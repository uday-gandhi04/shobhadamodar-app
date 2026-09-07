// src/controllers/auth.controller.js
import User from "../models/User.js";
import jwt from "jsonwebtoken";

/**
 * Helper function to generate JWT Access Token
 * @param {string} id - The MongoDB User ID
 * @returns {string} Signed JWT Token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });
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

    if (!user || !user.isActive) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Invalid credentials or inactive account",
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
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
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

/**
 * One-time seeder to create the first Manager account.
 * (In production, you would disable or protect this route after the first run)
 * @route POST /api/auth/seed
 */
export const seedManager = async (req, res, next) => {
  try {
    const existingManager = await User.findOne({ role: "MANAGER" });
    if (existingManager) {
      return res
        .status(400)
        .json({
          success: false,
          message: "A manager already exists in the system.",
        });
    }

    const manager = await User.create({
      name: "Station Admin",
      employeeId: "ADMIN01",
      password: "admin_password_123", // Will be automatically hashed by Mongoose pre-save
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
