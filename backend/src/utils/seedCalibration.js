// src/utils/seedCalibration.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tank from '../models/Tank.js';
import TankCalibration from '../models/TankCalibration.js';
import Station from '../models/Station.js';
import User from '../models/User.js';
import { connectDB } from '../config/db.js';
import { extractCalibrationPoints } from './extractCalibration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

/**
 * Loads official calibration points from JSON cache if available,
 * or directly extracts from Excel workbooks as fallback.
 */
export async function loadOfficialCalibrationPoints() {
  const jsonDir = path.resolve(__dirname, '../data/calibration');
  const msJsonPath = path.join(jsonDir, 'ms1_15kl_calibration.json');
  const hsdJsonPath = path.join(jsonDir, 'hsd1_20kl_calibration.json');

  let msPoints = null;
  let hsdPoints = null;

  if (fs.existsSync(msJsonPath) && fs.existsSync(hsdJsonPath)) {
    msPoints = JSON.parse(fs.readFileSync(msJsonPath, 'utf8'));
    hsdPoints = JSON.parse(fs.readFileSync(hsdJsonPath, 'utf8'));
  } else {
    const excelDir = path.resolve(__dirname, '../../data/calibration');
    const msExcelPath = path.join(excelDir, '15 KL Petrol Dip Chart.xlsx');
    const hsdExcelPath = path.join(excelDir, '20 KL Diesel dip Chart.xlsx');

    msPoints = await extractCalibrationPoints(msExcelPath);
    hsdPoints = await extractCalibrationPoints(hsdExcelPath);
  }

  return { msPoints, hsdPoints };
}

/**
 * Idempotently seeds or updates official tank calibrations for configured MS-1 and HSD-1 tanks.
 * Preserves all unrelated database records.
 *
 * @param {object} options
 * @param {string} options.stationId - Optional specific station ID
 * @returns {Promise<{ msUpdated: boolean, hsdUpdated: boolean, msCount: number, hsdCount: number }>}
 */
export async function seedTankCalibrations({ stationId = null, actorId = null } = {}) {
  // 1. Resolve Station
  const stationQuery = stationId ? { _id: stationId } : {};
  const station = await Station.findOne(stationQuery);
  if (!station) {
    throw new Error('No active station found to attach tank calibrations.');
  }

  // 2. Resolve Tanks for Petrol (MS-1) and Diesel (HSD-1)
  const msTank = await Tank.findOne({
    stationId: station._id,
    product: 'PETROL',
    isActive: true,
  });

  const hsdTank = await Tank.findOne({
    stationId: station._id,
    product: 'DIESEL',
    isActive: true,
  });

  if (!msTank) {
    throw new Error(`Active PETROL (MS-1) tank not found for station ${station.name} (${station._id})`);
  }
  if (!hsdTank) {
    throw new Error(`Active DIESEL (HSD-1) tank not found for station ${station.name} (${station._id})`);
  }

  // Resolve actor (Manager / Admin user)
  let updatedBy = actorId;
  if (!updatedBy) {
    const adminUser = await User.findOne({ role: 'MANAGER' });
    updatedBy = adminUser?._id;
  }

  // 3. Load official points
  const { msPoints, hsdPoints } = await loadOfficialCalibrationPoints();

  // 4. Update MS-1 Calibration
  const msCal = await TankCalibration.findOneAndUpdate(
    { tankId: msTank._id },
    {
      $set: {
        points: msPoints,
        ...(updatedBy ? { lastUpdatedBy: updatedBy } : {}),
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

  // 5. Update HSD-1 Calibration
  const hsdCal = await TankCalibration.findOneAndUpdate(
    { tankId: hsdTank._id },
    {
      $set: {
        points: hsdPoints,
        ...(updatedBy ? { lastUpdatedBy: updatedBy } : {}),
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

  return {
    msTankId: msTank._id,
    msTankNumber: msTank.tankNumber,
    msCount: msCal.points.length,
    hsdTankId: hsdTank._id,
    hsdTankNumber: hsdTank.tankNumber,
    hsdCount: hsdCal.points.length,
  };
}

// Direct CLI invocation
if (process.argv[1] && process.argv[1].endsWith('seedCalibration.js')) {
  (async () => {
    try {
      await connectDB();
      console.log('Seeding official tank calibrations...');
      const result = await seedTankCalibrations();
      console.log('Official Tank Calibrations Seeded Successfully:');
      console.log(`- MS Tank [${result.msTankNumber}] (${result.msTankId}): ${result.msCount} points`);
      console.log(`- HSD Tank [${result.hsdTankNumber}] (${result.hsdTankId}): ${result.hsdCount} points`);
      process.exit(0);
    } catch (err) {
      console.error('Failed to seed tank calibrations:', err);
      process.exit(1);
    }
  })();
}
