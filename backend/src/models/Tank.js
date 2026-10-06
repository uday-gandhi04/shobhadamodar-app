import mongoose from "mongoose";

const tankSchema = new mongoose.Schema({
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: "Station", required: true },
  tankNumber: { type: String, required: true, trim: true, uppercase: true },
  product: { type: String, enum: ["PETROL", "DIESEL"], required: true },
  capacityLitres: {
    type: Number,
    required: true,
    min: 0.01,
    validate: {
      validator: (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
      message: "Tank capacity must have no more than two decimal places.",
    },
  },
  isActive: { type: Boolean, default: true, required: true },
}, { timestamps: true });

tankSchema.index({ stationId: 1, tankNumber: 1 }, { unique: true });

export default mongoose.model("Tank", tankSchema);
