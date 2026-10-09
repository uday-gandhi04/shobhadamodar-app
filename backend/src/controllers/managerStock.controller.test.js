import assert from "node:assert/strict";
import test from "node:test";

import AuditLog from "../models/AuditLog.js";
import DailyDensity from "../models/DailyDensity.js";
import DailyStock from "../models/DailyStock.js";
import FuelReceipt from "../models/FuelReceipt.js";
import Station from "../models/Station.js";
import {
  createManagerReceipt,
  upsertManagerDensity,
  upsertManagerStock,
} from "./managerStock.controller.js";

const originals = {
  stationFindOne: Station.findOne,
  stockUpsert: DailyStock.findOneAndUpdate,
  stockFindOne: DailyStock.findOne,
  densityUpsert: DailyDensity.findOneAndUpdate,
  densityFindOne: DailyDensity.findOne,
  receiptCreate: FuelReceipt.create,
  auditCreate: AuditLog.create,
};
const managerId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const stationId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const entityId = "cccccccccccccccccccccccc";

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const setup = (callback) => {
  let auditEntry;
  Station.findOne = () => ({ lean: async () => ({ _id: stationId }) });
  DailyStock.findOne = () => ({ lean: async () => null });
  DailyDensity.findOne = () => ({ lean: async () => null });
  AuditLog.create = async (entry) => { auditEntry = entry; };
  const restore = () => {
    Station.findOne = originals.stationFindOne;
    DailyStock.findOneAndUpdate = originals.stockUpsert;
    DailyStock.findOne = originals.stockFindOne;
    DailyDensity.findOneAndUpdate = originals.densityUpsert;
    DailyDensity.findOne = originals.densityFindOne;
    FuelReceipt.create = originals.receiptCreate;
    AuditLog.create = originals.auditCreate;
  };
  return callback(() => auditEntry, restore);
};

test("manager stock upsert produces an audit with business date and product", async () => {
  await setup(async (getAudit, restore) => {
    DailyStock.findOneAndUpdate = async () => ({ _id: entityId });
    try {
      const res = response();
      await upsertManagerStock(
        {
          body: { businessDate: "2026-10-05", product: "PETROL", openingStockLitres: 100 },
          user: { _id: managerId, role: "MANAGER" },
        },
        res,
        assert.fail,
      );
      assert.equal(res.body.data._id, entityId);
      assert.equal(getAudit().action, "STOCK_UPSERTED");
      assert.deepEqual(getAudit().metadata, { businessDate: "2026-10-05", product: "PETROL", isUpdate: false });
      assert.equal(getAudit().actorId, managerId);
    } finally {
      restore();
    }
  });
});

test("manager density upsert produces an audit with business date and product", async () => {
  await setup(async (getAudit, restore) => {
    DailyDensity.findOneAndUpdate = async () => ({ _id: entityId });
    try {
      const res = response();
      await upsertManagerDensity(
        {
          body: { businessDate: "2026-10-05", product: "DIESEL", density15: 830 },
          user: { _id: managerId, role: "MANAGER" },
        },
        res,
        assert.fail,
      );
      assert.equal(getAudit().action, "DENSITY_UPSERTED");
      assert.deepEqual(getAudit().metadata, { businessDate: "2026-10-05", product: "DIESEL", isUpdate: false });
    } finally {
      restore();
    }
  });
});

test("manager receipt creation audits safe receipt context", async () => {
  await setup(async (getAudit, restore) => {
    FuelReceipt.create = async (receipt) => ({ _id: entityId, ...receipt });
    try {
      const res = response();
      res.status = function status(code) { this.statusCode = code; return this; };
      await createManagerReceipt(
        {
          body: {
            businessDate: "2026-10-05",
            product: "PETROL",
            invoiceNumber: "INV-1",
            quantityLitres: 10,
          },
          user: { _id: managerId, role: "MANAGER" },
        },
        res,
        assert.fail,
      );
      assert.equal(res.statusCode, 201);
      assert.equal(getAudit().action, "FUEL_RECEIPT_CREATED");
      assert.deepEqual(getAudit().metadata, {
        businessDate: "2026-10-05",
        product: "PETROL",
        invoiceNumber: "INV-1",
        quantityLitres: 10,
        receiptId: entityId,
      });
    } finally {
      restore();
    }
  });
});

test("stock update succeeds when audit persistence fails", async () => {
  const originalConsoleError = console.error;
  Station.findOne = () => ({ lean: async () => ({ _id: stationId }) });
  DailyStock.findOne = () => ({ lean: async () => null });
  DailyStock.findOneAndUpdate = async () => ({ _id: entityId });
  AuditLog.create = async () => { throw new Error("audit store unavailable"); };
  console.error = () => {};

  try {
    const res = response();
    await upsertManagerStock(
      {
        body: { businessDate: "2026-10-05", product: "PETROL", openingStockLitres: 100 },
        user: { _id: managerId, role: "MANAGER" },
      },
      res,
      (error) => { throw error; },
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data._id, entityId);
  } finally {
    Station.findOne = originals.stationFindOne;
    DailyStock.findOneAndUpdate = originals.stockUpsert;
    AuditLog.create = originals.auditCreate;
    console.error = originalConsoleError;
  }
});

test("receipt creation calculates correct density difference", async () => {
  await setup(async (getAudit, restore) => {
    FuelReceipt.create = async (receipt) => ({ _id: entityId, ...receipt });
    try {
      const res = response();
      await createManagerReceipt({
        body: { beforeDensity15: 730.55, challanDensity15: 730.00, afterDensity15: 830.12, afterChallanDensity15: 830.00 },
        user: { _id: managerId, role: "MANAGER" },
      }, res, assert.fail);
      assert.equal(res.body.data.beforeDensityDifference, 0.55);
      assert.equal(res.body.data.afterDensityDifference, 0.12);
    } finally { restore(); }
  });
});

test("receipt creation handles negative density difference", async () => {
  await setup(async (getAudit, restore) => {
    FuelReceipt.create = async (receipt) => ({ _id: entityId, ...receipt });
    try {
      const res = response();
      await createManagerReceipt({
        body: { beforeDensity15: 729.00, challanDensity15: 730.50 },
        user: { _id: managerId, role: "MANAGER" },
      }, res, assert.fail);
      assert.equal(res.body.data.beforeDensityDifference, -1.50);
      assert.equal(res.body.data.afterDensityDifference, null);
    } finally { restore(); }
  });
});

test("receipt creation sets density difference to null if fields are missing", async () => {
  await setup(async (getAudit, restore) => {
    FuelReceipt.create = async (receipt) => ({ _id: entityId, ...receipt });
    try {
      const res = response();
      await createManagerReceipt({
        body: { beforeDensity15: 730.55 },
        user: { _id: managerId, role: "MANAGER" },
      }, res, assert.fail);
      assert.equal(res.body.data.beforeDensityDifference, null);
      assert.equal(res.body.data.afterDensityDifference, null);
    } finally { restore(); }
  });
});

test("receipt creation ignores tampered client density difference", async () => {
  await setup(async (getAudit, restore) => {
    FuelReceipt.create = async (receipt) => ({ _id: entityId, ...receipt });
    try {
      const res = response();
      await createManagerReceipt({
        body: { beforeDensity15: 730.50, challanDensity15: 730.00, beforeDensityDifference: 999.99 },
        user: { _id: managerId, role: "MANAGER" },
      }, res, assert.fail);
      assert.equal(res.body.data.beforeDensityDifference, 0.50);
    } finally { restore(); }
  });
});

