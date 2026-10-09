import assert from "node:assert/strict";
import test from "node:test";

import Shift from "../models/Shift.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import {
  getManagerEmployeeDetail,
  getManagerEmployees,
  resetManagerEmployeePassword,
  updateManagerEmployee,
  updateManagerEmployeeStatus,
} from "./managerEmployees.controller.js";
import { loginUser } from "./auth.controller.js";
import { effectiveAccountStatus } from "../utils/accountStatus.js";
import { resetManagerEmployeePasswordSchema } from "../validations/managerEmployees.validation.js";

const employeeObjectId = "111111111111111111111111";
const secondEmployeeObjectId = "222222222222222222222222";
const originalUserMethods = {
  find: User.find,
  findOne: User.findOne,
  findOneAndUpdate: User.findOneAndUpdate,
};
const originalAuditCreate = AuditLog.create;
const originalShiftMethods = {
  find: Shift.find,
  findOne: Shift.findOne,
  aggregate: Shift.aggregate,
};

const createResponse = () => {
  let statusCode = 200;
  let body;
  return {
    response: {
      status(code) {
        statusCode = code;
        return this;
      },
      json(value) {
        body = value;
        return value;
      },
    },
    result: () => ({ statusCode, body }),
  };
};

const restoreModels = () => {
  User.find = originalUserMethods.find;
  User.findOne = originalUserMethods.findOne;
  User.findOneAndUpdate = originalUserMethods.findOneAndUpdate;
  Shift.find = originalShiftMethods.find;
  Shift.findOne = originalShiftMethods.findOne;
  Shift.aggregate = originalShiftMethods.aggregate;
  AuditLog.create = originalAuditCreate;
};

test.beforeEach(() => {
  AuditLog.create = async () => ({});
});

test("resolves old isActive records without reactivating inactive employees", () => {
  assert.equal(effectiveAccountStatus({ isActive: true }), "ACTIVE");
  assert.equal(effectiveAccountStatus({ isActive: false }), "INACTIVE");
  assert.equal(effectiveAccountStatus({ isActive: false, accountStatus: "BANNED" }), "BANNED");
  assert.equal(effectiveAccountStatus({}), "ACTIVE");
});

test("lists employees with active shifts independent of business date and omits auth fields", async () => {
  let shiftFilter;
  User.find = () => ({
    select() { return this; },
    sort() { return this; },
    lean: async () => [
      {
        _id: employeeObjectId,
        name: "Overnight Worker",
        employeeId: "EMP001",
        isActive: true,
        password: "hash-secret",
        tokenVersion: 9,
      },
      {
        _id: secondEmployeeObjectId,
        name: "Inactive Worker",
        employeeId: "EMP002",
        isActive: false,
      },
    ],
  });
  Shift.find = (filter) => {
    shiftFilter = filter;
    return {
      select() { return this; },
      populate() { return this; },
      lean: async () => [{
        _id: "333333333333333333333333",
        employeeId: employeeObjectId,
        mpdId: { mpdNumber: "MPD 2" },
        startedAt: new Date("2026-10-04T17:30:00.000Z"),
        businessDate: "2026-10-04",
        status: "IN_PROGRESS",
      }],
    };
  };

  try {
    const { response, result } = createResponse();
    await getManagerEmployees({}, response, (error) => { throw error; });
    const { body } = result();
    assert.deepEqual(shiftFilter, { status: "IN_PROGRESS" });
    assert.equal(body.data.summary.working, 1);
    assert.equal(body.data.summary.inactiveOrBanned, 1);
    assert.equal(body.data.employees[0].currentShift.mpd, "MPD 2");
    assert.equal(body.data.employees[0].password, undefined);
    assert.equal(body.data.employees[0].tokenVersion, undefined);
  } finally {
    restoreModels();
  }
});

test("employee detail separates current overnight shift from historical business-date history", async () => {
  let activeFilter;
  let historyFilter;
  User.findOne = () => ({
    select() {
      return {
        lean: async () => ({
          _id: employeeObjectId,
          name: "Overnight Worker",
          employeeId: "EMP001",
          isActive: true,
          createdAt: new Date("2025-01-01T00:00:00.000Z"),
          password: "hash-secret",
          tokenVersion: 3,
        }),
      };
    },
  });
  Shift.findOne = (filter) => {
    activeFilter = filter;
    return {
      select() { return this; },
      populate() { return this; },
      lean: async () => ({
        _id: "444444444444444444444444",
        mpdId: { mpdNumber: "MPD 2" },
        startedAt: new Date("2026-10-04T17:30:00.000Z"),
        businessDate: "2026-10-04",
        status: "IN_PROGRESS",
      }),
    };
  };
  Shift.find = (filter) => {
    historyFilter = filter;
    return {
      select() { return this; },
      populate() { return this; },
      sort() { return this; },
      limit() { return this; },
      lean: async () => [{
        _id: "555555555555555555555555",
        businessDate: "2026-10-02",
        mpdId: { mpdNumber: "MPD 1" },
        startedAt: new Date("2026-10-02T02:30:00.000Z"),
        endedAt: new Date("2026-10-02T08:30:00.000Z"),
        status: "ENDED",
        totalLitresPetrol: 500,
        totalLitresDiesel: 700,
        expectedTotalSalePaise: 14033000,
        differencePaise: -100,
      }],
    };
  };
  Shift.aggregate = async (pipeline) => {
    assert.equal(pipeline[0].$match.employeeId.toString(), employeeObjectId);
    return [{
      shiftCount: 1,
      totalLitresPetrol: 500,
      totalLitresDiesel: 700,
      totalSalePaise: 14033000,
      forceClosedShiftCount: 0,
    }];
  };

  try {
    const { response, result } = createResponse();
    await getManagerEmployeeDetail(
      { params: { id: employeeObjectId } },
      response,
      (error) => { throw error; },
    );
    const { body } = result();
    assert.deepEqual(activeFilter, {
      employeeId: employeeObjectId,
      status: "IN_PROGRESS",
    });
    assert.deepEqual(historyFilter.status.$in, ["ENDED", "FORCE_CLOSED"]);
    assert.equal(body.data.currentShift.mpd, "MPD 2");
    assert.equal(body.data.currentShift.businessDate, "2026-10-04");
    assert.equal(body.data.shiftHistory[0].businessDate, "2026-10-02");
    assert.equal(body.data.shiftHistory[0].totalLitres, 1200);
    assert.equal(body.data.summary.forceClosedShiftCount, 0);
    assert.equal(body.data.profile.password, undefined);
    assert.equal(body.data.profile.tokenVersion, undefined);
  } finally {
    restoreModels();
  }
});

test("blocks inactive or banned status changes while an employee has an active shift", async () => {
  let saved = false;
  let activeFilter;
  const employee = {
    _id: employeeObjectId,
    name: "Working Employee",
    employeeId: "EMP001",
    accountStatus: "ACTIVE",
    isActive: true,
    async save() { saved = true; },
  };
  User.findOne = () => ({ select: async () => employee });
  Shift.findOne = (filter) => {
    activeFilter = filter;
    return {
      select() { return this; },
      populate() { return this; },
      lean: async () => ({
        _id: "666666666666666666666666",
        mpdId: { mpdNumber: "MPD 2" },
        startedAt: new Date("2026-10-04T17:30:00.000Z"),
        businessDate: "2026-10-04",
        status: "IN_PROGRESS",
      }),
    };
  };

  try {
    const { response, result } = createResponse();
    await updateManagerEmployeeStatus(
      { params: { id: employeeObjectId }, body: { accountStatus: "BANNED" } },
      response,
      (error) => { throw error; },
    );
    const { statusCode, body } = result();
    assert.equal(statusCode, 409);
    assert.equal(body.code, "EMPLOYEE_HAS_ACTIVE_SHIFT");
    assert.deepEqual(activeFilter, {
      employeeId: employeeObjectId,
      status: "IN_PROGRESS",
    });
    assert.equal(saved, false);
    assert.equal(employee.isActive, true);
  } finally {
    restoreModels();
  }
});

test("synchronizes canonical account status with legacy isActive on allowed changes", async () => {
  const employee = {
    _id: employeeObjectId,
    name: "Status Employee",
    employeeId: "EMP001",
    accountStatus: "ACTIVE",
    isActive: true,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    async save() {},
  };
  const auditEntries = [];
  User.findOne = () => ({ select: async () => employee });
  Shift.findOne = () => ({
    select() { return this; },
    populate() { return this; },
    lean: async () => null,
  });
  AuditLog.create = async (entry) => { auditEntries.push(entry); };

  try {
    const manager = { _id: secondEmployeeObjectId, role: "MANAGER" };
    const deactivate = createResponse();
    await updateManagerEmployeeStatus(
      { params: { id: employeeObjectId }, body: { accountStatus: "INACTIVE" }, user: manager },
      deactivate.response,
      (error) => { throw error; },
    );
    assert.equal(deactivate.result().body.data.accountStatus, "INACTIVE");
    assert.equal(employee.isActive, false);

    const activate = createResponse();
    await updateManagerEmployeeStatus(
      { params: { id: employeeObjectId }, body: { accountStatus: "ACTIVE" }, user: manager },
      activate.response,
      (error) => { throw error; },
    );
    assert.equal(activate.result().body.data.accountStatus, "ACTIVE");
    assert.equal(employee.isActive, true);

    const ban = createResponse();
    await updateManagerEmployeeStatus(
      { params: { id: employeeObjectId }, body: { accountStatus: "BANNED" }, user: manager },
      ban.response,
      (error) => { throw error; },
    );
    assert.equal(ban.result().body.data.accountStatus, "BANNED");
    assert.equal(employee.isActive, false);
    assert.equal(auditEntries[0].action, "EMPLOYEE_STATUS_CHANGED");
    assert.deepEqual(auditEntries[0].metadata, {
      employeeId: "EMP001",
      previousStatus: "ACTIVE",
      newStatus: "INACTIVE",
    });
    assert.equal(auditEntries[0].actorId, manager._id);
  } finally {
    restoreModels();
  }
});

test("manager password reset updates only employee credentials and increments tokenVersion", async () => {
  let saved = false;
  let findQuery;
  let auditEntry;
  const oldCreatedAt = new Date("2024-01-01T00:00:00.000Z");
  const employee = {
    _id: employeeObjectId,
    name: "Employee",
    employeeId: "EMP001",
    role: "EMPLOYEE",
    password: "old-hash",
    tokenVersion: 7,
    createdAt: oldCreatedAt,
    historyMarker: "preserved",
    async save() { saved = true; },
  };
  User.findOne = async (query) => {
    findQuery = query;
    return employee;
  };
  AuditLog.create = async (entry) => { auditEntry = entry; };

  try {
    const { response, result } = createResponse();
    await resetManagerEmployeePassword(
      {
        params: { id: employeeObjectId },
        body: { password: "new-pass" },
        user: { _id: secondEmployeeObjectId, role: "MANAGER" },
      },
      response,
      (error) => { throw error; },
    );
    const { statusCode, body } = result();
    assert.deepEqual(findQuery, { _id: employeeObjectId, role: "EMPLOYEE" });
    assert.equal(statusCode, 200);
    assert.equal(body.data, undefined);
    assert.equal(JSON.stringify(body).includes("new-pass"), false);
    assert.equal(employee.password, "new-pass");
    assert.equal(employee.tokenVersion, 8);
    assert.equal(employee.name, "Employee");
    assert.equal(employee.employeeId, "EMP001");
    assert.equal(employee.createdAt, oldCreatedAt);
    assert.equal(employee.historyMarker, "preserved");
    assert.equal(saved, true);
    assert.equal(auditEntry.actorId, secondEmployeeObjectId);
    assert.equal(auditEntry.metadata.password, undefined);
  } finally {
    restoreModels();
  }
});

test("manager employee profile edit generates a profile audit record", async () => {
  let updateFilter;
  let auditEntry;
  const employee = {
    _id: employeeObjectId,
    name: "Updated Employee",
    employeeId: "EMP001",
    isActive: true,
    accountStatus: "ACTIVE",
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  };
  User.findOne = async (filter) => {
    updateFilter = filter;
    return {
      ...employee,
      save: async function() { employee.name = this.name; return this; }
    };
  };
  AuditLog.create = async (entry) => { auditEntry = entry; };

  try {
    const { response, result } = createResponse();
    const manager = { _id: secondEmployeeObjectId, role: "MANAGER" };
    await updateManagerEmployee(
      {
        params: { id: employeeObjectId },
        body: { name: "Updated Employee" },
        user: manager,
      },
      response,
      (error) => { throw error; },
    );
    assert.deepEqual(updateFilter, { _id: employeeObjectId, role: "EMPLOYEE" });
    assert.equal(result().statusCode, 200);
    assert.equal(auditEntry.actorId, manager._id);
    assert.equal(auditEntry.action, "EMPLOYEE_PROFILE_UPDATED");
    assert.deepEqual(auditEntry.metadata, { employeeId: "EMP001", oldName: "Updated Employee", newName: "Updated Employee" });
  } finally {
    restoreModels();
  }
});

test("manager password reset cannot target a manager and rejects short passwords", async () => {
  User.findOne = async (query) => {
    assert.deepEqual(query, { _id: employeeObjectId, role: "EMPLOYEE" });
    return null;
  };

  try {
    const { response, result } = createResponse();
    await resetManagerEmployeePassword(
      {
        params: { id: employeeObjectId },
        body: { password: "password" },
        user: { _id: secondEmployeeObjectId, role: "MANAGER" },
      },
      response,
      (error) => { throw error; },
    );
    assert.equal(result().statusCode, 404);
  } finally {
    restoreModels();
  }

  assert.equal(
    resetManagerEmployeePasswordSchema.safeParse({
      params: { id: employeeObjectId },
      body: { password: "short" },
    }).success,
    false,
  );
});

test("reset uses User save hashing and the employee can log in with the new password", async () => {
  const employee = new User({
    _id: employeeObjectId,
    name: "Password Employee",
    employeeId: "EMP001",
    password: "old-password",
    role: "EMPLOYEE",
    accountStatus: "ACTIVE",
    isActive: true,
    tokenVersion: 2,
  });
  const originalInsertOne = User.collection.insertOne;
  const originalJwtSecret = process.env.JWT_SECRET;
  let insertedDocument;
  User.collection.insertOne = async (document) => {
    insertedDocument = { ...document };
    return { acknowledged: true, insertedId: document._id };
  };
  User.findOne = async () => employee;
  AuditLog.create = async () => ({});
  process.env.JWT_SECRET = "employee-reset-test-secret";

  try {
    const resetResponse = createResponse();
    await resetManagerEmployeePassword(
      {
        params: { id: employeeObjectId },
        body: { password: "new-password" },
        user: { _id: secondEmployeeObjectId, role: "MANAGER" },
      },
      resetResponse.response,
      (error) => { throw error; },
    );
    assert.equal(resetResponse.result().statusCode, 200);
    assert.notEqual(insertedDocument.password, "new-password");
    assert.equal(await employee.matchPassword("new-password"), true);
    assert.equal(employee.tokenVersion, 3);

    const loginResponse = createResponse();
    await loginUser(
      { body: { employeeId: "EMP001", password: "new-password" } },
      loginResponse.response,
      (error) => { throw error; },
    );
    assert.equal(loginResponse.result().statusCode, 200);
    assert.ok(loginResponse.result().body.token);
  } finally {
    User.collection.insertOne = originalInsertOne;
    restoreModels();
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  }
});
