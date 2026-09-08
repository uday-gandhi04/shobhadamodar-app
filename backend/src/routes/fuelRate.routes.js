import express from 'express';

import {
  getCurrentFuelRate,
} from '../controllers/fuelRate.controller.js';

import {
  protect,
} from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get(
  '/current',
  protect,
  getCurrentFuelRate,
);

export default router;