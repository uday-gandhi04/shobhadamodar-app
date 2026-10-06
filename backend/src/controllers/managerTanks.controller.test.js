import assert from "node:assert/strict";
import test from "node:test";

import AuditLog from "../models/AuditLog.js";
import Station from "../models/Station.js";
import Tank from "../models/Tank.js";
import managerRoutes from "../routes/manager.routes.js";
import { authorize } from "../middlewares/auth.middleware.js";
import {
  createManagerTank,
  getManagerTanks,
  updateManagerTank,
} from "./managerTanks.controller.js";
import {
  createTankSchema,
  updateTankSchema,
} from "../validations/managerTanks.validation.js";

const originals = {
  stationFindOne: Station.findOne,
  tankFind: Tank.find,
  tankCreate: Tank.create,
  tankFindOneAndUpdate: Tank.findOneAndUpdate,
  auditCreate: AuditLog.create,
};
const stationId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const managerId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const tankId = "cccccccccccccccccccccccc";

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const setActiveStation = () => {
  Station.findOne = () => ({ lean: async () => ({ _id: stationId }) });
};
const restore = () => {
  Station.findOne = originals.stationFindOne;
  Tank.find = originals.tankFind;
  Tank.create = originals.tankCreate;
  Tank.findOneAndUpdate = originals.tankFindOneAndUpdate;
  AuditLog.create = originals.auditCreate;
};

test("manager can create a station tank and creation is audited", async () => {
  setActiveStation();
  let created;
  let audit;
  Tank.create = async (input) => { created = { _id: tankId, ...input }; return created; };
  AuditLog.create = async (input) => { audit = input; };
  try {
    const res = response();
    await createManagerTank({
      body: { tankNumber: "t-1", product: "PETROL", capacityLitres: 15000 },
      user: { _id: managerId, role: "MANAGER" },
    }, res, assert.fail);

    assert.equal(res.statusCode, 201);
    assert.equal(created.stationId, stationId);
    assert.equal(audit.action, "TANK_CREATED");
    assert.equal(audit.entityType, "TANK");
  } finally {
    restore();
  }
});

test("duplicate tank number is rejected", async () => {
  setActiveStation();
  Tank.create = async () => { const error = new Error("duplicate"); error.code = 11000; throw error; };
  try {
    const res = response();
    await createManagerTank({
      body: { tankNumber: "T-1", product: "PETROL", capacityLitres: 1000 },
      user: { _id: managerId, role: "MANAGER" },
    }, res, assert.fail);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, "TANK_NUMBER_EXISTS");
  } finally {
    restore();
  }
});

test("tank creation rejects invalid product, capacity, and tank number", () => {
  const valid = { body: { tankNumber: "T-1", product: "PETROL", capacityLitres: 1000 } };
  assert.equal(createTankSchema.safeParse({
    ...valid,
    body: { ...valid.body, product: "KEROSENE" },
  }).success, false);
  assert.equal(createTankSchema.safeParse({
    ...valid,
    body: { ...valid.body, capacityLitres: 0 },
  }).success, false);
  assert.equal(createTankSchema.safeParse({
    ...valid,
    body: { ...valid.body, capacityLitres: 1000.123 },
  }).success, false);
  assert.equal(createTankSchema.safeParse({
    ...valid,
    body: { ...valid.body, tankNumber: "   " },
  }).success, false);
  assert.equal(createTankSchema.safeParse({
    ...valid,
    body: { ...valid.body, stationId },
  }).success, false);
});

test("manager can update a tank and audit identity changes", async () => {
  setActiveStation();
  let query;
  let update;
  let audit;
  Tank.findOneAndUpdate = async (filter, values) => {
    query = filter;
    update = values;
    return { _id: tankId, tankNumber: "T-2", product: "DIESEL", capacityLitres: 18000, isActive: true };
  };
  AuditLog.create = async (input) => { audit = input; };
  try {
    const res = response();
    await updateManagerTank({
      params: { id: tankId },
      body: { tankNumber: "T-2", product: "DIESEL", capacityLitres: 18000 },
      user: { _id: managerId, role: "MANAGER" },
    }, res, assert.fail);

    assert.deepEqual(query, { _id: tankId, stationId });
    assert.deepEqual(update, { $set: { tankNumber: "T-2", product: "DIESEL", capacityLitres: 18000 } });
    assert.equal(res.body.data.tankNumber, "T-2");
    assert.equal(audit.action, "TANK_UPDATED");
  } finally {
    restore();
  }
});

test("manager can deactivate a tank and status change is audited", async () => {
  setActiveStation();
  let audit;
  Tank.findOneAndUpdate = async () => ({ _id: tankId, tankNumber: "T-1", isActive: false });
  AuditLog.create = async (input) => { audit = input; };
  try {
    const res = response();
    await updateManagerTank({
      params: { id: tankId },
      body: { isActive: false },
      user: { _id: managerId, role: "MANAGER" },
    }, res, assert.fail);
    assert.equal(res.body.data.isActive, false);
    assert.equal(audit.action, "TANK_STATUS_CHANGED");
    assert.deepEqual(audit.metadata.changedFields, ["isActive"]);
  } finally {
    restore();
  }
});

test("tank routes require manager authorization", () => {
  const tankRoutes = managerRoutes.stack
    .map((layer) => layer.route)
    .filter((route) => route && ["/tanks", "/tanks/:id"].includes(route.path));
  assert.equal(tankRoutes.length, 3);

  for (const route of tankRoutes) {
    assert.equal(route.stack[0].handle.name, "protect");
    const authorizeManager = route.stack[1].handle;
    const res = response();
    authorizeManager({ user: { role: "EMPLOYEE" } }, res, assert.fail);
    assert.equal(res.statusCode, 403);
  }
});

test("tank patch requires at least one valid editable field", () => {
  assert.equal(updateTankSchema.safeParse({ params: { id: tankId }, body: {} }).success, false);
  assert.equal(updateTankSchema.safeParse({
    params: { id: tankId },
    body: { isActive: false },
  }).success, true);
  assert.equal(updateTankSchema.safeParse({
    params: { id: tankId },
    body: { stationId },
  }).success, false);
});

test("tank schema defaults active and has a station-scoped unique tank-number index", () => {
  const tank = new Tank({
    stationId,
    tankNumber: " t-1 ",
    product: "PETROL",
    capacityLitres: 15000,
  });
  assert.equal(tank.isActive, true);
  assert.equal(tank.tankNumber, "T-1");
  assert.equal(Tank.schema.path("capacityLitres").options.min, 0.01);
  assert.ok(Tank.schema.indexes().some(([fields, options]) => (
    fields.stationId === 1
    && fields.tankNumber === 1
    && options.unique === true
  )));
});

test("manager tank list is station scoped and includes inactive tanks", async () => {
  setActiveStation();
  const result = [{ _id: tankId, tankNumber: "T-1", isActive: false }];
  const query = { sort() { return this; }, lean: async () => result };
  Tank.find = (filter) => {
    assert.deepEqual(filter, { stationId });
    return query;
  };
  try {
    const res = response();
    await getManagerTanks({}, res, assert.fail);
    assert.deepEqual(res.body.data, result);
  } finally {
    restore();
  }
});
