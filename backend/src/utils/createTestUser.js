import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createTestUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected');

    // -------------------------
    // 1. Create Manager
    // -------------------------
    let manager = await User.findOne({ employeeId: 'UDAY01' });

    if (!manager) {
      manager = await User.create({
        name: 'Uday Gandhi',
        employeeId: 'UDAY01',
        password: 'Uday@123',
        role: 'MANAGER',
        isActive: true,
      });

      console.log('Manager created:', manager.employeeId);
    } else {
      console.log('Manager already exists:', manager.employeeId);
    }

    // -------------------------
    // 2. Create Employee
    // -------------------------
    let employee = await User.findOne({ employeeId: 'GIRI001' });

    if (!employee) {
      employee = await User.create({
        name: 'Giri',
        employeeId: 'GIRI001',
        password: 'Giri@123',
        role: 'EMPLOYEE',
        isActive: true,
        createdBy: manager._id,
      });

      console.log('Employee created:', employee.employeeId);
    } else {
      console.log('Employee already exists:', employee.employeeId);
    }

    console.log('\nTest accounts ready:');
    console.log('Manager  → UDAY01 / Uday@123');
    console.log('Employee → GIRI001 / Giri@123');

    process.exit(0);
  } catch (error) {
    console.error('Error creating test users:', error);
    process.exit(1);
  }
};

createTestUsers();