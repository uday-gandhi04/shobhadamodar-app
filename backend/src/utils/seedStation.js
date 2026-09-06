// src/utils/seedStation.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Station from '../models/Station.js';
import Mpd from '../models/Mpd.js';
import FuelRate from '../models/FuelRate.js';
import User from '../models/User.js';

dotenv.config();

const seedStationData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for Seeding...');

    // 1. Clear existing physical config to prevent duplicates
    await Station.deleteMany();
    await Mpd.deleteMany();
    await FuelRate.deleteMany();

    // Fetch the Admin user to attribute the rate creation
    const adminUser = await User.findOne({ role: 'MANAGER' });
    if (!adminUser) {
      console.error('Error: Run the /api/auth/seed route first to create a Manager!');
      process.exit(1);
    }

    // 2. Create the Station
    const station = await Station.create({
      name: 'Shobhadamodar Petroleum',
      roCode: 'BPCL-MH-001',
      location: 'Maharashtra, India',
    });

    // 3. Create MPD 1
    await Mpd.create({
      stationId: station._id,
      mpdNumber: 'MPD 1',
      serialNumber: '14LB1582V',
      nozzles: [
        { nozzleId: 'n1', name: 'N1 - Petrol', fuelType: 'PETROL', currentCumulativeReading: 371722.35 },
        { nozzleId: 'n2', name: 'N2 - Diesel', fuelType: 'DIESEL', currentCumulativeReading: 798509.70 },
        { nozzleId: 'n3', name: 'N3 - Diesel', fuelType: 'DIESEL', currentCumulativeReading: 0.00 },
        { nozzleId: 'n4', name: 'N4 - Petrol', fuelType: 'PETROL', currentCumulativeReading: 0.00 },
      ],
    });

    // 4. Create MPD 2
    await Mpd.create({
      stationId: station._id,
      mpdNumber: 'MPD 2',
      serialNumber: '14LB1581V',
      nozzles: [
        { nozzleId: 'n1', name: 'N1 - Diesel', fuelType: 'DIESEL', currentCumulativeReading: 1020308.40 },
        { nozzleId: 'n2', name: 'N2 - Petrol', fuelType: 'PETROL', currentCumulativeReading: 1007335.70 },
        { nozzleId: 'n3', name: 'N3 - Petrol', fuelType: 'PETROL', currentCumulativeReading: 198428.50 },
        { nozzleId: 'n4', name: 'N4 - Diesel', fuelType: 'DIESEL', currentCumulativeReading: 1798390.11 },
      ],
    });

    // 5. Create Initial Fuel Rate (Current Maharashtra Rates converted to Paise)
    const today = new Date().toISOString().split('T')[0];
    await FuelRate.create({
      businessDate: today,
      petrolRatePaise: 11121, // ₹111.21 * 100
      dieselRatePaise: 9783,  // ₹97.83 * 100
      setBy: adminUser._id,
    });

    console.log('Physical Station, MPDs, and Fuel Rates Seeded Successfully!');
    process.exit();
  } catch (error) {
    console.error(`Seeding Error: ${error.message}`);
    process.exit(1);
  }
};

seedStationData();