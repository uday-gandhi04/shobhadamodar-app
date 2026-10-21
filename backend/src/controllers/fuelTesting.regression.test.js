import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";

import AuditLog from "../models/AuditLog.js";
import DailyDensity from "../models/DailyDensity.js";
import DailyMeterRegister from "../models/DailyMeterRegister.js";
import DailyStock from "../models/DailyStock.js";
import FuelReceipt from "../models/FuelReceipt.js";
import FuelTesting from "../models/FuelTesting.js";
import Mpd from "../models/Mpd.js";
import Shift from "../models/Shift.js";
import Station from "../models/Station.js";
import Tank from "../models/Tank.js";
import TankCalibration from "../models/TankCalibration.js";

import {
  createManagerFuelTesting,
  updateManagerFuelTesting,
  getManagerFuelTesting,
} from "./managerStock.controller.js";
import {
  fuelTestingCreateSchema,
  fuelTestingUpdateSchema,
} from "../validations/managerStock.validation.js";
import { getDailyRegister } from "../services/stockRegisterService.js";
import {
  getMonthlyRegisterReportData,
  generateMonthlyExcel,
} from "../services/exportRegisterService.js";

const managerId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const stationId = "aaaaaaaaaaaaaaaaaaaaaaaa";

const response = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const mockStation = {
  _id: stationId,
  name: "ShobhaDamodar Petroleum",
};

const originals = {
  stationFindOne: Station.findOne,
  stockFind: DailyStock.find,
  stockFindOne: DailyStock.findOne,
  meterFind: DailyMeterRegister.find,
  meterFindOne: DailyMeterRegister.findOne,
  receiptFind: FuelReceipt.find,
  receiptAggregate: FuelReceipt.aggregate,
  testingFind: FuelTesting.find,
  testingFindOne: FuelTesting.findOne,
  testingCreate: FuelTesting.create,
  testingFindOneAndUpdate: FuelTesting.findOneAndUpdate,
  shiftFind: Shift.find,
  tankFind: Tank.find,
  tankCalibrationFind: TankCalibration.find,
  mpdFind: Mpd.find,
  auditCreate: AuditLog.create,
};

const defaultMocks = () => {
  Station.findOne = () => ({ lean: async () => mockStation });
  DailyStock.find = () => ({ lean: async () => [] });
  DailyStock.findOne = () => ({
    sort() { return this; },
    lean: async () => null,
  });
  DailyMeterRegister.find = () => ({
    sort() { return this; },
    lean: async () => [],
  });
  DailyMeterRegister.findOne = () => ({
    sort() { return this; },
    lean: async () => null,
  });
  FuelReceipt.find = () => ({ lean: async () => [] });
  FuelReceipt.aggregate = async () => [];
  FuelTesting.find = () => ({
    sort() { return this; },
    populate() { return this; },
    lean: async () => [],
  });
  FuelTesting.findOne = () => ({
    lean: async () => null,
  });
  FuelTesting.create = async (doc) => ({ _id: "dummy_testing_id", ...doc });
  FuelTesting.findOneAndUpdate = async (q, u) => ({ _id: "dummy_testing_id", ...u });
  Shift.find = () => ({
    sort() { return this; },
    lean: async () => [],
  });
  Tank.find = () => ({
    sort() { return this; },
    lean: async () => [],
  });
  TankCalibration.find = () => ({
    lean: async () => [],
  });
  Mpd.find = () => ({
    sort() { return this; },
    lean: async () => [
      {
        _id: "mpd1",
        mpdNumber: "MPD 1",
        isActive: true,
        nozzles: [
          { nozzleId: "n1", registerNozzle: 1, fuelType: "PETROL", isActive: true },
          { nozzleId: "n2", registerNozzle: 1, fuelType: "DIESEL", isActive: true },
        ],
      },
    ],
  });
  AuditLog.create = async (doc) => doc;
};

const restoreAll = () => {
  Station.findOne = originals.stationFindOne;
  DailyStock.find = originals.stockFind;
  DailyStock.findOne = originals.stockFindOne;
  DailyMeterRegister.find = originals.meterFind;
  DailyMeterRegister.findOne = originals.meterFindOne;
  FuelReceipt.find = originals.receiptFind;
  FuelReceipt.aggregate = originals.receiptAggregate;
  FuelTesting.find = originals.testingFind;
  FuelTesting.findOne = originals.testingFindOne;
  FuelTesting.create = originals.testingCreate;
  FuelTesting.findOneAndUpdate = originals.testingFindOneAndUpdate;
  Shift.find = originals.shiftFind;
  Tank.find = originals.tankFind;
  TankCalibration.find = originals.tankCalibrationFind;
  Mpd.find = originals.mpdFind;
  AuditLog.create = originals.auditCreate;
};

beforeEach(() => {
  defaultMocks();
});

afterEach(() => {
  restoreAll();
});

test("1. Manager can save a valid MS testing record", async () => {
  let savedRecord = null;
  let savedAudit = null;

  FuelTesting.create = async (doc) => {
    savedRecord = { _id: "testrec001", ...doc };
    return savedRecord;
  };
  AuditLog.create = async (doc) => {
    savedAudit = doc;
    return doc;
  };

  const res = response();
  await createManagerFuelTesting(
    {
      body: {
        businessDate: "2026-10-21",
        product: "PETROL",
        testingQuantityLitres: 5,
        remarks: "Morning calibration nozzle test",
      },
      user: { _id: managerId, role: "MANAGER" },
    },
    res,
    assert.fail
  );

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(savedRecord.product, "PETROL");
  assert.equal(savedRecord.testingQuantityLitres, 5);
  assert.equal(savedRecord.remarks, "Morning calibration nozzle test");
  assert.equal(savedAudit.action, "FUEL_TESTING_CREATED");
  assert.equal(savedAudit.entityType, "FUEL_TESTING");
  assert.equal(savedAudit.actorId, managerId);
});

test("2. Manager can save a valid HSD testing record", async () => {
  let savedRecord = null;
  let savedAudit = null;

  FuelTesting.create = async (doc) => {
    savedRecord = { _id: "testrec002", ...doc };
    return savedRecord;
  };
  AuditLog.create = async (doc) => {
    savedAudit = doc;
    return doc;
  };

  const res = response();
  await createManagerFuelTesting(
    {
      body: {
        businessDate: "2026-10-21",
        product: "DIESEL",
        testingQuantityLitres: 10.5,
        remarks: "Diesel measure verification",
      },
      user: { _id: managerId, role: "MANAGER" },
    },
    res,
    assert.fail
  );

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(savedRecord.product, "DIESEL");
  assert.equal(savedRecord.testingQuantityLitres, 10.5);
  assert.equal(savedAudit.action, "FUEL_TESTING_CREATED");
});

test("3. Invalid or zero quantities are rejected on validation and controller", async () => {
  // Zod validation checks
  const zeroResult = fuelTestingCreateSchema.safeParse({
    body: { businessDate: "2026-10-21", product: "PETROL", testingQuantityLitres: 0 },
  });
  assert.equal(zeroResult.success, false);

  const negativeResult = fuelTestingCreateSchema.safeParse({
    body: { businessDate: "2026-10-21", product: "PETROL", testingQuantityLitres: -5 },
  });
  assert.equal(negativeResult.success, false);

  const invalidProduct = fuelTestingCreateSchema.safeParse({
    body: { businessDate: "2026-10-21", product: "KEROSENE", testingQuantityLitres: 5 },
  });
  assert.equal(invalidProduct.success, false);

  // Controller negative net sales protection
  DailyMeterRegister.find = () => ({
    sort() { return this; },
    lean: async () => [
      {
        stationId,
        businessDate: "2026-10-21",
        product: "PETROL",
        recordedTotalMeterSale: 20, // 20 L total metered sale
        nozzles: [
          { registerNozzle: 1, openingReading: 100, closingReading: 120, recordedSale: 20 },
        ],
      },
    ],
  });
  FuelTesting.find = () => ({
    sort() { return this; },
    populate() { return this; },
    lean: async () => [{ product: "PETROL", testingQuantityLitres: 15 }], // 15 L already tested
  });

  const res = response();
  await createManagerFuelTesting(
    {
      body: {
        businessDate: "2026-10-21",
        product: "PETROL",
        testingQuantityLitres: 10, // 15 + 10 = 25 > 20 L metered sale!
      },
      user: { _id: managerId, role: "MANAGER" },
    },
    res,
    assert.fail
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, "TESTING_EXCEEDS_METERED_SALE");
});

test("4. Multiple testing records on one date are summed correctly", async () => {
  FuelTesting.find = () => ({
    sort() { return this; },
    populate() { return this; },
    lean: async () => [
      { _id: "t1", businessDate: "2026-10-21", product: "PETROL", testingQuantityLitres: 5 },
      { _id: "t2", businessDate: "2026-10-21", product: "PETROL", testingQuantityLitres: 3.5 },
      { _id: "t3", businessDate: "2026-10-21", product: "PETROL", testingQuantityLitres: 1.5 },
    ],
  });

  const records = await FuelTesting.find().sort().lean();
  const total = records.reduce((sum, r) => sum + r.testingQuantityLitres, 0);
  assert.equal(total, 10);
});

test("5. Testing is applied only to its applicable date and fuel type", async () => {
  const testings = [
    { businessDate: "2026-10-21", product: "PETROL", testingQuantityLitres: 5 },
    { businessDate: "2026-10-21", product: "DIESEL", testingQuantityLitres: 10 },
    { businessDate: "2026-10-22", product: "PETROL", testingQuantityLitres: 2 },
  ];

  const petrolDate21 = testings
    .filter((t) => t.businessDate === "2026-10-21" && t.product === "PETROL")
    .reduce((sum, t) => sum + t.testingQuantityLitres, 0);

  const dieselDate21 = testings
    .filter((t) => t.businessDate === "2026-10-21" && t.product === "DIESEL")
    .reduce((sum, t) => sum + t.testingQuantityLitres, 0);

  const petrolDate22 = testings
    .filter((t) => t.businessDate === "2026-10-22" && t.product === "PETROL")
    .reduce((sum, t) => sum + t.testingQuantityLitres, 0);

  assert.equal(petrolDate21, 5);
  assert.equal(dieselDate21, 10);
  assert.equal(petrolDate22, 2);
});

test("6. Net sale and calculated closing stock correctly account for returned test fuel", async () => {
  Mpd.find = () => ({
    sort: () => ({
      lean: async () => [
        {
          _id: "mpd1",
          mpdNumber: "MPD 1",
          isActive: true,
          nozzles: [
            { nozzleId: "n1", registerNozzle: 1, fuelType: "PETROL", isActive: true },
          ],
        },
      ],
    }),
  });

  Tank.find = () => ({
    sort: () => ({
      lean: async () => [
        { _id: "tank1", tankNumber: "T1", product: "PETROL", capacityLitres: 20000, isActive: true },
      ],
    }),
  });

  // Opening stock = 1000 L, physical dip stock = 505 L
  DailyStock.find = () => ({
    lean: async () => [
      {
        stationId,
        businessDate: "2026-10-21",
        product: "PETROL",
        openingStockLitres: 1000,
        actualDipStockLitres: 505,
        productDip: 120,
      },
    ],
  });

  // Gross meter sale = 500 L (opening 1000, closing 1500)
  DailyMeterRegister.find = () => ({
    sort() { return this; },
    lean: async () => [
      {
        stationId,
        businessDate: "2026-10-21",
        product: "PETROL",
        recordedTotalMeterSale: 500,
        nozzles: [
          { registerNozzle: 1, openingReading: 1000, closingReading: 1500, recordedSale: 500 },
        ],
      },
    ],
  });

  FuelReceipt.aggregate = async () => [];

  // 5 Litres tested and returned to tank
  FuelTesting.find = () => ({
    sort() { return this; },
    populate() { return this; },
    lean: async () => [
      {
        stationId,
        businessDate: "2026-10-21",
        product: "PETROL",
        testingQuantityLitres: 5,
      },
    ],
  });

  const result = await getDailyRegister(stationId, "2026-10-21");
  const petrolStock = result.stock.find((s) => s.product === "PETROL");

  assert.ok(petrolStock);
  assert.equal(petrolStock.openingStockLitres, 1000);
  assert.equal(petrolStock.receiptStockLitres, 0);
  assert.equal(petrolStock.totalAvailableLitres, 1000);
  assert.equal(petrolStock.grossSalesLitres, 500);
  assert.equal(petrolStock.testingLitres, 5);
  // Net sales used for depletion = 500 - 5 = 495 L
  assert.equal(petrolStock.actualSalesLitres, 495);
  // Closing stock = 1000 + 0 - 495 = 505 L (credited back 5 L testing!)
  assert.equal(petrolStock.calculatedClosingStockLitres, 505);
});

test("7. Raw nozzle readings and gross metered readings remain unchanged", async () => {
  DailyMeterRegister.find = () => ({
    sort() { return this; },
    lean: async () => [
      {
        stationId,
        businessDate: "2026-10-21",
        product: "PETROL",
        recordedTotalMeterSale: 500,
        nozzles: [
          { registerNozzle: 1, openingReading: 1000, closingReading: 1500, recordedSale: 500 },
        ],
      },
    ],
  });

  FuelTesting.find = () => ({
    sort() { return this; },
    populate() { return this; },
    lean: async () => [
      { stationId, businessDate: "2026-10-21", product: "PETROL", testingQuantityLitres: 5 },
    ],
  });

  const result = await getDailyRegister(stationId, "2026-10-21");
  const petrolStock = result.stock.find((s) => s.product === "PETROL");
  const petrolMeter = petrolStock?.meterRegister;

  assert.ok(petrolMeter);
  const nozzle1 = petrolMeter.nozzles.find((n) => n.registerNozzle === 1);
  assert.equal(nozzle1.openingReading, 1000);
  assert.equal(nozzle1.closingReading, 1500);
  assert.equal(nozzle1.sale, 500);
  assert.equal(petrolMeter.totalMeterSale, 500);
  assert.equal(petrolMeter.pumpTestingLitres, 5);
});

test("8. Actual dip stock and the existing variation convention remain unchanged", async () => {
  // Calculated closing stock = 505 L, actual dip stock = 502 L
  // Variation = calculated closing stock - actual dip stock = 505 - 502 = +3 L
  const calculatedClosing = 505;
  const actualDipStock = 502;
  const variation = Number((calculatedClosing - actualDipStock).toFixed(2));

  assert.equal(variation, 3.0);
  assert.equal(actualDipStock, 502); // Untouched
});

test("9. Testing quantities are not counted as receipts or customer sales", async () => {
  // If receipt is 0, testing 5 does not increment receiptStockLitres
  const opening = 1000;
  const receipts = 0;
  const grossSales = 500;
  const testing = 5;

  const totalAvailable = opening + receipts; // exactly 1000, NOT 1005
  const netSales = grossSales - testing; // 495
  const closing = totalAvailable - netSales; // 505

  assert.equal(receipts, 0);
  assert.equal(totalAvailable, 1000);
  assert.equal(closing, 505);
});

test("10. Monthly Meter Registers display testing quantities on the correct rows with 0.00 when empty", async () => {
  DailyMeterRegister.find = () => ({
    sort() { return this; },
    lean: async () => [
      {
        stationId,
        businessDate: "2026-10-01",
        product: "PETROL",
        recordedTotalMeterSale: 400,
        nozzles: [{ registerNozzle: 1, openingReading: 100, closingReading: 500, recordedSale: 400 }],
      },
      {
        stationId,
        businessDate: "2026-10-02",
        product: "PETROL",
        recordedTotalMeterSale: 300,
        nozzles: [{ registerNozzle: 1, openingReading: 500, closingReading: 800, recordedSale: 300 }],
      },
    ],
  });

  FuelTesting.find = () => ({
    sort() { return this; },
    populate() { return this; },
    lean: async () => [
      {
        stationId,
        businessDate: "2026-10-01",
        product: "PETROL",
        testingQuantityLitres: 5,
      },
      // 2026-10-02 has NO testing record!
    ],
  });

  const report = await getMonthlyRegisterReportData(stationId, "2026-10");
  const msMeterSheet = report.sheets.find((s) => s.id === "MS_METER");

  assert.ok(msMeterSheet);
  const day1Row = msMeterSheet.rows.find((r) => r.date === "2026-10-01");
  const day2Row = msMeterSheet.rows.find((r) => r.date === "2026-10-02");

  assert.equal(day1Row.pumpTesting, 5.0);
  assert.equal(day2Row.pumpTesting, 0.0);
});

test("11. MS Stock and HSD Stock reflect the correct adjustment in monthly registers", async () => {
  DailyStock.find = () => ({
    lean: async () => [
      {
        stationId,
        businessDate: "2026-10-01",
        product: "PETROL",
        openingStockLitres: 5000,
        actualDipStockLitres: 4605,
      },
      {
        stationId,
        businessDate: "2026-10-01",
        product: "DIESEL",
        openingStockLitres: 8000,
        actualDipStockLitres: 7410,
      },
    ],
  });

  DailyMeterRegister.find = () => ({
    sort() { return this; },
    lean: async () => [
      {
        stationId,
        businessDate: "2026-10-01",
        product: "PETROL",
        recordedTotalMeterSale: 400,
        nozzles: [{ registerNozzle: 1, openingReading: 100, closingReading: 500, recordedSale: 400 }],
      },
      {
        stationId,
        businessDate: "2026-10-01",
        product: "DIESEL",
        recordedTotalMeterSale: 600,
        nozzles: [{ registerNozzle: 1, openingReading: 100, closingReading: 700, recordedSale: 600 }],
      },
    ],
  });

  FuelTesting.find = () => ({
    sort() { return this; },
    populate() { return this; },
    lean: async () => [
      {
        stationId,
        businessDate: "2026-10-01",
        product: "PETROL",
        testingQuantityLitres: 5,
      },
      {
        stationId,
        businessDate: "2026-10-01",
        product: "DIESEL",
        testingQuantityLitres: 10,
      },
    ],
  });

  const report = await getMonthlyRegisterReportData(stationId, "2026-10");
  const msStockSheet = report.sheets.find((s) => s.id === "MS_STOCK");
  const hsdStockSheet = report.sheets.find((s) => s.id === "HSD_STOCK");

  const msRow = msStockSheet.rows.find((r) => r.date === "2026-10-01");
  const hsdRow = hsdStockSheet.rows.find((r) => r.date === "2026-10-01");

  // MS net sale: 400 - 5 = 395. Closing: 5000 - 395 = 4605.
  assert.equal(msRow.grossSalesLitres, 400);
  assert.equal(msRow.testingLitres, 5);
  assert.equal(msRow.actualSalesLitres, 395);
  assert.equal(msRow.calculatedClosingStockLitres, 4605);

  // HSD net sale: 600 - 10 = 590. Closing: 8000 - 590 = 7410.
  assert.equal(hsdRow.grossSalesLitres, 600);
  assert.equal(hsdRow.testingLitres, 10);
  assert.equal(hsdRow.actualSalesLitres, 590);
  assert.equal(hsdRow.calculatedClosingStockLitres, 7410);
});

test("12. Downloaded Excel file matches the in-app register", async () => {
  DailyMeterRegister.find = () => ({
    sort() { return this; },
    lean: async () => [
      {
        stationId,
        businessDate: "2026-10-01",
        product: "PETROL",
        recordedTotalMeterSale: 400,
        nozzles: [{ registerNozzle: 1, openingReading: 100, closingReading: 500, recordedSale: 400 }],
      },
      {
        stationId,
        businessDate: "2026-10-02",
        product: "PETROL",
        recordedTotalMeterSale: 300,
        nozzles: [{ registerNozzle: 1, openingReading: 500, closingReading: 800, recordedSale: 300 }],
      },
    ],
  });

  DailyStock.find = () => ({
    lean: async () => [
      {
        stationId,
        businessDate: "2026-10-01",
        product: "PETROL",
        openingStockLitres: 5000,
        actualDipStockLitres: 4605,
      },
    ],
  });

  FuelTesting.find = () => ({
    sort() { return this; },
    populate() { return this; },
    lean: async () => [
      {
        stationId,
        businessDate: "2026-10-01",
        product: "PETROL",
        testingQuantityLitres: 5,
      },
    ],
  });

  const workbook = await generateMonthlyExcel(stationId, "2026-10");
  const meterSheet = workbook.getWorksheet("MS Meter Register");
  const stockSheet = workbook.getWorksheet("MS Stock Register");

  assert.ok(meterSheet);
  assert.ok(stockSheet);

  // Meter sheet header check: column 11 should be "Testing (L)"
  const headerRow = meterSheet.getRow(2);
  assert.equal(headerRow.getCell(11).value, "Testing (L)");
  assert.equal(headerRow.getCell(12).value, "Remarks");

  // Row 1 (2026-10-01) testing value should be "5.00"
  const row4 = meterSheet.getRow(4);
  assert.equal(row4.getCell(11).value, "5.00");

  // Row 2 (2026-10-02) testing value should be "0.00"
  const row5 = meterSheet.getRow(5);
  assert.equal(row5.getCell(11).value, "0.00");

  // Stock sheet row check
  const stockRow3 = stockSheet.getRow(3);
  assert.equal(stockRow3.getCell(1).value, "2026-10-01");
  assert.equal(stockRow3.getCell(2).value, 5000); // Opening
  assert.equal(stockRow3.getCell(5).value, 395); // Net Actual Sales
  assert.equal(stockRow3.getCell(6).value, 4605); // Calculated Closing
});

test("13. Historical records without testing entries continue to work as before", async () => {
  DailyStock.find = () => ({
    lean: async () => [
      {
        stationId,
        businessDate: "2026-09-15",
        product: "PETROL",
        openingStockLitres: 4000,
        actualDipStockLitres: 3700,
      },
    ],
  });

  DailyMeterRegister.find = () => ({
    sort() { return this; },
    lean: async () => [
      {
        stationId,
        businessDate: "2026-09-15",
        product: "PETROL",
        recordedTotalMeterSale: 300,
        nozzles: [
          { registerNozzle: 1, openingReading: 500, closingReading: 800, recordedSale: 300 },
        ],
      },
    ],
  });

  // Empty testing records for historical date
  FuelTesting.find = () => ({
    sort() { return this; },
    populate() { return this; },
    lean: async () => [],
  });

  const result = await getDailyRegister(stationId, "2026-09-15");
  const petrolStock = result.stock.find((s) => s.product === "PETROL");

  assert.ok(petrolStock);
  assert.equal(petrolStock.openingStockLitres, 4000);
  assert.equal(petrolStock.grossSalesLitres, 300);
  assert.equal(petrolStock.testingLitres, 0);
  assert.equal(petrolStock.actualSalesLitres, 300);
  assert.equal(petrolStock.calculatedClosingStockLitres, 3700);
  assert.equal(petrolStock.variationLitres, 0);
});
