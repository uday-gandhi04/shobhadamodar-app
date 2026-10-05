import mongoose from "mongoose";

const optionalNumber = { type: Number, min: 0, default: null };
const fuelReceiptSchema = new mongoose.Schema({
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: "Station", required: true },
  businessDate: { type: String, required: true },
  product: { type: String, enum: ["PETROL", "DIESEL"], required: true },
  invoiceNumber: { type: String, required: true, trim: true },
  quantityLitres: { type: Number, required: true, min: 0 },
  supplierName: { type: String, trim: true, default: "" },
  tankerNumber: { type: String, trim: true, default: "" },
  beforeHydrometer: optionalNumber, beforeTemperatureC: optionalNumber, beforeDensity15: optionalNumber,
  challanDensity15: optionalNumber, beforeDensityDifference: { type: Number, default: null },
  afterHydrometer: optionalNumber, afterTemperatureC: optionalNumber, afterDensity15: optionalNumber,
  afterChallanDensity15: optionalNumber, afterDensityDifference: { type: Number, default: null },
}, { timestamps: true });
fuelReceiptSchema.index({ stationId: 1, businessDate: 1 });
fuelReceiptSchema.index({ invoiceNumber: 1 });
export default mongoose.model("FuelReceipt", fuelReceiptSchema);
