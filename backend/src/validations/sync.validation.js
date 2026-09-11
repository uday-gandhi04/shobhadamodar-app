// src/validations/sync.validation.js
import { z } from 'zod';

export const submitShiftSchema = z.object({
  body: z.object({
    idempotencyKey: z.string({ required_error: 'Idempotency key is required' }),
    businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
    mpdId: z.string(),
    
    readings: z.array(
      z.object({
        nozzleId: z.string(),
        fuelType: z.enum(['PETROL', 'DIESEL']),
        openingReading: z.number().nonnegative(),
        closingReading: z.number().nonnegative(),
      })
    ).refine((arr) => arr.every((r) => r.closingReading >= r.openingReading), {
      message: 'Closing reading cannot be less than opening reading unless marked as reset.',
    }),

    collections: z.object({
      cashBreakdown: z.array(
        z.object({
          denomination: z.number(),
          count: z.number().nonnegative().int(),
        })
      ),
      upiAmount: z.number().nonnegative(), // Amount in standard Rupees, we will convert to paise
      cardAmount: z.number().nonnegative(),
      udhariTransactions: z.array(
        z.object({
          customerId: z.string(),
          amount: z.number().nonnegative(),
        })
      ),
    }),
  }),
});