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

export const forceEndShiftSchema = z.object({
  params: z.object({
    shiftId: z.string().min(1, "Shift ID is required"),
  }),
  body: z.object({
    readings: z
      .array(
        z.object({
          nozzleId: z.string().min(1, "Nozzle ID is required"),
          closingReading: z.coerce.number().min(0, "Closing reading must be non-negative"),
        }),
      )
      .min(1, "At least one nozzle reading is required"),
  }),
});