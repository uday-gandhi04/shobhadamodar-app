import assert from "node:assert/strict";
import test from "node:test";
import FuelRate from "../models/FuelRate.js";
import {
  TIMEZONE,
  getRateEffectiveTimeForDate,
  getBusinessDateFromInstant,
  getEligibleCutoffBusinessDate,
  getEffectiveFuelRate,
  getEffectiveRateForFuel,
  getTargetInstantFromRequest,
  resolveEventInstant,
} from "./fuelRateService.js";

const originalFindOne = FuelRate.findOne;

test("FuelRate 6:00 AM IST Rule: 1. At 5:59:59 AM IST on scheduled date, previous effective rate is selected", async () => {
  const dbRates = [
    {
      businessDate: "2026-10-22",
      effectiveAt: new Date("2026-10-22T06:00:00+05:30"),
      petrolRatePaise: 10000,
      dieselRatePaise: 9000,
    },
    {
      businessDate: "2026-10-23",
      effectiveAt: new Date("2026-10-23T06:00:00+05:30"),
      petrolRatePaise: 10500,
      dieselRatePaise: 9500,
    },
  ];

  FuelRate.findOne = (query) => {
    const maxDate = query.businessDate.$lte;
    return {
      sort: () => ({
        lean: async () => {
          const matching = dbRates
            .filter((r) => r.businessDate <= maxDate)
            .sort((a, b) => b.businessDate.localeCompare(a.businessDate));
          return matching.length ? matching[0] : null;
        },
      }),
    };
  };

  try {
    // 5:59:59 AM IST on October 23, 2026 = 2026-10-23T00:29:59.000Z
    const testInstant = new Date("2026-10-23T05:59:59+05:30");
    const rate = await getEffectiveFuelRate(testInstant);

    assert.ok(rate, "Rate should be found");
    assert.equal(rate.businessDate, "2026-10-22");
    assert.equal(rate.petrolRatePaise, 10000);
    assert.equal(rate.dieselRatePaise, 9000);
  } finally {
    FuelRate.findOne = originalFindOne;
  }
});

test("FuelRate 6:00 AM IST Rule: 2. At exactly 6:00:00 AM IST, scheduled rate becomes effective", async () => {
  const dbRates = [
    {
      businessDate: "2026-10-22",
      effectiveAt: new Date("2026-10-22T06:00:00+05:30"),
      petrolRatePaise: 10000,
      dieselRatePaise: 9000,
    },
    {
      businessDate: "2026-10-23",
      effectiveAt: new Date("2026-10-23T06:00:00+05:30"),
      petrolRatePaise: 10500,
      dieselRatePaise: 9500,
    },
  ];

  FuelRate.findOne = (query) => {
    const maxDate = query.businessDate.$lte;
    return {
      sort: () => ({
        lean: async () => {
          const matching = dbRates
            .filter((r) => r.businessDate <= maxDate)
            .sort((a, b) => b.businessDate.localeCompare(a.businessDate));
          return matching.length ? matching[0] : null;
        },
      }),
    };
  };

  try {
    // Exactly 6:00:00 AM IST on October 23, 2026 = 2026-10-23T00:30:00.000Z
    const testInstant = new Date("2026-10-23T06:00:00+05:30");
    const rate = await getEffectiveFuelRate(testInstant);

    assert.ok(rate, "Rate should be found");
    assert.equal(rate.businessDate, "2026-10-23");
    assert.equal(rate.petrolRatePaise, 10500);
    assert.equal(rate.dieselRatePaise, 9500);
  } finally {
    FuelRate.findOne = originalFindOne;
  }
});

test("FuelRate 6:00 AM IST Rule: 3. At 6:00:01 AM IST, scheduled rate remains active", async () => {
  const dbRates = [
    {
      businessDate: "2026-10-22",
      effectiveAt: new Date("2026-10-22T06:00:00+05:30"),
      petrolRatePaise: 10000,
      dieselRatePaise: 9000,
    },
    {
      businessDate: "2026-10-23",
      effectiveAt: new Date("2026-10-23T06:00:00+05:30"),
      petrolRatePaise: 10500,
      dieselRatePaise: 9500,
    },
  ];

  FuelRate.findOne = (query) => {
    const maxDate = query.businessDate.$lte;
    return {
      sort: () => ({
        lean: async () => {
          const matching = dbRates
            .filter((r) => r.businessDate <= maxDate)
            .sort((a, b) => b.businessDate.localeCompare(a.businessDate));
          return matching.length ? matching[0] : null;
        },
      }),
    };
  };

  try {
    // 6:00:01 AM IST on October 23, 2026 = 2026-10-23T00:30:01.000Z
    const testInstant = new Date("2026-10-23T06:00:01+05:30");
    const rate = await getEffectiveFuelRate(testInstant);

    assert.ok(rate, "Rate should be found");
    assert.equal(rate.businessDate, "2026-10-23");
    assert.equal(rate.petrolRatePaise, 10500);
    assert.equal(rate.dieselRatePaise, 9500);
  } finally {
    FuelRate.findOne = originalFindOne;
  }
});

test("FuelRate 6:00 AM IST Rule: 4. A future scheduled rate is never returned early", async () => {
  const dbRates = [
    {
      businessDate: "2026-10-23",
      effectiveAt: new Date("2026-10-23T06:00:00+05:30"),
      petrolRatePaise: 10500,
      dieselRatePaise: 9500,
    },
    {
      businessDate: "2026-10-24",
      effectiveAt: new Date("2026-10-24T06:00:00+05:30"),
      petrolRatePaise: 11000,
      dieselRatePaise: 10000,
    },
  ];

  FuelRate.findOne = (query) => {
    const maxDate = query.businessDate.$lte;
    return {
      sort: () => ({
        lean: async () => {
          const matching = dbRates
            .filter((r) => r.businessDate <= maxDate)
            .sort((a, b) => b.businessDate.localeCompare(a.businessDate));
          return matching.length ? matching[0] : null;
        },
      }),
    };
  };

  try {
    // Request at 11:00 PM IST on Oct 23
    const eveningOct23 = new Date("2026-10-23T23:00:00+05:30");
    const rate1 = await getEffectiveFuelRate(eveningOct23);
    assert.equal(rate1.businessDate, "2026-10-23");
    assert.equal(rate1.petrolRatePaise, 10500);

    // Request at 5:30 AM IST on Oct 24 (before 6:00 AM)
    const earlyOct24 = new Date("2026-10-24T05:30:00+05:30");
    const rate2 = await getEffectiveFuelRate(earlyOct24);
    assert.equal(rate2.businessDate, "2026-10-23");
    assert.equal(rate2.petrolRatePaise, 10500);
  } finally {
    FuelRate.findOne = originalFindOne;
  }
});

test("FuelRate 6:00 AM IST Rule: 5. If no rate is scheduled for current date, previous effective rate remains active", async () => {
  const dbRates = [
    {
      businessDate: "2026-10-18",
      effectiveAt: new Date("2026-10-18T06:00:00+05:30"),
      petrolRatePaise: 9800,
      dieselRatePaise: 8800,
    },
  ];

  FuelRate.findOne = (query) => {
    const maxDate = query.businessDate.$lte;
    return {
      sort: () => ({
        lean: async () => {
          const matching = dbRates
            .filter((r) => r.businessDate <= maxDate)
            .sort((a, b) => b.businessDate.localeCompare(a.businessDate));
          return matching.length ? matching[0] : null;
        },
      }),
    };
  };

  try {
    // Instant on Oct 22 (several days after Oct 18)
    const testInstant = new Date("2026-10-22T14:30:00+05:30");
    const rate = await getEffectiveFuelRate(testInstant);

    assert.ok(rate);
    assert.equal(rate.businessDate, "2026-10-18");
    assert.equal(rate.petrolRatePaise, 9800);
    assert.equal(rate.dieselRatePaise, 8800);
  } finally {
    FuelRate.findOne = originalFindOne;
  }
});

test("FuelRate 6:00 AM IST Rule: 6. MS and HSD rates resolve independently", async () => {
  const dbRates = [
    {
      businessDate: "2026-10-23",
      effectiveAt: new Date("2026-10-23T06:00:00+05:30"),
      petrolRatePaise: 10450,
      dieselRatePaise: 9230,
    },
  ];

  FuelRate.findOne = (query) => {
    const maxDate = query.businessDate.$lte;
    return {
      sort: () => ({
        lean: async () => {
          const matching = dbRates
            .filter((r) => r.businessDate <= maxDate)
            .sort((a, b) => b.businessDate.localeCompare(a.businessDate));
          return matching.length ? matching[0] : null;
        },
      }),
    };
  };

  try {
    const instant = new Date("2026-10-23T10:00:00+05:30");

    const msRate = await getEffectiveRateForFuel("MS", instant);
    const petrolRate = await getEffectiveRateForFuel("PETROL", instant);
    const hsdRate = await getEffectiveRateForFuel("HSD", instant);
    const dieselRate = await getEffectiveRateForFuel("DIESEL", instant);

    assert.equal(msRate, 10450);
    assert.equal(petrolRate, 10450);
    assert.equal(hsdRate, 9230);
    assert.equal(dieselRate, 9230);
  } finally {
    FuelRate.findOne = originalFindOne;
  }
});

test("FuelRate 6:00 AM IST Rule: 7. Missing rates follow existing validation behaviour (null, not fake 0)", async () => {
  // Empty database
  FuelRate.findOne = () => ({
    sort: () => ({
      lean: async () => null,
    }),
  });

  try {
    const rate = await getEffectiveFuelRate(new Date("2026-10-23T12:00:00+05:30"));
    assert.equal(rate, null, "Missing rate must return null, not 0");

    const msRate = await getEffectiveRateForFuel("MS", new Date("2026-10-23T12:00:00+05:30"));
    assert.equal(msRate, null, "Missing MS rate must return null, not 0");
  } finally {
    FuelRate.findOne = originalFindOne;
  }
});

test("FuelRate 6:00 AM IST Rule: 8. Date/time parsing and rate resolution are correct in Asia/Kolkata", () => {
  assert.equal(TIMEZONE, "Asia/Kolkata");

  const effectiveTime = getRateEffectiveTimeForDate("2026-10-23");
  // 06:00:00 IST = 00:30:00.000Z
  assert.equal(effectiveTime.toISOString(), "2026-10-23T00:30:00.000Z");

  // UTC instant 2026-10-23T00:29:59.000Z is 05:59:59 IST on Oct 23 -> cutoff is Oct 22
  const cutoffBefore6 = getEligibleCutoffBusinessDate("2026-10-23T00:29:59.000Z");
  assert.equal(cutoffBefore6, "2026-10-22");

  // UTC instant 2026-10-23T00:30:00.000Z is 06:00:00 IST on Oct 23 -> cutoff is Oct 23
  const cutoffAt6 = getEligibleCutoffBusinessDate("2026-10-23T00:30:00.000Z");
  assert.equal(cutoffAt6, "2026-10-23");

  // Test getBusinessDateFromInstant in IST
  assert.equal(getBusinessDateFromInstant("2026-10-22T20:00:00.000Z"), "2026-10-23"); // 20:00 UTC = 01:30 next day IST
});

test("FuelRate 6:00 AM IST Rule: 9. Existing historical finalized records remain unchanged", async () => {
  const historicalRates = [
    {
      businessDate: "2026-09-01",
      effectiveAt: new Date("2026-09-01T06:00:00+05:30"),
      petrolRatePaise: 9500,
      dieselRatePaise: 8500,
    },
    {
      businessDate: "2026-09-15",
      effectiveAt: new Date("2026-09-15T06:00:00+05:30"),
      petrolRatePaise: 9600,
      dieselRatePaise: 8600,
    },
  ];

  FuelRate.findOne = (query) => {
    const maxDate = query.businessDate.$lte;
    return {
      sort: () => ({
        lean: async () => {
          const matching = historicalRates
            .filter((r) => r.businessDate <= maxDate)
            .sort((a, b) => b.businessDate.localeCompare(a.businessDate));
          return matching.length ? matching[0] : null;
        },
      }),
    };
  };

  try {
    // A historical query on 2026-09-10 resolves to the 2026-09-01 rate
    const historicalInstant = getRateEffectiveTimeForDate("2026-09-10");
    const rate = await getEffectiveFuelRate(historicalInstant);

    assert.ok(rate);
    assert.equal(rate.businessDate, "2026-09-01");
    assert.equal(rate.petrolRatePaise, 9500);
    assert.equal(rate.dieselRatePaise, 8500);
  } finally {
    FuelRate.findOne = originalFindOne;
  }
});

test("FuelRate 6:00 AM IST Rule: 10. Target instant helper parses requests correctly with server-authoritative time", () => {
  // Query with explicit 'at' ISO timestamp
  const reqWithAt = { query: { at: "2026-10-23T05:59:00+05:30" } };
  const instantAt = getTargetInstantFromRequest(reqWithAt);
  assert.equal(instantAt.toISOString(), new Date("2026-10-23T05:59:00+05:30").toISOString());

  // Query with past calendar date parses to end of day IST on that date
  const reqWithPastDate = { query: { date: "2026-09-01" } };
  const instantPast = getTargetInstantFromRequest(reqWithPastDate);
  assert.equal(instantPast.toISOString(), new Date("2026-09-01T23:59:59+05:30").toISOString());

  // Query without params returns a valid Date instance close to current time
  const reqEmpty = { query: {} };
  const instantNow = getTargetInstantFromRequest(reqEmpty);
  assert.ok(Math.abs(instantNow.getTime() - Date.now()) < 5000);
});

test("FuelRate 6:00 AM IST Rule: 11. Delayed/offline shift sync arriving after 6:00 AM on date D uses date D-1 rate if shift was for date D-1", async () => {
  const dbRates = [
    {
      businessDate: "2026-10-22",
      effectiveAt: new Date("2026-10-22T06:00:00+05:30"),
      petrolRatePaise: 9500,
      dieselRatePaise: 8500,
    },
    {
      businessDate: "2026-10-23",
      effectiveAt: new Date("2026-10-23T06:00:00+05:30"),
      petrolRatePaise: 10500,
      dieselRatePaise: 9500,
    },
  ];

  FuelRate.findOne = (query) => {
    const maxDate = query.businessDate.$lte;
    return {
      sort: () => ({
        lean: async () => {
          const matching = dbRates
            .filter((r) => r.businessDate <= maxDate)
            .sort((a, b) => b.businessDate.localeCompare(a.businessDate));
          return matching.length ? matching[0] : null;
        },
      }),
    };
  };

  try {
    // Shift occurred on October 22, sync arrives on Oct 23 at 08:30 AM (after 6:00 AM rate increase)
    const shiftContext = {
      businessDate: "2026-10-22",
      endedAt: "2026-10-22T22:30:00+05:30",
    };

    const eventInstant = resolveEventInstant(shiftContext);
    const rate = await getEffectiveFuelRate(eventInstant);

    assert.ok(rate);
    assert.equal(rate.businessDate, "2026-10-22");
    assert.equal(rate.petrolRatePaise, 9500, "Must use Oct 22 rate of 9500, NOT Oct 23 rate of 10500");
  } finally {
    FuelRate.findOne = originalFindOne;
  }
});

test("FuelRate 6:00 AM IST Rule: 12. Offline shift ending at 05:30 AM before 6:00 AM rate change synced at 06:15 AM retains pre-6 AM rate", async () => {
  const dbRates = [
    {
      businessDate: "2026-10-22",
      effectiveAt: new Date("2026-10-22T06:00:00+05:30"),
      petrolRatePaise: 9800,
      dieselRatePaise: 8800,
    },
    {
      businessDate: "2026-10-23",
      effectiveAt: new Date("2026-10-23T06:00:00+05:30"),
      petrolRatePaise: 10800,
      dieselRatePaise: 9800,
    },
  ];

  FuelRate.findOne = (query) => {
    const maxDate = query.businessDate.$lte;
    return {
      sort: () => ({
        lean: async () => {
          const matching = dbRates
            .filter((r) => r.businessDate <= maxDate)
            .sort((a, b) => b.businessDate.localeCompare(a.businessDate));
          return matching.length ? matching[0] : null;
        },
      }),
    };
  };

  try {
    // Shift ended at 5:30 AM on Oct 23 (before 6:00 AM activation)
    const shiftContext = {
      businessDate: "2026-10-23",
      endedAt: "2026-10-23T05:30:00+05:30",
    };

    const eventInstant = resolveEventInstant(shiftContext);
    const rate = await getEffectiveFuelRate(eventInstant);

    assert.ok(rate);
    assert.equal(rate.businessDate, "2026-10-22");
    assert.equal(rate.petrolRatePaise, 9800, "Shift ending at 5:30 AM must use previous effective rate (9800), not new rate (10800)");
  } finally {
    FuelRate.findOne = originalFindOne;
  }
});

test("FuelRate 6:00 AM IST Rule: 13. Offline Udhari transaction recorded at 05:45 AM synced after 6:00 AM resolves pre-6 AM rate", async () => {
  const dbRates = [
    {
      businessDate: "2026-10-22",
      effectiveAt: new Date("2026-10-22T06:00:00+05:30"),
      petrolRatePaise: 10000,
      dieselRatePaise: 9000,
    },
    {
      businessDate: "2026-10-23",
      effectiveAt: new Date("2026-10-23T06:00:00+05:30"),
      petrolRatePaise: 11000,
      dieselRatePaise: 10000,
    },
  ];

  FuelRate.findOne = (query) => {
    const maxDate = query.businessDate.$lte;
    return {
      sort: () => ({
        lean: async () => {
          const matching = dbRates
            .filter((r) => r.businessDate <= maxDate)
            .sort((a, b) => b.businessDate.localeCompare(a.businessDate));
          return matching.length ? matching[0] : null;
        },
      }),
    };
  };

  try {
    // Udhari credit occurred at 05:45 AM on Oct 23
    const udhariContext = {
      businessDate: "2026-10-23",
      occurredAt: "2026-10-23T05:45:00+05:30",
    };

    const eventInstant = resolveEventInstant(udhariContext);
    const rate = await getEffectiveFuelRate(eventInstant);

    assert.ok(rate);
    assert.equal(rate.businessDate, "2026-10-22");
    assert.equal(rate.petrolRatePaise, 10000, "Udhari at 5:45 AM must use 10000 paise, not 11000 paise");
  } finally {
    FuelRate.findOne = originalFindOne;
  }
});

test("FuelRate 6:00 AM IST Rule: 14. Midnight boundary: at 00:00:01 AM IST on scheduled date D, rate for date D is NOT active (date D-1 rate remains active)", async () => {
  const dbRates = [
    {
      businessDate: "2026-10-22",
      effectiveAt: new Date("2026-10-22T06:00:00+05:30"),
      petrolRatePaise: 9900,
      dieselRatePaise: 8900,
    },
    {
      businessDate: "2026-10-23",
      effectiveAt: new Date("2026-10-23T06:00:00+05:30"),
      petrolRatePaise: 10200,
      dieselRatePaise: 9200,
    },
  ];

  FuelRate.findOne = (query) => {
    const maxDate = query.businessDate.$lte;
    return {
      sort: () => ({
        lean: async () => {
          const matching = dbRates
            .filter((r) => r.businessDate <= maxDate)
            .sort((a, b) => b.businessDate.localeCompare(a.businessDate));
          return matching.length ? matching[0] : null;
        },
      }),
    };
  };

  try {
    // Exactly 1 second past midnight on Oct 23
    const midnightInstant = new Date("2026-10-23T00:00:01+05:30");
    const rate = await getEffectiveFuelRate(midnightInstant);

    assert.ok(rate);
    assert.equal(rate.businessDate, "2026-10-22");
    assert.equal(rate.petrolRatePaise, 9900, "At 00:00:01 AM IST, October 22 rate must remain active; October 23 rate only activates at 06:00:00 IST");
  } finally {
    FuelRate.findOne = originalFindOne;
  }
});
