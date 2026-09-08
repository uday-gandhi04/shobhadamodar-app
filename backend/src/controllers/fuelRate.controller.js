import FuelRate from '../models/FuelRate.js';

const getApplicableFuelRate = async (businessDate) => {
  return FuelRate.findOne({
    businessDate: { $lte: businessDate },
  })
    .sort({ businessDate: -1 })
    .lean();
};

export const getCurrentFuelRate = async (
  req,
  res,
  next,
) => {
  try {
    const businessDate = req.query.date;

    if (!businessDate) {
      return res.status(400).json({
        success: false,
        message: 'Business date is required.',
        code: 'BUSINESS_DATE_REQUIRED',
      });
    }

    const fuelRate =
      await getApplicableFuelRate(
        businessDate,
      );

    if (!fuelRate) {
      return res.status(404).json({
        success: false,
        message: `Fuel rates not found for ${businessDate}.`,
        code: 'FUEL_RATE_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      data: fuelRate,
    });
  } catch (error) {
    next(error);
  }
};