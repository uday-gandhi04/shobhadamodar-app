// backend/src/services/fuelRateService.js
import FuelRate from "../models/FuelRate.js";

export const TIMEZONE = "Asia/Kolkata";

/**
 * Converts a YYYY-MM-DD business date string to its 06:00:00 IST Date object.
 * 06:00:00 IST = 00:30:00.000Z in UTC.
 * @param {string} businessDate
 * @returns {Date}
 */
export const getRateEffectiveTimeForDate = (businessDate) => {
  if (!businessDate || typeof businessDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) {
    throw new Error(`Invalid businessDate format: "${businessDate}". Expected YYYY-MM-DD.`);
  }
  return new Date(`${businessDate}T06:00:00+05:30`);
};

/**
 * Formats a Date instant to 'YYYY-MM-DD' in Asia/Kolkata timezone.
 * @param {Date|string|number} instant
 * @returns {string} 'YYYY-MM-DD'
 */
export const getBusinessDateFromInstant = (instant = new Date()) => {
  const d = new Date(instant);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
};

/**
 * Determines the latest eligible scheduled business date cutoff for a given instant in Asia/Kolkata.
 * If time in IST is before 06:00:00, the rate scheduled for today is NOT effective yet,
 * so the latest eligible scheduled businessDate is yesterday.
 * At or after 06:00:00 IST, today's scheduled rate is eligible.
 * @param {Date|string|number} instant
 * @returns {string} 'YYYY-MM-DD'
 */
export const getEligibleCutoffBusinessDate = (instant = new Date()) => {
  const d = new Date(instant);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(formatter.formatToParts(d).map((p) => [p.type, p.value]));
  const hour = parseInt(parts.hour, 10);
  const dateStr = `${parts.year}-${parts.month}-${parts.day}`;

  if (hour < 6) {
    // Before 6:00 AM IST, cutoff is previous calendar date
    const prevDate = new Date(d.getTime() - 6 * 3600 * 1000);
    const prevParts = Object.fromEntries(formatter.formatToParts(prevDate).map((p) => [p.type, p.value]));
    return `${prevParts.year}-${prevParts.month}-${prevParts.day}`;
  }

  return dateStr;
};

/**
 * Resolves the effective FuelRate for a specified instant.
 * Rule: effective rate = latest applicable rate whose effective timestamp <= requested instant.
 * A future scheduled rate is never returned early.
 *
 * @param {Date|string|number} instant - The instant at which to resolve the rate (defaults to new Date())
 * @returns {Promise<Object|null>} The effective rate document or null if none found
 */
export const getEffectiveFuelRate = async (instant = new Date()) => {
  const targetDate = new Date(instant);
  if (isNaN(targetDate.getTime())) {
    throw new Error(`Invalid instant provided to getEffectiveFuelRate: ${instant}`);
  }

  const cutoffBusinessDate = getEligibleCutoffBusinessDate(targetDate);

  // We query FuelRate where businessDate <= cutoffBusinessDate, sorted newest first
  const query = FuelRate.findOne({
    businessDate: { $lte: cutoffBusinessDate },
  }).sort({ businessDate: -1 });

  const rawRate = typeof query?.lean === "function" ? await query.lean() : await query;
  if (!rawRate) return null;

  let effectiveAt;
  if (rawRate.effectiveAt) {
    effectiveAt = new Date(rawRate.effectiveAt);
  } else if (rawRate.businessDate && /^\d{4}-\d{2}-\d{2}$/.test(rawRate.businessDate)) {
    effectiveAt = getRateEffectiveTimeForDate(rawRate.businessDate);
  } else {
    effectiveAt = new Date(0);
  }

  // Guarantee rate effective timestamp is not in the future
  if (effectiveAt > targetDate) {
    return null;
  }

  return {
    ...rawRate,
    effectiveAt: effectiveAt.toISOString(),
    isEffective: true,
  };
};

/**
 * Resolves effective rate for a specific fuel type ('PETROL'/'MS' or 'DIESEL'/'HSD') at a given instant.
 * @param {string} fuelType
 * @param {Date|string|number} instant
 * @returns {Promise<number|null>} rate in paise or null
 */
export const getEffectiveRateForFuel = async (fuelType, instant = new Date()) => {
  const rates = await getEffectiveFuelRate(instant);
  if (!rates) return null;
  const isPetrol = fuelType === "PETROL" || fuelType === "MS";
  return isPetrol ? Number(rates.petrolRatePaise || 0) : Number(rates.dieselRatePaise || 0);
};

/**
 * Helper to determine the target instant from an HTTP request.
 * - If req.query.at is present, uses that instant.
 * - If req.query.date is present:
 *   - If date is today, uses current server time.
 *   - If date is in the past, uses 23:59:59 IST on that date.
 *   - If date is in the future, uses current server time (cannot activate future rate early).
 * - Otherwise defaults to current server time.
 * @param {Object} req
 * @returns {Date}
 */
export const getTargetInstantFromRequest = (req) => {
  if (req?.query?.at) {
    const parsed = new Date(req.query.at);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  if (req?.query?.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
    const today = getBusinessDateFromInstant(new Date());
    if (req.query.date === today) {
      return new Date();
    }
    if (req.query.date < today) {
      return new Date(`${req.query.date}T23:59:59+05:30`);
    }
    // Future date queried on current endpoint: return current server time
    return new Date();
  }

  return new Date();
};

/**
 * Resolves the appropriate instant for shift or transaction financial calculations.
 * Protects against delayed or offline sync incorrectly applying newer rates post-6:00 AM.
 *
 * @param {Object} context - { businessDate, endedAt, forceEndedAt, occurredAt, timestamp } or Shift document
 * @returns {Date}
 */
export const resolveEventInstant = (context = {}) => {
  if (!context) return new Date();

  // 1. Explicit event timestamp (e.g. actual shift endedAt, udhari occurredAt)
  const explicitTime = context.endedAt || context.forceEndedAt || context.occurredAt || context.timestamp;
  if (explicitTime) {
    const parsed = new Date(explicitTime);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // 2. Business date comparison with current date in Asia/Kolkata
  const businessDate = context.businessDate;
  if (businessDate && /^\d{4}-\d{2}-\d{2}$/.test(businessDate)) {
    const today = getBusinessDateFromInstant(new Date());
    if (businessDate < today) {
      // Historical business date: use end-of-day (23:59:59 IST) on that business date
      return new Date(`${businessDate}T23:59:59+05:30`);
    }
  }

  // 3. Current active shift ending now
  return new Date();
};
