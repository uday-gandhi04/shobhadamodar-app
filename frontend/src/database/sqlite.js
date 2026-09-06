// src/database/sqlite.js
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { databaseSchema } from './schema';

const sqlite = new SQLiteConnection(CapacitorSQLite);
const DB_NAME = 'shobhadamodar_offline_db';

class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // In a web browser (during development), we use a local WebSQL polyfill.
      // On an actual Android device, this hooks into native SQLite.
      const platform = Capacitor.getPlatform();
      
      if (platform === 'web') {
        // The predev and prebuild scripts keep this component's WASM asset
        // (/assets/sql-wasm.wasm) compatible with its SQL.js wrapper.
        if (!document.querySelector('jeep-sqlite')) {
          document.body.appendChild(document.createElement('jeep-sqlite'));
        }
        await customElements.whenDefined('jeep-sqlite');
        await sqlite.initWebStore();
      }

      // Create and open the database connection
      this.db = await sqlite.createConnection(
        DB_NAME,
        false,
        'no-encryption',
        1,
        false
      );

      await this.db.open();

      // Execute our schema to ensure tables exist
      await this.db.execute(databaseSchema);
      
      if (platform === 'web') {
        await sqlite.saveToStore(DB_NAME);
      }

      this.isInitialized = true;
      console.log('✅ Local SQLite Database Initialized');
    } catch (error) {
      console.error('❌ SQLite Initialization Error:', error);
      throw error;
    }
  }

  async executeQuery(query, values = []) {
    if (!this.isInitialized) await this.initialize();
    return await this.db.query(query, values);
  }

  async executeRun(statement, values = []) {
    if (!this.isInitialized) await this.initialize();
    
    const result = await this.db.run(statement, values);
    
    if (Capacitor.getPlatform() === 'web') {
      await sqlite.saveToStore(DB_NAME);
    }
    
    return result;
  }
}

export const dbService = new DatabaseService();
