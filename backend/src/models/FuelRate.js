import mongoose from 'mongoose';
import { getRateEffectiveTimeForDate } from '../services/fuelRateService.js';

/**
 * @typedef {Object} FuelRate
 * @property {string} businessDate - Date string in 'YYYY-MM-DD' format (avoids UTC offset shifts)
 * @property {Date} [effectiveAt] - Exact timestamp when rate becomes effective (06:00:00 IST on businessDate)
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
    effectiveAt: {
      type: Date,
      index: true,
      default: function () {
        return this.businessDate ? getRateEffectiveTimeForDate(this.businessDate) : undefined;
      },
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

fuelRateSchema.pre('save', function (next) {
  if (!this.effectiveAt && this.businessDate) {
    this.effectiveAt = getRateEffectiveTimeForDate(this.businessDate);
  }
  next();
});

const FuelRate = mongoose.model('FuelRate', fuelRateSchema);
export default FuelRate;