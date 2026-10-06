import { z } from "zod";

const tankNumber = z.string().trim().min(1).max(50).transform((value) => value.toUpperCase());
const product = z.enum(["PETROL", "DIESEL"]);
const capacityLitres = z.number()
  .finite()
  .positive()
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, "Capacity must have no more than two decimal places.");

export const createTankSchema = z.object({
  body: z.object({
    tankNumber,
    product,
    capacityLitres,
  }).strict(),
});

export const updateTankSchema = z.object({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid tank ID.") }),
  body: z.object({
    tankNumber: tankNumber.optional(),
    product: product.optional(),
    capacityLitres: capacityLitres.optional(),
    isActive: z.boolean().optional(),
  }).strict().refine((value) => Object.keys(value).length > 0, "At least one tank field must be provided."),
});
