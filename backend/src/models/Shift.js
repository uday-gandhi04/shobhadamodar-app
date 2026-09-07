// src/models/Shift.js
import mongoose from "mongoose";

const readingEntrySchema = new mongoose.Schema({
  nozzleId: { type: String, required: true },
  fuelType: { type: String, enum: ["PETROL", "DIESEL"], required: true },
  openingReading: { type: Number, required: true },
  closingReading: { type: Number, required: true },
  dispensedLitres: { type: Number, required: true },
  ratePaise: { type: Number, required: true },
  expectedSalePaise: { type: Number, required: true },
});

const cashDenominationSchema = new mongoose.Schema({
  denomination: { type: Number, required: true }, // 500, 200, 100, 50, 20, 10, 5, 2, 1
  count: { type: Number, required: true, min: 0 },
  totalPaise: { type: Number, required: true },
});

const udhariEntrySchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  amountPaise: { type: Number, required: true },
});

const shiftSchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    businessDate: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      index: true,
    },
    shiftType: {
      type: String,
      enum: ["MORNING", "EVENING", "NIGHT"],
      required: true,
    },
    mpdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mpd",
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "OPEN",
        "IN_PROGRESS",
        "SUBMITTED",
        "UNDER_REVIEW",
        "FINALIZED",
        "FORCE_CLOSED",
      ],
      default: "OPEN",
    },
    startedAt: {
      type: Date,
    },
    submittedAt: {
      type: Date,
    },

    // 1. Physical Fuel Accounting
    readings: [readingEntrySchema],
    totalLitresPetrol: { type: Number, default: 0 },
    totalLitresDiesel: { type: Number, default: 0 },
    expectedTotalSalePaise: { type: Number, required: true },

    // 2. Collections Breakdown
    cashCollections: [cashDenominationSchema],
    totalCashPaise: { type: Number, default: 0 },
    totalUpiPaise: { type: Number, default: 0 },
    totalCardPaise: { type: Number, default: 0 },
    udhariEntries: [udhariEntrySchema],
    totalUdhariPaise: { type: Number, default: 0 },
    totalCollectedPaise: { type: Number, required: true },

    // 3. Reconciliation
    differencePaise: { type: Number, required: true }, // Total Collected - Expected Sale
    reconciliationStatus: {
      type: String,
      enum: ["MATCHED", "SHORT", "EXCESS"],
      required: true,
    },

    remarks: { type: String, trim: true },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    finalizedAt: { type: Date },
  },
  { timestamps: true },
);

// Compound index to guarantee one active shift per MPD/shift slot
shiftSchema.index(
  {
    employeeId: 1,
    businessDate: 1,
    status: 1,
  },
  {
    name: 'employee_daily_shift_lookup',
  }
);

const Shift = mongoose.model("Shift", shiftSchema);
export default Shift;
