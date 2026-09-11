// src/routes/auth.routes.js
import express from 'express';
import { loginUser, logoutUser, refreshAccessToken, seedManager } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginSchema, refreshTokenSchema } from '../validations/auth.validation.js';

const router = express.Router();

// Public Routes
router.post('/seed', seedManager);
router.post('/login', validate(loginSchema), loginUser);
router.post('/refresh', validate(refreshTokenSchema), refreshAccessToken);
router.post('/logout', protect, logoutUser);

export default router;