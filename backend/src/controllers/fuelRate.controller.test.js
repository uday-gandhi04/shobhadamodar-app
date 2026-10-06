import assert from "node:assert/strict";
import test from "node:test";

import AuditLog from "../models/AuditLog.js";
import FuelRate from "../models/FuelRate.js";
import { createFuelRate } from "./fuelRate.controller.js";

const originalExists = FuelRate.exists;
const originalCreate = FuelRate.create;
const originalAuditCreate = AuditLog.create;

test("fuel rate creation records manager actor and business date", async () => {
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
    assert.deepEqual(auditEntry.metadata, { businessDate: "2026-10-05" });
  } finally {
    FuelRate.exists = originalExists;
    FuelRate.create = originalCreate;
    AuditLog.create = originalAuditCreate;
  }
});
