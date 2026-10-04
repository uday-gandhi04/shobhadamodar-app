import express from 'express';

import {
  createCustomer,
  getCustomerDetail,
  listManagerCustomers,
  searchCustomers,
  settleCustomerBalance,
  toggleCustomerBlockedStatus,
  updateCustomer,
} from '../controllers/customer.controller.js';

import {
  protect,
  authorize,
} from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get(
  '/search',
  protect,
  searchCustomers,
);

router.get(
  '/',
  protect,
  authorize('MANAGER'),
  listManagerCustomers,
);

router.get(
  '/:customerId',
  protect,
  authorize('MANAGER'),
  getCustomerDetail,
);

router.post(
  '/',
  protect,
  authorize('MANAGER'),
  createCustomer,
);

router.patch(
  '/:customerId',
  protect,
  authorize('MANAGER'),
  updateCustomer,
);

router.patch(
  '/:customerId/block',
  protect,
  authorize('MANAGER'),
  toggleCustomerBlockedStatus,
);

router.post(
  '/:customerId/settlements',
  protect,
  authorize('MANAGER'),
  settleCustomerBalance,
);

export default router;