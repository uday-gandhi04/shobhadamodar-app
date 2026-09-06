// src/models/FuelRate.js
import mongoose from 'mongoose';

/**
 * @typedef {Object} FuelRate
 * @property {string} businessDate - Date string in 'YYYY-MM-DD' format (avoids UTC offset shifts)
 * @property {number} petrolRatePaise - Rate in paise (e.g., ₹101.50 = 10150 paise)
 * @property {number} dieselRatePaise - Rate in paise (e.g., ₹94.80 = 9480 paise)
 */
const fuelRateSchema = new mongoose.Schema(
  {
    businessDate: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      unique: true,
      index: true,
    },
    petrolRatePaise: {
      type: Number,
      required: true,
      set: (val) => Math.round(val),
    },
    dieselRatePaise: {
      type: Number,
      required: true,
      set: (val) => Math.round(val),
    },
    setBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const FuelRate = mongoose.model('FuelRate', fuelRateSchema);
export default FuelRate;