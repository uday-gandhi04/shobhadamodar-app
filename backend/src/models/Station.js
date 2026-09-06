// src/models/Station.js
import mongoose from 'mongoose';

/**
 * @typedef {Object} Station
 * @property {string} name - Retail outlet name
 * @property {string} roCode - BPCL Retail Outlet code
 * @property {string} location - Physical location/city
 * @property {string} timezone - Operational timezone (default: Asia/Kolkata)
 */
const stationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: 'Shobhadamodar Petroleum',
    },
    roCode: {
      type: String,
      trim: true,
      default: 'BPCL-RO-DEFAULT',
    },
    location: {
      type: String,
      default: 'Maharashtra, India',
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Station = mongoose.model('Station', stationSchema);
export default Station;