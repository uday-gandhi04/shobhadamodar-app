// backend/src/models/Shift.js

import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema(
  {
    businessDate: {
      type: String,
      required: true,
    },

    shiftType: {
      type: String,
      enum: ['MORNING', 'EVENING', 'NIGHT'],
      required: true,
    },

    mpdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MPD',
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
      enum: [
        'IN_PROGRESS',
        'ENDED',
        'SUBMITTED',
        'UNDER_REVIEW',
        'FINALIZED',
        'FORCE_CLOSED',
      ],
      default: 'IN_PROGRESS',
      required: true,
      index: true,
    },

    startedAt: {
      type: Date,
      required: true,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    finalizedAt: {
      type: Date,
      default: null,
    },

    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    readings: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    cashCollections: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    udhariEntries: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    totalLitresPetrol: {
      type: Number,
      default: 0,
    },

    totalLitresDiesel: {
      type: Number,
      default: 0,
    },

    expectedTotalSalePaise: {
      type: Number,
      default: 0,
    },

    totalCashPaise: {
      type: Number,
      default: 0,
    },

    totalUpiPaise: {
      type: Number,
      default: 0,
    },

    totalCardPaise: {
      type: Number,
      default: 0,
    },

    totalUdhariPaise: {
      type: Number,
      default: 0,
    },

    totalCollectedPaise: {
      type: Number,
      default: 0,
    },

    differencePaise: {
      type: Number,
      default: 0,
    },

    reconciliationStatus: {
      type: String,
      enum: ['MATCHED', 'SHORT', 'EXCESS', 'PENDING'],
      default: 'PENDING',
    },
  },
  {
    timestamps: true,
  },
);

/**
 * IMPORTANT:
 *
 * Only ONE active shift may exist for an employee.
 */
shiftSchema.index(
  { employeeId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: 'IN_PROGRESS',
    },
    name: 'one_active_shift_per_employee',
  },
);

/**
 * IMPORTANT:
 *
 * Only ONE employee may operate an MPD at a time.
 */
shiftSchema.index(
  { mpdId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: 'IN_PROGRESS',
    },
    name: 'one_active_shift_per_mpd',
  },
);

/**
 * Historical lookup.
 */
shiftSchema.index({
  businessDate: 1,
  mpdId: 1,
  shiftType: 1,
});

const Shift = mongoose.model('Shift', shiftSchema);

export default Shift;