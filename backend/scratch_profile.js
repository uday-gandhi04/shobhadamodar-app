import mongoose from 'mongoose';
import Station from './src/models/Station.js';
import DailyStock from './src/models/DailyStock.js';
import DailyMeterRegister from './src/models/DailyMeterRegister.js';
import Shift from './src/models/Shift.js';
import Mpd from './src/models/Mpd.js';
import Tank from './src/models/Tank.js';
import TankCalibration from './src/models/TankCalibration.js';
import FuelReceipt from './src/models/FuelReceipt.js';

await mongoose.connect(process.env.MONGODB_URI_TEST);
const station = await Station.findOne({ isActive: true }).lean();
const bDate = '2026-10-11';

console.time('optimized-all-parallel');
const [
  stockRows,
  receiptGroups,
  finalizedShifts,
  inProgressShifts,
  meterRegisterDocs,
  configuredTanks,
  mpds,
  calibrations,
  prevRegs,
  prevShifts
] = await Promise.all([
  DailyStock.find({ stationId: station._id, businessDate: bDate }).lean(),
  FuelReceipt.aggregate([
    { $match: { stationId: station._id, businessDate: bDate } },
    { $group: { _id: '$product', receiptStockLitres: { $sum: '$quantityLitres' } } }
  ]),
  Shift.find({ businessDate: bDate, status: { $in: ['ENDED', 'FORCE_CLOSED'] } }).sort({ startedAt: 1 }).lean(),
  Shift.find({ businessDate: bDate, status: 'IN_PROGRESS' }).sort({ startedAt: 1 }).lean(),
  DailyMeterRegister.find({ stationId: station._id, businessDate: bDate }).lean(),
  Tank.find({ stationId: station._id, isActive: true }).sort({ product: 1, tankNumber: 1 }).lean(),
  Mpd.find({ stationId: station._id, isActive: true }).sort({ mpdNumber: 1 }).lean(),
  TankCalibration.find().lean(),
  DailyMeterRegister.find({ stationId: station._id, businessDate: { $lt: bDate } })
    .sort({ businessDate: -1 })
    .limit(35)
    .select('product businessDate nozzles')
    .lean(),
  Shift.find({ status: { $in: ['ENDED', 'FORCE_CLOSED'] }, businessDate: { $lt: bDate } })
    .sort({ businessDate: -1, endedAt: -1, startedAt: -1 })
    .limit(50)
    .select('mpdId businessDate status endedAt startedAt readings')
    .lean()
]);
console.timeEnd('optimized-all-parallel');

await mongoose.disconnect();
