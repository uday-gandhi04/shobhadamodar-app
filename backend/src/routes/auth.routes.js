// src/routes/auth.routes.js
import express from 'express';
import { loginUser, seedManager } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginSchema } from '../validations/auth.validation.js';

const router = express.Router();

// Public Routes
router.post('/seed', seedManager);
router.post('/login', validate(loginSchema), loginUser);

export default router;