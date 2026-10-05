import assert from "node:assert/strict";
import test from "node:test";

import Customer from "../models/Customer.js";
import UdhariTransaction from "../models/UdhariTransaction.js";
import {
  createCustomer,
  getCustomerDetail,
  updateCustomer,
} from "./customer.controller.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "../validations/customer.validation.js";

const customerId = "aaaaaaaaaaaaaaaaaaaaaaaa";

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const makeCustomerDocument = (values) => ({
  ...values,
  save: async function save() {},
  toObject() {
    return { ...this };
  },
});

const withModelMocks = async (mocks, callback) => {
  const originals = Object.fromEntries(
    Object.keys(mocks).map((key) => [
      key,
      key.startsWith("transaction:")
        ? UdhariTransaction[key.slice("transaction:".length)]
        : Customer[key],
    ]),
  );

  for (const [key, value] of Object.entries(mocks)) {
    if (key.startsWith("transaction:")) {
      UdhariTransaction[key.slice("transaction:".length)] = value;
    } else {
      Customer[key] = value;
    }
  }

  try {
    await callback();
  } finally {
    for (const [key, value] of Object.entries(originals)) {
      if (key.startsWith("transaction:")) {
        UdhariTransaction[key.slice("transaction:".length)] = value;
      } else {
        Customer[key] = value;
      }
    }
  }
};

test("customer validation defaults credit limit to zero and accepts paise integers", () => {
  const parsed = createCustomerSchema.parse({
    body: { name: "Customer" },
  });

  assert.equal(parsed.body.creditLimitPaise, 0);
  assert.equal(
    createCustomerSchema.safeParse({
      body: { name: "Customer", creditLimitPaise: 12345 },
    }).success,
    true,
  );
});

test("customer validation rejects a negative credit limit", () => {
  assert.equal(
    createCustomerSchema.safeParse({
      body: { name: "Customer", creditLimitPaise: -1 },
    }).success,
    false,
  );
});

test("customer validation rejects invalid monetary values", () => {
  for (const creditLimitPaise of [1.5, "100", null, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(
      createCustomerSchema.safeParse({
        body: { name: "Customer", creditLimitPaise },
      }).success,
      false,
      `Expected ${String(creditLimitPaise)} to be rejected`,
    );
  }

  assert.equal(updateCustomerSchema.safeParse({ body: { creditLimitPaise: 1.5 } }).success, false);
});

test("create customer persists the supplied credit limit", async () => {
  let created;
  const document = makeCustomerDocument({
    _id: customerId,
    name: "Customer",
    outstandingBalance: 0,
    creditLimitPaise: 12500,
  });

  await withModelMocks({
    create: async (data) => {
      created = data;
      return document;
    },
  }, async () => {
    const response = makeResponse();
    await createCustomer(
      { body: { name: "Customer", creditLimitPaise: 12500 } },
      response,
      assert.fail,
    );

    assert.equal(response.statusCode, 201);
    assert.equal(created.creditLimitPaise, 12500);
    assert.equal(response.body.data.creditLimitPaise, 12500);
  });
});

test("create customer defaults credit limit to zero", async () => {
  let created;

  await withModelMocks({
    create: async (data) => {
      created = data;
      return makeCustomerDocument({ _id: customerId, ...data });
    },
  }, async () => {
    const response = makeResponse();
    await createCustomer({ body: { name: "Customer" } }, response, assert.fail);

    assert.equal(created.creditLimitPaise, 0);
    assert.equal(response.body.data.creditLimitPaise, 0);
  });
});

test("update customer changes credit limit without creating a duplicate or touching transactions", async () => {
  let createCalls = 0;
  const customer = makeCustomerDocument({
    _id: customerId,
    name: "Old name",
    phoneNumber: "1234567890",
    outstandingBalance: 7500,
    creditLimitPaise: 5000,
  });
  const existingTransactions = [
    { _id: "credit-1", amountPaise: 10000, transactionType: "CREDIT" },
    { _id: "settlement-1", amountPaise: 2500, transactionType: "SETTLEMENT" },
  ];
  let transactionFindCalls = 0;

  await withModelMocks({
    create: async () => {
      createCalls += 1;
      throw new Error("Update must not create a customer");
    },
    findById: async () => customer,
    "transaction:find": async () => {
      transactionFindCalls += 1;
      return existingTransactions;
    },
  }, async () => {
    const response = makeResponse();
    await updateCustomer(
      { params: { customerId }, body: { name: "New name", creditLimitPaise: 9000 } },
      response,
      assert.fail,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.data._id, customerId);
    assert.equal(response.body.data.name, "New name");
    assert.equal(response.body.data.creditLimitPaise, 9000);
    assert.equal(customer.outstandingBalance, 7500);
    assert.equal(createCalls, 0);
    assert.equal(transactionFindCalls, 0);
    assert.deepEqual(existingTransactions, [
      { _id: "credit-1", amountPaise: 10000, transactionType: "CREDIT" },
      { _id: "settlement-1", amountPaise: 2500, transactionType: "SETTLEMENT" },
    ]);
  });
});

test("customer detail keeps the existing outstanding and ledger calculations", async () => {
  const customer = {
    _id: customerId,
    name: "Customer",
    outstandingBalance: 7500,
    creditLimitPaise: 9000,
  };
  const transactions = [
    {
      _id: "credit-1",
      amountPaise: 10000,
      transactionType: "CREDIT",
      createdAt: new Date("2026-10-01T00:00:00.000Z"),
    },
    {
      _id: "settlement-1",
      amountPaise: 2500,
      transactionType: "SETTLEMENT",
      createdAt: new Date("2026-10-02T00:00:00.000Z"),
    },
  ];

  await withModelMocks({
    findById: () => ({ lean: async () => customer }),
    "transaction:find": () => ({
      sort() {
        return this;
      },
      populate() {
        return this;
      },
      lean: async () => transactions,
    }),
  }, async () => {
    const response = makeResponse();
    await getCustomerDetail({ params: { customerId } }, response, assert.fail);

    assert.equal(response.body.data.summary.currentOutstandingPaise, 7500);
    assert.equal(response.body.data.summary.totalCreditPaise, 10000);
    assert.equal(response.body.data.summary.totalSettlementsPaise, 2500);
    assert.deepEqual(
      response.body.data.ledger.map((entry) => entry.runningBalance),
      [10000, 7500],
    );
  });
});
