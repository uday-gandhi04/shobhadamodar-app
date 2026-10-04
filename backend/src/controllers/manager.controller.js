import Mpd from "../models/Mpd.js";
import Shift from "../models/Shift.js";
import FuelRate from "../models/FuelRate.js";
import Expense from "../models/Expense.js";
import UdhariTransaction from "../models/UdhariTransaction.js";

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

  const litresForFuel = (fuelType) =>
    readings
      .filter((reading) => reading.fuelType === fuelType)
      .reduce(
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

  const petrolLitres = litresForFuel("PETROL");
  const dieselLitres = litresForFuel("DIESEL");

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
      petrolLitres,

    totalLitresDiesel:
      Number(shift.totalLitresDiesel || 0) ||
      dieselLitres,

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

const accountingTotalFields = [
  "totalLitresPetrol",
  "totalLitresDiesel",
  "petrolSalePaise",
  "dieselSalePaise",
  "expectedTotalSalePaise",
  "totalCashPaise",
  "coinsPaise",
  "totalUpiPaise",
  "totalCardPaise",
  "totalUdhariPaise",
  "totalCollectedPaise",
  "differencePaise",
  "shiftCount",
  "pendingShiftCount",
  "shortShiftCount",
  "excessShiftCount",
];

const emptyAccountingTotals = () =>
  Object.fromEntries(accountingTotalFields.map((field) => [field, 0]));

const addAccountingTotals = (target, source) => {
  for (const field of accountingTotalFields) {
    target[field] += Number(source[field] || 0);
  }
};

const addBusinessDays = (businessDate, amount) => {
  const date = new Date(`${businessDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

const getAccountingRange = (period, anchorBusinessDate) => {
  if (period === "today") {
    return {
      startBusinessDate: anchorBusinessDate,
      endBusinessDate: anchorBusinessDate,
    };
  }

  if (period === "week") {
    const weekday = new Date(
      `${anchorBusinessDate}T00:00:00.000Z`,
    ).getUTCDay();
    const daysSinceMonday = (weekday + 6) % 7;
    const startBusinessDate = addBusinessDays(
      anchorBusinessDate,
      -daysSinceMonday,
    );

    return {
      startBusinessDate,
      endBusinessDate: addBusinessDays(startBusinessDate, 6),
    };
  }

  const [year, month] = anchorBusinessDate
    .slice(0, 7)
    .split("-")
    .map(Number);

  return {
    startBusinessDate: `${anchorBusinessDate.slice(0, 7)}-01`,
    endBusinessDate: new Date(Date.UTC(year, month, 0))
      .toISOString()
      .slice(0, 10),
  };
};

const getBusinessDates = (startBusinessDate, endBusinessDate) => {
  const dates = [];
  let businessDate = startBusinessDate;

  while (businessDate <= endBusinessDate) {
    dates.push(businessDate);
    businessDate = addBusinessDays(businessDate, 1);
  }

  return dates;
};

const reconciliationStatusForTotals = (totals) => {
  if (totals.shiftCount === 0 || totals.pendingShiftCount > 0) {
    return "PENDING";
  }

  if (totals.differencePaise === 0) return "MATCHED";
  return totals.differencePaise < 0 ? "SHORT" : "EXCESS";
};

const saleForFuelExpression = (fuelType) => ({
  $reduce: {
    input: { $ifNull: ["$readings", []] },
    initialValue: 0,
    in: {
      $cond: [
        { $eq: ["$$this.fuelType", fuelType] },
        {
          $add: [
            "$$value",
            { $ifNull: ["$$this.expectedSalePaise", 0] },
          ],
        },
        "$$value",
      ],
    },
  },
});

export const getManagerAccounting = async (req, res, next) => {
  try {
    const { period, date: anchorBusinessDate } = req.query;
    const { startBusinessDate, endBusinessDate } = getAccountingRange(
      period,
      anchorBusinessDate || getBusinessDate(),
    );
    const resolvedAnchorDate = anchorBusinessDate || getBusinessDate();
    const businessDateFilter = {
      $gte: startBusinessDate,
      $lte: endBusinessDate,
    };
    const finalizedStatuses = ["ENDED", "FORCE_CLOSED"];

    const [groupedShifts, expenseGroups, shifts, mpdDocuments] =
      await Promise.all([
        Shift.aggregate([
          {
            $match: {
              businessDate: businessDateFilter,
              status: { $in: finalizedStatuses },
            },
          },
          {
            $project: {
              businessDate: 1,
              mpdId: 1,
              totalLitresPetrol: { $ifNull: ["$totalLitresPetrol", 0] },
              totalLitresDiesel: { $ifNull: ["$totalLitresDiesel", 0] },
              petrolSalePaise: saleForFuelExpression("PETROL"),
              dieselSalePaise: saleForFuelExpression("DIESEL"),
              expectedTotalSalePaise: {
                $ifNull: ["$expectedTotalSalePaise", 0],
              },
              totalCashPaise: { $ifNull: ["$totalCashPaise", 0] },
              coinsPaise: { $ifNull: ["$coinsPaise", 0] },
              totalUpiPaise: { $ifNull: ["$totalUpiPaise", 0] },
              totalCardPaise: { $ifNull: ["$totalCardPaise", 0] },
              totalUdhariPaise: { $ifNull: ["$totalUdhariPaise", 0] },
              totalCollectedPaise: {
                $ifNull: ["$totalCollectedPaise", 0],
              },
              differencePaise: { $ifNull: ["$differencePaise", 0] },
              reconciliationStatus: {
                $ifNull: ["$reconciliationStatus", "PENDING"],
              },
            },
          },
          {
            $group: {
              _id: {
                businessDate: "$businessDate",
                mpdId: "$mpdId",
              },
              totalLitresPetrol: { $sum: "$totalLitresPetrol" },
              totalLitresDiesel: { $sum: "$totalLitresDiesel" },
              petrolSalePaise: { $sum: "$petrolSalePaise" },
              dieselSalePaise: { $sum: "$dieselSalePaise" },
              expectedTotalSalePaise: { $sum: "$expectedTotalSalePaise" },
              totalCashPaise: { $sum: "$totalCashPaise" },
              coinsPaise: { $sum: "$coinsPaise" },
              totalUpiPaise: { $sum: "$totalUpiPaise" },
              totalCardPaise: { $sum: "$totalCardPaise" },
              totalUdhariPaise: { $sum: "$totalUdhariPaise" },
              totalCollectedPaise: { $sum: "$totalCollectedPaise" },
              differencePaise: { $sum: "$differencePaise" },
              shiftCount: { $sum: 1 },
              pendingShiftCount: {
                $sum: {
                  $cond: [
                    { $eq: ["$reconciliationStatus", "PENDING"] },
                    1,
                    0,
                  ],
                },
              },
              shortShiftCount: {
                $sum: {
                  $cond: [
                    { $eq: ["$reconciliationStatus", "SHORT"] },
                    1,
                    0,
                  ],
                },
              },
              excessShiftCount: {
                $sum: {
                  $cond: [
                    { $eq: ["$reconciliationStatus", "EXCESS"] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
          { $sort: { "_id.businessDate": 1, "_id.mpdId": 1 } },
        ]),
        Expense.aggregate([
          { $match: { businessDate: businessDateFilter } },
          {
            $group: {
              _id: "$businessDate",
              totalExpensePaise: { $sum: "$amountPaise" },
            },
          },
        ]),
        Shift.find({
          businessDate: businessDateFilter,
          status: { $in: [...finalizedStatuses, "IN_PROGRESS"] },
        })
          .populate("employeeId", "name employeeId")
          .populate("mpdId", "mpdNumber serialNumber")
          .sort({ businessDate: -1, startedAt: 1 })
          .lean(),
        Mpd.find({})
          .select("_id mpdNumber serialNumber isActive")
          .lean(),
      ]);

    const summary = emptyAccountingTotals();
    const dailyTotals = new Map(
      getBusinessDates(startBusinessDate, endBusinessDate).map(
        (businessDate) => [businessDate, emptyAccountingTotals()],
      ),
    );
    const mpdTotals = new Map(
      mpdDocuments.map((mpd) => [String(mpd._id), emptyAccountingTotals()]),
    );

    for (const group of groupedShifts) {
      addAccountingTotals(summary, group);
      addAccountingTotals(dailyTotals.get(group._id.businessDate), group);

      const mpdId = String(group._id.mpdId);
      if (!mpdTotals.has(mpdId)) {
        mpdTotals.set(mpdId, emptyAccountingTotals());
      }
      addAccountingTotals(mpdTotals.get(mpdId), group);
    }

    const expensesByDate = new Map(
      expenseGroups.map((group) => [
        group._id,
        Number(group.totalExpensePaise || 0),
      ]),
    );
    const totalExpensePaise = expenseGroups.reduce(
      (total, group) => total + Number(group.totalExpensePaise || 0),
      0,
    );
    const activeShiftsByDate = new Map();
    for (const shift of shifts) {
      if (shift.status !== "IN_PROGRESS") continue;
      activeShiftsByDate.set(
        shift.businessDate,
        (activeShiftsByDate.get(shift.businessDate) || 0) + 1,
      );
    }

    const summaryResponse = {
      totalLitresPetrol: summary.totalLitresPetrol,
      totalLitresDiesel: summary.totalLitresDiesel,
      totalLitres: summary.totalLitresPetrol + summary.totalLitresDiesel,
      petrolSalePaise: summary.petrolSalePaise,
      dieselSalePaise: summary.dieselSalePaise,
      expectedTotalSalePaise: summary.expectedTotalSalePaise,
      totalCashPaise: summary.totalCashPaise,
      coinsPaise: summary.coinsPaise,
      totalUpiPaise: summary.totalUpiPaise,
      totalCardPaise: summary.totalCardPaise,
      totalUdhariPaise: summary.totalUdhariPaise,
      totalCollectedPaise: summary.totalCollectedPaise,
      totalExpensePaise,
      differencePaise: summary.differencePaise,
      reconciliationStatus: reconciliationStatusForTotals(summary),
      shiftCount: summary.shiftCount,
      pendingShiftCount: summary.pendingShiftCount,
      shortShiftCount: summary.shortShiftCount,
      excessShiftCount: summary.excessShiftCount,
    };

    const dailyBreakdown = [...dailyTotals.entries()].map(
      ([businessDate, totals]) => ({
        businessDate,
        totalLitresPetrol: totals.totalLitresPetrol,
        totalLitresDiesel: totals.totalLitresDiesel,
        totalLitres: totals.totalLitresPetrol + totals.totalLitresDiesel,
        petrolSalePaise: totals.petrolSalePaise,
        dieselSalePaise: totals.dieselSalePaise,
        expectedTotalSalePaise: totals.expectedTotalSalePaise,
        totalCashPaise: totals.totalCashPaise,
        coinsPaise: totals.coinsPaise,
        totalUpiPaise: totals.totalUpiPaise,
        totalCardPaise: totals.totalCardPaise,
        totalUdhariPaise: totals.totalUdhariPaise,
        totalCollectedPaise: totals.totalCollectedPaise,
        totalExpensePaise: expensesByDate.get(businessDate) || 0,
        differencePaise: totals.differencePaise,
        reconciliationStatus: reconciliationStatusForTotals(totals),
        shiftCount: totals.shiftCount,
        pendingShiftCount: totals.pendingShiftCount,
        shortShiftCount: totals.shortShiftCount,
        excessShiftCount: totals.excessShiftCount,
        activeShiftCount: activeShiftsByDate.get(businessDate) || 0,
      }),
    );

    const mpds = mpdDocuments
      .map((mpd) => {
        const totals = mpdTotals.get(String(mpd._id)) || emptyAccountingTotals();
        return {
          _id: mpd._id,
          mpdNumber: mpd.mpdNumber,
          serialNumber: mpd.serialNumber,
          totalLitresPetrol: totals.totalLitresPetrol,
          totalLitresDiesel: totals.totalLitresDiesel,
          totalLitres: totals.totalLitresPetrol + totals.totalLitresDiesel,
          petrolSalePaise: totals.petrolSalePaise,
          dieselSalePaise: totals.dieselSalePaise,
          expectedTotalSalePaise: totals.expectedTotalSalePaise,
          shiftCount: totals.shiftCount,
        };
      })
      .sort((left, right) =>
        left.mpdNumber.localeCompare(right.mpdNumber, undefined, {
          numeric: true,
        }),
      );

    const shiftSummaries = shifts.map((shift) => {
      const { readings, ...compactShift } = buildShiftSummary(shift);
      return compactShift;
    });

    return res.status(200).json({
      success: true,
      data: {
        period: {
          type: period,
          anchorBusinessDate: resolvedAnchorDate,
          startBusinessDate,
          endBusinessDate,
        },
        summary: summaryResponse,
        mpds,
        dailyBreakdown,
        shifts: shiftSummaries,
      },
    });
  } catch (error) {
    next(error);
  }
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

    const petrolSalePaise = (shift.readings || [])
      .filter((reading) => reading.fuelType === "PETROL")
      .reduce(
        (sum, reading) => sum + Number(reading.expectedSalePaise || 0),
        0,
      );

    const dieselSalePaise = (shift.readings || [])
      .filter((reading) => reading.fuelType === "DIESEL")
      .reduce(
        (sum, reading) => sum + Number(reading.expectedSalePaise || 0),
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

        petrolSalePaise,

        dieselSalePaise,

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