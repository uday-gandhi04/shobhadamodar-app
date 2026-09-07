import { z } from 'zod';

const businessDate = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Business date must be YYYY-MM-DD'
  );

export const getCurrentShiftSchema = z.object({
  query: z.object({
    date: businessDate.optional(),
  }),
});

export const startShiftSchema = z.object({
  body: z.object({
    businessDate,
    shiftType: z.enum([
      'MORNING',
      'EVENING',
      'NIGHT',
    ]),
    mpdId: z.string().min(1),
  }),
});