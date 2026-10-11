// src/config/db.js
import mongoose from 'mongoose';

/**
 * Establishes connection to MongoDB
 */
export const connectDB = async () => {
  try {
    let mongoUri;
    const isTestMode = process.env.USE_TEST_DB === 'true' || process.env.NODE_ENV === 'test';

    if (isTestMode) {
      if (!process.env.MONGODB_URI_TEST) {
        console.error('[Error] Test mode is active (USE_TEST_DB=true or NODE_ENV=test), but MONGODB_URI_TEST is not defined in environment variables. Aborting to protect default/production database.');
        process.exit(1);
      }
      mongoUri = process.env.MONGODB_URI_TEST;
    } else {
      mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
      if (!mongoUri) {
        console.error('[Error] MongoDB connection string missing: Neither MONGO_URI nor MONGODB_URI is defined in your environment.');
        process.exit(1);
      }
    }

    const conn = await mongoose.connect(mongoUri);

    if (isTestMode) {
      console.log(`[Database Isolation] Connected to TEST Database: ${conn.connection.name} on host ${conn.connection.host}`);
      if (!conn.connection.name.toLowerCase().includes('test')) {
        console.error(`[Error] Safety Check Failed: Test mode active, but connected database '${conn.connection.name}' does not contain 'test'. Halting immediately.`);
        process.exit(1);
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`[Diagnostic] MongoDB Host: ${conn.connection.host}`);
      console.log(`[Diagnostic] MongoDB Database Name: ${conn.connection.name}`);
    } else {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    }
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};