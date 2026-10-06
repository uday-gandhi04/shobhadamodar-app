import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import { authorize, protect } from "./auth.middleware.js";

const originalFindById = User.findById;
const originalSecret = process.env.JWT_SECRET;

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

test("protect accepts active legacy users with versioned tokens", async () => {
  process.env.JWT_SECRET = "middleware-test-secret";
  const user = {
    _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    isActive: true,
    role: "EMPLOYEE",
    tokenVersion: 2,
  };
  User.findById = () => ({ select: async () => user });

  try {
    const token = jwt.sign({ id: user._id, tokenVersion: 2 }, process.env.JWT_SECRET);
    const res = response();
    let continued = false;
    await protect(
      { headers: { authorization: `Bearer ${token}` } },
      res,
      () => { continued = true; },
    );
    assert.equal(continued, true);
  } finally {
    User.findById = originalFindById;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
});

test("protect rejects inactive, banned, stale-version, and legacy unversioned access tokens", async () => {
  process.env.JWT_SECRET = "middleware-test-secret";
  const baseUser = {
    _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    role: "EMPLOYEE",
    tokenVersion: 2,
  };
  const cases = [
    { user: { ...baseUser, accountStatus: "INACTIVE", isActive: true }, payload: { tokenVersion: 2 } },
    { user: { ...baseUser, accountStatus: "BANNED", isActive: true }, payload: { tokenVersion: 2 } },
    { user: { ...baseUser, isActive: false }, payload: { tokenVersion: 2 } },
    { user: { ...baseUser, isActive: true }, payload: { tokenVersion: 1 } },
    { user: { ...baseUser, isActive: true }, payload: {} },
  ];

  try {
    for (const { user, payload } of cases) {
      User.findById = () => ({ select: async () => user });
      const token = jwt.sign({ id: baseUser._id, ...payload }, process.env.JWT_SECRET);
      const res = response();
      let continued = false;
      await protect(
        { headers: { authorization: `Bearer ${token}` } },
        res,
        () => { continued = true; },
      );
      assert.equal(continued, false);
      assert.equal(res.statusCode, 401);
    }
  } finally {
    User.findById = originalFindById;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
});

test("authorize rejects non-manager request users", () => {
  const middleware = authorize("MANAGER");
  const res = response();
  let continued = false;
  middleware({ user: { role: "EMPLOYEE" } }, res, () => { continued = true; });
  assert.equal(continued, false);
  assert.equal(res.statusCode, 403);
});
