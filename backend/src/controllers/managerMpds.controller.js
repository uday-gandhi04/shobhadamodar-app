import mongoose from "mongoose";

import Station from "../models/Station.js";
import Mpd from "../models/Mpd.js";
import Shift from "../models/Shift.js";
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

const checkActiveShift = async (mpdId) => {
  return await Shift.findOne({ mpdId, status: "IN_PROGRESS" })
    .populate("employeeId", "name employeeId")
    .lean();
};

export const getManagerMpds = async (_req, res, next) => {
  try {
    const station = await activeStation();
    const mpds = await Mpd.find({ stationId: station._id })
      .sort({ mpdNumber: 1 })
      .lean();

    // Query active shifts and historical shift counts across all station MPDs
    const [activeShifts, historicalMpdIds] = await Promise.all([
      Shift.find({ status: "IN_PROGRESS" })
        .populate("employeeId", "name employeeId")
        .select("_id mpdId employeeId startedAt")
        .lean(),
      Shift.find({}).distinct("mpdId"),
    ]);

    const activeShiftByMpd = new Map(
      activeShifts.map((s) => [String(s.mpdId), s])
    );
    const historicalSet = new Set(historicalMpdIds.map((id) => String(id)));

    // For nozzles, check historical readings
    const historicalShiftsWithReadings = await Shift.find({
      "readings.0": { $exists: true },
    }).select("mpdId readings.nozzleId").lean();

    const historicalNozzleKeys = new Set(
      historicalShiftsWithReadings.flatMap((s) =>
        (s.readings || []).map((r) => `${String(s.mpdId)}_${r.nozzleId}`)
      )
    );

    const enrichedMpds = mpds.map((mpd) => {
      const activeShift = activeShiftByMpd.get(String(mpd._id)) || null;
      const hasHistorical = historicalSet.has(String(mpd._id));

      const nozzles = (mpd.nozzles || []).map((n) => ({
        _id: n._id,
        nozzleId: n.nozzleId,
        name: n.name,
        nozzleNumber: n.nozzleNumber,
        fuelType: n.fuelType,
        currentCumulativeReading: n.currentCumulativeReading ?? 0,
        isActive: n.isActive !== false,
        hasHistoricalReadings: historicalNozzleKeys.has(`${String(mpd._id)}_${n.nozzleId}`),
      }));

      return {
        _id: mpd._id,
        stationId: mpd.stationId,
        mpdNumber: mpd.mpdNumber,
        serialNumber: mpd.serialNumber || "",
        isActive: mpd.isActive !== false,
        createdAt: mpd.createdAt,
        updatedAt: mpd.updatedAt,
        hasActiveShift: Boolean(activeShift),
        activeShift: activeShift
          ? {
              shiftId: activeShift._id,
              employeeName: activeShift.employeeId?.name || "Employee",
              employeeId: activeShift.employeeId?._id,
              startedAt: activeShift.startedAt,
            }
          : null,
        hasHistoricalShifts: hasHistorical,
        nozzles,
      };
    });

    return res.json({ success: true, data: enrichedMpds });
  } catch (error) {
    return next(error);
  }
};

export const createManagerMpd = async (req, res, next) => {
  try {
    const station = await activeStation();
    const { mpdNumber, serialNumber, nozzles: inputNozzles, nozzleCount } = req.body;

    // Check duplicate MPD number in station
    const existing = await Mpd.findOne({
      stationId: station._id,
      mpdNumber: { $regex: new RegExp(`^${mpdNumber.trim()}$`, "i") },
    }).lean();

    if (existing) {
      return res.status(409).json({
        success: false,
        code: "MPD_NUMBER_EXISTS",
        message: `An MPD with the name "${mpdNumber.trim()}" already exists at this station.`,
      });
    }

    let nozzlesToCreate = [];

    if (Array.isArray(inputNozzles) && inputNozzles.length > 0) {
      // Validate nozzleId uniqueness within MPD
      const idSet = new Set();
      for (const n of inputNozzles) {
        if (idSet.has(n.nozzleId)) {
          return res.status(400).json({
            success: false,
            message: `Duplicate nozzle identifier "${n.nozzleId}" provided.`,
          });
        }
        idSet.add(n.nozzleId);
        nozzlesToCreate.push({
          nozzleId: n.nozzleId,
          name: n.name,
          nozzleNumber: n.nozzleNumber,
          fuelType: n.fuelType,
          currentCumulativeReading: n.currentCumulativeReading ?? 0,
          isActive: n.isActive !== false,
        });
      }
    } else {
      // Default initial nozzles based on count or 4
      const count = nozzleCount || 4;
      for (let i = 1; i <= count; i++) {
        // Petrol for first half, Diesel for second half
        const fuel = i <= Math.ceil(count / 2) ? "PETROL" : "DIESEL";
        const labelFuel = fuel === "PETROL" ? "Petrol" : "Diesel";
        nozzlesToCreate.push({
          nozzleId: `n${i}`,
          nozzleNumber: i,
          name: `Nozzle ${i} - ${labelFuel}`,
          fuelType: fuel,
          currentCumulativeReading: 0,
          isActive: true,
        });
      }
    }

    const mpd = await Mpd.create({
      stationId: station._id,
      mpdNumber: mpdNumber.trim(),
      serialNumber: serialNumber?.trim() || undefined,
      nozzles: nozzlesToCreate,
      isActive: true,
    });

    await recordAuditLog({
      actor: req.user,
      action: "MPD_CREATED",
      entityType: "MPD",
      entityId: mpd._id,
      metadata: {
        mpdNumber: mpd.mpdNumber,
        serialNumber: mpd.serialNumber,
        nozzleCount: mpd.nozzles.length,
      },
    });

    return res.status(201).json({ success: true, data: mpd });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        code: "MPD_NUMBER_EXISTS",
        message: "An MPD with this name already exists at this station.",
      });
    }
    return next(error);
  }
};

export const updateManagerMpd = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid MPD ID." });
    }

    const station = await activeStation();
    const mpd = await Mpd.findOne({ _id: id, stationId: station._id });
    if (!mpd) {
      return res.status(404).json({ success: false, message: "MPD not found." });
    }

    // Check active shift
    const activeShift = await checkActiveShift(id);
    if (activeShift) {
      return res.status(409).json({
        success: false,
        code: "ACTIVE_SHIFT_IN_PROGRESS",
        message: `Cannot modify MPD "${mpd.mpdNumber}" while an active shift is in progress by ${activeShift.employeeId?.name || "an employee"}. Please finalize the shift before updating.`,
      });
    }

    const { mpdNumber, serialNumber, isActive } = req.body;
    const previousState = {
      mpdNumber: mpd.mpdNumber,
      serialNumber: mpd.serialNumber,
      isActive: mpd.isActive,
    };

    if (mpdNumber !== undefined && mpdNumber.trim() !== mpd.mpdNumber) {
      const duplicate = await Mpd.findOne({
        stationId: station._id,
        _id: { $ne: id },
        mpdNumber: { $regex: new RegExp(`^${mpdNumber.trim()}$`, "i") },
      }).lean();
      if (duplicate) {
        return res.status(409).json({
          success: false,
          code: "MPD_NUMBER_EXISTS",
          message: `An MPD with the name "${mpdNumber.trim()}" already exists.`,
        });
      }
      mpd.mpdNumber = mpdNumber.trim();
    }

    if (serialNumber !== undefined) {
      mpd.serialNumber = serialNumber.trim();
    }

    if (isActive !== undefined) {
      mpd.isActive = Boolean(isActive);
    }

    await mpd.save();

    const statusChanged = isActive !== undefined && isActive !== previousState.isActive;
    await recordAuditLog({
      actor: req.user,
      action: statusChanged ? "MPD_STATUS_CHANGED" : "MPD_UPDATED",
      entityType: "MPD",
      entityId: mpd._id,
      metadata: {
        mpdNumber: mpd.mpdNumber,
        previousState,
        newState: {
          mpdNumber: mpd.mpdNumber,
          serialNumber: mpd.serialNumber,
          isActive: mpd.isActive,
        },
      },
    });

    return res.json({ success: true, data: mpd });
  } catch (error) {
    return next(error);
  }
};

export const deleteManagerMpd = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid MPD ID." });
    }

    const station = await activeStation();
    const mpd = await Mpd.findOne({ _id: id, stationId: station._id });
    if (!mpd) {
      return res.status(404).json({ success: false, message: "MPD not found." });
    }

    // Check active shift
    const activeShift = await checkActiveShift(id);
    if (activeShift) {
      return res.status(409).json({
        success: false,
        code: "ACTIVE_SHIFT_IN_PROGRESS",
        message: `Cannot delete MPD "${mpd.mpdNumber}" while an active shift is in progress by ${activeShift.employeeId?.name || "an employee"}.`,
      });
    }

    // Check historical shifts
    const hasHistorical = await Shift.exists({ mpdId: id });
    if (hasHistorical) {
      return res.status(409).json({
        success: false,
        code: "HISTORICAL_RECORDS_EXIST",
        message: `Cannot permanently delete MPD "${mpd.mpdNumber}" because historical shifts reference it. Deactivate the MPD instead to preserve financial records.`,
      });
    }

    await Mpd.deleteOne({ _id: id });

    await recordAuditLog({
      actor: req.user,
      action: "MPD_DELETED",
      entityType: "MPD",
      entityId: id,
      metadata: {
        mpdNumber: mpd.mpdNumber,
      },
    });

    return res.json({ success: true, message: `MPD "${mpd.mpdNumber}" deleted successfully.` });
  } catch (error) {
    return next(error);
  }
};

export const addManagerMpdNozzle = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid MPD ID." });
    }

    const station = await activeStation();
    const mpd = await Mpd.findOne({ _id: id, stationId: station._id });
    if (!mpd) {
      return res.status(404).json({ success: false, message: "MPD not found." });
    }

    // Check active shift
    const activeShift = await checkActiveShift(id);
    if (activeShift) {
      return res.status(409).json({
        success: false,
        code: "ACTIVE_SHIFT_IN_PROGRESS",
        message: `Cannot add nozzles to MPD "${mpd.mpdNumber}" while an active shift is in progress.`,
      });
    }

    const { nozzleId, name, nozzleNumber, fuelType, currentCumulativeReading, isActive } = req.body;

    // Check duplicate nozzleId within MPD
    const duplicate = mpd.nozzles.find(
      (n) => n.nozzleId.toLowerCase() === nozzleId.trim().toLowerCase()
    );
    if (duplicate) {
      return res.status(409).json({
        success: false,
        code: "NOZZLE_ID_EXISTS",
        message: `Nozzle with ID "${nozzleId.trim()}" already exists on this MPD.`,
      });
    }

    const newNozzle = {
      nozzleId: nozzleId.trim(),
      name: name.trim(),
      nozzleNumber: nozzleNumber || mpd.nozzles.length + 1,
      fuelType,
      currentCumulativeReading: currentCumulativeReading ?? 0,
      isActive: isActive !== false,
    };

    mpd.nozzles.push(newNozzle);
    await mpd.save();

    const created = mpd.nozzles[mpd.nozzles.length - 1];

    await recordAuditLog({
      actor: req.user,
      action: "NOZZLE_ADDED",
      entityType: "MPD",
      entityId: mpd._id,
      metadata: {
        mpdNumber: mpd.mpdNumber,
        nozzleId: created.nozzleId,
        name: created.name,
        fuelType: created.fuelType,
      },
    });

    return res.status(201).json({ success: true, data: mpd });
  } catch (error) {
    return next(error);
  }
};

export const updateManagerMpdNozzle = async (req, res, next) => {
  try {
    const { id, nozzleId } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid MPD ID." });
    }

    const station = await activeStation();
    const mpd = await Mpd.findOne({ _id: id, stationId: station._id });
    if (!mpd) {
      return res.status(404).json({ success: false, message: "MPD not found." });
    }

    // Check active shift
    const activeShift = await checkActiveShift(id);
    if (activeShift) {
      return res.status(409).json({
        success: false,
        code: "ACTIVE_SHIFT_IN_PROGRESS",
        message: `Cannot modify nozzles on MPD "${mpd.mpdNumber}" while an active shift is in progress.`,
      });
    }

    const nozzle = mpd.nozzles.find(
      (n) => n.nozzleId === nozzleId || String(n._id) === nozzleId
    );
    if (!nozzle) {
      return res.status(404).json({ success: false, message: "Nozzle not found on this MPD." });
    }

    const previousFuelType = nozzle.fuelType;
    const previousActive = nozzle.isActive;

    const { name, nozzleNumber, fuelType, currentCumulativeReading, isActive } = req.body;

    if (name !== undefined) nozzle.name = name.trim();
    if (nozzleNumber !== undefined) nozzle.nozzleNumber = nozzleNumber;
    if (fuelType !== undefined) nozzle.fuelType = fuelType;
    if (currentCumulativeReading !== undefined) nozzle.currentCumulativeReading = currentCumulativeReading;
    if (isActive !== undefined) nozzle.isActive = Boolean(isActive);

    await mpd.save();

    let action = "NOZZLE_UPDATED";
    if (fuelType !== undefined && fuelType !== previousFuelType) {
      action = "NOZZLE_FUEL_REASSIGNED";
    } else if (isActive !== undefined && isActive !== previousActive) {
      action = "NOZZLE_STATUS_CHANGED";
    }

    await recordAuditLog({
      actor: req.user,
      action,
      entityType: "MPD",
      entityId: mpd._id,
      metadata: {
        mpdNumber: mpd.mpdNumber,
        nozzleId: nozzle.nozzleId,
        name: nozzle.name,
        fuelType: nozzle.fuelType,
        previousFuelType: fuelType !== previousFuelType ? previousFuelType : undefined,
        isActive: nozzle.isActive,
      },
    });

    return res.json({ success: true, data: mpd });
  } catch (error) {
    return next(error);
  }
};

export const deleteManagerMpdNozzle = async (req, res, next) => {
  try {
    const { id, nozzleId } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid MPD ID." });
    }

    const station = await activeStation();
    const mpd = await Mpd.findOne({ _id: id, stationId: station._id });
    if (!mpd) {
      return res.status(404).json({ success: false, message: "MPD not found." });
    }

    // Check active shift
    const activeShift = await checkActiveShift(id);
    if (activeShift) {
      return res.status(409).json({
        success: false,
        code: "ACTIVE_SHIFT_IN_PROGRESS",
        message: `Cannot delete nozzle on MPD "${mpd.mpdNumber}" while an active shift is in progress.`,
      });
    }

    const nozzleIndex = mpd.nozzles.findIndex(
      (n) => n.nozzleId === nozzleId || String(n._id) === nozzleId
    );
    if (nozzleIndex === -1) {
      return res.status(404).json({ success: false, message: "Nozzle not found." });
    }

    const targetNozzle = mpd.nozzles[nozzleIndex];

    // Check if nozzle is referenced in historical shift readings
    const hasHistorical = await Shift.exists({
      mpdId: id,
      "readings.nozzleId": targetNozzle.nozzleId,
    });

    if (hasHistorical) {
      return res.status(409).json({
        success: false,
        code: "HISTORICAL_RECORDS_EXIST",
        message: `Cannot permanently delete nozzle "${targetNozzle.name}" (${targetNozzle.nozzleId}) because historical shift readings exist for it. Please deactivate the nozzle instead.`,
      });
    }

    mpd.nozzles.splice(nozzleIndex, 1);
    await mpd.save();

    await recordAuditLog({
      actor: req.user,
      action: "NOZZLE_DELETED",
      entityType: "MPD",
      entityId: mpd._id,
      metadata: {
        mpdNumber: mpd.mpdNumber,
        nozzleId: targetNozzle.nozzleId,
        name: targetNozzle.name,
      },
    });

    return res.json({ success: true, message: `Nozzle "${targetNozzle.name}" deleted successfully.`, data: mpd });
  } catch (error) {
    return next(error);
  }
};
