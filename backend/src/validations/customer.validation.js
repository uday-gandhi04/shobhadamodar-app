import { z } from 'zod';

const nullableText = z.string().trim().nullable().optional();
const creditLimitPaise = z.number().int().safe().min(0);

const customerFields = {
  name: z.string().trim().min(1).max(200),
  phoneNumber: nullableText,
  vehicleNumber: nullableText,
  address: nullableText,
  notes: nullableText,
  creditLimitPaise,
};

export const createCustomerSchema = z.object({
  body: z.object({
    ...customerFields,
    creditLimitPaise: creditLimitPaise.default(0),
  }),
});

export const updateCustomerSchema = z.object({
  body: z.object(customerFields).partial().refine(
    (body) => Object.keys(body).length > 0,
    { message: 'At least one customer field is required.' },
  ),
});
