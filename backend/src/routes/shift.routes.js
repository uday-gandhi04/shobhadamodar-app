import express from 'express';

import {
  endShift,
  getCurrentShift,
  startShift,
} from '../controllers/shift.controller.js';

import { protect } from '../middlewares/auth.middleware.js';

import { validate } from '../middlewares/validate.middleware.js';

import {
  getCurrentShiftSchema,
  startShiftSchema,
} from '../validations/shift.validation.js';

const router = express.Router();

router.get(
  '/current',
  protect,
  validate(getCurrentShiftSchema),
  getCurrentShift
);

router.post(
  '/start',
  protect,
  validate(startShiftSchema),
  startShift
);

router.post(
  '/:id/end',
  protect,
  endShift,
);

export default router;