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
  updateManagerEmployee,
  updateManagerEmployeeStatus,
} from "../controllers/managerEmployees.controller.js";
import {
  getManagerEmployeeDetailSchema,
  updateManagerEmployeeSchema,
  updateManagerEmployeeStatusSchema,
} from "../validations/managerEmployees.validation.js";

import {
  protect,
  authorize,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

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