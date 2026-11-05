// backend/src/config/db.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Safely masks MongoDB URI for logging (replaces username:password with username:***)
 *
 * @param {string} uri
 * @returns {string}
 */
export function maskMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

/**
 * Centralized, authoritative database configuration resolver.
 *
 * Selection Rules:
 * 1. If USE_TEST_DB is missing, default to TEST.
 * 2. If USE_TEST_DB is any value other than explicit, case-insensitive string 'false', default to TEST.
 * 3. Only an explicit, case-insensitive string value of 'false' selects PRODUCTION.
 * 4. Never silently fall back from missing TEST URI to PRODUCTION URI.
 * 5. Never silently fall back from missing PRODUCTION URI to TEST URI.
 *
 * URI Resolution:
 * - TEST: MONGODB_URI_TEST
 * - PRODUCTION: MONGODB_URI_PROD, with MONGO_URI as compatibility alias.
 *   If both are set but differ, throws an error.
 *
 * @param {object} [env=process.env]
 * @returns {{ environment: 'TEST'|'PRODUCTION', uri: string, isProduction: boolean, isTest: boolean }}
 */
export function resolveDatabaseConfig(env = process.env) {
  const rawFlag = env.USE_TEST_DB;

  // Strict check: only explicit case-insensitive 'false' selects PRODUCTION
  const isExplicitProduction =
    typeof rawFlag === 'string' && rawFlag.trim().toLowerCase() === 'false';

  const environment = isExplicitProduction ? 'PRODUCTION' : 'TEST';

  if (environment === 'TEST') {
    const testUri = env.MONGODB_URI_TEST?.trim();
    if (!testUri) {
      throw new Error(
        '[Database Configuration Error] Environment is TEST (USE_TEST_DB is not explicitly "false"), but MONGODB_URI_TEST is not defined in environment variables. Refusing to fall back to production.'
      );
    }
    return {
      environment: 'TEST',
      uri: testUri,
      isProduction: false,
      isTest: true,
    };
  }

  // PRODUCTION MODE
  const prodUri = env.MONGODB_URI_PROD?.trim();
  const legacyUri = env.MONGO_URI?.trim();

  // If both production aliases exist, they must match identically
  if (prodUri && legacyUri && prodUri !== legacyUri) {
    throw new Error(
      '[Database Configuration Error] Mismatched production MongoDB URIs: Both MONGODB_URI_PROD and MONGO_URI are configured with conflicting connection strings. Aborting startup to prevent connecting to the wrong database.'
    );
  }

  const resolvedProdUri = prodUri || legacyUri;
  if (!resolvedProdUri) {
    throw new Error(
      '[Database Configuration Error] Environment is PRODUCTION (USE_TEST_DB="false"), but neither MONGODB_URI_PROD nor MONGO_URI is defined. Refusing to fall back to test database.'
    );
  }

  return {
    environment: 'PRODUCTION',
    uri: resolvedProdUri,
    isProduction: true,
    isTest: false,
  };
}

/**
 * Connects to MongoDB using the central configuration.
 *
 * @param {object} [options]
 * @param {string} [options.target] - Optional explicit target ('TEST' or 'PRODUCTION')
 * @param {object} [options.env] - Optional custom env map
 * @param {boolean} [options.exitOnError=true] - Whether to call process.exit(1) on connection failure
 * @returns {Promise<typeof mongoose>}
 */
export const connectDB = async (options = {}) => {
  const exitOnError = options.exitOnError !== false;
  try {
    let effectiveEnv = options.env || process.env;
    if (options.target) {
      const targetUpper = options.target.toUpperCase();
      effectiveEnv = {
        ...effectiveEnv,
        USE_TEST_DB: targetUpper === 'PRODUCTION' ? 'false' : 'true',
      };
    }

    const config = resolveDatabaseConfig(effectiveEnv);
    const conn = await mongoose.connect(config.uri);

    if (config.isProduction) {
      console.warn('*******************************************************************************');
      console.warn(' [DATABASE WARNING] CONNECTED TO PRODUCTION DATABASE');
      console.warn(` Selected Environment: PRODUCTION`);
      console.warn(` Host:                 ${conn.connection.host}`);
      console.warn(` Database Name:        ${conn.connection.name}`);
      console.warn(' Operations here affect live production data!');
      console.warn('*******************************************************************************');
    } else {
      console.log(
        `[Database] Connected to TEST environment: '${conn.connection.name}' on host '${conn.connection.host}'`
      );
    }

    return conn;
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    if (exitOnError) {
      process.exit(1);
    }
    throw error;
  }
};
