import { z } from "zod";

const businessDate = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Business date must be a valid YYYY-MM-DD date");

export const getManagerAccountingSchema = z.object({
  query: z.object({
    period: z.enum(["today", "week", "month"]),
    date: businessDate,
  }),
});