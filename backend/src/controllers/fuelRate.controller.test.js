import assert from "node:assert/strict";
import test from "node:test";

import AuditLog from "../models/AuditLog.js";
import FuelRate from "../models/FuelRate.js";
import { createFuelRate, getCurrentFuelRate } from "./fuelRate.controller.js";

const originalExists = FuelRate.exists;
const originalCreate = FuelRate.create;
const originalAuditCreate = AuditLog.create;
const originalFindOne = FuelRate.findOne;

test("fuel rate creation records manager actor, business date, and rates", async () => {
  let auditEntry;
  FuelRate.exists = async () => false;
  FuelRate.create = async (rate) => ({ _id: "aaaaaaaaaaaaaaaaaaaaaaaa", ...rate });
  AuditLog.create = async (entry) => { auditEntry = entry; };

  try {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await createFuelRate(
      {
        body: { businessDate: "2026-10-05", petrolRatePaise: 10000, dieselRatePaise: 9000 },
        user: { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", role: "MANAGER" },
      },
      res,
      assert.fail,
    );
    assert.equal(res.statusCode, 201);
    assert.equal(auditEntry.actorId, "bbbbbbbbbbbbbbbbbbbbbbbb");
    assert.equal(auditEntry.action, "FUEL_RATE_CREATED");
    assert.deepEqual(auditEntry.metadata, { businessDate: "2026-10-05", petrolRatePaise: 10000, dieselRatePaise: 9000 });
  } finally {
    FuelRate.exists = originalExists;
    FuelRate.create = originalCreate;
    AuditLog.create = originalAuditCreate;
  }
});

test("duplicate fuel rate creation returns 409", async () => {
  FuelRate.exists = async () => true;

  try {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await createFuelRate(
      {
        body: { businessDate: "2026-10-05", petrolRatePaise: 10000, dieselRatePaise: 9000 },
        user: { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", role: "MANAGER" },
      },
      res,
      assert.fail,
    );
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, "FUEL_RATE_DATE_EXISTS");
  } finally {
    FuelRate.exists = originalExists;
  }
});

test("getCurrentFuelRate selects newest rate on or before requested date", async () => {
  const dbData = [
    { businessDate: "2026-10-01", petrolRatePaise: 100 },
    { businessDate: "2026-10-05", petrolRatePaise: 200 },
    { businessDate: "2026-10-10", petrolRatePaise: 300 }
  ];

  // mock getApplicableFuelRate logic
  FuelRate.findOne = (query) => {
    const maxDate = query.businessDate.$lte;
    return {
      sort: () => ({
        lean: async () => {
          const valid = dbData.filter(r => r.businessDate <= maxDate);
          return valid.length ? valid[valid.length - 1] : null;
        }
      })
    };
  };

  try {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    
    // Future-dated query uses current 2026-10-05 rate
    await getCurrentFuelRate({ query: { date: "2026-10-06" } }, res, assert.fail);
    assert.equal(res.body.data.businessDate, "2026-10-05");
    assert.equal(res.body.data.petrolRatePaise, 200);

    // Exact date match uses 2026-10-01
    await getCurrentFuelRate({ query: { date: "2026-10-01" } }, res, assert.fail);
    assert.equal(res.body.data.businessDate, "2026-10-01");

  } finally {
    FuelRate.findOne = originalFindOne;
  }
});
