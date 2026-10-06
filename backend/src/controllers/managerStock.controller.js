import Station from "../models/Station.js";
import DailyStock from "../models/DailyStock.js";
import FuelReceipt from "../models/FuelReceipt.js";
import DailyDensity from "../models/DailyDensity.js";
import Shift from "../models/Shift.js";
import Tank from "../models/Tank.js";
import { recordAuditLog } from "../utils/auditLog.js";

const products = ["PETROL", "DIESEL"];
const activeStation = async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  if (!station) { const error = new Error("No active station is configured."); error.status = 503; throw error; }
  return station;
};

export const getManagerStock = async (req, res, next) => {
  try {
    const station = await activeStation(); const { date: businessDate } = req.query;
    const [stockRows, receiptGroups, sales, configuredTanks] = await Promise.all([
      DailyStock.find({ stationId: station._id, businessDate }).lean(),
      FuelReceipt.aggregate([{ $match: { stationId: station._id, businessDate } }, { $group: { _id: "$product", receiptStockLitres: { $sum: "$quantityLitres" } } }]),
      Shift.aggregate([{ $match: { businessDate, status: { $in: ["ENDED", "FORCE_CLOSED"] } } }, { $group: { _id: null, petrol: { $sum: "$totalLitresPetrol" }, diesel: { $sum: "$totalLitresDiesel" } } }]),
      Tank.find({ stationId: station._id, isActive: true }).sort({ product: 1, tankNumber: 1 }).lean(),
    ]);
    const stored = new Map(stockRows.map((row) => [row.product, row])); const receipts = new Map(receiptGroups.map((row) => [row._id, Number(row.receiptStockLitres || 0)])); const salesRow = sales[0] || {};
    const stock = products.map((product) => {
      const row = stored.get(product); const hasStockRecord = Boolean(row); const openingStockLitres = hasStockRecord ? Number(row.openingStockLitres) : null; const receiptStockLitres = receipts.get(product) || 0; const actualSalesLitres = Number(product === "PETROL" ? salesRow.petrol || 0 : salesRow.diesel || 0); const totalAvailableLitres = hasStockRecord ? openingStockLitres + receiptStockLitres : null; const calculatedClosingStockLitres = totalAvailableLitres == null ? null : totalAvailableLitres - actualSalesLitres; const actualDipStockLitres = row?.actualDipStockLitres ?? null; const productTanks = configuredTanks.filter((tank) => tank.product === product); const tank = productTanks.length === 1 ? productTanks[0] : null;
      return { product, hasStockRecord, openingStockLitres, productDip: row?.productDip ?? null, actualDipStockLitres, waterDip: row?.waterDip ?? null, waterDipVolumeLitres: row?.waterDipVolumeLitres ?? null, receiptStockLitres, totalAvailableLitres, actualSalesLitres, calculatedClosingStockLitres, variationLitres: actualDipStockLitres == null || calculatedClosingStockLitres == null ? null : actualDipStockLitres - calculatedClosingStockLitres, tankNumber: tank?.tankNumber ?? null, capacityLitres: tank?.capacityLitres ?? null };
    });
    res.json({ success: true, data: { businessDate, stock, tanks: configuredTanks.map(({ _id, tankNumber, product, capacityLitres }) => ({ _id, tankNumber, product, capacityLitres })) } });
  } catch (error) { next(error); }
};
export const upsertManagerStock = async (req, res, next) => {
  try {
    const station = await activeStation();
    const { businessDate, product, ...values } = req.body;
    const stock = await DailyStock.findOneAndUpdate(
      { stationId: station._id, businessDate, product },
      { $set: values, $setOnInsert: { stationId: station._id, businessDate, product } },
      { new: true, upsert: true, runValidators: true },
    );
    await recordAuditLog({
      actor: req.user,
      action: "STOCK_UPSERTED",
      entityType: "STOCK",
      entityId: stock._id,
      metadata: { businessDate, product },
    });
    res.json({ success: true, data: stock });
  } catch (error) { next(error); }
};
export const getManagerDensity = async (req, res, next) => { try { const station = await activeStation(); const records = await DailyDensity.find({ stationId: station._id, businessDate: req.query.date }).lean(); res.json({ success: true, data: records }); } catch (error) { next(error); } };
export const upsertManagerDensity = async (req, res, next) => {
  try {
    const station = await activeStation();
    const { businessDate, product, ...values } = req.body;
    const record = await DailyDensity.findOneAndUpdate(
      { stationId: station._id, businessDate, product },
      { $set: values, $setOnInsert: { stationId: station._id, businessDate, product } },
      { new: true, upsert: true, runValidators: true },
    );
    await recordAuditLog({
      actor: req.user,
      action: "DENSITY_UPSERTED",
      entityType: "DENSITY",
      entityId: record._id,
      metadata: { businessDate, product },
    });
    res.json({ success: true, data: record });
  } catch (error) { next(error); }
};
export const getManagerReceipts = async (req, res, next) => { try { const station = await activeStation(); const receipts = await FuelReceipt.find({ stationId: station._id, businessDate: req.query.date }).sort({ createdAt: -1 }).lean(); res.json({ success: true, data: receipts }); } catch (error) { next(error); } };
export const createManagerReceipt = async (req, res, next) => {
  try {
    const station = await activeStation();
    const receipt = await FuelReceipt.create({ ...req.body, stationId: station._id });
    await recordAuditLog({
      actor: req.user,
      action: "FUEL_RECEIPT_CREATED",
      entityType: "FUEL_RECEIPT",
      entityId: receipt._id,
      metadata: {
        businessDate: receipt.businessDate,
        product: receipt.product,
        invoiceNumber: receipt.invoiceNumber,
      },
    });
    res.status(201).json({ success: true, data: receipt });
  } catch (error) { next(error); }
};
