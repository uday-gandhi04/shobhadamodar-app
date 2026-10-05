import mongoose from "mongoose";

const dailyStockSchema = new mongoose.Schema({
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: "Station", required: true },
  businessDate: { type: String, required: true },
  product: { type: String, enum: ["PETROL", "DIESEL"], required: true },
  openingStockLitres: { type: Number, required: true, min: 0 },
  productDip: { type: Number, min: 0, default: null },
  actualDipStockLitres: { type: Number, min: 0, default: null },
  waterDip: { type: Number, min: 0, default: null },
  waterDipVolumeLitres: { type: Number, min: 0, default: null },
}, { timestamps: true });

dailyStockSchema.index({ stationId: 1, businessDate: 1, product: 1 }, { unique: true });
export default mongoose.model("DailyStock", dailyStockSchema);
