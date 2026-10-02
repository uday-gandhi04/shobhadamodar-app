import express from "express";

import {
  getManagerOperations,
  getManagerShiftDetail,
} from "../controllers/manager.controller.js";

import {
  protect,
  authorize,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

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