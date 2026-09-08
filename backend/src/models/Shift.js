import mongoose from 'mongoose';

const shiftReadingSchema = new mongoose.Schema(
  {
    nozzleId: { type: String, required: true },
    fuelType: { type: String, enum: ['PETROL', 'DIESEL'], required: true },
    openingReading: { type: Number, required: true },
    closingReading: { type: Number, default: null },
    dispensedLitres: { type: Number, default: 0 },
    ratePaise: { type: Number, default: 0 },
    expectedSalePaise: { type: Number, default: 0 },
  },
  { _id: false },
);

const cashCollectionSchema = new mongoose.Schema(
  {
    denomination: { type: Number, required: true },
    count: { type: Number, required: true, min: 0 },
    totalPaise: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const shiftSchema = new mongoose.Schema(
  {
    businessDate: { type: String, required: true },

    shiftType: {
      type: String,
      enum: ['MORNING', 'EVENING', 'NIGHT'],
      required: true,
    },

    mpdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mpd',
      required: true,
      index: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['IN_PROGRESS', 'ENDED', 'FORCE_CLOSED'],
      default: 'IN_PROGRESS',
      required: true,
      index: true,
    },

    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },

    readings: { type: [shiftReadingSchema], default: [] },
    cashCollections: { type: [cashCollectionSchema], default: [] },
    udhariEntries: { type: [mongoose.Schema.Types.Mixed], default: [] },

    totalLitresPetrol: { type: Number, default: 0 },
    totalLitresDiesel: { type: Number, default: 0 },
    expectedTotalSalePaise: { type: Number, default: 0 },

    totalCashPaise: { type: Number, default: 0 },
    totalUpiPaise: { type: Number, default: 0 },
    totalCardPaise: { type: Number, default: 0 },
    totalUdhariPaise: { type: Number, default: 0 },
    totalCollectedPaise: { type: Number, default: 0 },

    differencePaise: { type: Number, default: 0 },
    reconciliationStatus: {
      type: String,
      enum: ['MATCHED', 'SHORT', 'EXCESS', 'PENDING'],
      default: 'PENDING',
    },
  },
  { timestamps: true },
);

shiftSchema.index(
  { employeeId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'IN_PROGRESS' },
    name: 'one_active_shift_per_employee',
  },
);

shiftSchema.index(
  { mpdId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'IN_PROGRESS' },
    name: 'one_active_shift_per_mpd',
  },
);

shiftSchema.index({ businessDate: 1, mpdId: 1, shiftType: 1 });

const Shift = mongoose.model('Shift', shiftSchema);

export default Shift;
