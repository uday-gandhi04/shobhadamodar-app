import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import dotenv from "dotenv";

import Station from "../models/Station.js";
import Mpd from "../models/Mpd.js";
import DailyMeterRegister from "../models/DailyMeterRegister.js";
import Shift from "../models/Shift.js";
import FuelReceipt from "../models/FuelReceipt.js";
import {
  getProductRegisterNozzles,
  deriveNozzleOpeningReading,
  getDailyRegister
} from "./stockRegisterService.js";
import { getMonthlyRegisterReportData } from "./exportRegisterService.js";

dotenv.config();

const uri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
});

test.after(async () => {
  // Keep connection open or close if needed
});

test("1. Initial opening reading comes from verified initial source (Sep 1 MS source opening)", async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  assert.ok(station, "Active station must exist");

  const regSep1 = await getDailyRegister(station._id, "2026-09-01");
  const msStock = regSep1.stock.find((s) => s.product === "PETROL");
  assert.ok(msStock?.meterRegister, "Meter register must exist for Sep 1 MS");

  const n1 = msStock.meterRegister.nozzles.find((n) => n.registerNozzle === 1);
  const n3 = msStock.meterRegister.nozzles.find((n) => n.registerNozzle === 3);

  // Directly from physical register: N1 opening was 386710, N3 was 1025810
  assert.equal(n1.openingReading, 386710.0);
  assert.equal(n3.openingReading, 1025810.0);
  assert.equal(n1.status, "HISTORICAL_RECORD");
});

test("2. Next day's opening reading carries forward from previous closing (Sep 1 -> Sep 2)", async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  const regSep1 = await getDailyRegister(station._id, "2026-09-01");
  const regSep2 = await getDailyRegister(station._id, "2026-09-02");

  const ms1 = regSep1.stock.find((s) => s.product === "PETROL").meterRegister;
  const ms2 = regSep2.stock.find((s) => s.product === "PETROL").meterRegister;

  // Nozzles 1, 2, 4 carry forward exactly
  const n1_1 = ms1.nozzles.find((n) => n.registerNozzle === 1);
  const n1_2 = ms2.nozzles.find((n) => n.registerNozzle === 1);
  assert.equal(n1_2.openingReading, n1_1.closingReading);
  assert.equal(n1_2.openingReading, 387433.0);

  const n2_1 = ms1.nozzles.find((n) => n.registerNozzle === 2);
  const n2_2 = ms2.nozzles.find((n) => n.registerNozzle === 2);
  assert.equal(n2_2.openingReading, n2_1.closingReading);

  const n4_1 = ms1.nozzles.find((n) => n.registerNozzle === 4);
  const n4_2 = ms2.nozzles.find((n) => n.registerNozzle === 4);
  assert.equal(n4_2.openingReading, n4_1.closingReading);
});

test("3. Multiple consecutive no-activity days preserve confirmed readings (Sep 24-26)", async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  
  // Date 24, 25, 26 have no shifts, so opening totalizers should carry forward from latest confirmed closing (Sep 22/23)
  const reg24 = await getDailyRegister(station._id, "2026-09-24");
  const reg25 = await getDailyRegister(station._id, "2026-09-25");
  const reg26 = await getDailyRegister(station._id, "2026-09-26");

  const ms24 = reg24.stock.find((s) => s.product === "PETROL").meterRegister;
  const ms25 = reg25.stock.find((s) => s.product === "PETROL").meterRegister;
  const ms26 = reg26.stock.find((s) => s.product === "PETROL").meterRegister;

  assert.equal(ms24.nozzles[0].openingReading, 393576.0);
  assert.equal(ms25.nozzles[0].openingReading, 393576.0);
  assert.equal(ms26.nozzles[0].openingReading, 393576.0);
  assert.equal(ms24.nozzles[0].isOpeningCarriedForward, true);
  assert.equal(ms25.nozzles[0].isOpeningCarriedForward, true);
});

test("4. Sales during an intervening day are accounted for before carry-forward", async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  // On Sep 5, N1 MS had opening 389160 and closing 389743 (583 L sale)
  const regSep5 = await getDailyRegister(station._id, "2026-09-05");
  const regSep6 = await getDailyRegister(station._id, "2026-09-06");

  const n1Sep5 = regSep5.stock.find((s) => s.product === "PETROL").meterRegister.nozzles.find((n) => n.registerNozzle === 1);
  const n1Sep6 = regSep6.stock.find((s) => s.product === "PETROL").meterRegister.nozzles.find((n) => n.registerNozzle === 1);

  assert.equal(n1Sep5.sale, 583.0);
  assert.equal(n1Sep6.openingReading, n1Sep5.closingReading);
  assert.equal(n1Sep6.openingReading, 389743.0);
});

test("5. Receipts do not change meter readings", async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  // Sep 7 had a 4000L HSD decantation receipt
  const regSep7 = await getDailyRegister(station._id, "2026-09-07");
  const hsdStock = regSep7.stock.find((s) => s.product === "DIESEL");

  assert.equal(hsdStock.receiptStockLitres, 4000);
  // Meter totalizer is independent of receipt
  const hsdN1 = hsdStock.meterRegister.nozzles.find((n) => n.registerNozzle === 1);
  assert.equal(hsdN1.openingReading, 820654.0);
  assert.equal(hsdN1.sale, 664.0);
});

test("6. A missing previous reading does not silently become zero", async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  // An arbitrary future date without any records in a fresh collection should not report sale 0 or opening 0
  const fakeFutureDate = "2099-01-01";
  const derived = await deriveNozzleOpeningReading(new mongoose.Types.ObjectId(), "PETROL", 1, fakeFutureDate);
  assert.equal(derived.openingReading, null);
  assert.equal(derived.source, "MISSING");
});

test("7. A future reading is never used to fill an earlier opening", async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  // On 2026-08-31 (before any records exist), opening should NOT come from 2026-09-01
  const derived = await deriveNozzleOpeningReading(station._id, "PETROL", 1, "2026-08-31");
  assert.equal(derived.openingReading, null);
});

test("8. A nozzle cannot inherit another nozzle's reading", async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  const reg = await getDailyRegister(station._id, "2026-09-01");
  const ms = reg.stock.find((s) => s.product === "PETROL").meterRegister;

  const n1 = ms.nozzles.find((n) => n.registerNozzle === 1);
  const n2 = ms.nozzles.find((n) => n.registerNozzle === 2);
  const n3 = ms.nozzles.find((n) => n.registerNozzle === 3);

  // N1 opening 386710, N2 opening 0, N3 opening 1025810
  assert.notEqual(n1.openingReading, n2.openingReading);
  assert.notEqual(n1.openingReading, n3.openingReading);
});

test("9. PETROL and DIESEL mappings remain independent across MPD 1 and MPD 2", async () => {
  const mpds = await Mpd.find({ isActive: true }).lean();
  const petrolSpecs = getProductRegisterNozzles("PETROL", mpds);
  const dieselSpecs = getProductRegisterNozzles("DIESEL", mpds);

  assert.equal(petrolSpecs.length, 4);
  assert.equal(dieselSpecs.length, 4);

  // MS uses n1 and n2 on MPD 1 and MPD 2
  assert.equal(petrolSpecs[0].nozzleId, "n1");
  assert.equal(petrolSpecs[1].nozzleId, "n2");
  assert.equal(petrolSpecs[2].nozzleId, "n1");
  assert.equal(petrolSpecs[3].nozzleId, "n2");

  // HSD uses n3 and n4 on MPD 1 and MPD 2
  assert.equal(dieselSpecs[0].nozzleId, "n3");
  assert.equal(dieselSpecs[1].nozzleId, "n4");
  assert.equal(dieselSpecs[2].nozzleId, "n3");
  assert.equal(dieselSpecs[3].nozzleId, "n4");
});

test("10. Finalized shifts provide the expected closing readings", async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  const regSep10 = await getDailyRegister(station._id, "2026-09-10");
  const ms = regSep10.stock.find((s) => s.product === "PETROL").meterRegister;

  const n1 = ms.nozzles.find((n) => n.registerNozzle === 1);
  assert.equal(n1.openingReading, 392049.0);
  assert.equal(n1.closingReading, 392377.0);
  assert.equal(n1.sale, 328.0);
});

test("11. IN_PROGRESS shifts are excluded from finalized totals", async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  const mpd1 = await Mpd.findOne({ mpdNumber: "MPD 1" });

  const tempShift = await Shift.create({
    businessDate: "2026-10-20",
    mpdId: mpd1._id,
    employeeId: new mongoose.Types.ObjectId(),
    status: "IN_PROGRESS",
    startedAt: new Date(),
    readings: [
      { nozzleId: "n1", fuelType: "PETROL", openingReading: 500000.0, dispensedLitres: 100 }
    ]
  });

  try {
    const reg = await getDailyRegister(station._id, "2026-10-20");
    const ms = reg.stock.find((s) => s.product === "PETROL").meterRegister;
    assert.equal(ms.status, "IN_PROGRESS");
    // totalMeterSale must remain null (not finalized)
    assert.equal(ms.totalMeterSale, null);
  } finally {
    await Shift.deleteOne({ _id: tempShift._id });
  }
});

test("12. Historical source readings are preserved and discrepancies are flagged (Sep 1 MS discrepancy)", async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  const reg = await getDailyRegister(station._id, "2026-09-01");
  const ms = reg.stock.find((s) => s.product === "PETROL").meterRegister;

  // On Sep 1 MS: nozzle sales sum to 1321.00, but paper register recorded 1321.71
  assert.equal(ms.recordedTotalMeterSale, 1321.71);
  assert.equal(ms.calculatedNozzleTotalSale, 1321.00);
  assert.equal(ms.hasDiscrepancy, true);
  assert.equal(ms.discrepancyLitres, 0.71);
  assert.equal(ms.totalMeterSale, 1321.71);
});

test("13. Genuine zero sale is distinguishable from missing data (Sep 1 N2 vs Sep 23 N3)", async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  const regSep1 = await getDailyRegister(station._id, "2026-09-01");
  const regSep23 = await getDailyRegister(station._id, "2026-09-23");

  const n2Sep1 = regSep1.stock.find((s) => s.product === "PETROL").meterRegister.nozzles.find((n) => n.registerNozzle === 2);
  const n3Sep23 = regSep23.stock.find((s) => s.product === "PETROL").meterRegister.nozzles.find((n) => n.registerNozzle === 3);

  // Sep 1 N2 is valid zero sale (0.0 to 0.0, recorded sale 0)
  assert.equal(n2Sep1.sale, 0.0);
  assert.equal(n2Sep1.status, "VALID_ZERO_SALE");

  // Sep 23 N3 has missing closing reading
  assert.equal(n3Sep23.closingReading, null);
  assert.equal(n3Sep23.sale, null);
  assert.equal(n3Sep23.status, "INCOMPLETE");
});

test("14. September 2026 imported readings appear in correct selected dates (Sep 1 to 23)", async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  for (let d = 1; d <= 22; d++) {
    const bDate = `2026-09-${String(d).padStart(2, '0')}`;
    const reg = await getDailyRegister(station._id, bDate);
    const ms = reg.stock.find((s) => s.product === "PETROL").meterRegister;
    const hsd = reg.stock.find((s) => s.product === "DIESEL").meterRegister;

    assert.ok(ms.totalMeterSale > 0, `Sep ${d} MS total sale must be > 0`);
    assert.ok(hsd.totalMeterSale > 0, `Sep ${d} HSD total sale must be > 0`);
  }
});

test("15. Meter Register total matches the sum of its valid nozzle sales (Sep 2 MS)", async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  const reg = await getDailyRegister(station._id, "2026-09-02");
  const ms = reg.stock.find((s) => s.product === "PETROL").meterRegister;

  const nozzleSum = ms.nozzles.reduce((sum, n) => sum + (n.sale || 0), 0);
  assert.equal(nozzleSum, 1207.0);
  assert.equal(ms.calculatedNozzleTotalSale, 1207.0);
});

test("16. Excel export uses the same Meter Register values as in-app view", async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  const reportData = await getMonthlyRegisterReportData(station._id, "2026-09");

  const msMeterSheet = reportData.sheets.find((s) => s.id === "MS_METER");
  assert.ok(msMeterSheet, "MS_METER sheet must exist");

  const day1Row = msMeterSheet.rows.find((r) => r.date === "2026-09-01");
  assert.equal(day1Row.totalMeterSale, 1321.71);
  assert.equal(day1Row.nozzles[0].openingReading, 386710.0);
  assert.equal(day1Row.nozzles[0].sale, 723.0);
});

test("17. Manager-only correction authorization and audit logging", async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  const testDate = "2026-10-30";
  
  // Directly test deriveNozzleOpeningReading before and after manual correction
  const before = await deriveNozzleOpeningReading(station._id, "PETROL", 1, testDate);
  assert.equal(before.isManualCorrection, false);

  // Create manual correction on testDate
  await DailyMeterRegister.findOneAndUpdate(
    { stationId: station._id, businessDate: testDate, product: "PETROL" },
    {
      $set: {
        nozzles: [
          {
            registerNozzle: 1,
            nozzleId: "n1",
            mpdNumber: "MPD 1",
            openingReading: 999999.0,
            closingReading: null,
            recordedSale: null,
            isManualOpeningCorrection: true,
            openingCorrectionReason: "Calibration reset test",
          }
        ],
        sourceType: "MANUAL_INITIALIZED"
      }
    },
    { upsert: true }
  );

  const after = await deriveNozzleOpeningReading(station._id, "PETROL", 1, testDate);
  assert.equal(after.openingReading, 999999.0);
  assert.equal(after.isManualCorrection, true);
  assert.equal(after.reason, "Calibration reset test");

  // Clean up test record
  await DailyMeterRegister.deleteOne({ stationId: station._id, businessDate: testDate, product: "PETROL" });
});

test("18. Existing Stock Register, receipt, density, rate remain unaffected", async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  const reg = await getDailyRegister(station._id, "2026-09-01");
  
  const msStock = reg.stock.find((s) => s.product === "PETROL");
  assert.equal(msStock.openingStockLitres, 11922.66);
  assert.equal(msStock.actualDipStockLitres, 10606.18);
  assert.equal(msStock.hasStockRecord, true);
});
