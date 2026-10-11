import mongoose from "mongoose";

const calibrationPointSchema = new mongoose.Schema({
  dipCm: { type: Number, required: true, min: 0 },
  volumeLitres: { type: Number, required: true, min: 0 },
}, { _id: false });

const tankCalibrationSchema = new mongoose.Schema({
  tankId: { type: mongoose.Schema.Types.ObjectId, ref: "Tank", required: true, unique: true },
  points: {
    type: [calibrationPointSchema],
    default: [],
    validate: {
      validator: function(points) {
        // Ensure points are sorted by dipCm and there are no duplicates
        if (points.length < 2) return true;
        for (let i = 1; i < points.length; i++) {
          if (points[i].dipCm <= points[i - 1].dipCm) {
            return false;
          }
        }
        return true;
      },
      message: "Calibration points must be strictly increasing by dip (cm)."
    }
  },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

export default mongoose.model("TankCalibration", tankCalibrationSchema);
