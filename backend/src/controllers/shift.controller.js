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
    const {
      businessDate,
      shiftType,
      mpdId,
    } = req.body;

    if (req.user.role !== 'EMPLOYEE') {
      return res.status(403).json({
        success: false,
        message: 'Only employees can start employee shifts.',
        code: 'FORBIDDEN',
      });
    }

    const existingShift = await Shift.findOne({
      employeeId: req.user._id,
      businessDate,
      status: {
        $in: ['OPEN', 'IN_PROGRESS'],
      },
    });

    if (existingShift) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active shift.',
        code: 'ACTIVE_SHIFT_EXISTS',
        data: {
          shiftId: existingShift._id,
          mpdId: existingShift.mpdId,
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
      mpdId: mpd._id,
      employeeId: req.user._id,
      status: 'IN_PROGRESS',
      startedAt: new Date(),

      readings: [],

      totalLitresPetrol: 0,
      totalLitresDiesel: 0,
      expectedTotalSalePaise: 0,

      cashCollections: [],
      totalCashPaise: 0,
      totalUpiPaise: 0,
      totalCardPaise: 0,

      udhariEntries: [],
      totalUdhariPaise: 0,

      totalCollectedPaise: 0,
      differencePaise: 0,
      reconciliationStatus: 'MATCHED',
    });

    return res.status(201).json({
      success: true,
      data: shift,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A shift already exists for this MPD and shift slot.',
        code: 'SHIFT_ALREADY_EXISTS',
      });
    }

    next(error);
  }
};