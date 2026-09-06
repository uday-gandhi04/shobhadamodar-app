// src/middlewares/validate.middleware.js

/**
 * Higher-order middleware function to validate Express requests using Zod schemas.
 * @param {import('zod').AnyZodObject} schema - The Zod schema to validate against
 * @returns {import('express').RequestHandler} Express middleware
 */
export const validate = (schema) => async (req, res, next) => {
  try {
    // Parse the request body, query, and params against the schema
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next(); // Move to the controller if validation succeeds
  } catch (error) {
    // Format Zod errors for a clean frontend response
    const formattedErrors = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }
};