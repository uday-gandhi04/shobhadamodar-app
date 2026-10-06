import assert from "node:assert/strict";
import test from "node:test";

import AuditLog from "../models/AuditLog.js";
import { recordAuditLog } from "./auditLog.js";

const originalCreate = AuditLog.create;

test("audit helper derives actor from the actor object and removes credential metadata", async () => {
  let document;
  AuditLog.create = async (value) => { document = value; };
  try {
    await recordAuditLog({
      actor: { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", role: "MANAGER" },
      action: "EMPLOYEE_PASSWORD_RESET",
      entityType: "EMPLOYEE",
      entityId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      metadata: {
        employeeId: "EMP001",
        password: "secret",
        accessToken: "access",
        nested: { setupSecret: "seed", safeValue: "ok" },
      },
    });
    assert.equal(document.actorId, "aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(document.actorRole, "MANAGER");
    assert.deepEqual(document.metadata, {
      employeeId: "EMP001",
      nested: { safeValue: "ok" },
    });
    assert.equal(JSON.stringify(document).includes("secret"), false);
    assert.equal(JSON.stringify(document).includes("access"), false);
    assert.equal(JSON.stringify(document).includes("seed"), false);
  } finally {
    AuditLog.create = originalCreate;
  }
});

test("audit persistence failure is contained and logged without sensitive values", async () => {
  const originalError = console.error;
  const messages = [];
  AuditLog.create = async () => {
    const error = new Error("should not escape");
    error.code = "AUDIT_STORE_ERROR";
    throw error;
  };
  console.error = (...values) => messages.push(values);
  try {
    await assert.doesNotReject(recordAuditLog({
      actor: { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", role: "MANAGER" },
      action: "FUEL_RATE_CREATED",
      entityType: "FUEL_RATE",
      entityId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    }));
    assert.deepEqual(messages, [[
      "Audit log persistence failed.",
      { name: "Error", code: "AUDIT_STORE_ERROR" },
    ]]);
  } finally {
    AuditLog.create = originalCreate;
    console.error = originalError;
  }
});
