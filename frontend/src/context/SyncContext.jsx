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

  // 3. Process the offline queue
  const pushOfflineShifts = async () => {
    if (!token || !isDbReady) return;

    try {
      const pendingRes = await dbService.executeQuery("SELECT * FROM pending_shifts WHERE sync_status = 'QUEUED'");
      const pendingShifts = pendingRes.values || [];

      if (pendingShifts.length === 0) return;

      console.log(`Attempting to background-sync ${pendingShifts.length} offline shifts...`);

      for (const shift of pendingShifts) {
        try {
          const payload = JSON.parse(shift.payload);
          await api.post('/sync/submit', payload);

          await dbService.executeRun('DELETE FROM pending_shifts WHERE idempotency_key = ?', [shift.idempotency_key]);
          console.log(`Successfully synced offline shift: ${shift.idempotency_key}`);
        } catch (error) {
          if (error.response?.status === 400 && error.response?.data?.message?.includes('already logged')) {
            await dbService.executeRun('DELETE FROM pending_shifts WHERE idempotency_key = ?', [shift.idempotency_key]);
            console.log(`Removed duplicate offline shift: ${shift.idempotency_key}`);
          } else {
            console.error(`Failed to background-sync shift ${shift.idempotency_key}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error processing offline queue:', error);
    }
  };

  return (
    <SyncContext.Provider value={{ isDbReady, syncStatus, performBootstrapSync, pushOfflineShifts }}>
      {children}
    </SyncContext.Provider>
  );
};
