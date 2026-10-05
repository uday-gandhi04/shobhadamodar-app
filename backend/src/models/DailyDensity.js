import mongoose from "mongoose";

const dailyDensitySchema = new mongoose.Schema({
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: "Station", required: true },
  businessDate: { type: String, required: true },
  product: { type: String, enum: ["PETROL", "DIESEL"], required: true },
  hydrometerReading: { type: Number, required: true, min: 0 },
  temperatureC: { type: Number, required: true, min: 0 },
  density15: { type: Number, required: true, min: 0 },
}, { timestamps: true });
dailyDensitySchema.index({ stationId: 1, businessDate: 1, product: 1 }, { unique: true });
export default mongoose.model("DailyDensity", dailyDensitySchema);
