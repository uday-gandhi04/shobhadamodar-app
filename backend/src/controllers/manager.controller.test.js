import assert from "node:assert/strict";
import test from "node:test";

import Expense from "../models/Expense.js";
import Mpd from "../models/Mpd.js";
import Shift from "../models/Shift.js";
import UdhariTransaction from "../models/UdhariTransaction.js";
import { getManagerAccounting } from "./manager.controller.js";

const mpdOneId = "111111111111111111111111";
const mpdTwoId = "222222222222222222222222";
const reportDate = "2026-10-04";

const groups = [
  {
    _id: { businessDate: reportDate, mpdId: mpdOneId },
    totalLitresPetrol: 10,
    totalLitresDiesel: 5,
    petrolSalePaise: 20000,
    dieselSalePaise: 10000,
    expectedTotalSalePaise: 30000,
    totalCashPaise: 20000,
    coinsPaise: 250,
    totalUpiPaise: 5000,
    totalCardPaise: 4000,
    totalUdhariPaise: 900,
    totalCollectedPaise: 29900,
    differencePaise: -100,
    shiftCount: 2,
    pendingShiftCount: 0,
    shortShiftCount: 1,
    excessShiftCount: 0,
  },
  {
    _id: { businessDate: reportDate, mpdId: mpdTwoId },
    totalLitresPetrol: 1,
    totalLitresDiesel: 2,
    petrolSalePaise: 2000,
    dieselSalePaise: 8000,
    expectedTotalSalePaise: 10000,
    totalCashPaise: 5000,
    coinsPaise: 100,
    totalUpiPaise: 2000,
    totalCardPaise: 1000,
    totalUdhariPaise: 2100,
    totalCollectedPaise: 10100,
    differencePaise: 100,
    shiftCount: 1,
    pendingShiftCount: 0,
    shortShiftCount: 0,
    excessShiftCount: 1,
  },
];

const originalMethods = {
  shiftAggregate: Shift.aggregate,
  shiftFind: Shift.find,
  expenseAggregate: Expense.aggregate,
  mpdFind: Mpd.find,
  udhariFind: UdhariTransaction.find,
};

const withMocks = async (query) => {
  let shiftPipeline;
  let expensePipeline;
  const shiftFindQueries = [];
  const finalizedShifts = [
    {
      _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
      businessDate: reportDate,
      status: "ENDED",
      startedAt: new Date("2026-10-04T01:00:00.000Z"),
      endedAt: new Date("2026-10-04T08:00:00.000Z"),
      readings: [],
      totalLitresPetrol: 0,
      totalLitresDiesel: 0,
      expectedTotalSalePaise: 30000,
      totalCollectedPaise: 29900,
      differencePaise: -100,
      reconciliationStatus: "SHORT",
      employeeId: { _id: "333333333333333333333333", name: "Employee" },
      mpdId: { _id: mpdOneId, mpdNumber: "MPD 1" },
    },
    {
      _id: "bbbbbbbbbbbbbbbbbbbbbbbb",
      businessDate: "2026-10-03",
      status: "IN_PROGRESS",
      startedAt: new Date("2026-10-04T09:00:00.000Z"),
      endedAt: null,
      readings: [],
      totalLitresPetrol: 0,
      totalLitresDiesel: 0,
      expectedTotalSalePaise: 500000,
      totalCollectedPaise: 0,
      differencePaise: 0,
      reconciliationStatus: "PENDING",
      employeeId: { _id: "444444444444444444444444", name: "Active Employee" },
      mpdId: { _id: mpdTwoId, mpdNumber: "MPD 2" },
    },
  ];

  Shift.aggregate = (pipeline) => {
    shiftPipeline = pipeline;
    return Promise.resolve(groups);
  };
  Shift.find = (query) => {
    shiftFindQueries.push(query);
    const queryBuilder = {
      populate() { return this; },
      sort() { return this; },
      lean() {
        return Promise.resolve(
          query.status === "IN_PROGRESS"
            ? finalizedShifts.filter((shift) => shift.status === "IN_PROGRESS")
            : finalizedShifts.filter((shift) => shift.status !== "IN_PROGRESS"),
        );
      },
    };
    return queryBuilder;
  };
  Expense.aggregate = (pipeline) => {
    expensePipeline = pipeline;
    return Promise.resolve([
      { _id: reportDate, totalExpensePaise: 5000 },
    ]);
  };
  Mpd.find = () => ({
    select() {
      return {
        lean: async () => [
          { _id: mpdOneId, mpdNumber: "MPD 1" },
          { _id: mpdTwoId, mpdNumber: "MPD 2" },
        ],
      };
    },
  });
  UdhariTransaction.find = () => ({
    populate() { return this; },
    sort() { return this; },
    lean: async () => []
  });

  try {
    let statusCode;
    let responseBody;
    await getManagerAccounting(
      { query },
      {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          responseBody = body;
          return body;
        },
      },
      (error) => {
        throw error;
      },
    );

    return { statusCode, responseBody, shiftPipeline, expensePipeline, shiftFindQueries };
  } finally {
    Shift.aggregate = originalMethods.shiftAggregate;
    Shift.find = originalMethods.shiftFind;
    Expense.aggregate = originalMethods.expenseAggregate;
    Mpd.find = originalMethods.mpdFind;
    UdhariTransaction.find = originalMethods.udhariFind;
  }
};

test("uses selected date for today and Monday-Sunday week boundaries", async () => {
  const today = await withMocks({ period: "today", date: reportDate });
  assert.equal(today.responseBody.data.period.startBusinessDate, reportDate);
  assert.equal(today.responseBody.data.period.endBusinessDate, reportDate);

  const week = await withMocks({ period: "week", date: reportDate });
  assert.equal(week.responseBody.data.period.startBusinessDate, "2026-09-28");
  assert.equal(week.responseBody.data.period.endBusinessDate, "2026-10-04");

  const month = await withMocks({ period: "month", date: reportDate });
  assert.equal(month.responseBody.data.period.startBusinessDate, "2026-10-01");
  assert.equal(month.responseBody.data.period.endBusinessDate, "2026-10-31");
});

test("aggregates only completed shift totals and keeps expense and coins separate", async () => {
  const result = await withMocks({ period: "today", date: reportDate });
  const { summary, mpds, shifts, activeShifts } = result.responseBody.data;
  const shiftMatch = result.shiftPipeline.find((stage) => stage.$match).$match;
  const expenseMatch = result.expensePipeline.find((stage) => stage.$match).$match;

  assert.deepEqual(shiftMatch.status.$in, ["ENDED", "FORCE_CLOSED"]);
  assert.deepEqual(expenseMatch.businessDate, shiftMatch.businessDate);
  assert.equal(summary.shiftCount, 3);
  assert.equal(summary.totalLitres, 18);
  assert.equal(summary.expectedTotalSalePaise, 40000);
  assert.equal(summary.totalCollectedPaise, 40000);
  assert.equal(summary.differencePaise, 0);
  assert.equal(summary.reconciliationStatus, "MATCHED");
  assert.equal(summary.shortShiftCount, 1);
  assert.equal(summary.excessShiftCount, 1);
  assert.equal(summary.totalExpensePaise, 5000);
  assert.equal(summary.coinsPaise, 350);
  assert.equal(summary.totalCollectedPaise, 40000);
  assert.equal(mpds.find((mpd) => mpd._id === mpdOneId).shiftCount, 2);
  assert.equal(mpds.find((mpd) => mpd._id === mpdOneId).expectedTotalSalePaise, 30000);
  assert.equal(shifts.length, 1);
  assert.equal(activeShifts.length, 1);
  assert.equal(activeShifts[0].businessDate, "2026-10-03");
  assert.equal(activeShifts[0].expectedTotalSalePaise, 500000);
  assert.deepEqual(
    result.shiftFindQueries.find((query) => query.status === "IN_PROGRESS"),
    { status: "IN_PROGRESS" },
  );
});
