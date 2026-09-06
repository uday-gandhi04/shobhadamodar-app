// src/models/Customer.js
import mongoose from 'mongoose';

/**
 * @typedef {Object} Customer
 * @property {string} name - Name of the person or transport company
 * @property {string} vehicleNumber - Optional vehicle registration
 * @property {string} phoneNumber - Contact number
 * @property {number} outstandingBalance - Current credit balance strictly in integer paise (₹1 = 100 paise)
 */
const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    outstandingBalance: {
      type: Number,
      default: 0,
      // Hard architectural constraint: Enforce integer (paise) storage at the schema level
      set: (val) => Math.round(val),
    },
  },
  { timestamps: true }
);

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;