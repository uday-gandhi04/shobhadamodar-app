import express from "express";

import {
  getManagerAccounting,
  getManagerOperations,
  getManagerShiftDetail,
  getManagerMpdShifts,
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
import { getManagerStock, upsertManagerStock, correctManagerOpeningStock, correctManagerMeterOpening, getManagerDensity, upsertManagerDensity, getDensityConversionPreview, getManagerReceipts, createManagerReceipt, getManagerStockExport, getManagerStockPreview } from "../controllers/managerStock.controller.js";
import { stockDateSchema, stockMonthSchema, stockSchema, openingCorrectionSchema, meterOpeningCorrectionSchema, densitySchema, receiptSchema } from "../validations/managerStock.validation.js";
import { getManagerTanks, createManagerTank, updateManagerTank, getManagerTankCalibration, upsertManagerTankCalibration } from "../controllers/managerTanks.controller.js";
import { createTankSchema, updateTankSchema, tankCalibrationSchema } from "../validations/managerTanks.validation.js";
import {
  getManagerMpds,
  createManagerMpd,
  updateManagerMpd,
  deleteManagerMpd,
  addManagerMpdNozzle,
  updateManagerMpdNozzle,
  deleteManagerMpdNozzle,
} from "../controllers/managerMpds.controller.js";
import {
  createMpdSchema,
  updateMpdSchema,
  addNozzleSchema,
  updateNozzleSchema,
  mpdIdParamSchema,
  nozzleIdParamSchema,
} from "../validations/managerMpds.validation.js";

const router = express.Router();

router.get("/stock", protect, authorize("MANAGER"), validate(stockDateSchema), getManagerStock);
router.get("/stock/preview", protect, authorize("MANAGER"), validate(stockMonthSchema), getManagerStockPreview);
router.get("/stock/export", protect, authorize("MANAGER"), validate(stockMonthSchema), getManagerStockExport);
router.put("/stock", protect, authorize("MANAGER"), validate(stockSchema), upsertManagerStock);
router.post("/stock/correct-opening", protect, authorize("MANAGER"), validate(openingCorrectionSchema), correctManagerOpeningStock);
router.post("/stock/correct-meter-opening", protect, authorize("MANAGER"), validate(meterOpeningCorrectionSchema), correctManagerMeterOpening);
router.get("/stock/density", protect, authorize("MANAGER"), validate(stockDateSchema), getManagerDensity);
router.get("/stock/density/convert", protect, authorize("MANAGER"), getDensityConversionPreview);
router.post("/stock/density", protect, authorize("MANAGER"), validate(densitySchema), upsertManagerDensity);
router.get("/stock/receipts", protect, authorize("MANAGER"), validate(stockDateSchema), getManagerReceipts);
router.post("/stock/receipts", protect, authorize("MANAGER"), validate(receiptSchema), createManagerReceipt);
router.get("/tanks", protect, authorize("MANAGER"), getManagerTanks);
router.post("/tanks", protect, authorize("MANAGER"), validate(createTankSchema), createManagerTank);
router.patch("/tanks/:id", protect, authorize("MANAGER"), validate(updateTankSchema), updateManagerTank);
router.get("/tanks/:id/calibration", protect, authorize("MANAGER"), getManagerTankCalibration);
router.put("/tanks/:id/calibration", protect, authorize("MANAGER"), validate(tankCalibrationSchema), upsertManagerTankCalibration);

router.get("/mpds", protect, authorize("MANAGER"), getManagerMpds);
router.post("/mpds", protect, authorize("MANAGER"), validate(createMpdSchema), createManagerMpd);
router.patch("/mpds/:id", protect, authorize("MANAGER"), validate(updateMpdSchema), updateManagerMpd);
router.delete("/mpds/:id", protect, authorize("MANAGER"), validate(mpdIdParamSchema), deleteManagerMpd);
router.post("/mpds/:id/nozzles", protect, authorize("MANAGER"), validate(addNozzleSchema), addManagerMpdNozzle);
router.patch("/mpds/:id/nozzles/:nozzleId", protect, authorize("MANAGER"), validate(updateNozzleSchema), updateManagerMpdNozzle);
router.delete("/mpds/:id/nozzles/:nozzleId", protect, authorize("MANAGER"), validate(nozzleIdParamSchema), deleteManagerMpdNozzle);

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
  "/operations/mpds/:mpdId/shifts",
  protect,
  authorize("MANAGER"),
  getManagerMpdShifts,
);

router.get(
  "/shifts/:shiftId",
  protect,
  authorize("MANAGER"),
  getManagerShiftDetail,
);

export default router;
