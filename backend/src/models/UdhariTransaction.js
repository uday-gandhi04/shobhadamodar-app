import mongoose from "mongoose";

const udhariTransactionSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
      index: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    businessDate: {
      type: String,
      required: true,
      index: true,
    },

    transactionType: {
      type: String,
      enum: ["CREDIT", "SETTLEMENT"],
      default: "CREDIT",
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "CARD", null],
      default: null,
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: null,
    },

    /*
     * Snapshot of vehicle used for this transaction.
     * Customer itself may have multiple vehicles over time.
     */

    slipNumber: {
      type: String,
      trim: true,
      default: null,
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },

    fuelType: {
      type: String,
      enum: ["PETROL", "DIESEL", null],
      default: null,
    },

    litres: {
      type: Number,
      default: 0,
      min: 0,
    },

    ratePaise: {
      type: Number,
      default: 0,
      min: 0,
    },

    amountPaise: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

udhariTransactionSchema.index({
  customerId: 1,
  createdAt: -1,
});

udhariTransactionSchema.index({
  shiftId: 1,
  createdAt: 1,
});

const UdhariTransaction = mongoose.model(
  "UdhariTransaction",
  udhariTransactionSchema,
);

export default UdhariTransaction;
