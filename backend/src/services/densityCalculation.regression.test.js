import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  convertHydrometerToDensity15,
  getDensityCalculationDetails,
  getChartMetadata,
  getTableBounds,
} from "./densityCalculationService.js";
import {
  upsertManagerDensity,
  createManagerReceipt,
  getDensityConversionPreview,
} from "../controllers/managerStock.controller.js";
import DailyDensity from "../models/DailyDensity.js";
import FuelReceipt from "../models/FuelReceipt.js";
import Station from "../models/Station.js";
import AuditLog from "../models/AuditLog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("OFFICIAL DATA: converted dataset matches official ASTM Table 53B (1980) axes, units, and bounds", () => {
  const meta = getChartMetadata();
  assert.equal(meta.standard, "ASTM Table 53B");
  assert.equal(meta.edition, "1980");
  assert.equal(meta.sourceWorkbook, "DENSITY CONVERSION CHART.xlsx");
  assert.equal(meta.hydrometerUnit, "kg/m³");
  assert.equal(meta.temperatureUnit, "°C");
  assert.equal(meta.densityUnit, "kg/m³ at 15°C");

  const bounds = getTableBounds();
  assert.equal(bounds.minHydrometer, 670);
  assert.equal(bounds.maxHydrometer, 922);
  assert.equal(bounds.hydrometerStep, 1.0);
  assert.equal(bounds.minTemperature, 0.0);
  assert.equal(bounds.maxTemperature, 50.0);
  assert.equal(bounds.temperatureStep, 0.5);

  assert.equal(bounds.hydrometerCount, 253);
  assert.equal(bounds.temperatureCount, 101);
});

test("OFFICIAL DATA: reference example 745 kg/m³ at 25°C returns exactly 753.8 kg/m³", () => {
  const result = convertHydrometerToDensity15(745, 25);
  assert.equal(result, 753.8);

  const details = getDensityCalculationDetails(745, 25);
  assert.equal(details.isValid, true);
  assert.equal(details.density15, 753.8);
  assert.equal(details.method, "EXACT_LOOKUP");
});

test("OFFICIAL DATA: exact grid points return authoritative table values", () => {
  // At 15°C standard temperature, density correction is identity
  assert.equal(convertHydrometerToDensity15(700, 15.0), 700.0);
  assert.equal(convertHydrometerToDensity15(750, 15.0), 750.0);
  assert.equal(convertHydrometerToDensity15(800, 15.0), 800.0);
  assert.equal(convertHydrometerToDensity15(850, 15.0), 850.0);

  // Exact lookups at boundary temperatures
  const atZero = convertHydrometerToDensity15(750, 0.0);
  assert.ok(atZero < 750, "At 0°C, observed reading 750 expands when warmed to 15°C, so density at 15°C is lower than 750");
  assert.equal(typeof atZero, "number");

  // Exact lookup at high temperature 40°C
  const atForty = convertHydrometerToDensity15(750, 40.0);
  assert.ok(typeof atForty === "number");
});

test("INTERPOLATION: intermediate hydrometer reading interpolates linearly between table columns", () => {
  const d745 = convertHydrometerToDensity15(745, 25.0); // 753.8
  const d746 = convertHydrometerToDensity15(746, 25.0); // 754.8
  const dMid = convertHydrometerToDensity15(745.5, 25.0);

  assert.ok(dMid >= d745 && dMid <= d746);
  assert.equal(dMid, Number(((d745 + d746) / 2).toFixed(1)));

  const details = getDensityCalculationDetails(745.5, 25.0);
  assert.equal(details.method, "LINEAR_INTERPOLATION");
});

test("INTERPOLATION: intermediate temperature interpolates linearly between table rows", () => {
  const t25_0 = convertHydrometerToDensity15(745, 25.0); // 753.8
  const t25_5 = convertHydrometerToDensity15(745, 25.5); // 754.3
  const tMid = convertHydrometerToDensity15(745, 25.25);

  assert.ok(tMid >= t25_0 && tMid <= t25_5);
  assert.equal(tMid, Number(((t25_0 + t25_5) / 2).toFixed(1)));

  const details = getDensityCalculationDetails(745, 25.25);
  assert.equal(details.method, "LINEAR_INTERPOLATION");
});

test("INTERPOLATION: combined intermediate inputs use bilinear interpolation", () => {
  const details = getDensityCalculationDetails(745.5, 25.25);
  assert.equal(details.isValid, true);
  assert.equal(details.method, "BILINEAR_INTERPOLATION");
  assert.ok(details.density15 >= 753.8 && details.density15 <= 755.5);
});

test("INTERPOLATION: out-of-range inputs are rejected and never extrapolated", () => {
  // Below minimum hydrometer (670)
  assert.equal(convertHydrometerToDensity15(669.9, 25.0), null);
  const belowHyd = getDensityCalculationDetails(669.9, 25.0);
  assert.equal(belowHyd.isValid, false);
  assert.ok(belowHyd.error.includes("670"));

  // Above maximum hydrometer (922)
  assert.equal(convertHydrometerToDensity15(922.1, 25.0), null);
  const aboveHyd = getDensityCalculationDetails(922.1, 25.0);
  assert.equal(aboveHyd.isValid, false);
  assert.ok(aboveHyd.error.includes("922"));

  // Below minimum temperature (0.0)
  assert.equal(convertHydrometerToDensity15(745, -0.5), null);
  const belowTemp = getDensityCalculationDetails(745, -0.5);
  assert.equal(belowTemp.isValid, false);
  assert.ok(belowTemp.error.includes("0"));

  // Above maximum temperature (50.0)
  assert.equal(convertHydrometerToDensity15(745, 50.5), null);
  const aboveTemp = getDensityCalculationDetails(745, 50.5);
  assert.equal(aboveTemp.isValid, false);
  assert.ok(aboveTemp.error.includes("50"));
});

test("INTERPOLATION: missing or non-finite inputs never produce a fake zero result", () => {
  assert.equal(convertHydrometerToDensity15(null, 25), null);
  assert.equal(convertHydrometerToDensity15(745, null), null);
  assert.equal(convertHydrometerToDensity15(undefined, 25), null);
  assert.equal(convertHydrometerToDensity15(NaN, 25), null);
  assert.equal(convertHydrometerToDensity15(745, Infinity), null);
  assert.equal(convertHydrometerToDensity15("abc", 25), null);

  const missingDetails = getDensityCalculationDetails(null, 25);
  assert.equal(missingDetails.isValid, false);
  assert.notEqual(missingDetails.density15, 0);
});

test("DAILY DENSITY: server calculates density15 from hydrometer and temperature, ignoring tampered client values", async () => {
  const stationId = "000000000000000000000001";
  const managerId = "000000000000000000000002";
  const entityId = "000000000000000000000003";

  const origStation = Station.findOne;
  const origFindOne = DailyDensity.findOne;
  const origFindOneAndUpdate = DailyDensity.findOneAndUpdate;
  const origAudit = AuditLog.create;

  let capturedAudit = null;
  let savedDoc = null;

  Station.findOne = () => ({ lean: async () => ({ _id: stationId }) });
  DailyDensity.findOne = () => ({ lean: async () => null });
  DailyDensity.findOneAndUpdate = async (_filter, update) => {
    savedDoc = { _id: entityId, ...update.$set, ...update.$setOnInsert };
    return savedDoc;
  };
  AuditLog.create = async (doc) => { capturedAudit = doc; return doc; };

  try {
    const res = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(data) { this.body = data; return this; },
    };

    // Client attempts to tamper with density15: 999.99
    await upsertManagerDensity(
      {
        body: {
          businessDate: "2026-10-15",
          product: "PETROL",
          hydrometerReading: 745,
          temperatureC: 25.0,
          density15: 999.99, // Tampered client value!
        },
        user: { _id: managerId, role: "MANAGER" },
      },
      res,
      assert.fail,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    // Verified authoritative conversion: 753.8, NOT 999.99
    assert.equal(savedDoc.density15, 753.8);
    assert.equal(res.body.data.density15, 753.8);
    assert.equal(capturedAudit.action, "DENSITY_UPSERTED");
    assert.equal(capturedAudit.metadata.product, "PETROL");
  } finally {
    Station.findOne = origStation;
    DailyDensity.findOne = origFindOne;
    DailyDensity.findOneAndUpdate = origFindOneAndUpdate;
    AuditLog.create = origAudit;
  }
});

test("DAILY DENSITY: out-of-range hydrometer or temperature returns 400 Bad Request", async () => {
  const stationId = "000000000000000000000001";
  const managerId = "000000000000000000000002";

  const origStation = Station.findOne;
  Station.findOne = () => ({ lean: async () => ({ _id: stationId }) });

  try {
    const res = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(data) { this.body = data; return this; },
    };

    await upsertManagerDensity(
      {
        body: {
          businessDate: "2026-10-15",
          product: "PETROL",
          hydrometerReading: 500, // Invalid: below 670
          temperatureC: 25.0,
        },
        user: { _id: managerId, role: "MANAGER" },
      },
      res,
      assert.fail,
    );

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes("670"));
  } finally {
    Station.findOne = origStation;
  }
});

test("FUEL RECEIPTS: derives beforeDensity15 and afterDensity15, enforces sign convention (Observed - Challan), and ignores tampered client values", async () => {
  const stationId = "000000000000000000000001";
  const managerId = "000000000000000000000002";
  const entityId = "000000000000000000000004";

  const origStation = Station.findOne;
  const origCreate = FuelReceipt.create;
  const origAudit = AuditLog.create;

  let createdReceipt = null;

  Station.findOne = () => ({ lean: async () => ({ _id: stationId }) });
  FuelReceipt.create = async (doc) => {
    createdReceipt = { _id: entityId, ...doc };
    return createdReceipt;
  };
  AuditLog.create = async (doc) => doc;

  try {
    const res = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(data) { this.body = data; return this; },
    };

    await createManagerReceipt(
      {
        body: {
          businessDate: "2026-10-15",
          product: "PETROL",
          invoiceNumber: "INV-100",
          quantityLitres: 10000,
          supplierName: "HPCL",
          tankerNumber: "MH-12-AB-1234",
          // Before decantation: 745 at 25°C => 753.8
          beforeHydrometer: 745,
          beforeTemperatureC: 25,
          beforeDensity15: 888.88, // Tampered client value!
          challanDensity15: 753.0,
          beforeDensityDifference: 999.99, // Tampered client value!

          // After decantation: 746 at 25°C => 754.7
          afterHydrometer: 746,
          afterTemperatureC: 25,
          afterDensity15: 777.77, // Tampered client value!
          afterChallanDensity15: 753.5,
          afterDensityDifference: -999.99, // Tampered client value!
        },
        user: { _id: managerId, role: "MANAGER" },
      },
      res,
      assert.fail,
    );

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);

    // Before density verified
    assert.equal(createdReceipt.beforeDensity15, 753.8);
    // Established sign convention: Observed (753.8) - Challan (753.0) = 0.8
    assert.equal(createdReceipt.beforeDensityDifference, 0.8);

    // After density verified
    assert.equal(createdReceipt.afterDensity15, 754.8);
    // Established sign convention: Observed (754.8) - Challan (753.5) = 1.3
    assert.equal(createdReceipt.afterDensityDifference, 1.3);
  } finally {
    Station.findOne = origStation;
    FuelReceipt.create = origCreate;
    AuditLog.create = origAudit;
  }
});

test("FUEL RECEIPTS: missing before or after observations produce null derived fields", async () => {
  const stationId = "000000000000000000000001";
  const managerId = "000000000000000000000002";
  const entityId = "000000000000000000000005";

  const origStation = Station.findOne;
  const origCreate = FuelReceipt.create;
  const origAudit = AuditLog.create;

  let createdReceipt = null;

  Station.findOne = () => ({ lean: async () => ({ _id: stationId }) });
  FuelReceipt.create = async (doc) => {
    createdReceipt = { _id: entityId, ...doc };
    return createdReceipt;
  };
  AuditLog.create = async (doc) => doc;

  try {
    const res = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(data) { this.body = data; return this; },
    };

    await createManagerReceipt(
      {
        body: {
          businessDate: "2026-10-15",
          product: "DIESEL",
          invoiceNumber: "INV-101",
          quantityLitres: 5000,
          // No density readings entered
          beforeHydrometer: null,
          beforeTemperatureC: null,
          challanDensity15: 830.0,
        },
        user: { _id: managerId, role: "MANAGER" },
      },
      res,
      assert.fail,
    );

    assert.equal(res.statusCode, 201);
    assert.equal(createdReceipt.beforeDensity15, null);
    assert.equal(createdReceipt.beforeDensityDifference, null);
    assert.equal(createdReceipt.afterDensity15, null);
    assert.equal(createdReceipt.afterDensityDifference, null);
    assert.equal(createdReceipt.challanDensity15, 830.0);
  } finally {
    Station.findOne = origStation;
    FuelReceipt.create = origCreate;
    AuditLog.create = origAudit;
  }
});

test("CONVERSION PREVIEW ENDPOINT: returns correct calculation details via GET /stock/density/convert", async () => {
  const req = {
    query: { hydrometer: "745", temperature: "25" },
  };
  const res = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(data) { this.body = data; return this; },
  };

  await getDensityConversionPreview(req, res, assert.fail);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.density15, 753.8);
  assert.equal(res.body.data.method, "EXACT_LOOKUP");
});

test("LOCALIZATION: en.json, hi.json, and mr.json locale files are valid JSON", () => {
  const localesDir = path.resolve(__dirname, "../../../frontend/src/locales");
  for (const locale of ["en.json", "hi.json", "mr.json"]) {
    const filePath = path.join(localesDir, locale);
    assert.ok(fs.existsSync(filePath), `${locale} should exist`);
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    assert.ok(parsed && typeof parsed === "object", `${locale} should parse to an object`);
    assert.ok(parsed.manager?.stockLabels?.dailyDensity, `${locale} should have dailyDensity`);
  }
});

test("OFFICIAL WORKBOOK: validates generated dataset against source Excel workbook cells", async () => {
  const workbookPath = path.resolve(__dirname, "../../data/density/DENSITY CONVERSION CHART.xlsx");
  if (!fs.existsSync(workbookPath)) {
    return;
  }
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const sheet = workbook.getWorksheet("Density-ASTM 1980");
  assert.ok(sheet, "Density-ASTM 1980 sheet must exist");

  // Reference example: 745 at 25°C
  // Row 6: hydrometers (Col 2 is 670, so Col 2 + (745-670) = Col 77)
  // Row 57: Temp 25.0°C (Row 7 is 0.0°C, step 0.5 => Row 7 + 25*2 = Row 57)
  const cellVal_745_25 = sheet.getRow(57).getCell(77).value;
  assert.equal(Number(cellVal_745_25), 753.8);
  assert.equal(convertHydrometerToDensity15(745, 25.0), 753.8);

  // Spot check: 700 at 15.0°C (Col 32, Row 37)
  const cellVal_700_15 = sheet.getRow(37).getCell(32).value;
  assert.equal(Number(cellVal_700_15), 700.0);
  assert.equal(convertHydrometerToDensity15(700, 15.0), 700.0);

  // Spot check: 800 at 30.0°C (Col 132, Row 67)
  const cellVal_800_30 = sheet.getRow(67).getCell(132).value;
  assert.equal(convertHydrometerToDensity15(800, 30.0), Number(cellVal_800_30));
});

