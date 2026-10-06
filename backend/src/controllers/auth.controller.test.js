import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import {
  loginUser,
  refreshAccessToken,
  seedManager,
} from "./auth.controller.js";
import { seedManagerSchema } from "../validations/auth.validation.js";

const original = {
  findOne: User.findOne,
  create: User.create,
};

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const withUserMocks = async (mocks, callback) => {
  for (const [key, value] of Object.entries(mocks)) User[key] = value;
  try {
    await callback();
  } finally {
    User.findOne = original.findOne;
    User.create = original.create;
  }
};

const withEnvironment = async (values, callback) => {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, values);
  try {
    await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

test("login issues a token versioned access token and a versioned refresh token for an active user", async () => {
  await withEnvironment({ JWT_SECRET: "test-access-secret", JWT_REFRESH_SECRET: "test-refresh-secret" }, async () => {
    const user = {
      _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
      name: "Active",
      employeeId: "EMP001",
      role: "EMPLOYEE",
      isActive: true,
      tokenVersion: 4,
      matchPassword: async () => true,
    };
    await withUserMocks({ findOne: async () => user }, async () => {
      const res = response();
      await loginUser({ body: { employeeId: "emp001", password: "new-pass" } }, res, assert.fail);
      assert.equal(res.statusCode, 200);
      assert.equal(jwt.verify(res.body.token, process.env.JWT_SECRET).tokenVersion, 4);
      const refresh = jwt.verify(res.body.refreshToken, process.env.JWT_REFRESH_SECRET);
      assert.equal(refresh.tokenVersion, 4);
      assert.equal(res.body.user.password, undefined);
    });
  });
});

test("login rejects inactive and banned accounts with a generic failure", async () => {
  await withEnvironment({ JWT_SECRET: "test-access-secret" }, async () => {
    for (const account of [
      { accountStatus: "INACTIVE", isActive: true },
      { accountStatus: "BANNED", isActive: true },
      { isActive: false },
    ]) {
      await withUserMocks({
        findOne: async () => ({
          ...account,
          matchPassword: async () => true,
        }),
      }, async () => {
        const res = response();
        await loginUser({ body: { employeeId: "EMP001", password: "secret1" } }, res, assert.fail);
        assert.equal(res.statusCode, 401);
        assert.equal(res.body.message, "Invalid credentials");
      });
    }
  });
});

test("refresh rejects inactive and banned users and issues access token for legacy active users", async () => {
  await withEnvironment({ JWT_SECRET: "test-access-secret", JWT_REFRESH_SECRET: "test-refresh-secret" }, async () => {
    for (const account of [
      { accountStatus: "INACTIVE", isActive: true },
      { accountStatus: "BANNED", isActive: true },
      { isActive: false },
    ]) {
      const refreshToken = jwt.sign(
        { id: "aaaaaaaaaaaaaaaaaaaaaaaa", type: "refresh", tokenVersion: 0 },
        process.env.JWT_REFRESH_SECRET,
      );
      await withUserMocks({
        findOne: original.findOne,
      }, async () => {
        const savedFindById = User.findById;
        User.findById = () => ({ select: async () => ({ ...account, tokenVersion: 0 }) });
        try {
          const res = response();
          await refreshAccessToken({ body: { refreshToken } }, res);
          assert.equal(res.statusCode, 401);
        } finally {
          User.findById = savedFindById;
        }
      });

    }

    const refreshToken = jwt.sign(
      { id: "aaaaaaaaaaaaaaaaaaaaaaaa", type: "refresh", tokenVersion: 0 },
      process.env.JWT_REFRESH_SECRET,
    );
    const savedFindById = User.findById;
    User.findById = () => ({
      select: async () => ({
        _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
        name: "Legacy active",
        employeeId: "EMP001",
        role: "EMPLOYEE",
        isActive: true,
        tokenVersion: 0,
      }),
    });
    try {
      const res = response();
      await refreshAccessToken({ body: { refreshToken } }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(jwt.verify(res.body.token, process.env.JWT_SECRET).tokenVersion, 0);
    } finally {
      User.findById = savedFindById;
    }
  });
});

test("refresh rejects a pre-reset refresh token after tokenVersion increments", async () => {
  await withEnvironment({ JWT_SECRET: "test-access-secret", JWT_REFRESH_SECRET: "test-refresh-secret" }, async () => {
    const refreshToken = jwt.sign(
      { id: "aaaaaaaaaaaaaaaaaaaaaaaa", type: "refresh", tokenVersion: 3 },
      process.env.JWT_REFRESH_SECRET,
    );
    const savedFindById = User.findById;
    User.findById = () => ({
      select: async () => ({
        _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
        isActive: true,
        tokenVersion: 4,
      }),
    });
    try {
      const res = response();
      await refreshAccessToken({ body: { refreshToken } }, res);
      assert.equal(res.statusCode, 401);
    } finally {
      User.findById = savedFindById;
    }
  });
});

test("manager seed requires a configured matching secret and creates a manager only once", async () => {
  await withEnvironment({ AUTH_SEED_SECRET: "my-seed-secret" }, async () => {
    let managerExists = false;
    let createCalls = 0;
    let savedManager;
    await withUserMocks({
      findOne: async () => managerExists ? savedManager : null,
      create: async (values) => {
        createCalls += 1;
        managerExists = true;
        savedManager = { ...values, employeeId: values.employeeId.toUpperCase() };
        return savedManager;
      },
    }, async () => {
      const body = { name: "First Manager", employeeId: "new-admin", password: "secret123" };
      assert.equal(seedManagerSchema.safeParse({ body }).success, true);

      const missing = response();
      await seedManager({ body, get: () => undefined }, missing, assert.fail);
      assert.equal(missing.statusCode, 403);

      const incorrect = response();
      await seedManager({ body, get: () => "wrong-secret" }, incorrect, assert.fail);
      assert.equal(incorrect.statusCode, 403);

      const created = response();
      await seedManager({ body, get: () => "my-seed-secret" }, created, assert.fail);
      assert.equal(created.statusCode, 201);
      assert.equal(savedManager.name, "First Manager");
      assert.equal(savedManager.employeeId, "NEW-ADMIN");
      assert.equal(savedManager.password, "secret123");
      assert.equal(JSON.stringify(created.body).includes("secret123"), false);
      assert.equal(JSON.stringify(created.body).includes("my-seed-secret"), false);

      const second = response();
      await seedManager({ body, get: () => "my-seed-secret" }, second, assert.fail);
      assert.equal(second.statusCode, 409);
      assert.equal(createCalls, 1);
    });
  });
});

test("manager seed reports missing server configuration and rejects short passwords", async () => {
  await withEnvironment({ AUTH_SEED_SECRET: "" }, async () => {
    const res = response();
    await seedManager(
      { body: { name: "Admin", employeeId: "ADMIN", password: "secret1" }, get: () => "" },
      res,
      assert.fail,
    );
    assert.equal(res.statusCode, 500);
  });

  assert.equal(
    seedManagerSchema.safeParse({
      body: { name: "Admin", employeeId: "ADMIN", password: "short" },
    }).success,
    false,
  );
});

test("manager seed persists a bcrypt hash and does not return the credential", async () => {
  await withEnvironment({
    AUTH_SEED_SECRET: "my-seed-secret",
    JWT_SECRET: "seed-test-access-secret",
  }, async () => {
    const originalInsertOne = User.collection.insertOne;
    let insertedDocument;
    User.findOne = async () => null;
    User.collection.insertOne = async (document) => {
      insertedDocument = { ...document };
      return { acknowledged: true, insertedId: document._id };
    };
    try {
      const res = response();
      await seedManager(
        {
          body: { name: "Station Admin", employeeId: "admin-01", password: "manager-pass" },
          get: () => "my-seed-secret",
        },
        res,
        assert.fail,
      );
      assert.equal(res.statusCode, 201);
      assert.notEqual(insertedDocument.password, "manager-pass");
      assert.equal(await bcrypt.compare("manager-pass", insertedDocument.password), true);
      assert.equal(JSON.stringify(res.body).includes("manager-pass"), false);
    } finally {
      User.collection.insertOne = originalInsertOne;
      User.findOne = original.findOne;
      User.create = original.create;
    }
  });
});
