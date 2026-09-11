import Shift from '../models/Shift.js';
import Mpd from '../models/Mpd.js';
import FuelRate from '../models/FuelRate.js';
import UdhariTransaction from '../models/UdhariTransaction.js';

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

const businessDateFromQuery = (value) => {
  if (value) return value;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

const normalizeCash = (cashBreakdown = []) => {
  const counts = new Map(cashBreakdown.map((item) => [Number(item.denomination), Number(item.count)]));

  return DENOMINATIONS
    .map((denomination) => {
      const count = counts.get(denomination) || 0;
      return {
        denomination,
        count,
        totalPaise: denomination * count * 100,
      };
    })
    .filter((item) => item.count > 0);
};

const calculateCollections = (collections = {}) => {
  const cashCollections = normalizeCash(collections.cashBreakdown);
  const coinsPaise = Number(collections.coinsPaise || 0);
  const totalCashPaise = cashCollections.reduce((sum, item) => sum + item.totalPaise, 0) + coinsPaise;
  const totalUpiPaise = Number(collections.upiPaise || 0);
  const totalCardPaise = Number(collections.cardPaise || 0);
  const totalUdhariPaise = Number(collections.udhariPaise || 0);
  const totalCollectedPaise =
    totalCashPaise + totalUpiPaise + totalCardPaise + totalUdhariPaise;

  return {
    cashCollections,
    coinsPaise,
    upiCollection: collections.upiCollection,
    totalCashPaise,
    totalUpiPaise,
    totalCardPaise,
    totalUdhariPaise,
    totalCollectedPaise,
  };
};

const calculateFinalResult = async (shift, finalReadings, collections) => {
  const rates = await FuelRate.findOne({
    businessDate: { $lte: shift.businessDate },
  }).sort({
    businessDate: -1,
  });
  if (!rates) {
    const error = new Error(`Fuel rates not found for ${shift.businessDate}.`);
    error.status = 400;
    throw error;
  }

  const openingByNozzle = new Map(shift.readings.map((reading) => [reading.nozzleId, reading]));
  const mpd = await Mpd.findById(shift.mpdId).lean();

  if (!mpd) {
    const error = new Error('MPD not found.');
    error.status = 404;
    throw error;
  }

  let expectedTotalSalePaise = 0;
  let totalLitresPetrol = 0;
  let totalLitresDiesel = 0;

  const processedReadings = [];
  const updatedNozzles = [];

  for (const input of finalReadings) {
    const opening = openingByNozzle.get(input.nozzleId);
    const nozzle = mpd.nozzles.find((item) => item.nozzleId === input.nozzleId);

    if (!opening || !nozzle) {
      const error = new Error(`Nozzle ${input.nozzleId} is not part of this shift.`);
      error.status = 400;
      throw error;
    }

    if (input.closingReading < opening.openingReading) {
      const error = new Error(
        `${nozzle.name}: closing reading cannot be less than opening reading.`,
      );
      error.status = 400;
      throw error;
    }

    const dispensedLitres = Math.round((input.closingReading - opening.openingReading) * 100) / 100;
    const ratePaise = nozzle.fuelType === 'PETROL' ? rates.petrolRatePaise : rates.dieselRatePaise;
    const expectedSalePaise = Math.round(dispensedLitres * ratePaise);

    if (nozzle.fuelType === 'PETROL') totalLitresPetrol += dispensedLitres;
    if (nozzle.fuelType === 'DIESEL') totalLitresDiesel += dispensedLitres;
    expectedTotalSalePaise += expectedSalePaise;

    processedReadings.push({
      nozzleId: nozzle.nozzleId,
      fuelType: nozzle.fuelType,
      openingReading: opening.openingReading,
      closingReading: input.closingReading,
      dispensedLitres,
      ratePaise,
      expectedSalePaise,
    });

    updatedNozzles.push({ nozzleId: nozzle.nozzleId, closingReading: input.closingReading });
  }

  const financials = calculateCollections(collections);
  const differencePaise = financials.totalCollectedPaise - expectedTotalSalePaise;
  const reconciliationStatus =
    differencePaise === 0 ? 'MATCHED' : differencePaise < 0 ? 'SHORT' : 'EXCESS';

  return {
    mpd,
    processedReadings,
    updatedNozzles,
    totalLitresPetrol,
    totalLitresDiesel,
    expectedTotalSalePaise,
    differencePaise,
    reconciliationStatus,
    ...financials,
  };
};

export const getAvailableMpds = async (req, res, next) => {
  try {
    const [mpds, activeShifts] = await Promise.all([
      Mpd.find({ isActive: true })
        .select('_id mpdNumber serialNumber nozzles')
        .lean(),

      /*
       * IMPORTANT:
       *
       * MPD availability depends only on whether
       * the MPD currently has an IN_PROGRESS shift.
       *
       * Do NOT filter by businessDate here.
       *
       * A NIGHT shift started on Sep 8 remains active
       * after midnight on Sep 9 until explicitly ended.
       */
      Shift.find({
        status: 'IN_PROGRESS',
      })
        .select('mpdId')
        .lean(),
    ]);

    const lockedMpdIds = new Set(
      activeShifts.map((shift) =>
        String(shift.mpdId),
      ),
    );

    return res.status(200).json({
      success: true,

      data: mpds.map((mpd) => ({
        _id: mpd._id,
        mpdNumber: mpd.mpdNumber,
        serialNumber: mpd.serialNumber,

        isAvailable:
          !lockedMpdIds.has(
            String(mpd._id),
          ),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentShift = async (req, res, next) => {
  try {
    const businessDate = businessDateFromQuery(req.query.date);

    const shift = await Shift.findOne({
      employeeId: req.user._id,
      status: 'IN_PROGRESS',
    })
      .populate('mpdId')
      .lean();

    if (shift) {
      const transactions = await UdhariTransaction.find({
        shiftId: shift._id,
      })
        .populate('customerId', 'name outstandingBalance')
        .sort({ createdAt: 1 })
        .lean();

      shift.udhariEntries = transactions.map((transaction) => ({
        id: transaction._id,
        transactionId: transaction._id,
        customerId: transaction.customerId?._id,
        customer: transaction.customerId,
        customerName: transaction.customerId?.name,
        vehicleNumber: transaction.vehicleNumber,
        fuelType: transaction.fuelType,
        litres: transaction.litres,
        ratePaise: transaction.ratePaise,
        amountPaise: transaction.amountPaise,
      }));
    }

    return res.status(200).json({ success: true, data: shift || null });
  } catch (error) {
    next(error);
  }
};

export const startShift = async (req, res, next) => {
  try {
    if (req.user.role !== 'EMPLOYEE') {
      return res.status(403).json({
        success: false,
        message: 'Only employees can start shifts.',
        code: 'FORBIDDEN',
      });
    }

    const { businessDate, shiftType, mpdId } = req.body;

    const [existingEmployeeShift, existingMpdShift, mpd] = await Promise.all([
      Shift.findOne({ employeeId: req.user._id, status: 'IN_PROGRESS' }),
      Shift.findOne({ mpdId, status: 'IN_PROGRESS' }).populate('employeeId', 'name employeeId'),
      Mpd.findOne({ _id: mpdId, isActive: true }),
    ]);

    if (existingEmployeeShift) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active shift. End it before starting another shift.',
        code: 'EMPLOYEE_ALREADY_ACTIVE',
        data: { shiftId: existingEmployeeShift._id, mpdId: existingEmployeeShift.mpdId },
      });
    }

    if (existingMpdShift) {
      return res.status(409).json({
        success: false,
        message: 'This MPD is currently being operated by another employee.',
        code: 'MPD_ALREADY_ACTIVE',
      });
    }

    if (!mpd) {
      return res.status(404).json({
        success: false,
        message: 'Selected MPD was not found or is inactive.',
        code: 'MPD_NOT_FOUND',
      });
    }

    const openingReadings = mpd.nozzles
      .filter((nozzle) => nozzle.isActive !== false)
      .map((nozzle) => ({
        nozzleId: nozzle.nozzleId,
        fuelType: nozzle.fuelType,
        openingReading: nozzle.currentCumulativeReading,
      }));

    const shift = await Shift.create({
      businessDate,
      shiftType,
      mpdId,
      employeeId: req.user._id,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      readings: openingReadings,
    });

    const populatedShift = await Shift.findById(shift._id).populate('mpdId').lean();

    return res.status(201).json({
      success: true,
      message: 'Shift started successfully.',
      data: populatedShift,
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];
      return res.status(409).json({
        success: false,
        message:
          duplicateField === 'employeeId'
            ? 'You already have an active shift.'
            : 'This MPD is currently being operated by another employee.',
        code:
          duplicateField === 'employeeId'
            ? 'EMPLOYEE_ALREADY_ACTIVE'
            : 'MPD_ALREADY_ACTIVE',
      });
    }

    next(error);
  }
};

export const updateCollections = async (req, res, next) => {
  try {
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

    const financials = calculateCollections(req.body);

    shift.cashCollections = financials.cashCollections;
    shift.coinsPaise = financials.coinsPaise;
    if (financials.upiCollection) shift.upiCollection = financials.upiCollection;
    shift.totalCashPaise = financials.totalCashPaise;
    shift.totalUpiPaise = financials.totalUpiPaise;
    shift.totalCardPaise = financials.totalCardPaise;
    shift.totalUdhariPaise = financials.totalUdhariPaise;
    shift.totalCollectedPaise = financials.totalCollectedPaise;
    shift.reconciliationStatus = 'PENDING';

    await shift.save();

    return res.status(200).json({
      success: true,
      message: 'Collections saved successfully.',
      data: shift,
    });
  } catch (error) {
    next(error);
  }
};

export const updateReadings = async (req, res, next) => {
  try {
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

    const readingsById = new Map(
      shift.readings.map((reading) => [reading.nozzleId, reading]),
    );

    for (const input of req.body.readings) {
      const reading = readingsById.get(input.nozzleId);
      if (!reading) {
        return res.status(400).json({
          success: false,
          message: `Nozzle ${input.nozzleId} is not part of this shift.`,
        });
      }

      if (input.closingReading < reading.openingReading) {
        return res.status(400).json({
          success: false,
          message: `${input.nozzleId}: closing reading cannot be less than opening reading.`,
        });
      }

      reading.closingReading = input.closingReading;
    }

    await shift.save();
    return res.status(200).json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
};

export const previewEndShift = async (req, res, next) => {
  try {
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

    const result = await calculateFinalResult(shift, req.body.readings, req.body.collections);

    return res.status(200).json({
      success: true,
      data: {
        expectedTotalSalePaise: result.expectedTotalSalePaise,
        totalCollectedPaise: result.totalCollectedPaise,
        differencePaise: result.differencePaise,
        reconciliationStatus: result.reconciliationStatus,
        totalLitresPetrol: result.totalLitresPetrol,
        totalLitresDiesel: result.totalLitresDiesel,
        cashCollections: result.cashCollections,
        coinsPaise: result.coinsPaise,
        upiCollection: result.upiCollection,
        totalCashPaise: result.totalCashPaise,
        totalUpiPaise: result.totalUpiPaise,
        totalCardPaise: result.totalCardPaise,
        totalUdhariPaise: result.totalUdhariPaise,
        readings: result.processedReadings,
      },
    });
  } catch (error) {
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

    const result = await calculateFinalResult(shift, req.body.readings, req.body.collections);

    shift.readings = result.processedReadings;
    shift.cashCollections = result.cashCollections;
    shift.coinsPaise = result.coinsPaise;
    if (result.upiCollection) shift.upiCollection = result.upiCollection;
    shift.totalLitresPetrol = result.totalLitresPetrol;
    shift.totalLitresDiesel = result.totalLitresDiesel;
    shift.expectedTotalSalePaise = result.expectedTotalSalePaise;
    shift.totalCashPaise = result.totalCashPaise;
    shift.totalUpiPaise = result.totalUpiPaise;
    shift.totalCardPaise = result.totalCardPaise;
    shift.totalUdhariPaise = result.totalUdhariPaise;
    shift.totalCollectedPaise = result.totalCollectedPaise;
    shift.differencePaise = result.differencePaise;
    shift.reconciliationStatus = result.reconciliationStatus;
    shift.status = 'ENDED';
    shift.endedAt = new Date();

    for (const updated of result.updatedNozzles) {
      const nozzle = result.mpd.nozzles.find((item) => item.nozzleId === updated.nozzleId);
      if (nozzle) {
        nozzle.currentCumulativeReading = updated.closingReading;
      }
    }

    await Promise.all([shift.save(), Mpd.findByIdAndUpdate(result.mpd._id, { nozzles: result.mpd.nozzles })]);

    return res.status(200).json({
      success: true,
      message: 'Shift ended successfully.',
      data: {
        shiftId: shift._id,
        status: shift.reconciliationStatus,
        differencePaise: shift.differencePaise,
        totalSalePaise: shift.expectedTotalSalePaise,
        totalCollectedPaise: shift.totalCollectedPaise,
        startedAt: shift.startedAt,
        endedAt: shift.endedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
