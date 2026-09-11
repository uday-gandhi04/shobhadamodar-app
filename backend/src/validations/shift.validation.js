import { z } from 'zod';

const businessDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Business date must be YYYY-MM-DD');

const cashItem = z.object({
  denomination: z.coerce.number().int().min(1),
  count: z.coerce.number().int().min(0),
});

const moneyPaise = z.coerce.number().int().min(0);

const upiCollection = z.object({
  firstTransactionTime: z.string().regex(/^\d{2}:\d{2}$/),
  firstTransactionAmountPaise: moneyPaise,
  lastTransactionTime: z.string().regex(/^\d{2}:\d{2}$/),
  lastTransactionAmountPaise: moneyPaise,
});

const collectionBody = z.object({
  cashBreakdown: z.array(cashItem).max(12).default([]),
  coinsPaise: moneyPaise.default(0),
  upiCollection: upiCollection.optional(),
  upiPaise: moneyPaise.default(0),
  cardPaise: moneyPaise.default(0),
  udhariPaise: moneyPaise.default(0),
});

const finalReading = z.object({
  nozzleId: z.string().min(1),
  closingReading: z.coerce.number().min(0),
});

const finalShiftBody = z.object({
  readings: z.array(finalReading).min(1).max(8),
  collections: collectionBody,
});

export const getCurrentShiftSchema = z.object({
  query: z.object({ date: businessDate.optional() }),
});

export const getAvailableMpdSchema = z.object({
  query: z.object({ date: businessDate.optional() }),
});

export const startShiftSchema = z.object({
  body: z.object({
    businessDate,
    shiftType: z.enum(['MORNING', 'EVENING', 'NIGHT']),
    mpdId: z.string().min(1),
  }),
});

export const updateCollectionsSchema = z.object({
  body: collectionBody,
});

export const endShiftSchema = z.object({
  body: finalShiftBody,
});

const udhariBody = z.object({
  shiftId: z.string().min(1),

  customerId: z.string().min(1).optional(),

  customerName: z
    .string()
    .trim()
    .min(2)
    .optional(),

  vehicleNumber: z
    .string()
    .trim()
    .max(20)
    .optional(),

  fuelType: z.enum([
    'PETROL',
    'DIESEL',
  ]),

  litres: z.coerce
    .number()
    .positive()
    .optional(),

  amountPaise: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
}).refine(
  (data) =>
    data.litres !== undefined ||
    data.amountPaise !== undefined,
  {
    message:
      'Enter either litres or amount.',
  },
).refine(
  (data) =>
    data.customerId ||
    data.customerName,
  {
    message:
      'Customer name is required for a new customer.',
  },
);

export const addUdhariSchema = z.object({
  body: udhariBody,
});