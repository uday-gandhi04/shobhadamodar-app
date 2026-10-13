import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import dotenv from "dotenv";

import Station from "../models/Station.js";
import Mpd from "../models/Mpd.js";
import Shift from "../models/Shift.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { getProductRegisterNozzles } from "../services/stockRegisterService.js";

dotenv.config();

const uri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
});

test.after(async () => {
  await mongoose.disconnect();
});

test("MPD & NOZZLE CONFIG: Manager API and business logic suite", async (t) => {
  const station = await Station.findOne({ isActive: true });
  assert.ok(station, "Active station must exist");

  const managerUser = await User.findOne({ role: "MANAGER" }) || {
    _id: new mongoose.Types.ObjectId(),
    name: "Test Manager",
    role: "MANAGER",
    email: "manager@example.com",
  };

  const employeeUser = await User.findOne({ role: "EMPLOYEE" }) || {
    _id: new mongoose.Types.ObjectId(),
    name: "Test Employee",
    role: "EMPLOYEE",
    email: "employee@example.com",
  };

  // Import controller methods
  const {
    getManagerMpds,
    createManagerMpd,
    updateManagerMpd,
    deleteManagerMpd,
    addManagerMpdNozzle,
    updateManagerMpdNozzle,
    deleteManagerMpdNozzle,
  } = await import("./managerMpds.controller.js");

  let createdMpdId = null;

  await t.test("1. Manager can list all configured MPDs with nozzle details and active shift status", async () => {
    let responseData = null;
    const req = { user: managerUser };
    const res = {
      json: (data) => { responseData = data; return res; },
      status: () => res,
    };

    await getManagerMpds(req, res, () => {});
    assert.ok(responseData?.success, "Should succeed");
    assert.ok(Array.isArray(responseData.data), "Should return array of MPDs");
    assert.ok(responseData.data.length >= 2, "Station must have at least 2 default MPDs");

    const mpd1 = responseData.data.find((m) => m.mpdNumber === "MPD 1");
    assert.ok(mpd1, "MPD 1 must be present");
    assert.ok(Array.isArray(mpd1.nozzles), "MPD 1 must contain nozzles");
    assert.equal(typeof mpd1.hasActiveShift, "boolean");
    assert.equal(typeof mpd1.hasHistoricalShifts, "boolean");
  });

  await t.test("2. Manager can add a new MPD with custom nozzles and display name", async () => {
    let statusCode = 200;
    let responseData = null;
    const req = {
      user: managerUser,
      body: {
        mpdNumber: "MPD 99 - Test",
        serialNumber: "SN-999-TEST",
        nozzles: [
          { nozzleId: "n1", name: "Nozzle 1", nozzleNumber: 1, fuelType: "PETROL" },
          { nozzleId: "n2", name: "Nozzle 2", nozzleNumber: 2, fuelType: "PETROL" },
          { nozzleId: "n3", name: "Nozzle 3", nozzleNumber: 3, fuelType: "DIESEL" },
        ],
      },
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; },
    };

    await createManagerMpd(req, res, () => {});
    assert.equal(statusCode, 201);
    assert.ok(responseData?.success);
    assert.equal(responseData.data.mpdNumber, "MPD 99 - Test");
    assert.equal(responseData.data.nozzles.length, 3);
    createdMpdId = responseData.data._id.toString();

    // Verify audit log
    const audit = await AuditLog.findOne({
      entityId: responseData.data._id,
      action: "MPD_CREATED",
    }).lean();
    assert.ok(audit, "MPD_CREATED audit record must be persisted");
  });

  await t.test("3. Duplicate MPD number within the same station is rejected with 409", async () => {
    let statusCode = 200;
    let responseData = null;
    const req = {
      user: managerUser,
      body: {
        mpdNumber: "MPD 99 - Test", // duplicate
        nozzles: [{ nozzleId: "n1", name: "N1", fuelType: "PETROL" }],
      },
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; },
    };

    await createManagerMpd(req, res, () => {});
    assert.equal(statusCode, 409);
    assert.equal(responseData?.code, "MPD_NUMBER_EXISTS");
  });

  await t.test("4. Duplicate nozzle identifier within the same MPD is rejected", async () => {
    let statusCode = 200;
    let responseData = null;
    const req = {
      user: managerUser,
      body: {
        mpdNumber: "MPD Unique",
        nozzles: [
          { nozzleId: "n1", name: "N1", fuelType: "PETROL" },
          { nozzleId: "n1", name: "N1 Duplicate", fuelType: "DIESEL" },
        ],
      },
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; },
    };

    await createManagerMpd(req, res, () => {});
    assert.equal(statusCode, 400);
    assert.match(responseData?.message, /duplicate nozzle identifier/i);
  });

  await t.test("5. Manager can update MPD display name and add/edit nozzle fuel assignments", async () => {
    assert.ok(createdMpdId, "Must have created MPD ID");

    // 5a. Rename MPD
    let statusCode = 200;
    let responseData = null;
    const updateReq = {
      user: managerUser,
      params: { id: createdMpdId },
      body: { mpdNumber: "MPD 99 - Renamed", serialNumber: "SN-RENAMED" },
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; },
    };
    await updateManagerMpd(updateReq, res, () => {});
    assert.equal(statusCode, 200);
    assert.equal(responseData.data.mpdNumber, "MPD 99 - Renamed");

    // 5b. Add a 4th nozzle
    const addNozzleReq = {
      user: managerUser,
      params: { id: createdMpdId },
      body: {
        nozzleId: "n4",
        name: "Nozzle 4",
        nozzleNumber: 4,
        fuelType: "DIESEL",
      },
    };
    await addManagerMpdNozzle(addNozzleReq, res, () => {});
    assert.equal(statusCode, 201);
    assert.equal(responseData.data.nozzles.length, 4);

    // 5c. Reassign nozzle 1 from PETROL to DIESEL
    statusCode = 200;
    const updateNozzleReq = {
      user: managerUser,
      params: { id: createdMpdId, nozzleId: "n1" },
      body: { fuelType: "DIESEL", name: "Nozzle 1 - Reassigned" },
    };
    await updateManagerMpdNozzle(updateNozzleReq, res, () => {});
    assert.equal(statusCode, 200);
    const n1 = responseData.data.nozzles.find((n) => n.nozzleId === "n1");
    assert.equal(n1.fuelType, "DIESEL");

    // Verify audit log for reassignment
    const reassignedAudit = await AuditLog.findOne({
      entityId: createdMpdId,
      action: "NOZZLE_FUEL_REASSIGNED",
    }).lean();
    assert.ok(reassignedAudit, "NOZZLE_FUEL_REASSIGNED audit record must exist");
  });

  await t.test("6. Changes are strictly blocked when an active (IN_PROGRESS) shift is open on the MPD", async () => {
    // Create an active shift on created MPD
    const activeShift = await Shift.create({
      businessDate: "2026-10-13",
      mpdId: createdMpdId,
      employeeId: employeeUser._id,
      status: "IN_PROGRESS",
      startedAt: new Date(),
      readings: [
        { nozzleId: "n1", fuelType: "DIESEL", openingReading: 100 },
      ],
    });

    try {
      let statusCode = 200;
      let responseData = null;
      const res = {
        status: (code) => { statusCode = code; return res; },
        json: (data) => { responseData = data; return res; },
      };

      // 6a. Attempt to update MPD while shift is active
      await updateManagerMpd({
        user: managerUser,
        params: { id: createdMpdId },
        body: { mpdNumber: "Blocked Change" },
      }, res, () => {});
      assert.equal(statusCode, 409);
      assert.equal(responseData?.code, "ACTIVE_SHIFT_IN_PROGRESS");

      // 6b. Attempt to modify nozzle fuel type while shift is active
      await updateManagerMpdNozzle({
        user: managerUser,
        params: { id: createdMpdId, nozzleId: "n1" },
        body: { fuelType: "PETROL" },
      }, res, () => {});
      assert.equal(statusCode, 409);
      assert.equal(responseData?.code, "ACTIVE_SHIFT_IN_PROGRESS");

      // 6c. Attempt to delete MPD while shift is active
      await deleteManagerMpd({
        user: managerUser,
        params: { id: createdMpdId },
      }, res, () => {});
      assert.equal(statusCode, 409);
      assert.equal(responseData?.code, "ACTIVE_SHIFT_IN_PROGRESS");
    } finally {
      // Clean up active shift
      await Shift.deleteOne({ _id: activeShift._id });
    }
  });

  await t.test("7. Destructive deletion is blocked when historical shifts reference the MPD", async () => {
    // Create a finalized historical shift
    const historicalShift = await Shift.create({
      businessDate: "2026-09-01",
      mpdId: createdMpdId,
      employeeId: employeeUser._id,
      status: "ENDED",
      startedAt: new Date("2026-09-01T06:00:00Z"),
      endedAt: new Date("2026-09-01T14:00:00Z"),
      readings: [
        { nozzleId: "n1", fuelType: "DIESEL", openingReading: 100, closingReading: 200, dispensedLitres: 100 },
      ],
    });

    try {
      let statusCode = 200;
      let responseData = null;
      const res = {
        status: (code) => { statusCode = code; return res; },
        json: (data) => { responseData = data; return res; },
      };

      // Attempt to delete MPD that has historical shifts
      await deleteManagerMpd({
        user: managerUser,
        params: { id: createdMpdId },
      }, res, () => {});
      assert.equal(statusCode, 409);
      assert.equal(responseData?.code, "HISTORICAL_RECORDS_EXIST");
      assert.match(responseData?.message, /deactivate/i);

      // Attempt to delete nozzle referenced in historical readings
      await deleteManagerMpdNozzle({
        user: managerUser,
        params: { id: createdMpdId, nozzleId: "n1" },
      }, res, () => {});
      assert.equal(statusCode, 409);
      assert.equal(responseData?.code, "HISTORICAL_RECORDS_EXIST");
    } finally {
      await Shift.deleteOne({ _id: historicalShift._id });
    }
  });

  await t.test("8. Deactivating MPD is safe and prevents new shifts while keeping history intact", async () => {
    let statusCode = 200;
    let responseData = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; },
    };

    // Deactivate MPD
    await updateManagerMpd({
      user: managerUser,
      params: { id: createdMpdId },
      body: { isActive: false },
    }, res, () => {});
    assert.equal(statusCode, 200);
    assert.equal(responseData.data.isActive, false);

    const doc = await Mpd.findById(createdMpdId).lean();
    assert.equal(doc.isActive, false);
  });

  await t.test("9. Unreferenced MPD can be safely deleted if no historical records exist", async () => {
    let statusCode = 200;
    let responseData = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; },
    };

    await deleteManagerMpd({
      user: managerUser,
      params: { id: createdMpdId },
    }, res, () => {});
    assert.equal(statusCode, 200);
    assert.ok(responseData?.success);

    const deletedDoc = await Mpd.findById(createdMpdId).lean();
    assert.equal(deletedDoc, null, "MPD document must be removed");
  });

  await t.test("10. Dynamic nozzle mapping in Stock & Meter Register reflects configured nozzles", async () => {
    const allMpds = await Mpd.find({ isActive: true }).lean();
    const petrolSpecs = getProductRegisterNozzles("PETROL", allMpds);
    const dieselSpecs = getProductRegisterNozzles("DIESEL", allMpds);

    assert.ok(petrolSpecs.length > 0, "Must have petrol specs");
    assert.ok(dieselSpecs.length > 0, "Must have diesel specs");

    for (const spec of petrolSpecs) {
      assert.equal(spec.fuelType, "PETROL");
      assert.ok(spec.mpdNumber);
      assert.ok(spec.nozzleId);
    }
    for (const spec of dieselSpecs) {
      assert.equal(spec.fuelType, "DIESEL");
      assert.ok(spec.mpdNumber);
      assert.ok(spec.nozzleId);
    }
  });
});
