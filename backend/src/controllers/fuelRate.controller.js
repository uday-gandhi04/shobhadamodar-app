import FuelRate from '../models/FuelRate.js';
import { recordAuditLog } from '../utils/auditLog.js';
import {
  getEffectiveFuelRate,
  getRateEffectiveTimeForDate,
  getBusinessDateFromInstant,
  getTargetInstantFromRequest,
} from '../services/fuelRateService.js';

export const getCurrentFuelRate = async (
  req,
  res,
  next,
) => {
  try {
    const businessDate = req.query.date;

    if (!businessDate && !req.query.at) {
      return res.status(400).json({
        success: false,
        message: 'Business date is required.',
        code: 'BUSINESS_DATE_REQUIRED',
      });
    }

    const instant = getTargetInstantFromRequest(req);
    const fuelRate = await getEffectiveFuelRate(instant);

    if (!fuelRate) {
      return res.status(404).json({
        success: false,
        message: `Fuel rates not found for ${businessDate || getBusinessDateFromInstant(instant)}.`,
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
    const instant = req.query?.at ? new Date(req.query.at) : new Date();
    const rates = await FuelRate.find({}).sort({ businessDate: -1 }).populate('setBy', 'name').lean();

    const activeRate = await getEffectiveFuelRate(instant);
    const activeId = activeRate?._id ? String(activeRate._id) : null;

    const decorated = rates.map((r) => {
      const effectiveAt = r.effectiveAt
        ? new Date(r.effectiveAt)
        : getRateEffectiveTimeForDate(r.businessDate);
      const isEffective = effectiveAt <= instant;
      const isCurrent = activeId && String(r._id) === activeId;
      const status = !isEffective ? "SCHEDULED" : (isCurrent ? "CURRENT" : "HISTORICAL");
      return {
        ...r,
        effectiveAt: effectiveAt.toISOString(),
        isEffective,
        status,
      };
    });

    res.json({ success: true, data: decorated });
  } catch (error) { next(error); }
};

export const createFuelRate = async (req, res, next) => {
  try {
    const existing = await FuelRate.exists({ businessDate: req.body.businessDate });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A fuel rate already exists for this business date.",
        code: "FUEL_RATE_DATE_EXISTS",
      });
    }

    const effectiveAt = req.body.effectiveAt
      ? new Date(req.body.effectiveAt)
      : getRateEffectiveTimeForDate(req.body.businessDate);

    const rate = await FuelRate.create({
      ...req.body,
      effectiveAt,
      setBy: req.user._id,
    });

    await recordAuditLog({
      actor: req.user,
      action: "FUEL_RATE_CREATED",
      entityType: "FUEL_RATE",
      entityId: rate._id,
      metadata: {
        businessDate: rate.businessDate,
        petrolRatePaise: rate.petrolRatePaise,
        dieselRatePaise: rate.dieselRatePaise,
      },
    });

    return res.status(201).json({ success: true, data: rate });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A fuel rate already exists for this business date.",
        code: "FUEL_RATE_DATE_EXISTS",
      });
    }
    next(error);
  }
};

