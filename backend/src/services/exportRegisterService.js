import ExcelJS from "exceljs";
import Mpd from "../models/Mpd.js";
import Tank from "../models/Tank.js";
import TankCalibration from "../models/TankCalibration.js";
import DailyStock from "../models/DailyStock.js";
import DailyMeterRegister from "../models/DailyMeterRegister.js";
import FuelReceipt from "../models/FuelReceipt.js";
import Shift from "../models/Shift.js";
import {
  getProductRegisterNozzles,
  deriveNozzleOpeningReading,
  deriveOpeningStock,
  interpolateVolume,
} from "./stockRegisterService.js";

// Ensure business date string "YYYY-MM-DD" is valid
const getDaysInMonth = (monthStr) => {
  const [year, month] = monthStr.split("-");
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(`${year}-${month}-${String(i).padStart(2, "0")}`);
  }
  return days;
};

export const getMonthlyRegisterReportData = async (stationId, monthStr) => {
  const days = getDaysInMonth(monthStr);
  const products = ["PETROL", "DIESEL"];
  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  // Batch query all collections needed for the month in one parallel round trip
  const [
    mpds,
    tanks,
    calibrations,
    monthStock,
    monthMeterDocs,
    monthReceipts,
    monthFinalizedShifts,
  ] = await Promise.all([
    Mpd.find({ stationId, isActive: true }).sort({ mpdNumber: 1 }).lean(),
    Tank.find({ stationId, isActive: true }).sort({ product: 1, tankNumber: 1 }).lean(),
    TankCalibration.find().lean(),
    DailyStock.find({ stationId, businessDate: { $gte: firstDay, $lte: lastDay } }).lean(),
    DailyMeterRegister.find({ stationId, businessDate: { $gte: firstDay, $lte: lastDay } }).lean(),
    FuelReceipt.find({ stationId, businessDate: { $gte: firstDay, $lte: lastDay } }).lean(),
    Shift.find({ businessDate: { $gte: firstDay, $lte: lastDay }, status: { $in: ["ENDED", "FORCE_CLOSED"] } }).sort({ startedAt: 1 }).lean(),
  ]);

  const calibrationMap = new Map(calibrations.map((c) => [c.tankId.toString(), c.points]));

  // Index month data by date and product
  const stockByDateProduct = new Map();
  monthStock.forEach((s) => stockByDateProduct.set(`${s.businessDate}_${s.product}`, s));

  const meterDocsByDateProduct = new Map();
  monthMeterDocs.forEach((m) => meterDocsByDateProduct.set(`${m.businessDate}_${m.product}`, m));

  const receiptsByDateProduct = new Map();
  monthReceipts.forEach((r) => {
    const key = `${r.businessDate}_${r.product}`;
    receiptsByDateProduct.set(key, (receiptsByDateProduct.get(key) || 0) + (r.quantityLitres || 0));
  });

  const shiftsByDate = new Map();
  monthFinalizedShifts.forEach((s) => {
    if (!shiftsByDate.has(s.businessDate)) shiftsByDate.set(s.businessDate, []);
    shiftsByDate.get(s.businessDate).push(s);
  });

  // Track carry-forward state across days for each product and nozzle
  const nozzleCarry = new Map();
  const stockCarry = new Map();

  for (const product of products) {
    const specs = getProductRegisterNozzles(product, mpds);
    for (const spec of specs) {
      const key = `${product}_${spec.registerNozzle}`;
      const derived = await deriveNozzleOpeningReading(stationId, product, spec.registerNozzle, firstDay);
      nozzleCarry.set(key, {
        openingReading: derived.openingReading,
        carriedForwardFromDate: derived.carriedForwardFromDate,
        source: derived.source,
      });
    }

    const derivedStock = await deriveOpeningStock(stationId, product, firstDay);
    stockCarry.set(product, {
      openingStockLitres: derivedStock.openingStockLitres,
      checkpointDate: derivedStock.openingStockCheckpointDate || derivedStock.lastConfirmedDipDate,
      checkpointLitres: derivedStock.lastConfirmedDipLitres,
      interveningReceipts: derivedStock.interveningReceiptsLitres || 0,
      interveningSales: derivedStock.interveningSalesLitres || 0,
    });
  }

  // Iterate day by day in chronological order
  const dailyDataByDateAndProduct = new Map();

  for (const day of days) {
    const dayShifts = shiftsByDate.get(day) || [];

    for (const product of products) {
      const specs = getProductRegisterNozzles(product, mpds);
      const meterDoc = meterDocsByDateProduct.get(`${day}_${product}`);
      const stockDoc = stockByDateProduct.get(`${day}_${product}`);
      const dayReceiptLitres = receiptsByDateProduct.get(`${day}_${product}`) || 0;

      // --- METER REGISTER FOR DAY ---
      const nozzleRows = [];
      let allNozzlesComplete = true;
      let totalValidSale = 0;
      let anyNozzleHasSale = false;

      for (const spec of specs) {
        const key = `${product}_${spec.registerNozzle}`;
        const nzDoc = meterDoc?.nozzles?.find((n) => n.registerNozzle === spec.registerNozzle);
        const carry = nozzleCarry.get(key) || { openingReading: null, carriedForwardFromDate: null, source: "MISSING" };

        let openingReading = null;

        if (nzDoc?.isManualOpeningCorrection && nzDoc.openingReading != null) {
          openingReading = nzDoc.openingReading;
        } else if (nzDoc?.openingReading != null) {
          openingReading = nzDoc.openingReading;
        } else {
          openingReading = carry.openingReading;
        }

        const nozzleShifts = dayShifts.filter((s) => s.mpdId.toString() === spec.mpdId);
        const nozzleReadings = nozzleShifts
          .map((s) => s.readings?.find((r) => r.nozzleId === spec.nozzleId && r.fuelType === product))
          .filter(Boolean);
        const hasShiftActivity = nozzleReadings.length > 0;
        const shiftClosing = hasShiftActivity ? nozzleReadings[nozzleReadings.length - 1].closingReading : null;
        const shiftLitres = hasShiftActivity
          ? Number(nozzleReadings.reduce((sum, r) => sum + (r.dispensedLitres || 0), 0).toFixed(2))
          : null;

        let closingReading = null;
        let sale = null;

        if (nzDoc) {
          const recordedClosing = nzDoc.closingReading ?? ((nzDoc.openingReading != null && nzDoc.recordedSale != null) ? Number((nzDoc.openingReading + nzDoc.recordedSale).toFixed(2)) : null);
          closingReading = recordedClosing;
          sale = nzDoc.recordedSale ?? ((closingReading != null && openingReading != null) ? Number((closingReading - openingReading).toFixed(2)) : null);
        } else if (hasShiftActivity) {
          closingReading = shiftClosing;
          sale = shiftLitres;
        } else if (openingReading != null) {
          closingReading = openingReading;
          sale = 0.0;
        }

        if (sale != null && sale >= 0) {
          totalValidSale += sale;
          anyNozzleHasSale = true;
        } else {
          allNozzlesComplete = false;
        }

        nozzleRows.push({
          nozzleIndex: spec.registerNozzle,
          openingReading,
          closingReading,
          sale,
        });

        // Update carry-forward for next chronological day
        if (closingReading != null) {
          nozzleCarry.set(key, {
            openingReading: closingReading,
            carriedForwardFromDate: day,
            source: "CARRIED_FORWARD",
          });
        } else if (openingReading != null) {
          nozzleCarry.set(key, {
            openingReading: openingReading,
            carriedForwardFromDate: carry.carriedForwardFromDate || day,
            source: "CARRIED_FORWARD",
          });
        } else {
          nozzleCarry.set(key, {
            openingReading: null,
            carriedForwardFromDate: null,
            source: "MISSING",
          });
        }
      }

      let totalMeterSale = null;
      if (meterDoc?.recordedTotalMeterSale != null) {
        totalMeterSale = meterDoc.recordedTotalMeterSale;
      } else if (allNozzlesComplete || anyNozzleHasSale) {
        totalMeterSale = Number(totalValidSale.toFixed(2));
      } else {
        totalMeterSale = null;
      }

      // --- STOCK REGISTER FOR DAY ---
      const sCarry = stockCarry.get(product);
      let openingStockLitres = null;

      if (stockDoc?.openingStockLitres != null) {
        openingStockLitres = stockDoc.openingStockLitres;
      } else if (sCarry.openingStockLitres != null) {
        openingStockLitres = sCarry.openingStockLitres;
      }

      const receiptStockLitres = stockDoc?.receiptStockLitres ?? (dayReceiptLitres > 0 ? dayReceiptLitres : null);
      const totalAvailableLitres = (openingStockLitres != null || receiptStockLitres != null)
        ? Number(((openingStockLitres || 0) + (receiptStockLitres || 0)).toFixed(2))
        : null;

      const actualSalesLitres = totalMeterSale != null
        ? totalMeterSale
        : (totalValidSale > 0 ? Number(totalValidSale.toFixed(2)) : null);

      const calculatedClosingStockLitres = (totalAvailableLitres != null && actualSalesLitres != null)
        ? Number((totalAvailableLitres - actualSalesLitres).toFixed(2))
        : null;

      const productTank = tanks.find((t) => t.product === product);
      const calibrationPoints = productTank ? calibrationMap.get(productTank._id.toString()) || [] : [];

      let productDip = stockDoc?.productDip ?? null;
      let actualDipStockLitres = stockDoc?.actualDipStockLitres ?? null;
      if (productDip != null && actualDipStockLitres == null && calibrationPoints.length > 0) {
        actualDipStockLitres = interpolateVolume(productDip, calibrationPoints);
      }

      let variationLitres = null;
      if (actualDipStockLitres != null && calculatedClosingStockLitres != null) {
        variationLitres = Number((calculatedClosingStockLitres - actualDipStockLitres).toFixed(2));
      }

      // Update stock carry-forward for next day
      if (actualDipStockLitres != null && actualDipStockLitres > 0) {
        stockCarry.set(product, {
          openingStockLitres: actualDipStockLitres,
          checkpointDate: day,
          checkpointLitres: actualDipStockLitres,
          interveningReceipts: 0,
          interveningSales: 0,
        });
      } else if (sCarry.checkpointLitres != null) {
        const newReceipts = sCarry.interveningReceipts + (receiptStockLitres || 0);
        const newSales = sCarry.interveningSales + (actualSalesLitres || 0);
        const prov = Number((sCarry.checkpointLitres + newReceipts - newSales).toFixed(2));
        stockCarry.set(product, {
          openingStockLitres: prov,
          checkpointDate: sCarry.checkpointDate,
          checkpointLitres: sCarry.checkpointLitres,
          interveningReceipts: newReceipts,
          interveningSales: newSales,
        });
      }

      dailyDataByDateAndProduct.set(`${day}_${product}`, {
        meter: {
          nozzles: nozzleRows,
          totalMeterSale,
          pumpTesting: meterDoc?.pumpTestingLitres ?? null,
          remarks: meterDoc?.remarks || "",
        },
        stock: {
          openingStockLitres,
          receiptStockLitres,
          totalAvailableLitres,
          actualSalesLitres,
          calculatedClosingStockLitres,
          productDip,
          actualDipStockLitres,
          variationLitres,
          waterDip: stockDoc?.waterDip ?? null,
          waterDipVolumeLitres: stockDoc?.waterDipVolumeLitres ?? null,
        },
      });
    }
  }

  // Build sheets
  const sheets = [];
  for (const product of products) {
    const productLabel = product === "PETROL" ? "MS" : "HSD";

    // 1. Meter Sheet
    const meterRows = days.map((day) => {
      const d = dailyDataByDateAndProduct.get(`${day}_${product}`);
      return {
        date: day,
        nozzles: d.meter.nozzles,
        totalMeterSale: d.meter.totalMeterSale,
        pumpTesting: d.meter.pumpTesting,
        remarks: d.meter.remarks,
      };
    });

    sheets.push({
      id: `${productLabel}_METER`,
      sheetName: `${productLabel} Meter Register`,
      product,
      productLabel,
      type: "METER",
      rows: meterRows,
    });

    // 2. Stock Sheet
    const stockRows = days.map((day) => {
      const d = dailyDataByDateAndProduct.get(`${day}_${product}`);
      return {
        date: day,
        ...d.stock,
      };
    });

    sheets.push({
      id: `${productLabel}_STOCK`,
      sheetName: `${productLabel} Stock Register`,
      product,
      productLabel,
      type: "STOCK",
      rows: stockRows,
    });
  }

  return {
    month: monthStr,
    days,
    sheets,
  };
};

export const generateMonthlyExcel = async (stationId, monthStr) => {
  const reportData = await getMonthlyRegisterReportData(stationId, monthStr);
  const { days, sheets } = reportData;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Shobhadamodar Petroleum";
  workbook.lastModifiedBy = "Shobhadamodar Petroleum";
  workbook.created = new Date();

  // Style helpers
  const borderAll = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  const subHeaderFont = { bold: true, size: 11 };

  for (const sheetData of sheets) {
    if (sheetData.type === "METER") {
      const meterSheet = workbook.addWorksheet(sheetData.sheetName);
      meterSheet.mergeCells("A1:L1");
      meterSheet.getCell("A1").value = `Shobhadamodar Petroleum - ${sheetData.sheetName} - ${monthStr}`;
      meterSheet.getCell("A1").font = { bold: true, size: 14 };
      meterSheet.getCell("A1").alignment = { horizontal: "center" };

      // Header Row 1 (Nozzle Groups)
      const meterHeaders1 = [
        "Date",
        "Nozzle 1", "",
        "Nozzle 2", "",
        "Nozzle 3", "",
        "Nozzle 4", "",
        "Total Meter Sale",
        "Pump Testing",
        "Remarks",
      ];
      meterSheet.addRow(meterHeaders1);
      meterSheet.mergeCells("B2:C2"); // Nozzle 1
      meterSheet.mergeCells("D2:E2"); // Nozzle 2
      meterSheet.mergeCells("F2:G2"); // Nozzle 3
      meterSheet.mergeCells("H2:I2"); // Nozzle 4

      const meterHeaders2 = [
        "",
        "Opening", "Sale",
        "Opening", "Sale",
        "Opening", "Sale",
        "Opening", "Sale",
        "", "", "",
      ];
      meterSheet.addRow(meterHeaders2);

      [2, 3].forEach((rowNum) => {
        const row = meterSheet.getRow(rowNum);
        row.font = subHeaderFont;
        row.alignment = { horizontal: "center" };
        row.eachCell((cell) => {
          cell.border = borderAll;
        });
      });

      meterSheet.getColumn(1).width = 12; // Date
      for (let i = 2; i <= 9; i++) meterSheet.getColumn(i).width = 12; // Open/Sale
      meterSheet.getColumn(10).width = 16; // Total
      meterSheet.getColumn(11).width = 15; // Testing
      meterSheet.getColumn(12).width = 20; // Remarks

      for (const mRow of sheetData.rows) {
        const row = [mRow.date];
        for (let i = 0; i < 4; i++) {
          const n = mRow.nozzles[i] || {};
          row.push(n.openingReading ?? "");
          row.push(n.sale ?? "");
        }
        row.push(mRow.totalMeterSale ?? "");
        row.push(mRow.pumpTesting ?? "");
        row.push(mRow.remarks ?? "");

        const addedRow = meterSheet.addRow(row);
        addedRow.eachCell((cell) => {
          cell.border = borderAll;
        });
      }
    } else if (sheetData.type === "STOCK") {
      const stockSheet = workbook.addWorksheet(sheetData.sheetName);
      stockSheet.mergeCells("A1:K1");
      stockSheet.getCell("A1").value = `Shobhadamodar Petroleum - ${sheetData.sheetName} - ${monthStr}`;
      stockSheet.getCell("A1").font = { bold: true, size: 14 };
      stockSheet.getCell("A1").alignment = { horizontal: "center" };

      const stockHeaders = [
        "Date",
        "Opening Stock",
        "Receipt Stock",
        "Total Available",
        "Actual Sales",
        "Closing Stock",
        "Product Dip (cm)",
        "Actual Dip Stock (L)",
        "Variation",
        "Water Dip (cm)",
        "Water Dip Volume (L)",
      ];
      stockSheet.addRow(stockHeaders);

      const stockHeaderRow = stockSheet.getRow(2);
      stockHeaderRow.font = subHeaderFont;
      stockHeaderRow.alignment = { horizontal: "center" };
      stockHeaderRow.eachCell((cell) => {
        cell.border = borderAll;
      });

      stockSheet.columns.forEach((col) => {
        col.width = 15;
      });

      for (const sRow of sheetData.rows) {
        const row = [
          sRow.date,
          sRow.openingStockLitres ?? "",
          sRow.receiptStockLitres ?? "",
          sRow.totalAvailableLitres ?? "",
          sRow.actualSalesLitres ?? "",
          sRow.calculatedClosingStockLitres ?? "",
          sRow.productDip ?? "",
          sRow.actualDipStockLitres ?? "",
          sRow.variationLitres ?? "",
          sRow.waterDip ?? "",
          sRow.waterDipVolumeLitres ?? "",
        ];
        const addedRow = stockSheet.addRow(row);
        addedRow.eachCell((cell) => {
          cell.border = borderAll;
        });
      }
    }
  }

  return workbook;
};
