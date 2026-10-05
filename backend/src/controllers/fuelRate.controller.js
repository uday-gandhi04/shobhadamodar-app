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

export const getFuelRateHistory = async (req, res, next) => {
  try {
    const rates = await FuelRate.find({}).sort({ businessDate: -1 }).lean();
    res.json({ success: true, data: rates });
  } catch (error) { next(error); }
};

export const createFuelRate = async (req, res, next) => {
  try {
    const existing = await FuelRate.exists({ businessDate: req.body.businessDate });
    if (existing) return res.status(409).json({ success: false, message: "A fuel rate already exists for this business date.", code: "FUEL_RATE_DATE_EXISTS" });
    const rate = await FuelRate.create({ ...req.body, setBy: req.user._id });
    return res.status(201).json({ success: true, data: rate });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "A fuel rate already exists for this business date.", code: "FUEL_RATE_DATE_EXISTS" });
    next(error);
  }
};
