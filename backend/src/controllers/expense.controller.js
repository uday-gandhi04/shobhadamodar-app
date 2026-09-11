import Expense from "../models/Expense.js";
import Shift from "../models/Shift.js";

export const createExpense = async (
  req,
  res,
  next,
) => {
  try {
    const {
      shiftId,
      amountPaise,
      reason,
    } = req.body;

    if (!shiftId) {
      return res.status(400).json({
        success: false,
        message: "Shift is required.",
      });
    }

    const normalizedAmount =
      Number(amountPaise);

    if (
      !Number.isInteger(
        normalizedAmount,
      ) ||
      normalizedAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Expense amount must be a positive integer amount in paise.",
      });
    }

    const normalizedReason =
      String(reason || "").trim();

    if (normalizedReason.length < 2) {
      return res.status(400).json({
        success: false,
        message:
          "Expense reason is required.",
      });
    }

    const shift = await Shift.findOne({
      _id: shiftId,
      employeeId: req.user._id,
      status: "IN_PROGRESS",
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message:
          "Active shift not found.",
      });
    }

    const expense = await Expense.create({
      shiftId: shift._id,
      employeeId: req.user._id,
      businessDate: shift.businessDate,
      amountPaise:
        normalizedAmount,
      reason: normalizedReason,
    });

    return res.status(201).json({
      success: true,
      message:
        "Expense recorded successfully.",
      data: {
        expense,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyShiftExpenses =
  async (req, res, next) => {
    try {
      const { shiftId } = req.query;

      if (!shiftId) {
        return res.status(400).json({
          success: false,
          message:
            "Shift is required.",
        });
      }

      const shift =
        await Shift.findOne({
          _id: shiftId,
          employeeId: req.user._id,
        })
          .select("_id")
          .lean();

      if (!shift) {
        return res.status(404).json({
          success: false,
          message:
            "Shift not found.",
        });
      }

      const expenses =
        await Expense.find({
          shiftId: shift._id,
          employeeId: req.user._id,
        })
          .sort({
            createdAt: -1,
          })
          .lean();

      return res.status(200).json({
        success: true,
        data: expenses,
      });
    } catch (error) {
      next(error);
    }
  };

export const getManagerExpenses = async (req, res, next) => {
  try {
    const filters = {};

    if (req.query.date) filters.businessDate = req.query.date;
    if (req.query.employeeId) filters.employeeId = req.query.employeeId;
    if (req.query.shiftId) filters.shiftId = req.query.shiftId;

    const expenses = await Expense.find(filters)
      .populate('employeeId', 'name employeeId')
      .populate({
        path: 'shiftId',
        select: 'businessDate mpdId',
        populate: { path: 'mpdId', select: 'mpdNumber name' },
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    next(error);
  }
};