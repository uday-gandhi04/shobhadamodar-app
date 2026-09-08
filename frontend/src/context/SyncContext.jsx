// src/context/SyncContext.jsx
import { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import api from '../services/api';
import { dbService } from '../database/sqlite';

export const SyncContext = createContext();

export const SyncProvider = ({ children }) => {
  const { token } = useContext(AuthContext);
  const [isDbReady, setIsDbReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState('PENDING'); // PENDING, SYNCING, SYNCED, ERROR

  // 1. Initialize SQLite when the app boots
  useEffect(() => {
    const initDB = async () => {
      try {
        await dbService.initialize();
        setIsDbReady(true);
      } catch (error) {
        console.error("Failed to initialize SQLite:", error);
      }
    };
    initDB();
  }, []);

  // 2. The function to pull data from backend and save it locally
  const performBootstrapSync = async (authToken = token) => {
    if (!authToken || !isDbReady) {
      console.warn("Cannot sync: Missing token or DB not ready.");
      return;
    }
    
    setSyncStatus('SYNCING');
    try {
      // Fetch from our Express /bootstrap endpoint
      const response = await api.get('/sync/bootstrap');
      const data = response.data;

      if (data.success) {
        // The web SQLite adapter persists after each statement and owns its
        // transaction boundary. Manual BEGIN/COMMIT would nest inside it.
        // Child rows must be removed before their parent rows. Upserts also
        // tolerate duplicate records returned by a backend response.
        await dbService.executeRun('DELETE FROM nozzles');
        await dbService.executeRun('DELETE FROM mpds');
        await dbService.executeRun('DELETE FROM fuel_rates');
        await dbService.executeRun('DELETE FROM customers');

        await dbService.executeRun(
          'INSERT OR REPLACE INTO fuel_rates (business_date, petrol_paise, diesel_paise) VALUES (?, ?, ?)',
          [data.businessDate, data.activeRates.petrolPaise, data.activeRates.dieselPaise]
        );

        for (const mpd of data.mpds) {
          await dbService.executeRun(
            'INSERT OR REPLACE INTO mpds (mpd_id, mpd_number) VALUES (?, ?)',
            [mpd._id, mpd.mpdNumber]
          );
          for (const nozzle of mpd.nozzles) {
            await dbService.executeRun(
              'INSERT OR REPLACE INTO nozzles (nozzle_id, mpd_id, fuel_type, current_reading) VALUES (?, ?, ?, ?)',
              [nozzle.nozzleId, mpd._id, nozzle.fuelType, nozzle.currentCumulativeReading]
            );
          }
        }

        for (const customer of data.customers) {
          await dbService.executeRun(
            'INSERT OR REPLACE INTO customers (customer_id, name, vehicle_number, outstanding_balance_paise) VALUES (?, ?, ?, ?)',
            [customer._id, customer.name, customer.vehicleNumber || null, customer.outstandingBalance]
          );
        }

        setSyncStatus('SYNCED');
        console.log("🚀 Offline Database Hydrated Successfully with Latest API Data!");
      }
    } catch (error) {
      console.error("Bootstrap Sync Failed:", error);
      setSyncStatus('ERROR');
    }
  };

  // Employee shift lifecycle now uses /api/shifts/* directly.
  // The old /api/sync/submit flow is intentionally not used by the employee UI.
  const pushOfflineShifts = async () => {};

  return (
    <SyncContext.Provider value={{ isDbReady, syncStatus, performBootstrapSync, pushOfflineShifts }}>
      {children}
    </SyncContext.Provider>
  );
};
