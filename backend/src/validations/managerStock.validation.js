import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Business date must be YYYY-MM-DD");
const product = z.enum(["PETROL", "DIESEL"]);
const nonNegative = z.number().finite().min(0);
const optionalNonNegative = nonNegative.nullish();

const month = z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format");

export const stockDateSchema = z.object({ query: z.object({ date }) });
export const stockMonthSchema = z.object({ query: z.object({ month }) });
export const stockSchema = z.object({ body: z.object({ businessDate: date, product, openingStockLitres: optionalNonNegative, productDip: optionalNonNegative, actualDipStockLitres: optionalNonNegative, waterDip: optionalNonNegative, waterDipVolumeLitres: optionalNonNegative }) });
export const openingCorrectionSchema = z.object({ body: z.object({ businessDate: date, product, correctedOpeningStockLitres: nonNegative, reason: z.string().trim().min(3, "Reason must be at least 3 characters") }) });
export const meterOpeningCorrectionSchema = z.object({ body: z.object({ businessDate: date, product, registerNozzle: z.number().int().min(1).max(4), correctedOpeningReading: nonNegative, reason: z.string().trim().min(3, "Reason must be at least 3 characters") }) });
export const densitySchema = z.object({ body: z.object({ businessDate: date, product, hydrometerReading: nonNegative, temperatureC: nonNegative, density15: nonNegative.optional() }) });
export const receiptSchema = z.object({ body: z.object({ businessDate: date, product, invoiceNumber: z.string().trim().min(1), quantityLitres: nonNegative, supplierName: z.string().trim().optional(), tankerNumber: z.string().trim().optional(), beforeHydrometer: optionalNonNegative, beforeTemperatureC: optionalNonNegative, beforeDensity15: optionalNonNegative, challanDensity15: optionalNonNegative, beforeDensityDifference: z.number().finite().nullish(), afterHydrometer: optionalNonNegative, afterTemperatureC: optionalNonNegative, afterDensity15: optionalNonNegative, afterChallanDensity15: optionalNonNegative, afterDensityDifference: z.number().finite().nullish() }) });

export const fuelTestingCreateSchema = z.object({
  body: z.object({
    businessDate: date,
    product: z.preprocess(
      (val) => (val === "MS" ? "PETROL" : val === "HSD" ? "DIESEL" : val),
      product
    ),
    testingQuantityLitres: z.coerce.number().finite().positive("Testing quantity must be greater than zero"),
    remarks: z.string().trim().optional().default(""),
  }),
});

export const fuelTestingUpdateSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Testing ID is required"),
  }),
  body: z.object({
    testingQuantityLitres: z.coerce.number().finite().positive("Testing quantity must be greater than zero").optional(),
    remarks: z.string().trim().optional(),
    reason: z.string().trim().optional(),
  }),
});

export const fuelTestingQuerySchema = z.object({
  query: z.object({
    date: date.optional(),
    month: month.optional(),
    product: z.preprocess(
      (val) => (val === "MS" ? "PETROL" : val === "HSD" ? "DIESEL" : val),
      product.optional()
    ),
  }),
});

