import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";

import Shift from "../models/Shift.js";
import Mpd from "../models/Mpd.js";
import FuelRate from "../models/FuelRate.js";
import AuditLog from "../models/AuditLog.js";
import Expense from "../models/Expense.js";
import UdhariTransaction from "../models/UdhariTransaction.js";
import { forceEndShift, getManagerAccounting } from "./manager.controller.js";
import { startShift } from "./shift.controller.js";
import { authorize } from "../middlewares/auth.middleware.js";

const shiftObjectId = new mongoose.Types.ObjectId().toString();
const employeeObjectId = new mongoose.Types.ObjectId().toString();
const managerObjectId = new mongoose.Types.ObjectId().toString();
const mpdObjectId = new mongoose.Types.ObjectId().toString();

const createMockResponse = () => {
  let statusCode = 200;
  let responseBody;
  return {
    res: {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return body;
      },
    },
    getResult: () => ({ statusCode, responseBody }),
  };
};

test("1. Manager can see and use Force End for a live shift, but Employee cannot invoke manager force-end API", async () => {
  // Test authorization middleware:
  const authMiddleware = authorize("MANAGER");

  // Employee attempt
  const employeeReq = { user: { _id: employeeObjectId, role: "EMPLOYEE" } };
  const { res: empRes, getResult: getEmpResult } = createMockResponse();
  let nextCalled = false;

  authMiddleware(employeeReq, empRes, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(getEmpResult().statusCode, 403);
  assert.equal(getEmpResult().responseBody.success, false);

  // Manager attempt
  const managerReq = { user: { _id: managerObjectId, role: "MANAGER" } };
  const { res: mgrRes } = createMockResponse();
  let managerNextCalled = false;

  authMiddleware(managerReq, mgrRes, () => {
    managerNextCalled = true;
  });

  assert.equal(managerNextCalled, true);
});

test("2. Valid readings successfully finalize the shift as FORCE_CLOSED with zero collections and correct fuel litres", async () => {
  const originalShiftFindById = Shift.findById;
  const originalShiftFindOneAndUpdate = Shift.findOneAndUpdate;
  const originalMpdFindById = Mpd.findById;
  const originalMpdFindByIdAndUpdate = Mpd.findByIdAndUpdate;
  const originalFuelRateFindOne = FuelRate.findOne;
  const originalAuditLogCreate = AuditLog.create;

  const mockShift = {
    _id: shiftObjectId,
    businessDate: "2026-10-21",
    mpdId: mpdObjectId,
    employeeId: employeeObjectId,
    status: "IN_PROGRESS",
    startedAt: new Date("2026-10-21T08:00:00.000Z"),
    readings: [
      {
        nozzleId: "N1",
        fuelType: "PETROL",
        openingReading: 372080.0,
      },
      {
        nozzleId: "N2",
        fuelType: "DIESEL",
        openingReading: 800220.0,
      },
    ],
    cashCollections: [{ denomination: 500, count: 10, totalPaise: 500000 }],
    totalCashPaise: 500000,
    totalCollectedPaise: 500000,
  };

  const mockMpd = {
    _id: mpdObjectId,
    mpdNumber: "MPD 1",
    nozzles: [
      {
        nozzleId: "N1",
        name: "Nozzle 1",
        fuelType: "PETROL",
        currentCumulativeReading: 372080.0,
        isActive: true,
      },
      {
        nozzleId: "N2",
        name: "Nozzle 2",
        fuelType: "DIESEL",
        currentCumulativeReading: 800220.0,
        isActive: true,
      },
    ],
  };

  let persistedShiftUpdate = null;
  let persistedMpdUpdate = null;
  let auditRecord = null;

  Shift.findById = async () => mockShift;
  Shift.findOneAndUpdate = async (query, update) => {
    if (query._id === shiftObjectId && query.status === "IN_PROGRESS") {
      persistedShiftUpdate = update.$set;
      return {
        ...mockShift,
        ...update.$set,
      };
    }
    return null;
  };
  Mpd.findById = async () => JSON.parse(JSON.stringify(mockMpd));
  Mpd.findByIdAndUpdate = async (id, update) => {
    persistedMpdUpdate = update;
    return update;
  };
  FuelRate.findOne = () => ({
    sort: () =>
      Promise.resolve({
        businessDate: "2026-10-21",
        petrolRatePaise: 10000, // ₹100 / L
        dieselRatePaise: 9000, // ₹90 / L
      }),
  });
  AuditLog.create = async (doc) => {
    auditRecord = doc;
    return doc;
  };

  try {
    const { res, getResult } = createMockResponse();
    const req = {
      user: { _id: managerObjectId, role: "MANAGER" },
      params: { shiftId: shiftObjectId },
      body: {
        readings: [
          { nozzleId: "N1", closingReading: 372130.0 }, // +50 L Petrol
          { nozzleId: "N2", closingReading: 800320.0 }, // +100 L Diesel
        ],
      },
    };

    await forceEndShift(req, res, (err) => {
      throw err;
    });

    const { statusCode, responseBody } = getResult();
    assert.equal(statusCode, 200);
    assert.equal(responseBody.success, true);
    assert.equal(responseBody.data.status, "FORCE_CLOSED");
    assert.equal(responseBody.data.isForceEnded, true);

    // 3. Status is FORCE_CLOSED
    assert.equal(persistedShiftUpdate.status, "FORCE_CLOSED");
    assert.equal(persistedShiftUpdate.isForceEnded, true);
    assert.equal(String(persistedShiftUpdate.forceEndedBy), managerObjectId);
    assert.ok(persistedShiftUpdate.endedAt instanceof Date);

    // 5. All collection fields are zero
    assert.deepEqual(persistedShiftUpdate.cashCollections, []);
    assert.equal(persistedShiftUpdate.coinsPaise, 0);
    assert.equal(persistedShiftUpdate.upiCollection, null);
    assert.equal(persistedShiftUpdate.totalCashPaise, 0);
    assert.equal(persistedShiftUpdate.totalUpiPaise, 0);
    assert.equal(persistedShiftUpdate.totalCardPaise, 0);
    assert.equal(persistedShiftUpdate.totalUdhariPaise, 0);
    assert.equal(persistedShiftUpdate.totalCollectedPaise, 0);
    assert.equal(persistedShiftUpdate.differencePaise, 0);
    assert.equal(persistedShiftUpdate.reconciliationStatus, "PENDING");

    // 6. Fuel litres still calculate correctly from readings
    assert.equal(persistedShiftUpdate.totalLitresPetrol, 50);
    assert.equal(persistedShiftUpdate.totalLitresDiesel, 100);
    // Expected sale: 50 * 10000 + 100 * 9000 = 500000 + 900000 = 1400000 paise
    assert.equal(persistedShiftUpdate.expectedTotalSalePaise, 1400000);

    // 7. Original employee and businessDate preserved
    assert.equal(mockShift.employeeId, employeeObjectId);
    assert.equal(mockShift.businessDate, "2026-10-21");

    // Audit log was recorded
    assert.ok(auditRecord);
    assert.equal(auditRecord.action, "SHIFT_FORCE_ENDED");
    assert.equal(auditRecord.entityType, "SHIFT");
    assert.equal(String(auditRecord.entityId), shiftObjectId);

    // 8. MPD nozzle cumulative readings updated to exact closing readings
    assert.ok(persistedMpdUpdate);
    const n1 = persistedMpdUpdate.nozzles.find((n) => n.nozzleId === "N1");
    const n2 = persistedMpdUpdate.nozzles.find((n) => n.nozzleId === "N2");
    assert.equal(n1.currentCumulativeReading, 372130.0);
    assert.equal(n2.currentCumulativeReading, 800320.0);
  } finally {
    Shift.findById = originalShiftFindById;
    Shift.findOneAndUpdate = originalShiftFindOneAndUpdate;
    Mpd.findById = originalMpdFindById;
    Mpd.findByIdAndUpdate = originalMpdFindByIdAndUpdate;
    FuelRate.findOne = originalFuelRateFindOne;
    AuditLog.create = originalAuditLogCreate;
  }
});

test("4. Missing, invalid, duplicate, unexpected, or lower-than-opening readings are rejected", async () => {
  const originalShiftFindById = Shift.findById;
  const originalMpdFindById = Mpd.findById;
  const originalFuelRateFindOne = FuelRate.findOne;

  const mockShift = {
    _id: shiftObjectId,
    businessDate: "2026-10-21",
    mpdId: mpdObjectId,
    status: "IN_PROGRESS",
    readings: [
      { nozzleId: "N1", fuelType: "PETROL", openingReading: 100 },
      { nozzleId: "N2", fuelType: "DIESEL", openingReading: 200 },
    ],
  };

  const mockMpd = {
    _id: mpdObjectId,
    nozzles: [
      { nozzleId: "N1", fuelType: "PETROL", currentCumulativeReading: 100 },
      { nozzleId: "N2", fuelType: "DIESEL", currentCumulativeReading: 200 },
    ],
  };

  Shift.findById = async () => mockShift;
  Mpd.findById = async () => mockMpd;
  FuelRate.findOne = () => ({
    sort: () => Promise.resolve({ petrolRatePaise: 10000, dieselRatePaise: 9000 }),
  });

  try {
    // 4a. Duplicate readings in submission
    {
      const { res, getResult } = createMockResponse();
      await forceEndShift(
        {
          user: { _id: managerObjectId, role: "MANAGER" },
          params: { shiftId: shiftObjectId },
          body: {
            readings: [
              { nozzleId: "N1", closingReading: 150 },
              { nozzleId: "N1", closingReading: 160 },
            ],
          },
        },
        res,
        () => {},
      );
      assert.equal(getResult().statusCode, 400);
      assert.equal(getResult().responseBody.code, "DUPLICATE_NOZZLE_READINGS");
    }

    // 4b. Missing nozzle reading (N2 omitted)
    {
      const { res, getResult } = createMockResponse();
      await forceEndShift(
        {
          user: { _id: managerObjectId, role: "MANAGER" },
          params: { shiftId: shiftObjectId },
          body: {
            readings: [{ nozzleId: "N1", closingReading: 150 }],
          },
        },
        res,
        () => {},
      );
      assert.equal(getResult().statusCode, 400);
      assert.equal(getResult().responseBody.code, "MISSING_NOZZLE_READING");
    }

    // 4c. Unexpected nozzle reading (N99 does not exist)
    {
      const { res, getResult } = createMockResponse();
      await forceEndShift(
        {
          user: { _id: managerObjectId, role: "MANAGER" },
          params: { shiftId: shiftObjectId },
          body: {
            readings: [
              { nozzleId: "N1", closingReading: 150 },
              { nozzleId: "N2", closingReading: 250 },
              { nozzleId: "N99", closingReading: 300 },
            ],
          },
        },
        res,
        () => {},
      );
      assert.equal(getResult().statusCode, 400);
      assert.equal(getResult().responseBody.code, "UNEXPECTED_NOZZLE");
    }

    // 4d. Closing lower than opening (N1 opening is 100, submitted 90)
    {
      const { res, getResult } = createMockResponse();
      await forceEndShift(
        {
          user: { _id: managerObjectId, role: "MANAGER" },
          params: { shiftId: shiftObjectId },
          body: {
            readings: [
              { nozzleId: "N1", closingReading: 90 },
              { nozzleId: "N2", closingReading: 250 },
            ],
          },
        },
        res,
        () => {},
      );
      assert.equal(getResult().statusCode, 400);
      assert.equal(getResult().responseBody.code, "READING_BELOW_OPENING");
    }

    // 4e. Invalid closing reading (negative)
    {
      const { res, getResult } = createMockResponse();
      await forceEndShift(
        {
          user: { _id: managerObjectId, role: "MANAGER" },
          params: { shiftId: shiftObjectId },
          body: {
            readings: [
              { nozzleId: "N1", closingReading: -5 },
              { nozzleId: "N2", closingReading: 250 },
            ],
          },
        },
        res,
        () => {},
      );
      assert.equal(getResult().statusCode, 400);
      assert.equal(getResult().responseBody.code, "INVALID_READING");
    }
  } finally {
    Shift.findById = originalShiftFindById;
    Mpd.findById = originalMpdFindById;
    FuelRate.findOne = originalFuelRateFindOne;
  }
});

test("8. The next shift receives the exact forced closing readings as its opening readings", async () => {
  const originalShiftFindOne = Shift.findOne;
  const originalShiftCreate = Shift.create;
  const originalShiftFindById = Shift.findById;
  const originalMpdFindOne = Mpd.findOne;

  // Simulate MPD after forced closure: cumulative readings were updated to 372130.0 and 800320.0
  const mpdAfterForcedEnd = {
    _id: mpdObjectId,
    mpdNumber: "MPD 1",
    isActive: true,
    nozzles: [
      {
        nozzleId: "N1",
        fuelType: "PETROL",
        currentCumulativeReading: 372130.0,
        isActive: true,
      },
      {
        nozzleId: "N2",
        fuelType: "DIESEL",
        currentCumulativeReading: 800320.0,
        isActive: true,
      },
    ],
  };

  let newShiftPayload = null;

  Shift.findOne = () => ({
    populate: () => Promise.resolve(null),
    then: (resolve, reject) => Promise.resolve(null).then(resolve, reject),
  });
  Mpd.findOne = async () => mpdAfterForcedEnd;
  Shift.create = async (doc) => {
    newShiftPayload = doc;
    return {
      _id: "new-shift-id",
      ...doc,
    };
  };
  Shift.findById = () => ({
    populate: () => ({
      lean: async () => ({
        _id: "new-shift-id",
        ...newShiftPayload,
      }),
    }),
  });

  try {
    const { res, getResult } = createMockResponse();
    await startShift(
      {
        user: { _id: "new-employee-id", role: "EMPLOYEE" },
        body: {
          businessDate: "2026-10-21",
          mpdId: mpdObjectId,
        },
      },
      res,
      (err) => {
        throw err;
      },
    );

    const { statusCode, responseBody } = getResult();
    assert.equal(statusCode, 201);
    assert.equal(responseBody.success, true);

    // Verify next shift opening readings match forced closing readings exactly!
    const newReadings = newShiftPayload.readings;
    const n1Reading = newReadings.find((r) => r.nozzleId === "N1");
    const n2Reading = newReadings.find((r) => r.nozzleId === "N2");
    assert.equal(n1Reading.openingReading, 372130.0);
    assert.equal(n2Reading.openingReading, 800320.0);
  } finally {
    Shift.findOne = originalShiftFindOne;
    Shift.create = originalShiftCreate;
    Shift.findById = originalShiftFindById;
    Mpd.findOne = originalMpdFindOne;
  }
});

test("9. Repeated or concurrent force-end requests cannot close the shift twice", async () => {
  const originalShiftFindById = Shift.findById;
  const originalShiftFindOneAndUpdate = Shift.findOneAndUpdate;
  const originalMpdFindById = Mpd.findById;
  const originalFuelRateFindOne = FuelRate.findOne;

  // Case 1: Shift is already FORCE_CLOSED in DB
  const closedShift = {
    _id: shiftObjectId,
    status: "FORCE_CLOSED",
    mpdId: mpdObjectId,
    readings: [{ nozzleId: "N1", fuelType: "PETROL", openingReading: 100 }],
  };

  Shift.findById = async () => closedShift;
  Mpd.findById = async () => ({ nozzles: [] });
  FuelRate.findOne = () => ({
    sort: () => Promise.resolve({ petrolRatePaise: 10000, dieselRatePaise: 9000 }),
  });

  try {
    const { res, getResult } = createMockResponse();
    await forceEndShift(
      {
        user: { _id: managerObjectId, role: "MANAGER" },
        params: { shiftId: shiftObjectId },
        body: { readings: [{ nozzleId: "N1", closingReading: 110 }] },
      },
      res,
      () => {},
    );

    assert.equal(getResult().statusCode, 400);
    assert.equal(getResult().responseBody.code, "SHIFT_NOT_IN_PROGRESS");
  } finally {
    Shift.findById = originalShiftFindById;
    Shift.findOneAndUpdate = originalShiftFindOneAndUpdate;
    Mpd.findById = originalMpdFindById;
    FuelRate.findOne = originalFuelRateFindOne;
  }

  // Case 2: Concurrent atomic race condition (findOneAndUpdate returns null because another request ended it)
  const inProgressShift = {
    _id: shiftObjectId,
    status: "IN_PROGRESS",
    mpdId: mpdObjectId,
    readings: [{ nozzleId: "N1", fuelType: "PETROL", openingReading: 100 }],
  };

  Shift.findById = async () => inProgressShift;
  Mpd.findById = async () => ({
    _id: mpdObjectId,
    nozzles: [{ nozzleId: "N1", fuelType: "PETROL", currentCumulativeReading: 100 }],
  });
  FuelRate.findOne = () => ({
    sort: () => Promise.resolve({ petrolRatePaise: 10000, dieselRatePaise: 9000 }),
  });
  Shift.findOneAndUpdate = async () => null; // Atomic check fails because already updated concurrently!

  try {
    const { res, getResult } = createMockResponse();
    await forceEndShift(
      {
        user: { _id: managerObjectId, role: "MANAGER" },
        params: { shiftId: shiftObjectId },
        body: { readings: [{ nozzleId: "N1", closingReading: 110 }] },
      },
      res,
      () => {},
    );

    assert.equal(getResult().statusCode, 409);
    assert.equal(getResult().responseBody.code, "SHIFT_ALREADY_ENDED");
  } finally {
    Shift.findById = originalShiftFindById;
    Shift.findOneAndUpdate = originalShiftFindOneAndUpdate;
    Mpd.findById = originalMpdFindById;
    FuelRate.findOne = originalFuelRateFindOne;
  }
});

test("10. Forced-ended shifts appear correctly in finalized accounting and carry FORCE_CLOSED status", async () => {
  const originalShiftAggregate = Shift.aggregate;
  const originalShiftFind = Shift.find;
  const originalMpdFind = Mpd.find;
  const originalFuelRateFindOne = FuelRate.findOne;
  const originalExpenseAggregate = Expense.aggregate;
  const originalUdhariFind = UdhariTransaction.find;

  let aggregatePipeline = null;
  let findQueries = [];

  Shift.aggregate = async (pipeline) => {
    aggregatePipeline = pipeline;
    return [];
  };

  Expense.aggregate = async () => [];
  UdhariTransaction.find = () => ({
    populate() {
      return this;
    },
    sort() {
      return this;
    },
    lean: async () => [],
  });

  Shift.find = (query) => {
    findQueries.push(query);
    return {
      populate: () => ({
        populate: () => ({
          sort: () => ({
            lean: async () => [
              {
                _id: shiftObjectId,
                businessDate: "2026-10-21",
                status: "FORCE_CLOSED",
                isForceEnded: true,
                startedAt: new Date("2026-10-21T08:00:00.000Z"),
                endedAt: new Date("2026-10-21T16:00:00.000Z"),
                totalLitresPetrol: 50,
                totalLitresDiesel: 0,
                expectedTotalSalePaise: 500000,
                totalCollectedPaise: 0,
                differencePaise: 0,
                reconciliationStatus: "PENDING",
                readings: [],
              },
            ],
          }),
        }),
      }),
    };
  };

  Mpd.find = () => ({
    select: () => ({
      lean: async () => [{ _id: mpdObjectId, mpdNumber: "MPD 1" }],
    }),
  });

  try {
    const { res, getResult } = createMockResponse();
    await getManagerAccounting(
      { query: { period: "today", date: "2026-10-21" } },
      res,
      (err) => {
        throw err;
      },
    );

    const { statusCode, responseBody } = getResult();
    assert.equal(statusCode, 200);

    // Verify aggregate pipeline matches FORCE_CLOSED alongside ENDED
    const matchStage = aggregatePipeline.find((s) => s.$match)?.$match;
    assert.deepEqual(matchStage.status.$in, ["ENDED", "FORCE_CLOSED"]);

    // Verify shifts returned include the force-closed shift with isForceEnded
    const returnedShifts = responseBody.data.shifts;
    assert.equal(returnedShifts.length, 1);
    assert.equal(returnedShifts[0].status, "FORCE_CLOSED");
    assert.equal(returnedShifts[0].isForceEnded, true);
  } finally {
    Shift.aggregate = originalShiftAggregate;
    Shift.find = originalShiftFind;
    Mpd.find = originalMpdFind;
    Expense.aggregate = originalExpenseAggregate;
    UdhariTransaction.find = originalUdhariFind;
  }
});
