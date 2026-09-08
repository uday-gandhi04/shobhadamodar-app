import mongoose from 'mongoose';

const udhariTransactionSchema =
  new mongoose.Schema(
    {
      customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
        index: true,
      },

      shiftId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shift',
        required: true,
        index: true,
      },

      employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },

      businessDate: {
        type: String,
        required: true,
        index: true,
      },

      /*
       * Snapshot of vehicle used for this transaction.
       * Customer itself may have multiple vehicles over time.
       */
      vehicleNumber: {
        type: String,
        trim: true,
        uppercase: true,
        default: null,
      },

      fuelType: {
        type: String,
        enum: ['PETROL', 'DIESEL'],
        required: true,
      },

      litres: {
        type: Number,
        required: true,
        min: 0,
      },

      ratePaise: {
        type: Number,
        required: true,
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

const UdhariTransaction =
  mongoose.model(
    'UdhariTransaction',
    udhariTransactionSchema,
  );

export default UdhariTransaction;