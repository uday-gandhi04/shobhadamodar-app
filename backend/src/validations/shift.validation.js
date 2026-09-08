import { z } from 'zod';

const businessDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Business date must be YYYY-MM-DD');

const cashItem = z.object({
  denomination: z.coerce.number().int().min(1),
  count: z.coerce.number().int().min(0),
});

const moneyPaise = z.coerce.number().int().min(0);

const collectionBody = z.object({
  cashBreakdown: z.array(cashItem).max(12).default([]),
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
