import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
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

    amountPaise: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Amount must be a whole number of paise',
      },
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
);

expenseSchema.index({
  shiftId: 1,
  createdAt: -1,
});

expenseSchema.index({
  employeeId: 1,
  businessDate: 1,
  createdAt: -1,
});

const Expense = mongoose.model(
  "Expense",
  expenseSchema,
);

export default Expense;