import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createExpenseSchema = z.object({
  body: z.object({
    shiftId: objectId,
    amountPaise: z.number().int().positive(),
    reason: z.string().trim().min(2).max(500),
  }),
});

export const getMyShiftExpensesSchema = z.object({
  query: z.object({
    shiftId: objectId,
  }),
});

export const getManagerExpensesSchema = z.object({
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    employeeId: objectId.optional(),
    shiftId: objectId.optional(),
  }),
});