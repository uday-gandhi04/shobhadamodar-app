// src/models/Mpd.js
import mongoose from 'mongoose';

const nozzleSchema = new mongoose.Schema({
  nozzleId: {
    type: String, // e.g. 'n1', 'n2', 'n3', 'n4'
    required: true,
  },
  nozzleNumber: {
    type: Number,
  },
  name: {
    type: String, // e.g. 'N1 - Petrol'
    required: true,
  },
  fuelType: {
    type: String,
    enum: ['PETROL', 'DIESEL'],
    required: true,
  },
  currentCumulativeReading: {
    type: Number,
    required: true,
    default: 0.0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const mpdSchema = new mongoose.Schema(
  {
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station',
      required: true,
    },
    mpdNumber: {
      type: String, // e.g. 'MPD 1', 'MPD 2'
      required: true,
    },
    serialNumber: {
      type: String, // Machine serial number from the dispenser plate
      trim: true,
    },
    nozzles: [nozzleSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

mpdSchema.index({ stationId: 1, mpdNumber: 1 });

const Mpd = mongoose.model('Mpd', mpdSchema);
export default Mpd;