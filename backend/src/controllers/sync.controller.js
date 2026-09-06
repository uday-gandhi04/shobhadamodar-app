// src/controllers/sync.controller.js
import Mpd from '../models/Mpd.js';
import FuelRate from '../models/FuelRate.js';
import Station from '../models/Station.js';
import Customer from '../models/Customer.js';
import Shift from '../models/Shift.js';


/**
 * Hydrates the mobile client with required offline data
 * @route GET /api/sync/bootstrap
 */
export const bootstrapDevice = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Get Station details
    const station = await Station.findOne({ isActive: true });
    
    // 2. Get active MPDs
    const mpds = await Mpd.find({ isActive: true }).select('-createdAt -updatedAt -__v');

    // 3. Get Today's Rates
    const rates = await FuelRate.findOne({ businessDate: today }).sort({ createdAt: -1 });

    // 4. Get Udhari Customers
    const customers = await Customer.find().select('name vehicleNumber outstandingBalance');

    if (!rates) {
      return res.status(400).json({ 
        success: false, 
        message: `No fuel rates configured for business date: ${today}. Manager must set rates first.` 
      });
    }

    res.status(200).json({
      success: true,
      businessDate: today,
      activeRates: {
        petrolPaise: rates.petrolRatePaise,
        dieselPaise: rates.dieselRatePaise,
        display: {
          petrol: `₹${(rates.petrolRatePaise / 100).toFixed(2)}`,
          diesel: `₹${(rates.dieselRatePaise / 100).toFixed(2)}`
        }
      },
      station: {
        name: station?.name,
        location: station?.location,
      },
      mpds,
      customers
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Processes the end-of-shift payload, calculates financials, and finalizes the ledger.
 * @route POST /api/sync/submit
 */
export const submitShift = async (req, res, next) => {
  try {
    const { idempotencyKey, businessDate, shiftType, mpdId, readings, collections } = req.body;
    const employeeId = req.user._id;

    // 1. Idempotency Check: Prevent duplicate submissions if network drops
    const existingShift = await Shift.findOne({ idempotencyKey });
    if (existingShift) {
      return res.status(200).json({
        success: true,
        message: 'Shift already processed (Idempotency hit).',
        receipt: existingShift,
      });
    }

    // 2. Fetch required master data
    const rates = await FuelRate.findOne({ businessDate }).sort({ createdAt: -1 });
    if (!rates) {
      return res.status(400).json({ success: false, message: 'Fuel rates not found for this date.' });
    }

    const mpd = await Mpd.findById(mpdId);
    if (!mpd) {
      return res.status(404).json({ success: false, message: 'MPD not found.' });
    }

    // 3. Process Readings & Calculate Expected Sales
    let expectedTotalSalePaise = 0;
    let totalLitresPetrol = 0;
    let totalLitresDiesel = 0;
    const processedReadings = [];

    for (const reading of readings) {
      // Avoid JS floating point issues with decimals (e.g., 289.80)
      const dispensedLitres = Math.round((reading.closingReading - reading.openingReading) * 100) / 100;
      
      const ratePaise = reading.fuelType === 'PETROL' ? rates.petrolRatePaise : rates.dieselRatePaise;
      
      // Calculate Sale: (Litres * Rate in Paise)
      const expectedSalePaise = Math.round(dispensedLitres * ratePaise);

      expectedTotalSalePaise += expectedSalePaise;
      if (reading.fuelType === 'PETROL') totalLitresPetrol += dispensedLitres;
      if (reading.fuelType === 'DIESEL') totalLitresDiesel += dispensedLitres;

      processedReadings.push({
        nozzleId: reading.nozzleId,
        fuelType: reading.fuelType,
        openingReading: reading.openingReading,
        closingReading: reading.closingReading,
        dispensedLitres,
        ratePaise,
        expectedSalePaise,
      });

      // UPDATE MPD METER: Save the new closing reading as the permanent physical state
      const nozzleIndex = mpd.nozzles.findIndex(n => n.nozzleId === reading.nozzleId);
      if (nozzleIndex > -1) {
        mpd.nozzles[nozzleIndex].currentCumulativeReading = reading.closingReading;
      }
    }

    // 4. Process Collections
    let totalCashPaise = 0;
    const processedCash = collections.cashBreakdown.map(item => {
      // 500 notes * 10 count = 5000 Rupees = 500000 Paise
      const rowTotalPaise = (item.denomination * item.count) * 100;
      totalCashPaise += rowTotalPaise;
      return {
        denomination: item.denomination,
        count: item.count,
        totalPaise: rowTotalPaise
      };
    });

    const totalUpiPaise = Math.round(collections.upiAmount * 100);
    const totalCardPaise = Math.round(collections.cardAmount * 100);
    let totalUdhariPaise = 0;
    const processedUdhari = [];

    // Process Customer Credit Updates
    for (const udhari of collections.udhariTransactions) {
      const amountPaise = Math.round(udhari.amount * 100);
      totalUdhariPaise += amountPaise;
      processedUdhari.push({ customerId: udhari.customerId, amountPaise });

      // Update the customer's permanent ledger balance
      await Customer.findByIdAndUpdate(udhari.customerId, {
        $inc: { outstandingBalance: amountPaise }
      });
    }

    const totalCollectedPaise = totalCashPaise + totalUpiPaise + totalCardPaise + totalUdhariPaise;
    const differencePaise = totalCollectedPaise - expectedTotalSalePaise;
    
    // Determine Status
    let reconciliationStatus = 'MATCHED';
    if (differencePaise < 0) reconciliationStatus = 'SHORT';
    if (differencePaise > 0) reconciliationStatus = 'EXCESS';

    // 5. Save the Shift Document
    const shift = await Shift.create({
      idempotencyKey,
      businessDate,
      shiftType,
      mpdId,
      employeeId,
      status: 'SUBMITTED',
      readings: processedReadings,
      totalLitresPetrol,
      totalLitresDiesel,
      expectedTotalSalePaise,
      cashCollections: processedCash,
      totalCashPaise,
      totalUpiPaise,
      totalCardPaise,
      udhariEntries: processedUdhari,
      totalUdhariPaise,
      totalCollectedPaise,
      differencePaise,
      reconciliationStatus,
    });

    // Save updated physical MPD meters
    await mpd.save();

    // 6. Return response
    res.status(201).json({
      success: true,
      message: 'Shift successfully processed and reconciled.',
      receipt: {
        shiftId: shift._id,
        status: shift.reconciliationStatus,
        difference: `₹${(shift.differencePaise / 100).toFixed(2)}`,
        totalSale: `₹${(shift.expectedTotalSalePaise / 100).toFixed(2)}`
      }
    });

  } catch (error) {
    // Handle MongoDB unique constraint errors for duplicate shifts gracefully
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A shift for this MPD and time slot is already logged.' });
    }
    next(error);
  }
};