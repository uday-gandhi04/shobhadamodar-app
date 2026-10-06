import { z } from "zod";

const employeeId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid employee ID");

export const getManagerEmployeeDetailSchema = z.object({
  params: z.object({ id: employeeId }),
});

export const updateManagerEmployeeSchema = z.object({
  params: z.object({ id: employeeId }),
  body: z.object({
    name: z.string().trim().min(2).max(100),
  }),
});

export const updateManagerEmployeeStatusSchema = z.object({
  params: z.object({ id: employeeId }),
  body: z.object({
    accountStatus: z.enum(["ACTIVE", "INACTIVE", "BANNED"]),
  }),
});

export const resetManagerEmployeePasswordSchema = z.object({
  params: z.object({ id: employeeId }),
  body: z.object({
    password: z.string().min(6, "Password must be at least 6 characters").max(128),
  }),
});
