import express from "express";

import {
  getManagerAccounting,
  getManagerOperations,
  getManagerShiftDetail,
} from "../controllers/manager.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { getManagerAccountingSchema } from "../validations/manager.validation.js";

import {
  protect,
  authorize,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/accounting",
  protect,
  authorize("MANAGER"),
  validate(getManagerAccountingSchema),
  getManagerAccounting,
);

router.get(
  "/operations",
  protect,
  authorize("MANAGER"),
  getManagerOperations,
);

router.get(
  "/shifts/:shiftId",
  protect,
  authorize("MANAGER"),
  getManagerShiftDetail,
);

export default router;