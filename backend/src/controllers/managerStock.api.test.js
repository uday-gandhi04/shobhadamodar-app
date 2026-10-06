import assert from "node:assert/strict";
import test from "node:test";

import DailyStock from "../models/DailyStock.js";
import FuelReceipt from "../models/FuelReceipt.js";
import Shift from "../models/Shift.js";
import Station from "../models/Station.js";
import Tank from "../models/Tank.js";
import { getManagerStock } from "./managerStock.controller.js";

const originals = {
  stationFindOne: Station.findOne,
  stockFind: DailyStock.find,
  receiptAggregate: FuelReceipt.aggregate,
  shiftAggregate: Shift.aggregate,
  tankFind: Tank.find,
};
const stationId = "aaaaaaaaaaaaaaaaaaaaaaaa";

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const stubQueries = ({ stockRows, receipts, sales, configuredTanks }) => {
  let shiftPipeline;
  Station.findOne = () => ({ lean: async () => ({ _id: stationId }) });
  DailyStock.find = () => ({ lean: async () => stockRows });
  FuelReceipt.aggregate = async () => receipts;
  Shift.aggregate = async (pipeline) => { shiftPipeline = pipeline; return sales; };
  Tank.find = () => ({
    sort() { return this; },
    lean: async () => configuredTanks,
  });
  return () => shiftPipeline;
};

const restore = () => {
  Station.findOne = originals.stationFindOne;
  DailyStock.find = originals.stockFind;
  FuelReceipt.aggregate = originals.receiptAggregate;
  Shift.aggregate = originals.shiftAggregate;
  Tank.find = originals.tankFind;
};

test("stock API returns configured tank context and preserves stock formulas/finalized sales", async () => {
  const getShiftPipeline = stubQueries({
    stockRows: [{
      product: "PETROL",
      openingStockLitres: 100,
      productDip: 95,
      actualDipStockLitres: 92,
      waterDip: 2,
      waterDipVolumeLitres: 1.5,
    }],
    receipts: [{ _id: "PETROL", receiptStockLitres: 20 }],
    sales: [{ petrol: 25, diesel: 7 }],
    configuredTanks: [{
      _id: "dddddddddddddddddddddddd",
      tankNumber: "P-1",
      product: "PETROL",
      capacityLitres: 16000,
      isActive: true,
    }],
  });

  try {
    const res = response();
    await getManagerStock({ query: { date: "2026-10-05" } }, res, assert.fail);
    const [petrol, diesel] = res.body.data.stock;
    assert.equal(petrol.hasStockRecord, true);
    assert.equal(petrol.openingStockLitres, 100);
    assert.equal(petrol.receiptStockLitres, 20);
    assert.equal(petrol.totalAvailableLitres, 120);
    assert.equal(petrol.actualSalesLitres, 25);
    assert.equal(petrol.calculatedClosingStockLitres, 95);
    assert.equal(petrol.variationLitres, -3);
    assert.equal(petrol.productDip, 95);
    assert.equal(petrol.actualDipStockLitres, 92);
    assert.equal(petrol.waterDip, 2);
    assert.equal(petrol.waterDipVolumeLitres, 1.5);
    assert.equal(petrol.tankNumber, "P-1");
    assert.equal(petrol.product, "PETROL");
    assert.equal(petrol.capacityLitres, 16000);
    assert.equal(diesel.actualSalesLitres, 7);
    assert.deepEqual(getShiftPipeline()[0].$match.status.$in, ["ENDED", "FORCE_CLOSED"]);
    assert.deepEqual(res.body.data.tanks, [{
      _id: "dddddddddddddddddddddddd",
      tankNumber: "P-1",
      product: "PETROL",
      capacityLitres: 16000,
    }]);
  } finally {
    restore();
  }
});

test("missing stock is distinct from an entered zero opening and has no calculated closing", async () => {
  stubQueries({
    stockRows: [{ product: "PETROL", openingStockLitres: 0 }],
    receipts: [],
    sales: [],
    configuredTanks: [],
  });
  try {
    const res = response();
    await getManagerStock({ query: { date: "2026-10-05" } }, res, assert.fail);
    const [petrol, diesel] = res.body.data.stock;
    assert.equal(petrol.hasStockRecord, true);
    assert.equal(petrol.openingStockLitres, 0);
    assert.equal(petrol.totalAvailableLitres, 0);
    assert.equal(petrol.calculatedClosingStockLitres, 0);
    assert.equal(diesel.hasStockRecord, false);
    assert.equal(diesel.openingStockLitres, null);
    assert.equal(diesel.totalAvailableLitres, null);
    assert.equal(diesel.calculatedClosingStockLitres, null);
  } finally {
    restore();
  }
});

test("multiple configured product tanks are returned as context without assigning one to aggregate stock", async () => {
  stubQueries({
    stockRows: [],
    receipts: [],
    sales: [],
    configuredTanks: [
      { _id: "dddddddddddddddddddddddd", tankNumber: "P-1", product: "PETROL", capacityLitres: 1000 },
      { _id: "eeeeeeeeeeeeeeeeeeeeeeee", tankNumber: "P-2", product: "PETROL", capacityLitres: 2000 },
    ],
  });
  try {
    const res = response();
    await getManagerStock({ query: { date: "2026-10-05" } }, res, assert.fail);
    const [petrol] = res.body.data.stock;
    assert.equal(petrol.tankNumber, null);
    assert.equal(petrol.capacityLitres, null);
    assert.equal(res.body.data.tanks.length, 2);
  } finally {
    restore();
  }
});
