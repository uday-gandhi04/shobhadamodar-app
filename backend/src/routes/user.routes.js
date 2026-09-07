import express from 'express';

import { createEmployee } from '../controllers/user.controller.js';

import { protect, authorize } from '../middlewares/auth.middleware.js';

import { validate } from '../middlewares/validate.middleware.js';

import { createEmployeeSchema } from '../validations/user.validation.js';

const router = express.Router();

router.post(
  '/employees',
  protect,
  authorize('MANAGER'),
  validate(createEmployeeSchema),
  createEmployee
);

export default router;