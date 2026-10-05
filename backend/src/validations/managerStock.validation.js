import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Business date must be YYYY-MM-DD");
const product = z.enum(["PETROL", "DIESEL"]);
const nonNegative = z.number().finite().min(0);
const optionalNonNegative = nonNegative.nullish();

export const stockDateSchema = z.object({ query: z.object({ date }) });
export const stockSchema = z.object({ body: z.object({ businessDate: date, product, openingStockLitres: nonNegative, productDip: optionalNonNegative, actualDipStockLitres: optionalNonNegative, waterDip: optionalNonNegative, waterDipVolumeLitres: optionalNonNegative }) });
export const densitySchema = z.object({ body: z.object({ businessDate: date, product, hydrometerReading: nonNegative, temperatureC: nonNegative, density15: nonNegative }) });
export const receiptSchema = z.object({ body: z.object({ businessDate: date, product, invoiceNumber: z.string().trim().min(1), quantityLitres: nonNegative, supplierName: z.string().trim().optional(), tankerNumber: z.string().trim().optional(), beforeHydrometer: optionalNonNegative, beforeTemperatureC: optionalNonNegative, beforeDensity15: optionalNonNegative, challanDensity15: optionalNonNegative, beforeDensityDifference: z.number().finite().nullish(), afterHydrometer: optionalNonNegative, afterTemperatureC: optionalNonNegative, afterDensity15: optionalNonNegative, afterChallanDensity15: optionalNonNegative, afterDensityDifference: z.number().finite().nullish() }) });
