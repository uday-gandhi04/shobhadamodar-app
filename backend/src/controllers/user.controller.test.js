import assert from "node:assert/strict";
import test from "node:test";

import AuditLog from "../models/AuditLog.js";
import User from "../models/User.js";
import { createEmployee } from "./user.controller.js";

const originalMethods = {
  findOne: User.findOne,
  create: User.create,
  auditCreate: AuditLog.create,
};

test("manager employee creation preserves account setup and creates a safe audit record", async () => {
  let createdValues;
  let auditEntry;
  User.findOne = async () => null;
  User.create = async (values) => {
    createdValues = values;
    return {
      ...values,
      _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
    };
  };
  AuditLog.create = async (entry) => { auditEntry = entry; };

  try {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await createEmployee(
      {
        body: { name: "Employee", employeeId: "emp001", password: "secret123" },
        user: { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", role: "MANAGER" },
      },
      res,
      assert.fail,
    );
    assert.equal(res.statusCode, 201);
    assert.equal(createdValues.employeeId, "EMP001");
    assert.equal(createdValues.role, "EMPLOYEE");
    assert.equal(createdValues.createdBy, "bbbbbbbbbbbbbbbbbbbbbbbb");
    assert.equal(res.body.data.password, undefined);
    assert.equal(auditEntry.actorId, "bbbbbbbbbbbbbbbbbbbbbbbb");
    assert.equal(auditEntry.action, "EMPLOYEE_CREATED");
    assert.deepEqual(auditEntry.metadata, { employeeId: "EMP001" });
    assert.equal(JSON.stringify(auditEntry).includes("secret123"), false);
  } finally {
    User.findOne = originalMethods.findOne;
    User.create = originalMethods.create;
    AuditLog.create = originalMethods.auditCreate;
  }
});
