// backend/src/middlewares/validate.middleware.js

/**
 * Higher-order middleware for validating Express requests with Zod.
 */
export const validate = (schema) => async (req, res, next) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    next();
  } catch (error) {
    const issues = Array.isArray(error?.issues)
      ? error.issues
      : [];

    console.error('Validation error:', issues);

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
};