import express from 'express';

import {
  getCurrentFuelRate,
  getFuelRateHistory,
  createFuelRate,
} from '../controllers/fuelRate.controller.js';
import { validate } from "../middlewares/validate.middleware.js";
import { z } from "zod";

import {
  protect,
  authorize,
} from '../middlewares/auth.middleware.js';

const router = express.Router();
const createRateSchema = z.object({ body: z.object({ businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), petrolRatePaise: z.number().int().positive(), dieselRatePaise: z.number().int().positive() }) });

router.get('/history', protect, authorize("MANAGER"), getFuelRateHistory);
router.post('/', protect, authorize("MANAGER"), validate(createRateSchema), createFuelRate);

router.get(
  '/current',
  protect,
  getCurrentFuelRate,
);

export default router;
