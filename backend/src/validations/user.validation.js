import { z } from 'zod';

export const createEmployeeSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),

    employeeId: z
      .string()
      .trim()
      .min(3, 'Employee ID must be at least 3 characters')
      .max(30, 'Employee ID cannot exceed 30 characters')
      .regex(
        /^[A-Za-z0-9_-]+$/,
        'Employee ID can contain only letters, numbers, hyphens and underscores'
      ),

    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(128, 'Password cannot exceed 128 characters'),
  }),
});