// src/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * @typedef {Object} User
 * @property {string} name - Full name of the employee/manager
 * @property {string} employeeId - Unique login ID (e.g., EMP001)
 * @property {string} password - Hashed password
 * @property {string} role - 'EMPLOYEE' or 'MANAGER'
 * @property {string|null} assignedMpdId - ID of the MPD assigned to the employee
 * @property {boolean} isActive - Status for soft-deleting/disabling accounts
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true, // Ensures EMP001 and emp001 are treated the same
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    role: {
      type: String,
      enum: ['EMPLOYEE', 'MANAGER'],
      default: 'EMPLOYEE',
    },
    assignedMpdId: {
      type: String,
      default: null, // Managers might not have a specific MPD assigned
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/**
 * Pre-save middleware to hash the password before saving to MongoDB
 */
userSchema.pre('save', async function () {
  // Only run this function if password was modified (not on other update operations)
  if (!this.isModified('password')) return;

  // No try/catch needed; Mongoose catches errors automatically in async hooks
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Instance method to compare incoming password with hashed password
 * @param {string} candidatePassword - The plain text password to check
 * @returns {Promise<boolean>} - True if passwords match
 */
userSchema.methods.matchPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;