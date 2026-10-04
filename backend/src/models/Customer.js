import mongoose from 'mongoose';

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
      default: null,
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: null,
    },

    address: {
      type: String,
      trim: true,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      default: null,
    },

    outstandingBalance: {
      type: Number,
      default: 0,
      min: 0,
      set: (value) => Math.round(value),
    },

    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

/*
 * Name search.
 */
customerSchema.index({
  name: 1,
});

customerSchema.index({
  phoneNumber: 1,
});

/*
 * Optional vehicle lookup.
 */
customerSchema.index({
  vehicleNumber: 1,
});

const Customer = mongoose.model(
  'Customer',
  customerSchema,
);

export default Customer;