import express from "express";

import {
  getManagerAccounting,
  getManagerOperations,
  getManagerShiftDetail,
} from "../controllers/manager.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { getManagerAccountingSchema } from "../validations/manager.validation.js";
import {
  getManagerEmployeeDetail,
  getManagerEmployees,
  resetManagerEmployeePassword,
  updateManagerEmployee,
  updateManagerEmployeeStatus,
} from "../controllers/managerEmployees.controller.js";
import {
  getManagerEmployeeDetailSchema,
  updateManagerEmployeeSchema,
  updateManagerEmployeeStatusSchema,
  resetManagerEmployeePasswordSchema,
} from "../validations/managerEmployees.validation.js";

import {
  protect,
  authorize,
} from "../middlewares/auth.middleware.js";
import { getManagerStock, upsertManagerStock, getManagerDensity, upsertManagerDensity, getManagerReceipts, createManagerReceipt } from "../controllers/managerStock.controller.js";
import { stockDateSchema, stockSchema, densitySchema, receiptSchema } from "../validations/managerStock.validation.js";

const router = express.Router();

router.get("/stock", protect, authorize("MANAGER"), validate(stockDateSchema), getManagerStock);
router.put("/stock", protect, authorize("MANAGER"), validate(stockSchema), upsertManagerStock);
router.get("/stock/density", protect, authorize("MANAGER"), validate(stockDateSchema), getManagerDensity);
router.post("/stock/density", protect, authorize("MANAGER"), validate(densitySchema), upsertManagerDensity);
router.get("/stock/receipts", protect, authorize("MANAGER"), validate(stockDateSchema), getManagerReceipts);
router.post("/stock/receipts", protect, authorize("MANAGER"), validate(receiptSchema), createManagerReceipt);

router.get(
  "/employees",
  protect,
  authorize("MANAGER"),
  getManagerEmployees,
);

router.get(
  "/employees/:id",
  protect,
  authorize("MANAGER"),
  validate(getManagerEmployeeDetailSchema),
  getManagerEmployeeDetail,
);

router.patch(
  "/employees/:id/status",
  protect,
  authorize("MANAGER"),
  validate(updateManagerEmployeeStatusSchema),
  updateManagerEmployeeStatus,
);

router.patch(
  "/employees/:id/password",
  protect,
  authorize("MANAGER"),
  validate(resetManagerEmployeePasswordSchema),
  resetManagerEmployeePassword,
);

router.patch(
  "/employees/:id",
  protect,
  authorize("MANAGER"),
  validate(updateManagerEmployeeSchema),
  updateManagerEmployee,
);

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
