// src/database/schema.js

/**
 * Raw SQL schema for the local offline database.
 * Note: All financial values (prices, totals) MUST be stored as INTEGER (paise).
 * Meter readings can be stored as REAL (decimals).
 */
export const databaseSchema = `
  CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fuel_rates (
    business_date TEXT PRIMARY KEY,
    petrol_paise INTEGER NOT NULL,
    diesel_paise INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mpds (
    mpd_id TEXT PRIMARY KEY,
    mpd_number TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS nozzles (
    nozzle_id TEXT PRIMARY KEY,
    mpd_id TEXT NOT NULL,
    fuel_type TEXT NOT NULL,
    current_reading REAL NOT NULL,
    FOREIGN KEY(mpd_id) REFERENCES mpds(mpd_id)
  );

  CREATE TABLE IF NOT EXISTS customers (
    customer_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    vehicle_number TEXT,
    outstanding_balance_paise INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pending_shifts (
    idempotency_key TEXT PRIMARY KEY,
    business_date TEXT NOT NULL,
    payload TEXT NOT NULL,
    sync_status TEXT DEFAULT 'QUEUED' 
  );
`;