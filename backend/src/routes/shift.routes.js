import express from 'express';

import {
  endShift,
  getAvailableMpds,
  getCurrentShift,
  previewEndShift,
  startShift,
  updateReadings,
  updateCollections,
} from '../controllers/shift.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  endShiftSchema,
  getAvailableMpdSchema,
  getCurrentShiftSchema,
  startShiftSchema,
  updateReadingsSchema,
  updateCollectionsSchema,
} from '../validations/shift.validation.js';

const router = express.Router();

router.get('/available-mpds', protect, validate(getAvailableMpdSchema), getAvailableMpds);
router.get('/current', protect, validate(getCurrentShiftSchema), getCurrentShift);
router.post('/start', protect, validate(startShiftSchema), startShift);
router.patch('/:id/readings', protect, validate(updateReadingsSchema), updateReadings);
router.patch('/:id/collections', protect, validate(updateCollectionsSchema), updateCollections);
router.post('/:id/end/preview', protect, validate(endShiftSchema), previewEndShift);
router.post('/:id/end', protect, validate(endShiftSchema), endShift);

export default router;
