// src/database/sqlite.js
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { databaseSchema } from './schema.js';

export const DB_NAME = 'shobhadamodar_offline_db';
const defaultSqlite = new SQLiteConnection(CapacitorSQLite);

export class DatabaseService {
  constructor(sqliteInstance = defaultSqlite, dbName = DB_NAME, getPlatform = () => Capacitor.getPlatform()) {
    this.sqlite = sqliteInstance;
    this.dbName = dbName;
    this.getPlatform = getPlatform;
    this.db = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  /**
   * Safe singleton initialization.
   * - Concurrent callers share the single in-flight promise.
   * - Repeated callers immediately reuse the existing connection.
   * - Failed initializations clear the in-flight promise so retries can run cleanly.
   */
  async initialize() {
    if (this.isInitialized && this.db) {
      return this.db;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize().finally(() => {
      this.initPromise = null;
    });

    return this.initPromise;
  }

  async _doInitialize() {
    const platform = this.getPlatform();

    try {
      if (platform === 'web') {
        // Web environment requires jeep-sqlite custom element and WebStore initialization
        if (typeof document !== 'undefined') {
          if (!document.querySelector('jeep-sqlite')) {
            document.body.appendChild(document.createElement('jeep-sqlite'));
          }
          if (typeof customElements !== 'undefined' && customElements.whenDefined) {
            await customElements.whenDefined('jeep-sqlite');
          }
        }
        if (typeof this.sqlite?.initWebStore === 'function') {
          await this.sqlite.initWebStore();
        }
      } else {
        // Native platforms (Android/iOS):
        // Synchronize connections consistency to clean up orphaned connections
        // from previous WebView reloads / OTA restarts while the native Activity was kept alive.
        try {
          if (typeof this.sqlite?.checkConnectionsConsistency === 'function') {
            await this.sqlite.checkConnectionsConsistency();
          }
        } catch (consistErr) {
          console.warn('[SQLite] checkConnectionsConsistency warning:', consistErr?.message || consistErr);
        }
      }

      let dbConnection = null;

      // 1. Check if the connection is already registered in SQLiteConnection dictionary
      let connectionExists = false;
      try {
        if (typeof this.sqlite?.isConnection === 'function') {
          const isConnResult = await this.sqlite.isConnection(this.dbName, false);
          connectionExists = Boolean(isConnResult && isConnResult.result);
        }
      } catch (checkErr) {
        console.warn('[SQLite] isConnection check warning:', checkErr?.message || checkErr);
      }

      if (connectionExists && typeof this.sqlite?.retrieveConnection === 'function') {
        try {
          dbConnection = await this.sqlite.retrieveConnection(this.dbName, false);
          console.log(`[SQLite] Reusing existing connection for "${this.dbName}"`);
        } catch (retrieveErr) {
          console.warn('[SQLite] retrieveConnection failed despite isConnection=true:', retrieveErr?.message || retrieveErr);
          connectionExists = false;
        }
      }

      // 2. If not already existing, create connection with resilient fallback handling
      if (!dbConnection) {
        try {
          dbConnection = await this.sqlite.createConnection(
            this.dbName,
            false,
            'no-encryption',
            1,
            false
          );
        } catch (createErr) {
          const errMsg = createErr?.message || String(createErr);
          // Native Android plugin throws: "CreateConnection: Connection <name> already exists"
          if (errMsg.includes('already exists')) {
            console.warn(`[SQLite] Connection "${this.dbName}" already exists natively. Retrieving existing connection...`);
            try {
              if (typeof this.sqlite?.retrieveConnection === 'function') {
                dbConnection = await this.sqlite.retrieveConnection(this.dbName, false);
              }
            } catch (fallbackRetrieveErr) {
              console.warn('[SQLite] Native connection exists but was unretrievable in JS. Closing orphaned connection and recreating:', fallbackRetrieveErr?.message || fallbackRetrieveErr);
              try {
                if (typeof this.sqlite?.closeConnection === 'function') {
                  await this.sqlite.closeConnection(this.dbName, false);
                }
              } catch {
                // Ignore close error on orphaned connection
              }
              dbConnection = await this.sqlite.createConnection(
                this.dbName,
                false,
                'no-encryption',
                1,
                false
              );
            }
          } else {
            throw createErr;
          }
        }
      }

      // 3. Ensure the database connection is open
      try {
        const isDBOpen = typeof dbConnection.isDBOpen === 'function'
          ? await dbConnection.isDBOpen()
          : { result: false };

        if (!isDBOpen?.result) {
          await dbConnection.open();
        }
      } catch (openErr) {
        const openMsg = openErr?.message || String(openErr);
        if (!openMsg.toLowerCase().includes('already open')) {
          throw openErr;
        }
      }

      // 4. Execute idempotent schema (CREATE TABLE IF NOT EXISTS)
      // This strictly preserves all existing stored rows and tables without dropping data.
      await dbConnection.execute(databaseSchema);

      if (platform === 'web' && typeof this.sqlite?.saveToStore === 'function') {
        await this.sqlite.saveToStore(this.dbName);
      }

      this.db = dbConnection;
      this.isInitialized = true;
      console.log('✅ Local SQLite Database Initialized');
      return this.db;
    } catch (error) {
      this.isInitialized = false;
      this.db = null;
      console.error('❌ SQLite Initialization Error:', error);
      throw error;
    }
  }

  async executeQuery(query, values = []) {
    await this.initialize();
    return await this.db.query(query, values);
  }

  async executeRun(statement, values = []) {
    await this.initialize();
    const result = await this.db.run(statement, values);

    if (this.getPlatform() === 'web' && typeof this.sqlite?.saveToStore === 'function') {
      await this.sqlite.saveToStore(this.dbName);
    }

    return result;
  }
}

export const dbService = new DatabaseService();
