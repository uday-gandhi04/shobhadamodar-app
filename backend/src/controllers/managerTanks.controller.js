import mongoose from "mongoose";

import Station from "../models/Station.js";
import Tank from "../models/Tank.js";
import { recordAuditLog } from "../utils/auditLog.js";

const activeStation = async () => {
  const station = await Station.findOne({ isActive: true }).lean();
  if (!station) {
    const error = new Error("No active station is configured.");
    error.status = 503;
    throw error;
  }
  return station;
};

const duplicateTankResponse = (res) => res.status(409).json({
  success: false,
  message: "A tank with this number already exists at this station.",
  code: "TANK_NUMBER_EXISTS",
});

export const getManagerTanks = async (_req, res, next) => {
  try {
    const station = await activeStation();
    const tanks = await Tank.find({ stationId: station._id })
      .sort({ product: 1, tankNumber: 1 })
      .lean();
    return res.json({ success: true, data: tanks });
  } catch (error) {
    return next(error);
  }
};

export const createManagerTank = async (req, res, next) => {
  try {
    const station = await activeStation();
    const tank = await Tank.create({
      stationId: station._id,
      tankNumber: req.body.tankNumber,
      product: req.body.product,
      capacityLitres: req.body.capacityLitres,
    });
    await recordAuditLog({
      actor: req.user,
      action: "TANK_CREATED",
      entityType: "TANK",
      entityId: tank._id,
      metadata: {
        tankNumber: tank.tankNumber,
        product: tank.product,
        capacityLitres: tank.capacityLitres,
      },
    });
    return res.status(201).json({ success: true, data: tank });
  } catch (error) {
    if (error?.code === 11000) return duplicateTankResponse(res);
    return next(error);
  }
};

export const updateManagerTank = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid tank ID." });
    }
    const station = await activeStation();
    const changes = Object.fromEntries(
      ["tankNumber", "product", "capacityLitres", "isActive"]
        .filter((field) => Object.hasOwn(req.body, field))
        .map((field) => [field, req.body[field]]),
    );
    const tank = await Tank.findOneAndUpdate(
      { _id: req.params.id, stationId: station._id },
      { $set: changes },
      { new: true, runValidators: true },
    );
    if (!tank) return res.status(404).json({ success: false, message: "Tank not found." });

    const changesActivation = Object.hasOwn(changes, "isActive");
    await recordAuditLog({
      actor: req.user,
      action: changesActivation ? "TANK_STATUS_CHANGED" : "TANK_UPDATED",
      entityType: "TANK",
      entityId: tank._id,
      metadata: {
        tankNumber: tank.tankNumber,
        changedFields: Object.keys(changes),
        ...(changesActivation ? { isActive: tank.isActive } : {}),
      },
    });
    return res.json({ success: true, data: tank });
  } catch (error) {
    if (error?.code === 11000) return duplicateTankResponse(res);
    return next(error);
  }
};
