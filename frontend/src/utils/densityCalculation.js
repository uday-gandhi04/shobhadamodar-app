import chartData from '../data/density/astm_table_53b_1980.json';

export const DENSITY_CHART_LIMITS = {
  MIN_HYDROMETER: 670,
  MAX_HYDROMETER: 922,
  MIN_TEMPERATURE: 0.0,
  MAX_TEMPERATURE: 50.0,
  EPSILON: 1e-6,
};

/**
 * Calculates Density @15°C from observed hydrometer reading and observed temperature (°C)
 * using official ASTM Table 53B (1980 Edition).
 *
 * @param {number|string} hydrometerReading
 * @param {number|string} temperatureC
 * @returns {number|null} Density @15°C rounded to 1 decimal place, or null if invalid/incomplete/out-of-range.
 */
export function calculateDensity15Client(hydrometerReading, temperatureC) {
  if (hydrometerReading === '' || hydrometerReading == null || temperatureC === '' || temperatureC == null) {
    return null;
  }

  const hyd = Number(hydrometerReading);
  const temp = Number(temperatureC);

  if (isNaN(hyd) || isNaN(temp) || !isFinite(hyd) || !isFinite(temp)) {
    return null;
  }

  const { MIN_HYDROMETER, MAX_HYDROMETER, MIN_TEMPERATURE, MAX_TEMPERATURE, EPSILON } = DENSITY_CHART_LIMITS;

  if (hyd < MIN_HYDROMETER - EPSILON || hyd > MAX_HYDROMETER + EPSILON) {
    return null;
  }
  if (temp < MIN_TEMPERATURE - EPSILON || temp > MAX_TEMPERATURE + EPSILON) {
    return null;
  }

  const { grid } = chartData;

  const h1 = Math.max(MIN_HYDROMETER, Math.min(MAX_HYDROMETER, Math.floor(hyd)));
  const h2 = Math.max(MIN_HYDROMETER, Math.min(MAX_HYDROMETER, Math.ceil(hyd)));

  const t1 = Math.max(MIN_TEMPERATURE, Math.min(MAX_TEMPERATURE, Math.floor(temp * 2) / 2));
  const t2 = Math.max(MIN_TEMPERATURE, Math.min(MAX_TEMPERATURE, Math.ceil(temp * 2) / 2));

  const getCell = (h, t) => {
    const rowIdx = Math.round((t - MIN_TEMPERATURE) / 0.5);
    const colIdx = Math.round(h - MIN_HYDROMETER);
    if (rowIdx < 0 || rowIdx >= grid.length) return null;
    if (colIdx < 0 || colIdx >= grid[rowIdx].length) return null;
    return grid[rowIdx][colIdx];
  };

  const isExactH = Math.abs(hyd - h1) <= EPSILON;
  const isExactT = Math.abs(temp - t1) <= EPSILON;

  // Exact match
  if (isExactH && isExactT) {
    const val = getCell(h1, t1);
    return val != null ? Number(val.toFixed(1)) : null;
  }

  // Exact on Hydrometer, interpolate along Temperature
  if (isExactH || h1 === h2) {
    const d1 = getCell(h1, t1);
    const d2 = getCell(h1, t2);
    if (d1 == null || d2 == null) return null;
    const dt = t2 - t1;
    if (dt === 0) return Number(d1.toFixed(1));
    const u = (temp - t1) / dt;
    return Number(((1 - u) * d1 + u * d2).toFixed(1));
  }

  // Exact on Temperature, interpolate along Hydrometer
  if (isExactT || t1 === t2) {
    const d1 = getCell(h1, t1);
    const d2 = getCell(h2, t1);
    if (d1 == null || d2 == null) return null;
    const dh = h2 - h1;
    if (dh === 0) return Number(d1.toFixed(1));
    const t = (hyd - h1) / dh;
    return Number(((1 - t) * d1 + t * d2).toFixed(1));
  }

  // Bilinear interpolation
  const d11 = getCell(h1, t1);
  const d21 = getCell(h2, t1);
  const d12 = getCell(h1, t2);
  const d22 = getCell(h2, t2);

  if (d11 == null || d21 == null || d12 == null || d22 == null) {
    return null;
  }

  const dh = h2 - h1;
  const dt = t2 - t1;
  const tFrac = dh === 0 ? 0 : (hyd - h1) / dh;
  const uFrac = dt === 0 ? 0 : (temp - t1) / dt;

  const interpolated =
    (1 - tFrac) * (1 - uFrac) * d11 +
    tFrac * (1 - uFrac) * d21 +
    (1 - tFrac) * uFrac * d12 +
    tFrac * uFrac * d22;

  return Number(interpolated.toFixed(1));
}

/**
 * Returns validation message for input fields if out of range.
 */
export function getDensityValidationStatus(hydrometerReading, temperatureC) {
  if (hydrometerReading === '' || hydrometerReading == null || temperatureC === '' || temperatureC == null) {
    return { isValid: false, density15: null, state: 'INCOMPLETE', message: '' };
  }

  const hyd = Number(hydrometerReading);
  const temp = Number(temperatureC);

  if (isNaN(hyd) || isNaN(temp) || !isFinite(hyd) || !isFinite(temp)) {
    return { isValid: false, density15: null, state: 'INVALID', message: 'Enter valid numeric values' };
  }

  const { MIN_HYDROMETER, MAX_HYDROMETER, MIN_TEMPERATURE, MAX_TEMPERATURE } = DENSITY_CHART_LIMITS;

  if (hyd < MIN_HYDROMETER || hyd > MAX_HYDROMETER) {
    return {
      isValid: false,
      density15: null,
      state: 'OUT_OF_RANGE',
      message: `Hydrometer reading must be between ${MIN_HYDROMETER} and ${MAX_HYDROMETER} kg/m³`,
    };
  }
  if (temp < MIN_TEMPERATURE || temp > MAX_TEMPERATURE) {
    return {
      isValid: false,
      density15: null,
      state: 'OUT_OF_RANGE',
      message: `Temperature must be between ${MIN_TEMPERATURE}°C and ${MAX_TEMPERATURE}°C`,
    };
  }

  const result = calculateDensity15Client(hyd, temp);
  if (result == null) {
    return { isValid: false, density15: null, state: 'UNAVAILABLE', message: 'Density conversion unavailable for these coordinates' };
  }

  return { isValid: true, density15: result, state: 'VALID', message: '' };
}
