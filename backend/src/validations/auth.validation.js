// src/validations/auth.validation.js
import { z } from 'zod';

/**
 * Zod schema for validating login payloads
 */
export const loginSchema = z.object({
  body: z.object({
    employeeId: z.string({ required_error: 'Employee ID is required' })
      .min(1, 'Employee ID cannot be empty'),
    password: z.string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

export const seedManagerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    employeeId: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/),
    password: z.string().min(6).max(128),
  }),
});