// backend/src/scripts/auditProductionDb.js
/**
 * Read-Only Production Database Audit Script for Shobhadamodar Petroleum
 *
 * SAFETY GUARDS:
 * - Read-only inspection.
 * - Strict exact-host and exact-database validation.
 * - Zero write operations.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveDatabaseConfig, maskMongoUri } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const APPROVED_HOST = 'sdpapp-cluster0.zt95msx.mongodb.net';
const APPROVED_DB = 'test';
const TEST_CLUSTER_HOST = 'test-cluster.91qe7ml.mongodb.net';

export async function auditProductionDatabase() {
  console.log('========================================================================');
  console.log(' SHOBHADAMODAR PETROLEUM — READ-ONLY PRODUCTION AUDIT');
  console.log('========================================================================\n');

  // Verify explicit USE_TEST_DB=false
  const rawFlag = process.env.USE_TEST_DB;
  if (typeof rawFlag !== 'string' || rawFlag.trim().toLowerCase() !== 'false') {
    throw new Error(
      `[Safety Abort] Audit target is PRODUCTION, but USE_TEST_DB is not explicitly 'false' (found: '${rawFlag}'). Aborting to protect test environment.`
    );
  }

  // Resolve config via central resolver
  const config = resolveDatabaseConfig(process.env);
  if (!config.isProduction) {
    throw new Error('[Safety Abort] Central resolver did not resolve to PRODUCTION.');
  }

  // Exact URI Hostname Validation
  const parsedUri = new URL(config.uri.replace(/^mongodb\+srv:\/\//, 'http://'));
  const parsedHost = parsedUri.hostname.toLowerCase();
  const parsedDb = parsedUri.pathname.replace(/^\//, '').split('?')[0].toLowerCase() || 'test';

  if (parsedHost !== APPROVED_HOST.toLowerCase()) {
    throw new Error(
      `[Target Mismatch] Parsed URI host '${parsedHost}' does not exactly match approved production cluster '${APPROVED_HOST}'.`
    );
  }

  if (parsedHost.includes(TEST_CLUSTER_HOST.toLowerCase())) {
    throw new Error(`[Safety Abort] URI host points to TEST cluster '${TEST_CLUSTER_HOST}'. Refusing to proceed.`);
  }

  if (parsedDb !== APPROVED_DB.toLowerCase()) {
    throw new Error(
      `[Target Mismatch] Parsed database '${parsedDb}' does not match approved production database '${APPROVED_DB}'.`
    );
  }

  console.log(`[Config Check] Target Host:     ${parsedHost} (MATCHES ALLOWLIST)`);
  console.log(`[Config Check] Target Database: ${parsedDb} (MATCHES ALLOWLIST)`);
  console.log(`[Config Check] Connection URI:  ${maskMongoUri(config.uri)}\n`);

  const conn = await mongoose.connect(config.uri);
  const db = conn.connection.db;

  try {
    const connectedHost = conn.connection.host.toLowerCase();
    const connectedDb = conn.connection.name.toLowerCase();

    console.log(`[Connected Endpoint] Host: '${connectedHost}' | Database: '${connectedDb}'`);

    if (connectedDb !== APPROVED_DB.toLowerCase()) {
      throw new Error(`Connected database '${connectedDb}' does not match '${APPROVED_DB}'.`);
    }

    if (!connectedHost.includes('zt95msx.mongodb.net')) {
      throw new Error(`Connected host '${connectedHost}' is not a shard of approved production cluster.`);
    }

    console.log('\n--- COLLECTION INVENTORY ---');
    const collections = await db.listCollections().toArray();
    const inventory = [];
    for (const col of collections.sort((a, b) => a.name.localeCompare(b.name))) {
      const count = await db.collection(col.name).countDocuments();
      inventory.push({ collection: col.name, count });
    }
    console.table(inventory);

    // Users
    console.log('\n--- USERS BREAKDOWN ---');
    const users = await db.collection('users').find({}).project({ password: 0 }).toArray();
    for (const u of users) {
      console.log(`  - [${u.role}] ID: ${u._id} | EmpID: ${u.employeeId.padEnd(10)} | Name: ${u.name.padEnd(20)} | Active: ${u.isActive}`);
    }

    // Tanks
    console.log('\n--- TANKS BREAKDOWN ---');
    const tanks = await db.collection('tanks').find({}).toArray();
    for (const t of tanks) {
      console.log(`  - Tank: ${t.tankNumber.padEnd(6)} | ID: ${t._id} | Product: ${t.product.padEnd(8)} | Capacity: ${t.capacityLitres} L | Active: ${t.isActive}`);
    }

    // MPDs
    console.log('\n--- MPDS BREAKDOWN ---');
    const mpds = await db.collection('mpds').find({}).toArray();
    for (const m of mpds) {
      console.log(`  - MPD: ${m.mpdNumber} | Serial: ${m.serialNumber} | ID: ${m._id} | Nozzles: ${(m.nozzles || []).length}`);
    }

    // Shifts
    console.log('\n--- SHIFTS STATUS BREAKDOWN ---');
    const shiftStats = await db.collection('shifts').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    console.table(shiftStats);

    // Customers
    console.log('\n--- CUSTOMERS BREAKDOWN ---');
    const customers = await db.collection('customers').find({}).toArray();
    for (const c of customers) {
      console.log(`  - ID: ${c._id} | Name: ${c.name.padEnd(18)} | Vehicle: ${(c.vehicleNumber || 'N/A').padEnd(12)} | Balance: ₹${((c.outstandingBalancePaise || 0) / 100).toFixed(2)}`);
    }

    console.log('\n========================================================================');
    console.log(' AUDIT COMPLETED SUCCESSFULLY (READ-ONLY)');
    console.log('========================================================================\n');
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  auditProductionDatabase().catch(err => {
    console.error(`\n[AUDIT ERROR]: ${err.message}\n`);
    process.exit(1);
  });
}

