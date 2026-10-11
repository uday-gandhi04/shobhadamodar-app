import Shift from "../models/Shift.js";
import DailyStock from "../models/DailyStock.js";
import FuelReceipt from "../models/FuelReceipt.js";
import Tank from "../models/Tank.js";
import TankCalibration from "../models/TankCalibration.js";
import Mpd from "../models/Mpd.js";
import DailyMeterRegister from "../models/DailyMeterRegister.js";

// Helper to interpolate volume from calibration points (strict: no extrapolation, capacity bound)
export const interpolateVolume = (dipCm, points, maxCapacityLitres = null) => {
  if (dipCm == null || isNaN(dipCm) || dipCm < 0) return null;
  if (!points || !Array.isArray(points) || points.length === 0) return null;
  
  // Sort and filter points to ensure strict ordering and valid data
  const validPoints = points
    .filter(p => typeof p.dipCm === 'number' && typeof p.volumeLitres === 'number' && p.volumeLitres >= 0)
    .sort((a, b) => a.dipCm - b.dipCm);

  if (validPoints.length === 0) return null;

  const minDip = validPoints[0].dipCm;
  const maxDip = validPoints[validPoints.length - 1].dipCm;

  const clamp = (vol) => {
    let result = vol;
    if (maxCapacityLitres != null && result > maxCapacityLitres) {
      result = maxCapacityLitres;
    }
    if (result < 0) result = 0;
    return Number(result.toFixed(2));
  };

  // Bounds check: clamp to calibrated range endpoints
  if (dipCm <= minDip) {
    return clamp(validPoints[0].volumeLitres);
  }
  if (dipCm >= maxDip) {
    return clamp(validPoints[validPoints.length - 1].volumeLitres);
  }

  for (let i = 0; i < validPoints.length - 1; i++) {
    const p1 = validPoints[i];
    const p2 = validPoints[i + 1];

    if (dipCm === p1.dipCm) {
      return clamp(p1.volumeLitres);
    }
    if (dipCm === p2.dipCm) {
      return clamp(p2.volumeLitres);
    }

    if (dipCm > p1.dipCm && dipCm < p2.dipCm) {
      const deltaDip = p2.dipCm - p1.dipCm;
      if (deltaDip === 0) return clamp(p1.volumeLitres);
      const ratio = (dipCm - p1.dipCm) / deltaDip;
      const interpolated = p1.volumeLitres + ratio * (p2.volumeLitres - p1.volumeLitres);
      return clamp(interpolated);
    }
  }

  return null;
};

// Deterministic nozzle mapping: 4 nozzles per product across MPD 1 and MPD 2
export const getProductRegisterNozzles = (product, mpds) => {
  const mpd1 = mpds.find((m) => m.mpdNumber === "MPD 1");
  const mpd2 = mpds.find((m) => m.mpdNumber === "MPD 2");

  if (product === "PETROL") {
    return [
      { registerNozzle: 1, label: "Nozzle 1", mpdNumber: "MPD 1", mpdId: mpd1?._id?.toString(), nozzleId: "n1", fuelType: "PETROL" },
      { registerNozzle: 2, label: "Nozzle 2", mpdNumber: "MPD 1", mpdId: mpd1?._id?.toString(), nozzleId: "n2", fuelType: "PETROL" },
      { registerNozzle: 3, label: "Nozzle 3", mpdNumber: "MPD 2", mpdId: mpd2?._id?.toString(), nozzleId: "n1", fuelType: "PETROL" },
      { registerNozzle: 4, label: "Nozzle 4", mpdNumber: "MPD 2", mpdId: mpd2?._id?.toString(), nozzleId: "n2", fuelType: "PETROL" },
    ];
  } else {
    return [
      { registerNozzle: 1, label: "Nozzle 1", mpdNumber: "MPD 1", mpdId: mpd1?._id?.toString(), nozzleId: "n3", fuelType: "DIESEL" },
      { registerNozzle: 2, label: "Nozzle 2", mpdNumber: "MPD 1", mpdId: mpd1?._id?.toString(), nozzleId: "n4", fuelType: "DIESEL" },
      { registerNozzle: 3, label: "Nozzle 3", mpdNumber: "MPD 2", mpdId: mpd2?._id?.toString(), nozzleId: "n3", fuelType: "DIESEL" },
      { registerNozzle: 4, label: "Nozzle 4", mpdNumber: "MPD 2", mpdId: mpd2?._id?.toString(), nozzleId: "n4", fuelType: "DIESEL" },
    ];
  }
};

// Automatic Opening Totalizer carry-forward helper
export const deriveNozzleOpeningReading = async (stationId, product, registerNozzle, businessDate) => {
  // 1. Check if DailyMeterRegister exists on this date with an opening reading or manual correction
  const currentReg = await DailyMeterRegister.findOne({ stationId, product, businessDate }).lean();
  const currentNz = currentReg?.nozzles?.find((n) => n.registerNozzle === registerNozzle);

  if (currentNz?.isManualOpeningCorrection && currentNz.openingReading != null) {
    return {
      openingReading: currentNz.openingReading,
      isManualCorrection: true,
      reason: currentNz.openingCorrectionReason,
      source: "MANUAL_CORRECTION",
      carriedForwardFromDate: null,
    };
  }

  if (currentNz?.openingReading != null) {
    return {
      openingReading: currentNz.openingReading,
      isManualCorrection: false,
      reason: null,
      source: "HISTORICAL_REGISTER",
      carriedForwardFromDate: null,
    };
  }

  // 2. Query MPD info to identify physical nozzle
  const mpds = await Mpd.find({ stationId, isActive: true }).lean();
  const specs = getProductRegisterNozzles(product, mpds);
  const spec = specs.find((s) => s.registerNozzle === registerNozzle);

  // 3. Search backwards for latest confirmed closing totalizer (d < businessDate)
  const prevRegs = await DailyMeterRegister.find({
    stationId,
    product,
    businessDate: { $lt: businessDate },
  })
    .sort({ businessDate: -1 })
    .lean();

  let histCandidate = null;
  for (const pr of prevRegs) {
    const pnz = pr.nozzles?.find((n) => n.registerNozzle === registerNozzle);
    if (pnz) {
      const closing = pnz.closingReading ?? ((pnz.openingReading != null && pnz.recordedSale != null) ? Number((pnz.openingReading + pnz.recordedSale).toFixed(2)) : null);
      if (closing != null) {
        histCandidate = { businessDate: pr.businessDate, closingReading: closing };
        break;
      }
    }
  }

  let shiftCandidate = null;
  if (spec?.mpdId) {
    const prevShifts = await Shift.find({
      mpdId: spec.mpdId,
      status: { $in: ["ENDED", "FORCE_CLOSED"] },
      businessDate: { $lt: businessDate },
    })
      .sort({ businessDate: -1, endedAt: -1, startedAt: -1 })
      .lean();

    for (const ps of prevShifts) {
      const r = ps.readings?.find((rd) => rd.nozzleId === spec.nozzleId && rd.fuelType === product);
      if (r && r.closingReading != null) {
        shiftCandidate = { businessDate: ps.businessDate, closingReading: r.closingReading };
        break;
      }
    }
  }

  let confirmedCandidate = null;
  if (histCandidate && shiftCandidate) {
    if (shiftCandidate.businessDate > histCandidate.businessDate) {
      confirmedCandidate = shiftCandidate;
    } else {
      const interveningShifts = await Shift.find({
        mpdId: spec.mpdId,
        status: { $in: ["ENDED", "FORCE_CLOSED"] },
        businessDate: { $gt: histCandidate.businessDate, $lt: businessDate },
      }).sort({ businessDate: -1, endedAt: -1 }).lean();

      if (interveningShifts.length > 0) {
        const lastIntShift = interveningShifts[0];
        const r = lastIntShift.readings?.find((rd) => rd.nozzleId === spec.nozzleId && rd.fuelType === product);
        if (r && r.closingReading != null) {
          confirmedCandidate = { businessDate: lastIntShift.businessDate, closingReading: r.closingReading };
        } else {
          confirmedCandidate = histCandidate;
        }
      } else {
        confirmedCandidate = histCandidate;
      }
    }
  } else if (shiftCandidate) {
    confirmedCandidate = shiftCandidate;
  } else if (histCandidate) {
    confirmedCandidate = histCandidate;
  }

  if (confirmedCandidate) {
    return {
      openingReading: confirmedCandidate.closingReading,
      isManualCorrection: false,
      reason: null,
      source: "CARRIED_FORWARD",
      carriedForwardFromDate: confirmedCandidate.businessDate,
    };
  }

  return {
    openingReading: null,
    isManualCorrection: false,
    reason: null,
    source: "MISSING",
    carriedForwardFromDate: null,
  };
};

export const deriveOpeningStock = async (stationId, product, businessDate, row = null) => {
  if (!row) {
    row = await DailyStock.findOne({ stationId, product, businessDate }).lean();
  }
  // 1. If row already exists in DB with opening stock recorded or manually corrected:
  if (row && row.openingStockLitres != null) {
    if (row.isManualOpeningCorrection) {
      return {
        openingStockLitres: row.openingStockLitres,
        openingStockType: "MANUAL_CORRECTION",
        openingStockSource: "MANUAL_CORRECTION",
        isManualOpeningCorrection: true,
        lastConfirmedDipDate: null,
        openingStockCheckpointDate: null,
        lastConfirmedDipLitres: null,
        interveningReceiptsLitres: 0,
        interveningSalesLitres: 0,
        reason: row.openingCorrectionReason,
        openingCorrectionReason: row.openingCorrectionReason,
        correctedAt: row.openingCorrectionAt,
      };
    }
    return {
      openingStockLitres: row.openingStockLitres,
      openingStockType: "RECORDED",
      openingStockSource: "RECORDED",
      lastConfirmedDipDate: null,
      openingStockCheckpointDate: null,
      lastConfirmedDipLitres: null,
      interveningReceiptsLitres: 0,
      interveningSalesLitres: 0,
    };
  }

  // 2. Look backwards for the last valid physical dip checkpoint:
  const checkpoint = await DailyStock.findOne({
    stationId,
    product,
    businessDate: { $lt: businessDate },
    actualDipStockLitres: { $ne: null, $gt: 0 },
  })
    .sort({ businessDate: -1 })
    .lean();

  if (!checkpoint) {
    return {
      openingStockLitres: null,
      openingStockType: "MISSING_CHECKPOINT",
      openingStockSource: "MISSING_CHECKPOINT",
      lastConfirmedDipDate: null,
      openingStockCheckpointDate: null,
      lastConfirmedDipLitres: null,
      interveningReceiptsLitres: 0,
      interveningSalesLitres: 0,
    };
  }

  const dCp = checkpoint.businessDate;
  const vCp = checkpoint.actualDipStockLitres;

  // 3. Find any intervening receipts between dCp and businessDate (dCp < d < businessDate)
  const receiptAgg = await FuelReceipt.aggregate([
    {
      $match: {
        stationId,
        product,
        businessDate: { $gt: dCp, $lt: businessDate },
      },
    },
    { $group: { _id: null, total: { $sum: "$quantityLitres" } } },
  ]);
  const interveningReceipts = receiptAgg.length > 0 ? Number(receiptAgg[0].total.toFixed(2)) : 0;

  // 4. Find any intervening finalized shift sales and register sales between dCp and businessDate (dCp < d < businessDate)
  const interveningShifts = await Shift.find({
    businessDate: { $gt: dCp, $lt: businessDate },
    status: { $in: ["ENDED", "FORCE_CLOSED"] },
  }).lean();

  const interveningMeterRegs = await DailyMeterRegister.find({
    stationId,
    product,
    businessDate: { $gt: dCp, $lt: businessDate },
  }).lean();

  let interveningSales = 0;
  const shiftDates = new Set(interveningShifts.map((s) => s.businessDate));

  interveningShifts.forEach((shift) => {
    shift.readings?.forEach((reading) => {
      if (reading.fuelType === product) {
        if (reading.dispensedLitres != null && reading.dispensedLitres > 0) {
          interveningSales += reading.dispensedLitres;
        } else if (reading.openingReading != null && reading.closingReading != null) {
          interveningSales += reading.closingReading - reading.openingReading;
        }
      }
    });
  });

  interveningMeterRegs.forEach((mr) => {
    if (!shiftDates.has(mr.businessDate)) {
      if (mr.recordedTotalMeterSale != null) {
        interveningSales += mr.recordedTotalMeterSale;
      } else if (mr.nozzles) {
        const nSale = mr.nozzles.reduce((sum, n) => sum + (n.recordedSale || (n.closingReading != null && n.openingReading != null ? n.closingReading - n.openingReading : 0)), 0);
        interveningSales += nSale;
      }
    }
  });
  interveningSales = Number(interveningSales.toFixed(2));

  // 5. If no intervening movements occurred, carry the last confirmed physical stock forward unchanged
  if (interveningReceipts === 0 && interveningSales === 0) {
    return {
      openingStockLitres: vCp,
      openingStockType: "CONFIRMED_PHYSICAL_CARRYOVER",
      openingStockSource: "CONFIRMED_PHYSICAL_CARRYOVER",
      lastConfirmedDipDate: dCp,
      openingStockCheckpointDate: dCp,
      lastConfirmedDipLitres: vCp,
      interveningReceiptsLitres: 0,
      interveningSalesLitres: 0,
    };
  }

  // 6. If intervening receipts or sales occurred, calculate provisional opening balance
  const provisional = Number((vCp + interveningReceipts - interveningSales).toFixed(2));
  return {
    openingStockLitres: provisional,
    openingStockType: "PROVISIONAL_CALCULATED",
    openingStockSource: "PROVISIONAL_CALCULATED",
    lastConfirmedDipDate: dCp,
    openingStockCheckpointDate: dCp,
    lastConfirmedDipLitres: vCp,
    interveningReceiptsLitres: interveningReceipts,
    interveningSalesLitres: interveningSales,
  };
};

// Main service function to get comprehensive daily register data
export const getDailyRegister = async (stationId, businessDate) => {
  const products = ["PETROL", "DIESEL"];

  // Fetch all necessary data
  const [
    stockRows,
    receiptGroups,
    finalizedShifts,
    inProgressShifts,
    meterRegisterDocs,
    configuredTanks,
    mpds,
    calibrations
  ] = await Promise.all([
    DailyStock.find({ stationId, businessDate }).lean(),
    FuelReceipt.aggregate([
      { $match: { stationId, businessDate } },
      { $group: { _id: "$product", receiptStockLitres: { $sum: "$quantityLitres" } } }
    ]),
    Shift.find({ businessDate, status: { $in: ["ENDED", "FORCE_CLOSED"] } }).sort({ startedAt: 1 }).lean(),
    Shift.find({ businessDate, status: "IN_PROGRESS" }).sort({ startedAt: 1 }).lean(),
    DailyMeterRegister.find({ stationId, businessDate }).lean(),
    Tank.find({ stationId, isActive: true }).sort({ product: 1, tankNumber: 1 }).lean(),
    Mpd.find({ stationId, isActive: true }).sort({ mpdNumber: 1 }).lean(),
    TankCalibration.find().lean()
  ]);

  const calibrationMap = new Map(calibrations.map(c => [c.tankId.toString(), c.points]));
  
  // Calculate Meter Register per product
  const meterRegisters = {};
  
  for (const product of products) {
    const specs = getProductRegisterNozzles(product, mpds);
    const meterDoc = meterRegisterDocs.find((d) => d.product === product);

    const nozzleData = [];

    for (const spec of specs) {
      const nzDoc = meterDoc?.nozzles?.find((n) => n.registerNozzle === spec.registerNozzle);

      // Determine opening reading
      let openingReading = null;
      let isManualOpeningCorrection = false;
      let openingCorrectionReason = null;
      let isOpeningCarriedForward = false;
      let openingCarriedForwardFromDate = null;
      let openingSource = "MISSING";

      if (nzDoc?.isManualOpeningCorrection && nzDoc.openingReading != null) {
        openingReading = nzDoc.openingReading;
        isManualOpeningCorrection = true;
        openingCorrectionReason = nzDoc.openingCorrectionReason;
        openingSource = "MANUAL_CORRECTION";
      } else if (nzDoc?.openingReading != null) {
        openingReading = nzDoc.openingReading;
        openingSource = "HISTORICAL_REGISTER";
      } else {
        const derived = await deriveNozzleOpeningReading(stationId, product, spec.registerNozzle, businessDate);
        openingReading = derived.openingReading;
        isManualOpeningCorrection = derived.isManualCorrection;
        openingCorrectionReason = derived.reason;
        isOpeningCarriedForward = derived.source === "CARRIED_FORWARD";
        openingCarriedForwardFromDate = derived.carriedForwardFromDate;
        openingSource = derived.source;
      }

      // Finalized shift readings for this physical nozzle on this date
      const nozzleShifts = finalizedShifts.filter((s) => s.mpdId.toString() === spec.mpdId);
      const nozzleShiftReadings = nozzleShifts
        .map((s) => s.readings?.find((r) => r.nozzleId === spec.nozzleId && r.fuelType === product))
        .filter(Boolean);

      const hasShiftActivity = nozzleShiftReadings.length > 0;
      const shiftClosing = hasShiftActivity ? nozzleShiftReadings[nozzleShiftReadings.length - 1].closingReading : null;
      const shiftLitres = hasShiftActivity
        ? Number(nozzleShiftReadings.reduce((sum, r) => sum + (r.dispensedLitres || 0), 0).toFixed(2))
        : null;

      // In-progress shift readings
      const ipShifts = inProgressShifts.filter((s) => s.mpdId.toString() === spec.mpdId);
      const ipReadings = ipShifts
        .map((s) => s.readings?.find((r) => r.nozzleId === spec.nozzleId && r.fuelType === product))
        .filter(Boolean);
      const hasLiveInProgressShift = ipReadings.length > 0;

      // Determine closing reading & sale
      let closingReading = null;
      let sale = null;
      let status = "INCOMPLETE";
      let statusMessage = "";
      let hasDiscrepancy = false;
      let discrepancyLitres = 0;

      if (nzDoc) {
        // Historical/source register record exists
        const recordedClosing = nzDoc.closingReading ?? ((nzDoc.openingReading != null && nzDoc.recordedSale != null) ? Number((nzDoc.openingReading + nzDoc.recordedSale).toFixed(2)) : null);
        closingReading = recordedClosing;
        sale = nzDoc.recordedSale ?? ((closingReading != null && openingReading != null) ? Number((closingReading - openingReading).toFixed(2)) : null);

        if (hasShiftActivity && shiftClosing != null) {
          if (closingReading != null && Math.abs(shiftClosing - closingReading) > 0.05) {
            hasDiscrepancy = true;
            discrepancyLitres = Number((closingReading - shiftClosing).toFixed(2));
            status = "DISCREPANCY";
            statusMessage = `Register closing (${closingReading}) differs from shift closing (${shiftClosing})`;
          } else if (sale != null && shiftLitres != null && Math.abs(sale - shiftLitres) > 0.05) {
            hasDiscrepancy = true;
            discrepancyLitres = Number((sale - shiftLitres).toFixed(2));
            status = "DISCREPANCY";
            statusMessage = `Register sale (${sale} L) differs from shift dispensed litres (${shiftLitres} L)`;
          } else if (sale === 0 && openingReading === closingReading) {
            status = "VALID_ZERO_SALE";
            statusMessage = "Confirmed zero sale (meter readings unchanged)";
          } else if (sale != null) {
            status = "HISTORICAL_RECORD";
            statusMessage = "Historical register record verified";
          } else {
            status = "INCOMPLETE";
            statusMessage = "Closing reading missing in register";
          }
        } else {
          if (sale === 0 && openingReading === closingReading) {
            status = "VALID_ZERO_SALE";
            statusMessage = "Confirmed zero sale (meter readings unchanged)";
          } else if (sale != null) {
            status = "HISTORICAL_RECORD";
            statusMessage = "Transcribed historical register record";
          } else {
            status = "INCOMPLETE";
            statusMessage = "Closing reading missing in register";
          }
        }
      } else if (hasShiftActivity && shiftClosing != null) {
        // Normal finalized shift operation
        closingReading = shiftClosing;
        sale = (openingReading != null && closingReading != null) ? Number((closingReading - openingReading).toFixed(2)) : null;

        if (sale != null && shiftLitres != null && Math.abs(sale - shiftLitres) > 0.05) {
          hasDiscrepancy = true;
          discrepancyLitres = Number((sale - shiftLitres).toFixed(2));
          status = "DISCREPANCY";
          statusMessage = `Totalizer difference (${sale} L) differs from dispensed sum (${shiftLitres} L)`;
        } else if (sale === 0 && openingReading === closingReading) {
          status = "VALID_ZERO_SALE";
          statusMessage = "Confirmed zero sale (meter readings unchanged across shifts)";
        } else if (sale != null) {
          status = "FINALIZED";
          statusMessage = "Finalized from shift totalizers";
        } else {
          status = "INCOMPLETE";
          statusMessage = "Incomplete shift totalizer readings";
        }
      } else if (hasLiveInProgressShift) {
        // Active shift in progress
        closingReading = null;
        sale = null;
        status = "IN_PROGRESS_SHIFT";
        statusMessage = "Shift in progress — live readings excluded from finalized register totals";
      } else {
        // No shifts and no register record on this date
        if (openingReading != null) {
          closingReading = openingReading;
          sale = 0.0;
          status = "VALID_ZERO_SALE";
          statusMessage = isOpeningCarriedForward
            ? `Confirmed zero sale (meter readings unchanged from ${openingCarriedForwardFromDate || "previous confirmed closing"})`
            : "Confirmed zero sale (meter readings unchanged across shifts)";
        } else {
          closingReading = null;
          sale = null;
          status = "NO_RECORD";
          statusMessage = "No opening reading available. Manager initialization required.";
        }
      }

      nozzleData.push({
        registerNozzle: spec.registerNozzle,
        label: spec.label,
        mpdNumber: spec.mpdNumber,
        nozzleId: spec.nozzleId,
        fuelType: product,
        openingReading,
        closingReading,
        sale,
        status,
        statusMessage,
        isOpeningCarriedForward,
        openingCarriedForwardFromDate,
        isManualOpeningCorrection,
        openingCorrectionReason,
        openingSource,
        shiftLitres,
        hasDiscrepancy,
        discrepancyLitres,
      });
    }

    // Calculate Total Meter Sale safely
    const allNozzlesHaveSale = nozzleData.every((n) => n.sale != null);
    const anyNozzleHasSale = nozzleData.some((n) => n.sale != null && n.sale > 0);
    let calculatedNozzleTotalSale = null;
    if (allNozzlesHaveSale || anyNozzleHasSale) {
      calculatedNozzleTotalSale = Number(nozzleData.reduce((sum, n) => sum + (n.sale || 0), 0).toFixed(2));
    }

    let totalMeterSale = null;
    let recordedTotalMeterSale = meterDoc?.recordedTotalMeterSale ?? null;
    let hasRegisterDiscrepancy = false;
    let registerDiscrepancyLitres = 0;

    if (recordedTotalMeterSale != null) {
      totalMeterSale = recordedTotalMeterSale;
      if (calculatedNozzleTotalSale != null && Math.abs(recordedTotalMeterSale - calculatedNozzleTotalSale) > 0.05) {
        hasRegisterDiscrepancy = true;
        registerDiscrepancyLitres = Number((recordedTotalMeterSale - calculatedNozzleTotalSale).toFixed(2));
      }
    } else if (nozzleData.some((n) => n.status === "IN_PROGRESS_SHIFT")) {
      totalMeterSale = null;
    } else if (allNozzlesHaveSale || anyNozzleHasSale) {
      totalMeterSale = calculatedNozzleTotalSale;
    } else {
      totalMeterSale = null;
    }

    // Determine overall register status
    let registerStatus = "INCOMPLETE";
    if (nozzleData.every((n) => n.status === "VALID_ZERO_SALE")) {
      registerStatus = "VALID_ZERO_SALE";
    } else if (hasRegisterDiscrepancy || nozzleData.some((n) => n.status === "DISCREPANCY")) {
      registerStatus = "DISCREPANCY";
    } else if (meterDoc && totalMeterSale != null) {
      registerStatus = "HISTORICAL_RECORD";
    } else if (nozzleData.some((n) => n.status === "IN_PROGRESS_SHIFT")) {
      registerStatus = "IN_PROGRESS";
    } else if (allNozzlesHaveSale || anyNozzleHasSale) {
      registerStatus = "FINALIZED";
    } else if (nozzleData.some((n) => n.status === "AWAITING_SHIFTS")) {
      registerStatus = "AWAITING_SHIFTS";
    } else if (nozzleData.every((n) => n.status === "NO_RECORD")) {
      registerStatus = "NO_RECORD";
    }

    meterRegisters[product] = {
      product,
      businessDate,
      nozzles: nozzleData,
      totalMeterSale,
      recordedTotalMeterSale,
      calculatedNozzleTotalSale,
      hasDiscrepancy: hasRegisterDiscrepancy,
      discrepancyLitres: registerDiscrepancyLitres,
      status: registerStatus,
      pumpTestingLitres: meterDoc?.pumpTestingLitres ?? null,
      remarks: meterDoc?.remarks || "",
    };
  }

  const stored = new Map(stockRows.map((row) => [row.product, row]));
  const receipts = new Map(receiptGroups.map((row) => [row._id, Number(row.receiptStockLitres || 0)]));

  // Build the stock response
  const stock = [];
  
  for (const product of products) {
    let row = stored.get(product);
    const derivedOpening = await deriveOpeningStock(stationId, product, businessDate, row);
    const openingStockLitres = derivedOpening.openingStockLitres;

    const receiptStockLitres = receipts.get(product) || 0;
    const actualSalesLitres = meterRegisters[product].totalMeterSale;
    const totalAvailableLitres = openingStockLitres != null ? Number((openingStockLitres + receiptStockLitres).toFixed(2)) : null;
    const calculatedClosingStockLitres = totalAvailableLitres != null ? Number((totalAvailableLitres - actualSalesLitres).toFixed(2)) : null;

    const productTanks = configuredTanks.filter((tank) => tank.product === product);
    const hasMultipleTanks = productTanks.length > 1;
    const tank = productTanks.length === 1 ? productTanks[0] : null;

    let actualDipStockLitres = row?.actualDipStockLitres ?? null;
    let productDip = row?.productDip ?? null;

    let calibrationStatus = "NO_DIP";
    let minCalDip = null;
    let maxCalDip = null;
    let calPoints = [];

    if (hasMultipleTanks) {
      calibrationStatus = "MULTIPLE_TANKS_AMBIGUOUS";
    } else if (tank) {
      calPoints = calibrationMap.get(tank._id.toString()) || [];
      if (calPoints.length > 0) {
        minCalDip = calPoints[0].dipCm;
        maxCalDip = calPoints[calPoints.length - 1].dipCm;
      }

      if (productDip != null) {
        if (!calPoints || calPoints.length === 0) {
          calibrationStatus = "MISSING_CALIBRATION";
        } else if (productDip < minCalDip || productDip > maxCalDip) {
          calibrationStatus = "OUT_OF_RANGE";
        } else {
          calibrationStatus = "VALID";
          const converted = interpolateVolume(productDip, calPoints, tank.capacityLitres);
          if (converted != null) {
            actualDipStockLitres = converted;
          }
        }
      }
    } else if (productDip != null) {
      calibrationStatus = "NO_ACTIVE_TANK";
    }

    // Formula from physical register heading: अन्तर (6-8) = Closing Stock - Actual Dip Stock
    const variationLitres = (calculatedClosingStockLitres != null && actualDipStockLitres != null) 
      ? Number((calculatedClosingStockLitres - actualDipStockLitres).toFixed(2)) 
      : null;

    stock.push({
      product,
      hasStockRecord: Boolean(row),
      openingStockLitres,
      openingStockType: derivedOpening.openingStockType,
      openingStockSource: derivedOpening.openingStockSource,
      lastConfirmedDipDate: derivedOpening.lastConfirmedDipDate,
      openingStockCheckpointDate: derivedOpening.openingStockCheckpointDate,
      lastConfirmedDipLitres: derivedOpening.lastConfirmedDipLitres,
      interveningReceiptsLitres: derivedOpening.interveningReceiptsLitres,
      interveningSalesLitres: derivedOpening.interveningSalesLitres,
      isManualOpeningCorrection: Boolean(row?.isManualOpeningCorrection),
      openingCorrectionReason: row?.openingCorrectionReason || null,
      openingCorrectionAt: row?.openingCorrectionAt || null,
      productDip,
      actualDipStockLitres,
      waterDip: row?.waterDip ?? null,
      waterDipVolumeLitres: row?.waterDipVolumeLitres ?? null,
      receiptStockLitres,
      totalAvailableLitres,
      actualSalesLitres,
      calculatedClosingStockLitres,
      variationLitres,
      tankNumber: tank?.tankNumber ?? null,
      capacityLitres: tank?.capacityLitres ?? null,
      calibrationStatus,
      minCalDip,
      maxCalDip,
      calibrationPoints: calPoints,
      calibrationTankId: tank?._id?.toString() ?? null,
      hasMultipleTanks,
      meterRegister: meterRegisters[product]
    });
  }

  const tanksWithCalibration = configuredTanks.map((tank) => ({
    ...tank,
    calibrationPoints: calibrationMap.get(tank._id.toString()) || []
  }));

  return { stock, tanks: tanksWithCalibration };
};
