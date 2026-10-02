import Mpd from "../models/Mpd.js";
import Shift from "../models/Shift.js";
import FuelRate from "../models/FuelRate.js";

const getBusinessDate = (value) => {
  if (value) return value;

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

const getApplicableRate = async (businessDate) => {
  return FuelRate.findOne({
    businessDate: { $lte: businessDate },
  })
    .sort({ businessDate: -1 })
    .lean();
};

const getRateForFuel = (fuelType, rate) => {
  if (!rate) return 0;

  return fuelType === "PETROL"
    ? Number(rate.petrolRatePaise || 0)
    : Number(rate.dieselRatePaise || 0);
};

const buildShiftSummary = (shift) => {
  const readings = Array.isArray(shift.readings)
    ? shift.readings
    : [];

  const petrolLitres = readings.reduce(
    (sum, reading) =>
      sum +
      Number(
        reading.dispensedLitres ||
          (reading.closingReading != null
            ? Math.max(
                Number(reading.closingReading) -
                  Number(reading.openingReading),
                0,
              )
            : 0),
      ),
    0,
  );

  const dieselLitres = readings.reduce(
    (sum, reading) =>
      sum +
      Number(
        reading.dispensedLitres ||
          (reading.closingReading != null
            ? Math.max(
                Number(reading.closingReading) -
                  Number(reading.openingReading),
                0,
              )
            : 0),
      ),
    0,
  );

  return {
    _id: shift._id,
    businessDate: shift.businessDate,
    status: shift.status,

    startedAt: shift.startedAt,
    endedAt: shift.endedAt,

    employee: shift.employeeId
      ? {
          _id: shift.employeeId._id,
          name: shift.employeeId.name,
          employeeId: shift.employeeId.employeeId,
        }
      : null,

    mpd: shift.mpdId
      ? {
          _id: shift.mpdId._id,
          mpdNumber: shift.mpdId.mpdNumber,
          serialNumber: shift.mpdId.serialNumber,
        }
      : null,

    totalLitresPetrol:
      Number(shift.totalLitresPetrol || 0) ||
      readings
        .filter((reading) => reading.fuelType === "PETROL")
        .reduce(
          (sum, reading) =>
            sum +
            (reading.closingReading != null
              ? Math.max(
                  Number(reading.closingReading) -
                    Number(reading.openingReading),
                  0,
                )
              : 0),
          0,
        ),

    totalLitresDiesel:
      Number(shift.totalLitresDiesel || 0) ||
      readings
        .filter((reading) => reading.fuelType === "DIESEL")
        .reduce(
          (sum, reading) =>
            sum +
            (reading.closingReading != null
              ? Math.max(
                  Number(reading.closingReading) -
                    Number(reading.openingReading),
                  0,
                )
              : 0),
          0,
        ),

    expectedTotalSalePaise: Number(
      shift.expectedTotalSalePaise || 0,
    ),

    totalCollectedPaise: Number(
      shift.totalCollectedPaise || 0,
    ),

    differencePaise: Number(
      shift.differencePaise || 0,
    ),

    reconciliationStatus:
      shift.reconciliationStatus || "PENDING",

    readings,
  };
};

export const getManagerOperations = async (
  req,
  res,
  next,
) => {
  try {
    const businessDate = getBusinessDate(
      req.query.date,
    );

    const [mpds, activeShifts, dateShifts, rate] =
      await Promise.all([
        Mpd.find({
          isActive: true,
        })
          .select(
            "_id mpdNumber serialNumber nozzles isActive",
          )
          .lean(),

        // Active shifts must NOT be restricted by businessDate.
        Shift.find({
          status: "IN_PROGRESS",
        })
          .populate(
            "employeeId",
            "name employeeId",
          )
          .populate(
            "mpdId",
            "mpdNumber serialNumber nozzles",
          )
          .sort({ startedAt: 1 })
          .lean(),

        Shift.find({
          businessDate,
        })
          .populate(
            "employeeId",
            "name employeeId",
          )
          .populate(
            "mpdId",
            "mpdNumber serialNumber nozzles",
          )
          .sort({ createdAt: -1 })
          .lean(),

        getApplicableRate(businessDate),
      ]);

    const activeShiftByMpd = new Map(
      activeShifts.map((shift) => [
        String(
          shift.mpdId?._id ||
            shift.mpdId,
        ),
        shift,
      ]),
    );

    const mpdViews = mpds.map((mpd) => {
      const activeShift =
        activeShiftByMpd.get(
          String(mpd._id),
        ) || null;

      const shiftReadings = new Map(
        (activeShift?.readings || []).map(
          (reading) => [
            reading.nozzleId,
            reading,
          ],
        ),
      );

      const nozzles = (mpd.nozzles || []).map(
        (nozzle) => {
          const shiftReading =
            shiftReadings.get(
              nozzle.nozzleId,
            );

          const opening =
            shiftReading?.openingReading ??
            nozzle.currentCumulativeReading ??
            0;

          const closing =
            shiftReading?.closingReading ??
            null;

          const litres =
            closing != null
              ? Math.max(
                  Number(closing) -
                    Number(opening),
                  0,
                )
              : 0;

          const ratePaise =
            getRateForFuel(
              nozzle.fuelType,
              rate,
            );

          const salePaise =
            Math.round(
              litres * ratePaise,
            );

          return {
            nozzleId:
              nozzle.nozzleId,
            name: nozzle.name,
            fuelType:
              nozzle.fuelType,
            currentReading:
              closing != null
                ? Number(closing)
                : Number(
                    nozzle.currentCumulativeReading ||
                      opening ||
                      0,
                  ),
            openingReading:
              Number(opening),
            closingReading:
              closing != null
                ? Number(closing)
                : null,
            litres,
            salePaise,
            readingEntered:
              closing != null,
          };
        },
      );

      const totalPetrolLitres =
        nozzles.reduce(
          (sum, nozzle) =>
            sum +
            (nozzle.fuelType === "PETROL"
              ? nozzle.litres
              : 0),
          0,
        );

      const totalDieselLitres =
        nozzles.reduce(
          (sum, nozzle) =>
            sum +
            (nozzle.fuelType === "DIESEL"
              ? nozzle.litres
              : 0),
          0,
        );

      const estimatedSalePaise =
        nozzles.reduce(
          (sum, nozzle) =>
            sum + nozzle.salePaise,
          0,
        );

      return {
        _id: mpd._id,
        mpdNumber: mpd.mpdNumber,
        serialNumber: mpd.serialNumber,
        isActive: mpd.isActive,

        status: activeShift
          ? "ACTIVE"
          : "FREE",

        activeShift: activeShift
          ? {
              _id: activeShift._id,
              businessDate:
                activeShift.businessDate,
              startedAt:
                activeShift.startedAt,
              employee:
                activeShift.employeeId
                  ? {
                      _id:
                        activeShift
                          .employeeId
                          ._id,
                      name:
                        activeShift
                          .employeeId
                          .name,
                      employeeId:
                        activeShift
                          .employeeId
                          .employeeId,
                    }
                  : null,
            }
          : null,

        nozzles,

        totalPetrolLitres,
        totalDieselLitres,
        totalLitres:
          totalPetrolLitres +
          totalDieselLitres,

        estimatedSalePaise,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        businessDate,

        activeShifts:
          activeShifts.map(
            buildShiftSummary,
          ),

        shifts:
          dateShifts.map(
            buildShiftSummary,
          ),

        mpds: mpdViews,

        rate: rate
          ? {
              businessDate:
                rate.businessDate,
              petrolRatePaise:
                Number(
                  rate.petrolRatePaise ||
                    0,
                ),
              dieselRatePaise:
                Number(
                  rate.dieselRatePaise ||
                    0,
                ),
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getManagerShiftDetail = async (
  req,
  res,
  next,
) => {
  try {
    const { shiftId } = req.params;

    if (!shiftId) {
      return res.status(400).json({
        success: false,
        message: "Shift ID is required.",
      });
    }

    const shift = await Shift.findById(shiftId)
      .populate(
        "employeeId",
        "name employeeId",
      )
      .populate(
        "mpdId",
        "mpdNumber serialNumber nozzles",
      )
      .lean();

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found.",
      });
    }

    const [expenses, udhariTransactions] =
      await Promise.all([
        Expense.find({
          shiftId: shift._id,
        })
          .sort({ createdAt: 1 })
          .lean(),

        UdhariTransaction.find({
          shiftId: shift._id,
        })
          .populate(
            "customerId",
            "name outstandingBalance",
          )
          .sort({ createdAt: 1 })
          .lean(),
      ]);

    const totalExpensePaise =
      expenses.reduce(
        (sum, expense) =>
          sum +
          Number(
            expense.amountPaise || 0,
          ),
        0,
      );

    const totalUdhariPaise =
      udhariTransactions.reduce(
        (sum, transaction) =>
          sum +
          Number(
            transaction.amountPaise || 0,
          ),
        0,
      );

    return res.status(200).json({
      success: true,

      data: {
        _id: shift._id,

        businessDate:
          shift.businessDate,

        status:
          shift.status,

        startedAt:
          shift.startedAt,

        endedAt:
          shift.endedAt,

        employee:
          shift.employeeId
            ? {
                _id:
                  shift.employeeId._id,
                name:
                  shift.employeeId.name,
                employeeId:
                  shift.employeeId
                    .employeeId,
              }
            : null,

        mpd:
          shift.mpdId
            ? {
                _id:
                  shift.mpdId._id,
                mpdNumber:
                  shift.mpdId
                    .mpdNumber,
                serialNumber:
                  shift.mpdId
                    .serialNumber,
              }
            : null,

        readings:
          shift.readings || [],

        totalLitresPetrol:
          Number(
            shift.totalLitresPetrol || 0,
          ),

        totalLitresDiesel:
          Number(
            shift.totalLitresDiesel || 0,
          ),

        expectedTotalSalePaise:
          Number(
            shift.expectedTotalSalePaise ||
              0,
          ),

        cashCollections:
          shift.cashCollections || [],

        coinsPaise:
          Number(
            shift.coinsPaise || 0,
          ),

        totalCashPaise:
          Number(
            shift.totalCashPaise || 0,
          ),

        upiCollection:
          shift.upiCollection || null,

        totalUpiPaise:
          Number(
            shift.totalUpiPaise || 0,
          ),

        atmEntries:
          shift.atmEntries || [],

        totalCardPaise:
          Number(
            shift.totalCardPaise || 0,
          ),

        totalUdhariPaise:
          Number(
            shift.totalUdhariPaise ||
              totalUdhariPaise ||
              0,
          ),

        totalCollectedPaise:
          Number(
            shift.totalCollectedPaise ||
              0,
          ),

        differencePaise:
          Number(
            shift.differencePaise ||
              0,
          ),

        reconciliationStatus:
          shift.reconciliationStatus ||
          "PENDING",

        expenses,

        totalExpensePaise,

        udhariTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
};