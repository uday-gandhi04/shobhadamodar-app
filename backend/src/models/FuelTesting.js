import mongoose from "mongoose";

const fuelTestingSchema = new mongoose.Schema(
  {
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      required: true,
      index: true,
    },
    businessDate: {
      type: String, // "YYYY-MM-DD"
      required: true,
      index: true,
    },
    product: {
      type: String,
      enum: ["PETROL", "DIESEL"],
      required: true,
      index: true,
    },
    testingQuantityLitres: {
      type: Number,
      required: true,
      min: 0.01,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isCorrection: {
      type: Boolean,
      default: false,
    },
    correctionReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

fuelTestingSchema.index({ stationId: 1, businessDate: 1, product: 1 });
fuelTestingSchema.index({ stationId: 1, product: 1, businessDate: -1 });

export default mongoose.model("FuelTesting", fuelTestingSchema);
