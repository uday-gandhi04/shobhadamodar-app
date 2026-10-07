import mongoose from "mongoose";

import Shift from "../models/Shift.js";
import User from "../models/User.js";
import { ACCOUNT_STATUSES, effectiveAccountStatus } from "../utils/accountStatus.js";
import { recordAuditLog } from "../utils/auditLog.js";

const employeeProjection = "name employeeId isActive accountStatus createdAt";
const completedShiftStatuses = ["ENDED", "FORCE_CLOSED"];

const serializeCurrentShift = (shift) => {
  if (!shift) return null;

  return {
    id: String(shift._id),
    mpd: shift.mpdId?.mpdNumber || null,
    startedAt: shift.startedAt,
    businessDate: shift.businessDate,
    status: shift.status,
  };
};

const serializeEmployee = (employee, currentShift) => {
  const accountStatus = effectiveAccountStatus(employee);
  return {
    id: String(employee._id),
    name: employee.name,
    employeeId: employee.employeeId,
    accountStatus,
    isActive: accountStatus === "ACTIVE",
    createdAt: employee.createdAt,
    currentShift: serializeCurrentShift(currentShift),
  };
};

const findEmployee = async (id) => {
  if (!mongoose.isValidObjectId(id)) return null;

  return User.findOne({ _id: id, role: "EMPLOYEE" })
    .select(employeeProjection)
    .lean();
};

export const getManagerEmployees = async (_req, res, next) => {
  try {
    const [users, activeShifts] = await Promise.all([
      User.find({ role: "EMPLOYEE" })
        .select(employeeProjection)
        .sort({ name: 1, employeeId: 1 })
        .lean(),
      Shift.find({ status: "IN_PROGRESS" })
        .select("employeeId mpdId startedAt businessDate status")
        .populate("mpdId", "mpdNumber")
        .lean(),
    ]);

    const currentShiftByEmployee = new Map(
      activeShifts.map((shift) => [String(shift.employeeId), shift]),
    );
    const employees = users.map((user) =>
      serializeEmployee(
        user,
        currentShiftByEmployee.get(String(user._id)),
      ),
    );
    const active = employees.filter(
      (employee) => employee.accountStatus === "ACTIVE",
    ).length;
    const inactive = employees.filter(
      (employee) => employee.accountStatus === "INACTIVE",
    ).length;
    const banned = employees.filter(
      (employee) => employee.accountStatus === "BANNED",
    ).length;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          total: employees.length,
          active,
          inactive,
          banned,
          inactiveOrBanned: inactive + banned,
          working: employees.filter((employee) => employee.currentShift).length,
        },
        employees,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getManagerEmployeeDetail = async (req, res, next) => {
  try {
    const employee = await findEmployee(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    const [activeShift, shiftHistory, [summary = null]] = await Promise.all([
      Shift.findOne({
        employeeId: employee._id,
        status: "IN_PROGRESS",
      })
        .select("mpdId startedAt businessDate status")
        .populate("mpdId", "mpdNumber")
        .lean(),
      Shift.find({
        employeeId: employee._id,
        status: { $in: completedShiftStatuses },
      })
        .select("businessDate mpdId startedAt endedAt status totalLitresPetrol totalLitresDiesel expectedTotalSalePaise differencePaise reconciliationStatus")
        .populate("mpdId", "mpdNumber")
        .sort({ businessDate: -1, startedAt: -1 })
        .limit(30)
        .lean(),
      Shift.aggregate([
        {
          $match: {
            employeeId: employee._id,
            status: { $in: completedShiftStatuses },
          },
        },
        {
          $group: {
            _id: null,
            shiftCount: { $sum: 1 },
            totalLitresPetrol: {
              $sum: { $ifNull: ["$totalLitresPetrol", 0] },
            },
            totalLitresDiesel: {
              $sum: { $ifNull: ["$totalLitresDiesel", 0] },
            },
            totalSalePaise: {
              $sum: { $ifNull: ["$expectedTotalSalePaise", 0] },
            },
            forceClosedShiftCount: {
              $sum: {
                $cond: [{ $eq: ["$status", "FORCE_CLOSED"] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        profile: {
          id: String(employee._id),
          name: employee.name,
          employeeId: employee.employeeId,
          accountStatus: effectiveAccountStatus(employee),
          isActive: effectiveAccountStatus(employee) === "ACTIVE",
          createdAt: employee.createdAt,
        },
        currentShift: serializeCurrentShift(activeShift),
        shiftHistory: shiftHistory.map((shift) => ({
          id: String(shift._id),
          businessDate: shift.businessDate,
          mpd: shift.mpdId?.mpdNumber || null,
          startedAt: shift.startedAt,
          endedAt: shift.endedAt,
          status: shift.status,
          totalLitres:
            Number(shift.totalLitresPetrol || 0) +
            Number(shift.totalLitresDiesel || 0),
          salePaise: Number(shift.expectedTotalSalePaise || 0),
          differencePaise: Number(shift.differencePaise || 0),
          reconciliationStatus: shift.reconciliationStatus || "PENDING",
        })),
        summary: {
          shiftCount: Number(summary?.shiftCount || 0),
          totalLitresPetrol: Number(summary?.totalLitresPetrol || 0),
          totalLitresDiesel: Number(summary?.totalLitresDiesel || 0),
          totalLitres:
            Number(summary?.totalLitresPetrol || 0) +
            Number(summary?.totalLitresDiesel || 0),
          totalSalePaise: Number(summary?.totalSalePaise || 0),
          forceClosedShiftCount: Number(summary?.forceClosedShiftCount || 0),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateManagerEmployee = async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 2 and 100 characters.",
      });
    }

    const employee = await User.findOne({ _id: req.params.id, role: "EMPLOYEE" });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    const oldName = employee.name;
    employee.name = name;
    await employee.save();

    await recordAuditLog({
      actor: req.user,
      action: "EMPLOYEE_PROFILE_UPDATED",
      entityType: "EMPLOYEE",
      entityId: employee._id,
      metadata: { employeeId: employee.employeeId, oldName, newName: name },
    });

    return res.status(200).json({
      success: true,
      data: {
        id: String(employee._id),
        name: employee.name,
        employeeId: employee.employeeId,
        accountStatus: effectiveAccountStatus(employee),
        isActive: effectiveAccountStatus(employee) === "ACTIVE",
        createdAt: employee.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateManagerEmployeeStatus = async (req, res, next) => {
  try {
    const requestedStatus = req.body.accountStatus;
    if (!ACCOUNT_STATUSES.includes(requestedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee account status.",
      });
    }

    const employee = await User.findOne({
      _id: req.params.id,
      role: "EMPLOYEE",
    }).select(employeeProjection);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    const currentStatus = effectiveAccountStatus(employee);
    const allowedTransitions = {
      ACTIVE: ["INACTIVE", "BANNED"],
      INACTIVE: ["ACTIVE"],
      BANNED: ["ACTIVE"],
    };
    if (requestedStatus !== currentStatus &&
      !allowedTransitions[currentStatus].includes(requestedStatus)) {
      return res.status(409).json({
        success: false,
        message: "This account status change is not allowed.",
      });
    }

    if (requestedStatus !== "ACTIVE") {
      const activeShift = await Shift.findOne({
        employeeId: employee._id,
        status: "IN_PROGRESS",
      })
        .select("mpdId startedAt businessDate status")
        .populate("mpdId", "mpdNumber")
        .lean();

      if (activeShift) {
        return res.status(409).json({
          success: false,
          code: "EMPLOYEE_HAS_ACTIVE_SHIFT",
          message: "End the active shift before changing this employee's account status.",
          data: { currentShift: serializeCurrentShift(activeShift) },
        });
      }
    }

    employee.accountStatus = requestedStatus;
    employee.isActive = requestedStatus === "ACTIVE";
    await employee.save();

    await recordAuditLog({
      actor: req.user,
      action: "EMPLOYEE_STATUS_CHANGED",
      entityType: "EMPLOYEE",
      entityId: employee._id,
      metadata: {
        employeeId: employee.employeeId,
        previousStatus: currentStatus,
        newStatus: requestedStatus,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        id: String(employee._id),
        name: employee.name,
        employeeId: employee.employeeId,
        accountStatus: effectiveAccountStatus(employee),
        isActive: employee.isActive,
        createdAt: employee.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resetManagerEmployeePassword = async (req, res, next) => {
  try {
    const employee = await User.findOne({
      _id: req.params.id,
      role: "EMPLOYEE",
    });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    employee.password = req.body.password;
    employee.tokenVersion += 1;
    await employee.save();

    await recordAuditLog({
      actor: req.user,
      action: "EMPLOYEE_PASSWORD_RESET",
      entityType: "EMPLOYEE",
      entityId: employee._id,
      metadata: { employeeId: employee.employeeId },
    });

    return res.status(200).json({
      success: true,
      message: "Employee password reset successfully.",
    });
  } catch (error) {
    next(error);
  }
};
