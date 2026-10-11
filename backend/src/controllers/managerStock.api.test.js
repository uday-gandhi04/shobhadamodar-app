import assert from "node:assert/strict";
import test from "node:test";

import DailyStock from "../models/DailyStock.js";
import FuelReceipt from "../models/FuelReceipt.js";
import Shift from "../models/Shift.js";
import Station from "../models/Station.js";
import Tank from "../models/Tank.js";
import Mpd from "../models/Mpd.js";
import DailyMeterRegister from "../models/DailyMeterRegister.js";
import TankCalibration from "../models/TankCalibration.js";
import { getManagerStock } from "./managerStock.controller.js";

const originals = {
  stationFindOne: Station.findOne,
  stockFind: DailyStock.find,
  stockFindOne: DailyStock.findOne,
  receiptAggregate: FuelReceipt.aggregate,
  shiftFind: Shift.find,
  meterFind: DailyMeterRegister.find,
  meterFindOne: DailyMeterRegister.findOne,
  mpdFind: Mpd.find,
  tankFind: Tank.find,
  calibrationFind: TankCalibration.find,
};
const stationId = "aaaaaaaaaaaaaaaaaaaaaaaa";

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const stubQueries = ({ stockRows = [], receipts = [], sales = [], configuredTanks = [] }) => {
  let shiftQuery;
  Station.findOne = () => ({ lean: async () => ({ _id: stationId }) });
  DailyStock.find = () => ({ lean: async () => stockRows });
  DailyStock.findOne = () => ({
    sort() { return this; },
    lean: async () => null,
  });
  FuelReceipt.aggregate = async () => receipts;

  const petrolSale = sales[0]?.petrol ?? null;
  const dieselSale = sales[0]?.diesel ?? null;
  const meterDocs = [];
  if (petrolSale != null) {
    meterDocs.push({
      product: "PETROL",
      recordedTotalMeterSale: petrolSale,
      nozzles: [
        { registerNozzle: 1, openingReading: 1000, closingReading: 1000 + petrolSale, recordedSale: petrolSale },
        { registerNozzle: 2, openingReading: 0, closingReading: 0, recordedSale: 0 },
        { registerNozzle: 3, openingReading: 0, closingReading: 0, recordedSale: 0 },
        { registerNozzle: 4, openingReading: 0, closingReading: 0, recordedSale: 0 },
      ]
    });
  }
  if (dieselSale != null) {
    meterDocs.push({
      product: "DIESEL",
      recordedTotalMeterSale: dieselSale,
      nozzles: [
        { registerNozzle: 1, openingReading: 2000, closingReading: 2000 + dieselSale, recordedSale: dieselSale },
        { registerNozzle: 2, openingReading: 0, closingReading: 0, recordedSale: 0 },
        { registerNozzle: 3, openingReading: 0, closingReading: 0, recordedSale: 0 },
        { registerNozzle: 4, openingReading: 0, closingReading: 0, recordedSale: 0 },
      ]
    });
  }

  Shift.find = (q) => {
    if (q?.status?.$in) shiftQuery = q;
    return {
      sort() { return this; },
      lean: async () => [],
    };
  };

  DailyMeterRegister.find = () => ({
    sort() { return this; },
    lean: async () => meterDocs,
  });
  DailyMeterRegister.findOne = () => ({
    lean: async () => null,
  });

  Mpd.find = () => ({
    sort() { return this; },
    lean: async () => [
      { _id: "111111111111111111111111", mpdNumber: "MPD 1", isActive: true, nozzles: [] },
      { _id: "222222222222222222222222", mpdNumber: "MPD 2", isActive: true, nozzles: [] },
    ],
  });

  Tank.find = () => ({
    sort() { return this; },
    lean: async () => configuredTanks,
  });

  TankCalibration.find = () => ({
    lean: async () => [],
  });

  return () => shiftQuery;
};

const restore = () => {
  Station.findOne = originals.stationFindOne;
  DailyStock.find = originals.stockFind;
  DailyStock.findOne = originals.stockFindOne;
  FuelReceipt.aggregate = originals.receiptAggregate;
  Shift.find = originals.shiftFind;
  DailyMeterRegister.find = originals.meterFind;
  DailyMeterRegister.findOne = originals.meterFindOne;
  Mpd.find = originals.mpdFind;
  Tank.find = originals.tankFind;
  TankCalibration.find = originals.calibrationFind;
};

test("stock API returns configured tank context and preserves stock formulas/finalized sales", async () => {
  const getShiftQuery = stubQueries({
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
    assert.equal(petrol.variationLitres, 3);
    assert.equal(petrol.productDip, 95);
    assert.equal(petrol.actualDipStockLitres, 92);
    assert.equal(petrol.waterDip, 2);
    assert.equal(petrol.waterDipVolumeLitres, 1.5);
    assert.equal(petrol.tankNumber, "P-1");
    assert.equal(petrol.product, "PETROL");
    assert.equal(petrol.capacityLitres, 16000);
    assert.equal(diesel.actualSalesLitres, 7);
    assert.deepEqual(getShiftQuery().status.$in, ["ENDED", "FORCE_CLOSED"]);
    assert.deepEqual(res.body.data.tanks, [{
      _id: "dddddddddddddddddddddddd",
      tankNumber: "P-1",
      product: "PETROL",
      capacityLitres: 16000,
      calibrationPoints: [],
    }]);
  } finally {
    restore();
  }
});

test("missing stock is distinct from an entered zero opening and has no calculated closing", async () => {
  stubQueries({
    stockRows: [{ product: "PETROL", openingStockLitres: 0 }],
    receipts: [],
    sales: [{ petrol: 0 }],
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
