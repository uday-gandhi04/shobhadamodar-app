// src/routes/update.routes.js
import express from 'express';
import { checkForUpdate } from '../controllers/update.controller.js';

const router = express.Router();

router.post('/', checkForUpdate);

export default router;
