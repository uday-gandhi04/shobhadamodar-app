import mongoose from "mongoose";

const meterNozzleReadingSchema = new mongoose.Schema(
  {
    registerNozzle: { type: Number, required: true }, // 1, 2, 3, 4
    nozzleId: { type: String, required: true },       // 'n1', 'n2', 'n3', 'n4'
    mpdNumber: { type: String, required: true },      // 'MPD 1', 'MPD 2'
    openingReading: { type: Number, default: null },
    closingReading: { type: Number, default: null },
    recordedSale: { type: Number, default: null },
    isManualOpeningCorrection: { type: Boolean, default: false },
    openingCorrectionReason: { type: String, default: null },
    openingCorrectionBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    openingCorrectionAt: { type: Date, default: null },
  },
  { _id: false }
);

const dailyMeterRegisterSchema = new mongoose.Schema(
  {
    stationId: { type: mongoose.Schema.Types.ObjectId, ref: "Station", required: true },
    businessDate: { type: String, required: true },
    product: { type: String, enum: ["PETROL", "DIESEL"], required: true },
    nozzles: [meterNozzleReadingSchema],
    recordedTotalMeterSale: { type: Number, default: null },
    pumpTestingLitres: { type: Number, default: null },
    remarks: { type: String, default: "" },
    sourceType: {
      type: String,
      enum: ["HISTORICAL_TRANSCRIBED", "SHIFT_FINALIZED", "MANUAL_INITIALIZED"],
      default: "HISTORICAL_TRANSCRIBED",
    },
  },
  { timestamps: true }
);

dailyMeterRegisterSchema.index({ stationId: 1, businessDate: 1, product: 1 }, { unique: true });
dailyMeterRegisterSchema.index({ stationId: 1, product: 1, businessDate: -1 });

export default mongoose.model("DailyMeterRegister", dailyMeterRegisterSchema);
