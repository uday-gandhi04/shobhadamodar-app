import assert from "node:assert/strict";
import test from "node:test";

import Mpd from "../models/Mpd.js";
import FuelRate from "../models/FuelRate.js";
import Shift from "../models/Shift.js";
import { endShift, calculateCollections } from "./shift.controller.js";
import { endShiftSchema } from "../validations/shift.validation.js";

test("collection totals include coins in cash, collection, and reconciliation", () => {
  const financials = calculateCollections({
    cashBreakdown: [{ denomination: 500, count: 20 }],
    coinsPaise: 50000,
    upiPaise: 500000,
    atmEntries: [{ time: "12:30", amountPaise: 200000 }],
    udhariPaise: 50000,
  });

  assert.equal(financials.totalCashPaise, 1050000);
  assert.equal(financials.totalCollectedPaise, 1800000);
  assert.equal(financials.totalCollectedPaise - 1750000, 50000);
});

test("collection totals exclude expenses and remain backward compatible without coins", () => {
  const withExpense = calculateCollections({
    cashBreakdown: [{ denomination: 100, count: 1 }],
    upiPaise: 2000,
    expensesPaise: 900000,
  });
  const withoutCoins = calculateCollections({
    cashBreakdown: [{ denomination: 100, count: 1 }],
    upiPaise: 2000,
  });

  assert.equal(withExpense.totalCollectedPaise, 12000);
  assert.equal(withExpense.totalCollectedPaise, withoutCoins.totalCollectedPaise);
  assert.equal(withoutCoins.totalCashPaise, 10000);
});

test("end shift persists normalized ATM entries without changing the card total", async () => {
  const originals = {
    shiftFindOne: Shift.findOne,
    rateFindOne: FuelRate.findOne,
    mpdFindById: Mpd.findById,
    mpdFindByIdAndUpdate: Mpd.findByIdAndUpdate,
  };
  const saved = {};
  const shift = {
    _id: "shift-id",
    businessDate: "2026-10-05",
    mpdId: "mpd-id",
    readings: [{ nozzleId: "N1", openingReading: 0 }],
    save: async () => Object.assign(saved, JSON.parse(JSON.stringify(shift))),
  };
  const mpd = {
    _id: "mpd-id",
    nozzles: [{ nozzleId: "N1", fuelType: "PETROL", currentCumulativeReading: 0 }],
  };

  Shift.findOne = async () => shift;
  FuelRate.findOne = () => ({ sort: async () => ({ petrolRatePaise: 10000, dieselRatePaise: 9000 }) });
  Mpd.findById = () => ({ lean: async () => mpd });
  Mpd.findByIdAndUpdate = async () => mpd;

  try {
    let response;
    await endShift(
      {
        user: { _id: "employee-id", role: "EMPLOYEE" },
        params: { id: "shift-id" },
        body: {
          readings: [{ nozzleId: "N1", closingReading: 1 }],
          collections: {
            cashBreakdown: [],
            atmEntries: [
              { time: "09:15", amountPaise: 4000 },
              { time: "18:45", amountPaise: 6000 },
            ],
          },
        },
      },
      { status: () => ({ json: (body) => (response = body) }) },
      (error) => { throw error; },
    );

    assert.equal(response.success, true);
    assert.equal(saved.totalCardPaise, 10000);
    assert.deepEqual(saved.atmEntries, [
      { time: "09:15", amountPaise: 4000 },
      { time: "18:45", amountPaise: 6000 },
    ]);
  } finally {
    Shift.findOne = originals.shiftFindOne;
    FuelRate.findOne = originals.rateFindOne;
    Mpd.findById = originals.mpdFindById;
    Mpd.findByIdAndUpdate = originals.mpdFindByIdAndUpdate;
  }
});

test("end-shift validation retains the existing ATM entry structure", () => {
  const parsed = endShiftSchema.parse({
    body: {
      readings: [{ nozzleId: "N1", closingReading: 10 }],
      collections: { atmEntries: [{ time: "09:15", amountPaise: 12345 }] },
    },
  });

  assert.deepEqual(parsed.body.collections.atmEntries, [
    { time: "09:15", amountPaise: 12345 },
  ]);
});
