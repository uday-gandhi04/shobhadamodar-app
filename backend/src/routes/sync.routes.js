// src/routes/sync.routes.js
import express from 'express';
import { bootstrapDevice, submitShift } from '../controllers/sync.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { submitShiftSchema } from '../validations/sync.validation.js';

const router = express.Router();

// Existing bootstrap route
router.get('/bootstrap', protect, bootstrapDevice);

// New Submission Route (Protected + Validated)
router.post('/submit', protect, validate(submitShiftSchema), submitShift);

export default router;
