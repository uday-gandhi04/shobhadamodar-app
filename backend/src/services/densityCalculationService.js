import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy-loaded cached table
let cachedChart = null;

function loadChart() {
  if (!cachedChart) {
    const jsonPath = path.resolve(__dirname, '../data/density/astm_table_53b_1980.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`ASTM Table 53B dataset not found at ${jsonPath}`);
    }
    cachedChart = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }
  return cachedChart;
}

export const DENSITY_CHART_LIMITS = {
  MIN_HYDROMETER: 670,
  MAX_HYDROMETER: 922,
  MIN_TEMPERATURE: 0.0,
  MAX_TEMPERATURE: 50.0,
  EPSILON: 1e-6,
};

/**
 * Converts observed hydrometer reading and observed temperature (°C)
 * to density at 15°C using official ASTM Table 53B (1980 Edition).
 *
 * Method:
 * 1. Range check: rejects values outside [670, 922] kg/m³ and [0.0, 50.0] °C.
 * 2. Exact match: returns exact chart entry when input lands on grid point.
 * 3. Bilinear interpolation: used when inputs fall between grid points (0.5°C temp step, 1.0 hydrometer step).
 * 4. Output precision: rounded to 1 decimal place.
 *
 * @param {number|string} hydrometerReading - Observed hydrometer reading (kg/m³)
 * @param {number|string} temperatureC - Observed temperature (°C)
 * @returns {number|null} Converted Density @15°C rounded to 1 decimal place, or null if invalid / out of range.
 */
export function convertHydrometerToDensity15(hydrometerReading, temperatureC) {
  if (hydrometerReading == null || temperatureC == null) return null;

  const hyd = Number(hydrometerReading);
  const temp = Number(temperatureC);

  if (isNaN(hyd) || isNaN(temp) || !isFinite(hyd) || !isFinite(temp)) {
    return null;
  }

  const { MIN_HYDROMETER, MAX_HYDROMETER, MIN_TEMPERATURE, MAX_TEMPERATURE, EPSILON } = DENSITY_CHART_LIMITS;

  // Strict range check — no extrapolation outside the official table
  if (hyd < MIN_HYDROMETER - EPSILON || hyd > MAX_HYDROMETER + EPSILON) {
    return null;
  }
  if (temp < MIN_TEMPERATURE - EPSILON || temp > MAX_TEMPERATURE + EPSILON) {
    return null;
  }

  const chart = loadChart();
  const { grid } = chart;

  // Find bounding grid coordinates
  // Hydrometer grid has step 1 (670, 671, ...)
  const h1 = Math.max(MIN_HYDROMETER, Math.min(MAX_HYDROMETER, Math.floor(hyd)));
  const h2 = Math.max(MIN_HYDROMETER, Math.min(MAX_HYDROMETER, Math.ceil(hyd)));

  // Temperature grid has step 0.5 (0.0, 0.5, 1.0, ...)
  const t1 = Math.max(MIN_TEMPERATURE, Math.min(MAX_TEMPERATURE, Math.floor(temp * 2) / 2));
  const t2 = Math.max(MIN_TEMPERATURE, Math.min(MAX_TEMPERATURE, Math.ceil(temp * 2) / 2));

  // Helper to get raw cell from grid
  const getCell = (h, t) => {
    const rowIdx = Math.round((t - MIN_TEMPERATURE) / 0.5);
    const colIdx = Math.round(h - MIN_HYDROMETER);
    if (rowIdx < 0 || rowIdx >= grid.length) return null;
    if (colIdx < 0 || colIdx >= grid[rowIdx].length) return null;
    return grid[rowIdx][colIdx];
  };

  const isExactH = Math.abs(hyd - h1) <= EPSILON;
  const isExactT = Math.abs(temp - t1) <= EPSILON;

  // Case 1: Exact match on both axes
  if (isExactH && isExactT) {
    const val = getCell(h1, t1);
    return val != null ? Number(val.toFixed(1)) : null;
  }

  // Case 2: Exact on Hydrometer, interpolate along Temperature
  if (isExactH || h1 === h2) {
    const d1 = getCell(h1, t1);
    const d2 = getCell(h1, t2);
    if (d1 == null || d2 == null) return null;
    const dt = t2 - t1;
    if (dt === 0) return Number(d1.toFixed(1));
    const u = (temp - t1) / dt;
    const interpolated = (1 - u) * d1 + u * d2;
    return Number(interpolated.toFixed(1));
  }

  // Case 3: Exact on Temperature, interpolate along Hydrometer
  if (isExactT || t1 === t2) {
    const d1 = getCell(h1, t1);
    const d2 = getCell(h2, t1);
    if (d1 == null || d2 == null) return null;
    const dh = h2 - h1;
    if (dh === 0) return Number(d1.toFixed(1));
    const t = (hyd - h1) / dh;
    const interpolated = (1 - t) * d1 + t * d2;
    return Number(interpolated.toFixed(1));
  }

  // Case 4: Bilinear interpolation across 4 grid points
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
 * Diagnostic helper returning detailed status, exact match flag, or error message.
 */
export function getDensityCalculationDetails(hydrometerReading, temperatureC) {
  if (hydrometerReading == null || hydrometerReading === '') {
    return { success: false, isValid: false, density15: null, error: 'Hydrometer reading is required.', message: 'Hydrometer reading is required.' };
  }
  if (temperatureC == null || temperatureC === '') {
    return { success: false, isValid: false, density15: null, error: 'Temperature is required.', message: 'Temperature is required.' };
  }

  const hyd = Number(hydrometerReading);
  const temp = Number(temperatureC);

  if (isNaN(hyd) || isNaN(temp) || !isFinite(hyd) || !isFinite(temp)) {
    return { success: false, isValid: false, density15: null, error: 'Values must be valid numbers.', message: 'Values must be valid numbers.' };
  }

  const { MIN_HYDROMETER, MAX_HYDROMETER, MIN_TEMPERATURE, MAX_TEMPERATURE, EPSILON } = DENSITY_CHART_LIMITS;

  if (hyd < MIN_HYDROMETER - EPSILON || hyd > MAX_HYDROMETER + EPSILON) {
    const msg = `Hydrometer reading must be between ${MIN_HYDROMETER} and ${MAX_HYDROMETER} kg/m³.`;
    return { success: false, isValid: false, density15: null, error: msg, message: msg };
  }
  if (temp < MIN_TEMPERATURE - EPSILON || temp > MAX_TEMPERATURE + EPSILON) {
    const msg = `Temperature must be between ${MIN_TEMPERATURE}°C and ${MAX_TEMPERATURE}°C.`;
    return { success: false, isValid: false, density15: null, error: msg, message: msg };
  }

  const density15 = convertHydrometerToDensity15(hyd, temp);
  if (density15 == null) {
    const msg = 'Conversion unavailable for these coordinates in official chart.';
    return { success: false, isValid: false, density15: null, error: msg, message: msg };
  }

  const isExactHyd = Math.abs(hyd - Math.round(hyd)) <= EPSILON;
  const isExactTemp = Math.abs(temp * 2 - Math.round(temp * 2)) <= EPSILON;
  const isExact = isExactHyd && isExactTemp;

  let method = 'EXACT_LOOKUP';
  if (!isExact) {
    if (isExactHyd || isExactTemp) {
      method = 'LINEAR_INTERPOLATION';
    } else {
      method = 'BILINEAR_INTERPOLATION';
    }
  }

  return {
    success: true,
    isValid: true,
    density15,
    isExact,
    method,
    message: isExact ? 'Exact ASTM Table 53B match.' : `Interpolated (${method.toLowerCase()}) from ASTM Table 53B grid.`,
  };
}

export function getChartMetadata() {
  const chart = loadChart();
  return {
    source: chart.source,
    standard: "ASTM Table 53B",
    edition: "1980",
    sourceWorkbook: "DENSITY CONVERSION CHART.xlsx",
    hydrometerUnit: chart.units?.hydrometerReading || "kg/m³",
    temperatureUnit: chart.units?.temperatureC || "°C",
    densityUnit: chart.units?.density15 ? `${chart.units.density15} at 15°C` : "kg/m³ at 15°C",
  };
}

export function getTableBounds() {
  const chart = loadChart();
  return {
    minHydrometer: chart.axes.minHydrometer,
    maxHydrometer: chart.axes.maxHydrometer,
    hydrometerStep: chart.axes.stepHydrometer,
    hydrometerCount: chart.axes.totalHydrometers,
    minTemperature: chart.axes.minTemperature,
    maxTemperature: chart.axes.maxTemperature,
    temperatureStep: chart.axes.stepTemperature,
    temperatureCount: chart.axes.totalTemperatures,
  };
}

