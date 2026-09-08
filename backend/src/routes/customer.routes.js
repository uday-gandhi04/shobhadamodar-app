import express from 'express';

import {
  searchCustomers,
} from '../controllers/customer.controller.js';

import {
  protect,
} from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get(
  '/search',
  protect,
  searchCustomers,
);

export default router;