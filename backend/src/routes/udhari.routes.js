import express from 'express';

import {
  addUdhariTransaction,
  deleteUdhariTransaction,
} from '../controllers/udhari.controller.js';

import {
  protect,
} from '../middlewares/auth.middleware.js';

import {
  validate,
} from '../middlewares/validate.middleware.js';

import {
  addUdhariSchema,
} from '../validations/shift.validation.js';

const router = express.Router();

router.post(
  '/',
  protect,
  validate(addUdhariSchema),
  addUdhariTransaction,
);

router.delete(
  '/:transactionId',
  protect,
  deleteUdhariTransaction,
);

export default router;