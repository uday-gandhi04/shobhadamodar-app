import mongoose from 'mongoose';

import Customer from '../models/Customer.js';
import UdhariTransaction from '../models/UdhariTransaction.js';
import Shift from '../models/Shift.js';
import FuelRate from '../models/FuelRate.js';
import Mpd from '../models/Mpd.js';

const roundTwo = (value) => {
  return Math.round(value * 100) / 100;
};

export const addUdhariTransaction =
  async (req, res, next) => {
    const session =
      await mongoose.startSession();

    try {
      const {
        shiftId,
        customerId,
        customerName,
        vehicleNumber,
        fuelType,
        litres,
        amountPaise,
      } = req.body;

      /*
       * 1. Verify active shift belongs to employee.
       */
      const shift =
        await Shift.findOne({
          _id: shiftId,
          employeeId: req.user._id,
          status: 'IN_PROGRESS',
        }).session(session);

      if (!shift) {
        return res.status(404).json({
          success: false,
          message: 'Active shift not found.',
          code: 'ACTIVE_SHIFT_NOT_FOUND',
        });
      }

      /*
       * 2. Validate MPD.
       */
      const mpd =
        await Mpd.findById(
          shift.mpdId,
        ).lean();

      if (!mpd) {
        return res.status(404).json({
          success: false,
          message: 'MPD not found.',
          code: 'MPD_NOT_FOUND',
        });
      }

      const matchingNozzle =
        mpd.nozzles.find(
          (nozzle) =>
            nozzle.fuelType === fuelType,
        );

      if (!matchingNozzle) {
        return res.status(400).json({
          success: false,
          message: `No ${fuelType} nozzle is configured on this MPD.`,
          code: 'FUEL_TYPE_NOT_CONFIGURED',
        });
      }

      /*
       * 3. Get applicable rate.
       *
       * We use the shift's business date.
       */
      const rates =
        await FuelRate.findOne({
          businessDate: {
            $lte: shift.businessDate,
          },
        })
          .sort({
            businessDate: -1,
          })
          .lean();

      if (!rates) {
        return res.status(400).json({
          success: false,
          message: `Fuel rates not found for ${shift.businessDate}.`,
          code: 'FUEL_RATE_NOT_FOUND',
        });
      }

      const ratePaise =
        fuelType === 'PETROL'
          ? rates.petrolRatePaise
          : rates.dieselRatePaise;

      /*
       * 4. Calculate litres / amount.
       *
       * Employee can provide either:
       *
       * litres
       * OR
       * amountPaise
       */
      let finalLitres;
      let finalAmountPaise;

      const hasLitres =
        litres !== undefined &&
        litres !== null &&
        litres !== '';

      const hasAmount =
        amountPaise !== undefined &&
        amountPaise !== null &&
        amountPaise !== '';

      if (!hasLitres && !hasAmount) {
        return res.status(400).json({
          success: false,
          message:
            'Enter either litres or rupee amount.',
          code: 'AMOUNT_OR_LITRES_REQUIRED',
        });
      }

      if (hasLitres) {
        finalLitres = roundTwo(
          Number(litres),
        );

        if (
          !Number.isFinite(
            finalLitres,
          ) ||
          finalLitres <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: 'Invalid litres.',
            code: 'INVALID_LITRES',
          });
        }

        finalAmountPaise =
          Math.round(
            finalLitres * ratePaise,
          );
      } else {
        finalAmountPaise = Math.round(
          Number(amountPaise),
        );

        if (
          !Number.isFinite(
            finalAmountPaise,
          ) ||
          finalAmountPaise <= 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid rupee amount.',
            code: 'INVALID_AMOUNT',
          });
        }

        finalLitres = roundTwo(
          finalAmountPaise / ratePaise,
        );
      }

      /*
       * 5. Find or create customer.
       *
       * Existing customer is preferred.
       */
      await session.withTransaction(
        async () => {
          let customer = null;

          if (customerId) {
            customer =
              await Customer.findById(
                customerId,
              ).session(session);
          }

          if (!customer) {
            customer =
              await Customer.findOne({
                name: customerName?.trim(),
              }).session(session);
          }

          if (!customer) {
            customer = new Customer({
              name: customerName?.trim(),
              vehicleNumber:
                vehicleNumber
                  ?.trim()
                  ?.toUpperCase() || null,
              outstandingBalance:
                0,
            });

            await customer.save({
              session,
            });
          }

          /*
           * 6. Create immutable transaction.
           */
          await UdhariTransaction.create(
            [
              {
                customerId:
                  customer._id,

                shiftId:
                  shift._id,

                employeeId:
                  req.user._id,

                businessDate:
                  shift.businessDate,

                vehicleNumber:
                  vehicleNumber
                    ?.trim()
                    ?.toUpperCase() ||
                  null,

                fuelType,

                litres:
                  finalLitres,

                ratePaise,

                amountPaise:
                  finalAmountPaise,
              },
            ],
            {
              session,
            },
          );

          /*
           * 7. Increase customer's balance atomically.
           */
          customer =
            await Customer.findOneAndUpdate(
              {
                _id: customer._id,
              },
              {
                $inc: {
                  outstandingBalance:
                    finalAmountPaise,
                },
              },
              {
                new: true,
                session,
              },
            );

          /*
           * 8. Update shift's Udhari total.
           */
          const shiftUpdate =
            await Shift.findById(
              shift._id,
            ).session(session);

          shiftUpdate.udhariEntries.push({
            customerId:
              customer._id,
            amountPaise:
              finalAmountPaise,
            fuelType,
            litres:
              finalLitres,
            ratePaise,
            vehicleNumber:
              vehicleNumber
                ?.trim()
                ?.toUpperCase() ||
              null,
          });

          shiftUpdate.totalUdhariPaise +=
            finalAmountPaise;

          shiftUpdate.totalCollectedPaise =
            shiftUpdate.totalCashPaise +
            shiftUpdate.totalUpiPaise +
            shiftUpdate.totalCardPaise +
            shiftUpdate.totalUdhariPaise;

          shiftUpdate.reconciliationStatus =
            'PENDING';

          await shiftUpdate.save({
            session,
          });

          req.createdCustomer =
            customer;
          req.updatedShift =
            shiftUpdate;
        },
      );

      return res.status(201).json({
        success: true,
        message:
          'Udhari added successfully.',
        data: {
          customer:
            req.createdCustomer,
          transaction: {
            fuelType,
            litres: finalLitres,
            ratePaise,
            amountPaise:
              finalAmountPaise,
            vehicleNumber:
              vehicleNumber
                ?.trim()
                ?.toUpperCase() ||
              null,
          },
          shiftId: shift._id,
        },
      });
    } catch (error) {
      next(error);
    } finally {
      await session.endSession();
    }
  };