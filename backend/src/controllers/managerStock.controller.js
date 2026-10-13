import Station from "../models/Station.js";
import DailyStock from "../models/DailyStock.js";
import FuelReceipt from "../models/FuelReceipt.js";
import DailyDensity from "../models/DailyDensity.js";
import Shift from "../models/Shift.js";
import Tank from "../models/Tank.js";
import TankCalibration from "../models/TankCalibration.js";
import Mpd from "../models/Mpd.js";
import DailyMeterRegister from "../models/DailyMeterRegister.js";
import { getDailyRegister, interpolateVolume, deriveOpeningStock, getProductRegisterNozzles } from "../services/stockRegisterService.js";
import { generateMonthlyExcel, getMonthlyRegisterReportData } from "../services/exportRegisterService.js";
import { recordAuditLog } from "../utils/auditLog.js";
import { convertHydrometerToDensity15, getDensityCalculationDetails } from "../services/densityCalculationService.js";

const products = ["PETROL", "DIESEL"];
const activeStation = async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  if (!station) { const error = new Error("No active station is configured."); error.status = 503; throw error; }
  return station;
};

export const getManagerStock = async (req, res, next) => {
  try {
    const station = await activeStation();
    const { date: businessDate } = req.query;

    const { stock, tanks } = await getDailyRegister(station._id, businessDate);

    res.json({
      success: true,
      data: {
        businessDate,
        stock,
        tanks: tanks.map(({ _id, tankNumber, product, capacityLitres, calibrationPoints }) => ({
          _id,
          tankNumber,
          product,
          capacityLitres,
          calibrationPoints: calibrationPoints || []
        }))
      }
    });
  } catch (error) { next(error); }
};
export const upsertManagerStock = async (req, res, next) => {
  try {
    const station = await activeStation();
    const { businessDate, product, ...values } = req.body;

    const existing = await DailyStock.findOne({ stationId: station._id, businessDate, product }).lean();

    // Opening stock fallback / derivation if not provided
    if (values.openingStockLitres == null) {
      if (existing && existing.openingStockLitres != null) {
        values.openingStockLitres = existing.openingStockLitres;
      } else {
        const derived = await deriveOpeningStock(station._id, product, businessDate, existing);
        values.openingStockLitres = derived.openingStockLitres ?? 0;
      }
    }

    // Server calculation authority: Derive actualDipStockLitres from productDip and tank calibration
    // Reject arbitrary client overrides of actualDipStockLitres
    if (values.productDip != null) {
      const activeTanks = await Tank.find({ stationId: station._id, product, isActive: true }).lean();
      if (activeTanks.length === 1) {
        const tank = activeTanks[0];
        const calibration = await TankCalibration.findOne({ tankId: tank._id }).lean();
        if (calibration && calibration.points && calibration.points.length > 0) {
          const converted = interpolateVolume(values.productDip, calibration.points);
          if (converted != null) {
            values.actualDipStockLitres = converted;
          } else {
            // Dip is out of calibration range or invalid
            // If dip was not changed, preserve historical record; otherwise set to null (no fabrication)
            if (existing && existing.productDip === values.productDip && existing.actualDipStockLitres != null) {
              values.actualDipStockLitres = existing.actualDipStockLitres;
            } else {
              values.actualDipStockLitres = null;
            }
          }
        } else {
          // Missing calibration
          if (existing && existing.productDip === values.productDip && existing.actualDipStockLitres != null) {
            values.actualDipStockLitres = existing.actualDipStockLitres;
          } else {
            values.actualDipStockLitres = null;
          }
        }
      } else {
        // Multiple tanks or no tank: cannot determine single calibration
        if (existing && existing.productDip === values.productDip && existing.actualDipStockLitres != null) {
          values.actualDipStockLitres = existing.actualDipStockLitres;
        } else {
          values.actualDipStockLitres = null;
        }
      }
    } else {
      // productDip is null or empty
      values.productDip = null;
      values.actualDipStockLitres = null;
    }

    const stock = await DailyStock.findOneAndUpdate(
      { stationId: station._id, businessDate, product },
      { $set: values, $setOnInsert: { stationId: station._id, businessDate, product } },
      { new: true, upsert: true, runValidators: true },
    );

    const changedFields = {};
    if (existing) {
      if (existing.productDip !== stock.productDip) changedFields.previousProductDip = existing.productDip;
      if (existing.waterDip !== stock.waterDip) changedFields.previousWaterDip = existing.waterDip;
      if (existing.actualDipStockLitres !== stock.actualDipStockLitres) changedFields.previousDipStockLitres = existing.actualDipStockLitres;
      if (existing.waterDipVolumeLitres !== stock.waterDipVolumeLitres) changedFields.previousWaterDipVolumeLitres = existing.waterDipVolumeLitres;
    }

    await recordAuditLog({
      actor: req.user,
      action: "STOCK_UPSERTED",
      entityType: "STOCK",
      entityId: stock._id,
      metadata: {
        businessDate,
        product,
        isUpdate: !!existing,
        ...changedFields
      },
    });
    res.json({ success: true, data: stock });
  } catch (error) { next(error); }
};
export const getManagerDensity = async (req, res, next) => { try { const station = await activeStation(); const records = await DailyDensity.find({ stationId: station._id, businessDate: req.query.date }).lean(); res.json({ success: true, data: records }); } catch (error) { next(error); } };
export const getDensityConversionPreview = async (req, res, next) => {
  try {
    const { hydrometer, temperature } = req.query;
    if (hydrometer == null || temperature == null) {
      return res.status(400).json({ success: false, message: "Hydrometer reading and temperature query parameters are required." });
    }
    const hyd = Number(hydrometer);
    const temp = Number(temperature);
    if (isNaN(hyd) || isNaN(temp)) {
      return res.status(400).json({ success: false, message: "Hydrometer reading and temperature must be valid numbers." });
    }
    const details = getDensityCalculationDetails(hyd, temp);
    if (!details.isValid) {
      return res.status(400).json({ success: false, message: details.error, data: details });
    }
    res.json({ success: true, data: details });
  } catch (error) { next(error); }
};

export const upsertManagerDensity = async (req, res, next) => {
  try {
    const station = await activeStation();
    const { businessDate, product, ...values } = req.body;

    if (values.hydrometerReading != null && values.temperatureC != null) {
      const calc = getDensityCalculationDetails(values.hydrometerReading, values.temperatureC);
      if (!calc.isValid) {
        return res.status(400).json({ success: false, message: calc.error || "Density calculation failed: inputs outside ASTM 53B range." });
      }
      values.density15 = calc.density15;
    } else if (values.density15 == null) {
      return res.status(400).json({ success: false, message: "Hydrometer reading and temperature (°C) are required." });
    }

    const existing = await DailyDensity.findOne({ stationId: station._id, businessDate, product }).lean();

    const record = await DailyDensity.findOneAndUpdate(
      { stationId: station._id, businessDate, product },
      { $set: values, $setOnInsert: { stationId: station._id, businessDate, product } },
      { new: true, upsert: true, runValidators: true },
    );

    const changedFields = {};
    if (existing) {
      if (existing.density15 !== record.density15) changedFields.previousDensity15 = existing.density15;
      if (existing.temperatureC !== record.temperatureC) changedFields.previousTemperatureC = existing.temperatureC;
      if (existing.hydrometerReading !== record.hydrometerReading) changedFields.previousHydrometerReading = existing.hydrometerReading;
    }

    await recordAuditLog({
      actor: req.user,
      action: "DENSITY_UPSERTED",
      entityType: "DENSITY",
      entityId: record._id,
      metadata: {
        businessDate,
        product,
        isUpdate: !!existing,
        ...changedFields
      },
    });
    res.json({ success: true, data: record });
  } catch (error) { next(error); }
};
export const getManagerReceipts = async (req, res, next) => { try { const station = await activeStation(); const receipts = await FuelReceipt.find({ stationId: station._id, businessDate: req.query.date }).sort({ createdAt: -1 }).lean(); res.json({ success: true, data: receipts }); } catch (error) { next(error); } };
export const createManagerReceipt = async (req, res, next) => {
  try {
    const station = await activeStation();
    const payload = { ...req.body, stationId: station._id };

    // Server-authoritative before decantation density
    if (payload.beforeHydrometer != null && payload.beforeTemperatureC != null) {
      const beforeCalc = getDensityCalculationDetails(payload.beforeHydrometer, payload.beforeTemperatureC);
      if (!beforeCalc.isValid) {
        return res.status(400).json({ success: false, message: `Before decantation error: ${beforeCalc.error}` });
      }
      payload.beforeDensity15 = beforeCalc.density15;
    } else if (payload.beforeHydrometer != null || payload.beforeTemperatureC != null) {
      return res.status(400).json({ success: false, message: "Both before hydrometer reading and temperature (°C) must be provided." });
    } else if (payload.beforeDensity15 == null) {
      payload.beforeDensity15 = null;
    }

    // Server-authoritative after decantation density
    if (payload.afterHydrometer != null && payload.afterTemperatureC != null) {
      const afterCalc = getDensityCalculationDetails(payload.afterHydrometer, payload.afterTemperatureC);
      if (!afterCalc.isValid) {
        return res.status(400).json({ success: false, message: `After decantation error: ${afterCalc.error}` });
      }
      payload.afterDensity15 = afterCalc.density15;
    } else if (payload.afterHydrometer != null || payload.afterTemperatureC != null) {
      return res.status(400).json({ success: false, message: "Both after hydrometer reading and temperature (°C) must be provided." });
    } else if (payload.afterDensity15 == null) {
      payload.afterDensity15 = null;
    }

    if (!payload.supplierName || !payload.supplierName.trim()) {
      payload.supplierName = "BPCL";
    }

    // Server-authoritative density differences (Observed @15°C - Challan @15°C)
    if (payload.beforeDensity15 != null && payload.challanDensity15 != null) {
      payload.beforeDensityDifference = Number((payload.beforeDensity15 - payload.challanDensity15).toFixed(4));
    } else {
      payload.beforeDensityDifference = null;
    }

    const afterChallan = payload.afterChallanDensity15 ?? payload.challanDensity15;
    if (payload.afterDensity15 != null && afterChallan != null) {
      payload.afterDensityDifference = Number((payload.afterDensity15 - afterChallan).toFixed(4));
      if (payload.afterChallanDensity15 == null) {
        payload.afterChallanDensity15 = afterChallan;
      }
    } else {
      payload.afterDensityDifference = null;
    }

    const receipt = await FuelReceipt.create(payload);
    await recordAuditLog({
      actor: req.user,
      action: "FUEL_RECEIPT_CREATED",
      entityType: "FUEL_RECEIPT",
      entityId: receipt._id,
      metadata: {
        receiptId: receipt._id,
        businessDate: receipt.businessDate,
        product: receipt.product,
        invoiceNumber: receipt.invoiceNumber,
        quantityLitres: receipt.quantityLitres,
        vendor: req.body.supplierName ? receipt.supplierName : undefined
      },
    });
    res.status(201).json({ success: true, data: receipt });
  } catch (error) { next(error); }
};


export const getManagerStockPreview = async (req, res, next) => {
  try {
    const station = await activeStation();
    const { month } = req.query; // format "YYYY-MM"
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: "Valid month in YYYY-MM format is required." });
    }

    const reportData = await getMonthlyRegisterReportData(station._id, month);
    res.json({ success: true, data: reportData });
  } catch (error) { next(error); }
};

export const getManagerStockExport = async (req, res, next) => {
  try {
    const station = await activeStation();
    const { month } = req.query; // format "YYYY-MM"
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: "Valid month in YYYY-MM format is required." });
    }

    const workbook = await generateMonthlyExcel(station._id, month);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Registers_${month}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { next(error); }
};

export const correctManagerOpeningStock = async (req, res, next) => {
  try {
    const station = await activeStation();
    const { businessDate, product, correctedOpeningStockLitres, reason } = req.body;

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ success: false, message: "A valid reason for opening stock correction is required." });
    }

    const existing = await DailyStock.findOne({ stationId: station._id, businessDate, product }).lean();
    const previousOpeningStockLitres = existing?.openingStockLitres ?? null;

    const stock = await DailyStock.findOneAndUpdate(
      { stationId: station._id, businessDate, product },
      {
        $set: {
          openingStockLitres: correctedOpeningStockLitres,
          isManualOpeningCorrection: true,
          openingCorrectionReason: reason.trim(),
          openingCorrectionBy: req.user._id,
          openingCorrectionAt: new Date(),
        },
        $setOnInsert: { stationId: station._id, businessDate, product }
      },
      { new: true, upsert: true, runValidators: true }
    );

    await recordAuditLog({
      actor: req.user,
      action: "OPENING_STOCK_CORRECTED",
      entityType: "STOCK",
      entityId: stock._id,
      metadata: {
        businessDate,
        product,
        previousOpeningStockLitres,
        correctedOpeningStockLitres,
        reason: reason.trim(),
        isUpdate: !!existing,
      },
    });

    res.json({ success: true, data: stock });
  } catch (error) { next(error); }
};

export const correctManagerMeterOpening = async (req, res, next) => {
  try {
    const station = await activeStation();
    const { businessDate, product, registerNozzle, correctedOpeningReading, reason } = req.body;

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ success: false, message: "A valid reason for opening reading correction is required." });
    }

    const mpds = await Mpd.find({ stationId: station._id, isActive: true }).lean();
    const nozzleSpecs = getProductRegisterNozzles(product, mpds);
    const spec = nozzleSpecs.find((s) => s.registerNozzle === registerNozzle);

    if (!spec) {
      return res.status(400).json({ success: false, message: `Invalid register nozzle: ${registerNozzle}` });
    }

    let reg = await DailyMeterRegister.findOne({ stationId: station._id, businessDate, product });
    let previousOpeningReading = null;

    if (!reg) {
      const nozzles = nozzleSpecs.map((s) => {
        const isTarget = s.registerNozzle === registerNozzle;
        return {
          registerNozzle: s.registerNozzle,
          nozzleId: s.nozzleId,
          mpdNumber: s.mpdNumber,
          openingReading: isTarget ? correctedOpeningReading : null,
          closingReading: null,
          recordedSale: null,
          isManualOpeningCorrection: isTarget,
          openingCorrectionReason: isTarget ? reason.trim() : null,
          openingCorrectionBy: isTarget ? req.user._id : null,
          openingCorrectionAt: isTarget ? new Date() : null,
        };
      });

      reg = new DailyMeterRegister({
        stationId: station._id,
        businessDate,
        product,
        nozzles,
        sourceType: "MANUAL_INITIALIZED",
      });
    } else {
      let targetNozzle = reg.nozzles.find((n) => n.registerNozzle === registerNozzle);
      if (!targetNozzle) {
        targetNozzle = {
          registerNozzle: spec.registerNozzle,
          nozzleId: spec.nozzleId,
          mpdNumber: spec.mpdNumber,
          openingReading: correctedOpeningReading,
          closingReading: null,
          recordedSale: null,
          isManualOpeningCorrection: true,
          openingCorrectionReason: reason.trim(),
          openingCorrectionBy: req.user._id,
          openingCorrectionAt: new Date(),
        };
        reg.nozzles.push(targetNozzle);
      } else {
        previousOpeningReading = targetNozzle.openingReading;
        targetNozzle.openingReading = correctedOpeningReading;
        targetNozzle.isManualOpeningCorrection = true;
        targetNozzle.openingCorrectionReason = reason.trim();
        targetNozzle.openingCorrectionBy = req.user._id;
        targetNozzle.openingCorrectionAt = new Date();
        if (targetNozzle.closingReading != null) {
          targetNozzle.recordedSale = Number((targetNozzle.closingReading - correctedOpeningReading).toFixed(2));
        }
      }
    }

    await reg.save();

    await recordAuditLog({
      actor: req.user,
      action: "METER_OPENING_CORRECTED",
      entityType: "METER_REGISTER",
      entityId: reg._id,
      metadata: {
        businessDate,
        product,
        registerNozzle,
        nozzleId: spec.nozzleId,
        mpdNumber: spec.mpdNumber,
        previousOpeningReading,
        correctedOpeningReading,
        reason: reason.trim(),
      },
    });

    res.json({ success: true, data: reg });
  } catch (error) { next(error); }
};
