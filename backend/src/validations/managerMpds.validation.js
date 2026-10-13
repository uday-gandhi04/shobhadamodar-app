import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID format.");
const fuelType = z.enum(["PETROL", "DIESEL"]);

const nozzleInputSchema = z.object({
  nozzleId: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(50),
  nozzleNumber: z.number().int().positive().optional(),
  fuelType,
  currentCumulativeReading: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const createMpdSchema = z.object({
  body: z.object({
    mpdNumber: z.string().trim().min(1).max(50),
    serialNumber: z.string().trim().max(100).optional(),
    nozzles: z.array(nozzleInputSchema).optional(),
    nozzleCount: z.number().int().min(1).max(12).optional(),
  }).strict(),
});

export const updateMpdSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    mpdNumber: z.string().trim().min(1).max(50).optional(),
    serialNumber: z.string().trim().max(100).optional(),
    isActive: z.boolean().optional(),
  }).strict().refine((val) => Object.keys(val).length > 0, "At least one editable MPD field must be provided."),
});

export const addNozzleSchema = z.object({
  params: z.object({ id: objectId }),
  body: nozzleInputSchema.strict(),
});

export const updateNozzleSchema = z.object({
  params: z.object({
    id: objectId,
    nozzleId: z.string().trim().min(1),
  }),
  body: z.object({
    name: z.string().trim().min(1).max(50).optional(),
    nozzleNumber: z.number().int().positive().optional(),
    fuelType: fuelType.optional(),
    currentCumulativeReading: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
  }).strict().refine((val) => Object.keys(val).length > 0, "At least one editable nozzle field must be provided."),
});

export const mpdIdParamSchema = z.object({
  params: z.object({ id: objectId }),
});

export const nozzleIdParamSchema = z.object({
  params: z.object({
    id: objectId,
    nozzleId: z.string().trim().min(1),
  }),
});
