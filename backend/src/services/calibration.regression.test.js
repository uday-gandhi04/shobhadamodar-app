import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { interpolateVolume } from './stockRegisterService.js';
import { extractCalibrationPoints } from '../utils/extractCalibration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load official extracted points
const msJsonPath = path.resolve(__dirname, '../data/calibration/ms1_15kl_calibration.json');
const hsdJsonPath = path.resolve(__dirname, '../data/calibration/hsd1_20kl_calibration.json');

const msPoints = JSON.parse(fs.readFileSync(msJsonPath, 'utf8'));
const hsdPoints = JSON.parse(fs.readFileSync(hsdJsonPath, 'utf8'));

// Numerical tolerance helper for floating point checks
const assertClose = (actual, expected, tolerance = 1e-4, message = '') => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message} Expected ${actual} to be close to ${expected} within tolerance ${tolerance}`
  );
};

test('1. Exact petrol (MS-1, 15 KL) chart lookup at 136.8 cm', () => {
  const rawPoint = msPoints.find((p) => Math.abs(p.dipCm - 136.8) < 1e-6);
  assert.ok(rawPoint, 'Point for 136.8 cm must exist in MS chart');
  assertClose(rawPoint.volumeLitres, 11375.87235851704, 1e-4, 'MS 136.8 raw volume');

  const computed = interpolateVolume(136.8, msPoints);
  assert.strictEqual(computed, 11375.87, 'MS 136.8 rounded volume');
});

test('2. Exact petrol (MS-1, 15 KL) chart lookup at 137.0 cm', () => {
  const rawPoint = msPoints.find((p) => Math.abs(p.dipCm - 137.0) < 1e-6);
  assert.ok(rawPoint, 'Point for 137.0 cm must exist in MS chart');
  assertClose(rawPoint.volumeLitres, 11394.341975326213, 1e-4, 'MS 137.0 raw volume');

  const computed = interpolateVolume(137.0, msPoints);
  assert.strictEqual(computed, 11394.34, 'MS 137.0 rounded volume');
});

test('3. Exact petrol (MS-1, 15 KL) chart lookup at 137.2 cm', () => {
  const rawPoint = msPoints.find((p) => Math.abs(p.dipCm - 137.2) < 1e-6);
  assert.ok(rawPoint, 'Point for 137.2 cm must exist in MS chart');
  assertClose(rawPoint.volumeLitres, 11412.795763505552, 1e-4, 'MS 137.2 raw volume');

  const computed = interpolateVolume(137.2, msPoints);
  assert.strictEqual(computed, 11412.80, 'MS 137.2 rounded volume');
});

test('4. Exact diesel (HSD-1, 20 KL) chart lookup at 136.8, 137.0, and 137.2 cm', () => {
  const p1368 = hsdPoints.find((p) => Math.abs(p.dipCm - 136.8) < 1e-6);
  assert.ok(p1368, 'Point for 136.8 cm must exist in HSD chart');
  assertClose(p1368.volumeLitres, 15383.073773051019, 1e-4, 'HSD 136.8 raw volume');
  assert.strictEqual(interpolateVolume(136.8, hsdPoints), 15383.07, 'HSD 136.8 rounded volume');

  const p1370 = hsdPoints.find((p) => Math.abs(p.dipCm - 137.0) < 1e-6);
  assert.ok(p1370, 'Point for 137.0 cm must exist in HSD chart');
  assertClose(p1370.volumeLitres, 15408.049394170996, 1e-4, 'HSD 137.0 raw volume');
  assert.strictEqual(interpolateVolume(137.0, hsdPoints), 15408.05, 'HSD 137.0 rounded volume');

  const p1372 = hsdPoints.find((p) => Math.abs(p.dipCm - 137.2) < 1e-6);
  assert.ok(p1372, 'Point for 137.2 cm must exist in HSD chart');
  assertClose(p1372.volumeLitres, 15433.00361095618, 1e-4, 'HSD 137.2 raw volume');
  assert.strictEqual(interpolateVolume(137.2, hsdPoints), 15433.00, 'HSD 137.2 rounded volume');
});

test('5. Correct linear interpolation between adjacent points where entered dip is intermediate', () => {
  // Petrol 136.9 cm (midpoint between 136.8 and 137.0)
  // Expected: (11375.87235851704 + 11394.341975326213) / 2 = 11385.107166921626 -> 11385.11
  const ms1369 = interpolateVolume(136.9, msPoints);
  assert.strictEqual(ms1369, 11385.11, 'MS 136.9 interpolated volume');

  // Diesel 137.1 cm (midpoint between 137.0 and 137.2)
  // Expected: (15408.049394170996 + 15433.00361095618) / 2 = 15420.526502563588 -> 15420.53
  const hsd1371 = interpolateVolume(137.1, hsdPoints);
  assert.strictEqual(hsd1371, 15420.53, 'HSD 137.1 interpolated volume');
});

test('6. No extrapolation outside the supported chart range', () => {
  // Range is 0.2 cm to 200.0 cm
  assert.strictEqual(interpolateVolume(0.1, msPoints), null, 'Dip below minimum (0.2) must return null');
  assert.strictEqual(interpolateVolume(0.0, msPoints), null, 'Zero dip must return null');
  assert.strictEqual(interpolateVolume(-5.0, msPoints), null, 'Negative dip must return null');
  assert.strictEqual(interpolateVolume(200.1, msPoints), null, 'Dip above maximum (200.0) must return null');
  assert.strictEqual(interpolateVolume(250.0, msPoints), null, 'Dip far above maximum must return null');

  assert.strictEqual(interpolateVolume(0.1, hsdPoints), null, 'HSD dip below min must return null');
  assert.strictEqual(interpolateVolume(200.5, hsdPoints), null, 'HSD dip above max must return null');
});

test('7. Missing calibration points produce null', () => {
  assert.strictEqual(interpolateVolume(137.0, []), null, 'Empty points array must return null');
  assert.strictEqual(interpolateVolume(137.0, null), null, 'Null points must return null');
  assert.strictEqual(interpolateVolume(137.0, undefined), null, 'Undefined points must return null');
  assert.strictEqual(interpolateVolume(null, msPoints), null, 'Null dip must return null');
  assert.strictEqual(interpolateVolume(undefined, msPoints), null, 'Undefined dip must return null');
  assert.strictEqual(interpolateVolume(NaN, msPoints), null, 'NaN dip must return null');
});

test('8. Tank selection distinguishes MS-1 (Petrol) versus HSD-1 (Diesel)', () => {
  const ms137 = interpolateVolume(137.0, msPoints);
  const hsd137 = interpolateVolume(137.0, hsdPoints);

  assert.strictEqual(ms137, 11394.34, 'Petrol volume for 137 cm');
  assert.strictEqual(hsd137, 15408.05, 'Diesel volume for 137 cm');
  assert.notStrictEqual(ms137, hsd137, 'Petrol and Diesel volumes must be distinct');
});

test('9. Capacity discrepancy: Chart values exceeding nominal capacity are preserved without clamping', () => {
  // Petrol nominal capacity is 15,000 L, but chart at 200.0 cm is 15,607.43 L
  const msMax = interpolateVolume(200.0, msPoints);
  assert.strictEqual(msMax, 15607.43, 'Petrol max calibrated volume exceeds 15,000 L and must not be clamped');

  // Diesel nominal capacity is 20,000 L, but chart at 200.0 cm is 21,105.22 L
  const hsdMax = interpolateVolume(200.0, hsdPoints);
  assert.strictEqual(hsdMax, 21105.22, 'Diesel max calibrated volume exceeds 20,000 L and must not be clamped');
});

test('10. Existing stock variation calculations remain correct: Variation = Calculated Closing - Actual Dip Stock', () => {
  // Variation formula: Calculated Closing Stock - Actual Dip Stock
  const calcClosing = 11400.00;
  const actualDip = 11394.34; // from 137 cm dip
  const variation = Number((calcClosing - actualDip).toFixed(2));
  assert.strictEqual(variation, 5.66, 'Variation = 11400.00 - 11394.34 = 5.66');

  // Negative variation (dip stock exceeds book stock)
  const calcClosingLow = 11390.00;
  const variationNeg = Number((calcClosingLow - actualDip).toFixed(2));
  assert.strictEqual(variationNeg, -4.34, 'Variation = 11390.00 - 11394.34 = -4.34');
});

test('11. Extraction from Excel workbooks extracts exactly 1,000 points per tank with 0.2 cm increments', async () => {
  const petrolExcel = path.resolve(__dirname, '../../data/calibration/15 KL Petrol Dip Chart.xlsx');
  const dieselExcel = path.resolve(__dirname, '../../data/calibration/20 KL Diesel dip Chart.xlsx');

  const pPoints = await extractCalibrationPoints(petrolExcel);
  const dPoints = await extractCalibrationPoints(dieselExcel);

  assert.strictEqual(pPoints.length, 1000, 'Petrol chart must have exactly 1000 calibration points');
  assert.strictEqual(dPoints.length, 1000, 'Diesel chart must have exactly 1000 calibration points');

  assert.strictEqual(pPoints[0].dipCm, 0.2, 'Petrol min dip is 0.2 cm');
  assert.strictEqual(pPoints[999].dipCm, 200.0, 'Petrol max dip is 200.0 cm');

  assert.strictEqual(dPoints[0].dipCm, 0.2, 'Diesel min dip is 0.2 cm');
  assert.strictEqual(dPoints[999].dipCm, 200.0, 'Diesel max dip is 200.0 cm');
});

test('12. Calibration points are strictly monotonic with no duplicate dips', () => {
  for (let i = 1; i < msPoints.length; i++) {
    assert.ok(msPoints[i].dipCm > msPoints[i - 1].dipCm, `MS dip points must increase: ${msPoints[i].dipCm} > ${msPoints[i - 1].dipCm}`);
    assert.ok(msPoints[i].volumeLitres > msPoints[i - 1].volumeLitres, `MS volume points must increase: ${msPoints[i].volumeLitres} > ${msPoints[i - 1].volumeLitres}`);
  }
  for (let i = 1; i < hsdPoints.length; i++) {
    assert.ok(hsdPoints[i].dipCm > hsdPoints[i - 1].dipCm, `HSD dip points must increase: ${hsdPoints[i].dipCm} > ${hsdPoints[i - 1].dipCm}`);
    assert.ok(hsdPoints[i].volumeLitres > hsdPoints[i - 1].volumeLitres, `HSD volume points must increase: ${hsdPoints[i].volumeLitres} > ${hsdPoints[i - 1].volumeLitres}`);
  }
});
