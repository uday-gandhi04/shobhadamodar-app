// src/controllers/auth.controller.js
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { timingSafeEqual } from "node:crypto";
import { effectiveAccountStatus } from "../utils/accountStatus.js";

/**
 * Helper function to generate JWT Access Token
 * @param {string} id - The MongoDB User ID
 * @returns {string} Signed JWT Token
 */
const generateToken = (id, tokenVersion) => {
  return jwt.sign({ id, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });
};

const generateRefreshToken = (id, tokenVersion) => {
  return jwt.sign(
    { id, type: "refresh", tokenVersion },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" },
  );
};

/**
 * Authenticates user and returns JWT token
 * @route POST /api/auth/login
 */
export const loginUser = async (req, res, next) => {
  try {
    // Validation middleware already ensured these exist
    const { employeeId, password } = req.body;

    // Find user (converting employeeId to uppercase for safety)
    const user = await User.findOne({ employeeId: employeeId.toUpperCase() });

    if (!user || effectiveAccountStatus(user) !== "ACTIVE") {
      return res
        .status(401)
        .json({
          success: false,
          message: "Invalid credentials",
        });
    }

    // Verify password using the method we built in the User model
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Generate Token
    const token = generateToken(user._id, user.tokenVersion);
    const refreshToken = generateRefreshToken(user._id, user.tokenVersion);

    res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        employeeId: user.employeeId,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const decoded = jwt.verify(
      req.body.refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    );

    if (decoded.type !== "refresh") {
      return res.status(401).json({ success: false, message: "Invalid refresh token." });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (
      !user ||
      effectiveAccountStatus(user) !== "ACTIVE" ||
      user.tokenVersion !== decoded.tokenVersion
    ) {
      return res.status(401).json({ success: false, message: "Refresh session expired." });
    }

    return res.status(200).json({
      success: true,
      token: generateToken(user._id, user.tokenVersion),
      user: {
        _id: user._id,
        name: user.name,
        employeeId: user.employeeId,
        role: user.role,
      },
    });
  } catch {
    return res.status(401).json({ success: false, message: "Refresh session expired." });
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });
    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * Creates the first Manager account when the configured provisioning secret matches.
 * @route POST /api/auth/seed
 */
export const seedManager = async (req, res, next) => {
  try {
    const configuredSecret = process.env.AUTH_SEED_SECRET;
    if (!configuredSecret) {
      return res.status(500).json({
        success: false,
        message: "Manager provisioning is not configured.",
      });
    }

    const providedSecret = req.get("x-auth-seed-secret") || "";
    const expectedBytes = Buffer.from(configuredSecret);
    const providedBytes = Buffer.from(providedSecret);
    if (
      expectedBytes.length !== providedBytes.length ||
      !timingSafeEqual(expectedBytes, providedBytes)
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden.",
      });
    }

    const existingManager = await User.findOne({ role: "MANAGER" });
    if (existingManager) {
      return res
        .status(409)
        .json({
          success: false,
          message: "A manager already exists in the system.",
        });
    }

    const manager = await User.create({
      name: req.body.name.trim(),
      employeeId: req.body.employeeId.trim().toUpperCase(),
      password: req.body.password,
      role: "MANAGER",
    });

    res.status(201).json({
      success: true,
      message: "Initial manager account created successfully.",
      data: { employeeId: manager.employeeId, role: manager.role },
    });
  } catch (error) {
    next(error);
  }
};
