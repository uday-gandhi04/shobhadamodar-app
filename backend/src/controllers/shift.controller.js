import Shift from '../models/Shift.js';
import Mpd from '../models/Mpd.js';

/**
 * Return the employee's currently active shift for a business date.
 *
 * @route GET /api/shifts/current
 * @access Protected
 */
export const getCurrentShift = async (req, res, next) => {
  try {
    const businessDate =
      req.query.date ||
      new Date().toISOString().split('T')[0];

    const shift = await Shift.findOne({
      employeeId: req.user._id,
      businessDate,
      status: {
        $in: ['OPEN', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW'],
      },
    })
      .populate('mpdId')
      .lean();

    if (!shift) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      data: shift,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start a new employee shift on a selected MPD.
 *
 * @route POST /api/shifts/start
 * @access Protected
 */
export const startShift = async (req, res, next) => {
  try {
    if (req.user.role !== 'EMPLOYEE') {
      return res.status(403).json({
        success: false,
        message: 'Only employees can start shifts.',
        code: 'FORBIDDEN',
      });
    }

    const {
      businessDate,
      shiftType,
      mpdId,
    } = req.body;

    /*
     * Check employee lock.
     */
    const existingEmployeeShift = await Shift.findOne({
      employeeId: req.user._id,
      status: 'IN_PROGRESS',
    });

    if (existingEmployeeShift) {
      return res.status(409).json({
        success: false,
        message:
          'You already have an active shift. End it before starting another shift.',
        code: 'EMPLOYEE_ALREADY_ACTIVE',
        data: {
          shiftId: existingEmployeeShift._id,
          mpdId: existingEmployeeShift.mpdId,
        },
      });
    }

    /*
     * Check MPD lock.
     */
    const existingMpdShift = await Shift.findOne({
      mpdId,
      status: 'IN_PROGRESS',
    })
      .populate('employeeId', 'name employeeId')
      .lean();

    if (existingMpdShift) {
      return res.status(409).json({
        success: false,
        message:
          'This MPD is currently being operated by another employee.',
        code: 'MPD_ALREADY_ACTIVE',
        data: {
          shiftId: existingMpdShift._id,
          employee: existingMpdShift.employeeId,
        },
      });
    }

    const mpd = await Mpd.findOne({
      _id: mpdId,
      isActive: true,
    });

    if (!mpd) {
      return res.status(404).json({
        success: false,
        message: 'Selected MPD was not found or is inactive.',
        code: 'MPD_NOT_FOUND',
      });
    }

    const shift = await Shift.create({
      businessDate,
      shiftType,
      mpdId,
      employeeId: req.user._id,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Shift started successfully.',
      data: shift,
    });
  } catch (error) {
    /*
     * Race-condition protection.
     *
     * Even if two requests pass the findOne checks simultaneously,
     * MongoDB's unique partial indexes will allow only one to succeed.
     */
    if (error.code === 11000) {
      const duplicateField = Object.keys(
        error.keyPattern || {},
      )[0];

      if (duplicateField === 'employeeId') {
        return res.status(409).json({
          success: false,
          message:
            'You already have an active shift.',
          code: 'EMPLOYEE_ALREADY_ACTIVE',
        });
      }

      if (duplicateField === 'mpdId') {
        return res.status(409).json({
          success: false,
          message:
            'This MPD is currently being operated by another employee.',
          code: 'MPD_ALREADY_ACTIVE',
        });
      }

      return res.status(409).json({
        success: false,
        message: 'Shift could not be started because the resource is busy.',
        code: 'SHIFT_CONFLICT',
      });
    }

    next(error);
  }
};

export const endShift = async (req, res, next) => {
  try {
    if (req.user.role !== 'EMPLOYEE') {
      return res.status(403).json({
        success: false,
        message: 'Only employees can end their shifts.',
        code: 'FORBIDDEN',
      });
    }

    const shift = await Shift.findOne({
      _id: req.params.id,
      employeeId: req.user._id,
      status: 'IN_PROGRESS',
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Active shift not found.',
        code: 'ACTIVE_SHIFT_NOT_FOUND',
      });
    }

    shift.status = 'ENDED';
    shift.endedAt = new Date();

    await shift.save();

    return res.status(200).json({
      success: true,
      message: 'Shift ended successfully.',
      data: shift,
    });
  } catch (error) {
    next(error);
  }
};