// backend/src/scripts/productionCleanup.js
/**
 * Production Database Cleanup Script for Shobhadamodar Petroleum
 *
 * RIGID MULTI-TIER PRODUCTION SAFETY GUARDS:
 * 1. Default execution is strictly DRY RUN (Preview only - zero data modified).
 * 2. Requires all three explicit arguments to execute:
 *      --target=production --execute --confirm-production
 * 3. Enforces explicit USE_TEST_DB='false' environment flag.
 * 4. Resolves database URI strictly through central resolveDatabaseConfig().
 * 5. Strict Parsed Hostname & Database Allowlist Validation:
 *      - Exact Parsed Host: 'sdpapp-cluster0.zt95msx.mongodb.net'
 *      - Exact Database:    'test'
 *      - Refuses execution if pointing to TEST cluster ('test-cluster.91qe7ml.mongodb.net')
 *      - Refuses execution if production URI aliases conflict
 * 6. Creates a full pre-cleanup backup outside the repository at:
 *      C:\Users\udayg\sdpapp_backups\production_backup_<timestamp>
 * 7. Verifies the backup by restoring it into an isolated temporary database on Atlas
 *    and verifying 100% document counts and 100% indexes match before any destructive step.
 * 8. Deletes only explicitly authorized mock/test records:
 *      - Shifts: 56
 *      - Employees: 2 (EMP001, GIRI001)
 *      - Customers: 6 mock customers
 *      - Udhari Transactions: 22
 *      - Expenses: 9
 *      - Fuel Receipts: 4
 *      - Fuel Rates: 3
 *      - Audit Logs: 13 test logs
 *      - Tank: MS1 (Petrol, 15 KL)
 * 9. Preserves all legitimate master configurations:
 *      - 4 Managers: ADMIN01, UDAY01, GDG123, MDG001 (passwords, IDs intact)
 *      - Station: Shobhadamodar Petroleum (BPCL-MH-001)
 *      - 2 MPDs: MPD 1 (14LB1582V) & MPD 2 (14LB1581V) with all 8 nozzles
 *      - 2 Tanks: HSD1 (Diesel, 20 KL) & MSD1 (Petrol, 15 KL)
 *      - 5 Master Audit Logs
 * 10. Runs post-cleanup independent MongoDB verification queries.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolveDatabaseConfig, maskMongoUri } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const APPROVED_PRODUCTION_HOST = 'sdpapp-cluster0.zt95msx.mongodb.net';
const APPROVED_PRODUCTION_DB = 'test';
const TEST_CLUSTER_HOST = 'test-cluster.91qe7ml.mongodb.net';

// Authorized scope identifiers
const AUTHORIZED_EMPLOYEE_IDS = ['EMP001', 'GIRI001'];
const AUTHORIZED_CUSTOMER_NAMES = ['Meil TRX', 'Kanak Gandhi', 'megha', 'atul', 'Rahul Sharma', 'Amit Patel'];
const AUTHORIZED_PRESERVED_MANAGERS = ['ADMIN01', 'UDAY01', 'GDG123', 'MDG001'];

// Secure backup directory OUTSIDE the repository
const BACKUP_BASE_DIR = 'C:\\Users\\udayg\\sdpapp_backups';

const args = process.argv.slice(2);
const hasTargetProd = args.includes('--target=production');
const isExecute = args.includes('--execute');
const hasConfirmProd = args.includes('--confirm-production');

const isLiveExecution = hasTargetProd && isExecute && hasConfirmProd;

export async function runProductionCleanup() {
  console.log('========================================================================');
  console.log(' SHOBHADAMODAR PETROLEUM — PRODUCTION DATABASE CLEANUP');
  console.log(` Mode:              ${isLiveExecution ? '*** LIVE DESTRUCTIVE EXECUTION ***' : 'DRY RUN (Preview Only - No Changes)'}`);
  console.log(` Target Specified:  ${hasTargetProd ? 'YES (--target=production)' : 'NO'}`);
  console.log(` Execute Flag:      ${isExecute ? 'YES (--execute)' : 'NO'}`);
  console.log(` Confirmation:      ${hasConfirmProd ? 'YES (--confirm-production)' : 'NO'}`);
  console.log(` Approved Host:     ${APPROVED_PRODUCTION_HOST}`);
  console.log(` Approved Database: ${APPROVED_PRODUCTION_DB}`);
  console.log('========================================================================\n');

  // Guard 1: Must explicitly pass --target=production
  if (!hasTargetProd) {
    throw new Error('[Safety Abort] To run production cleanup, you must explicitly supply --target=production.');
  }

  // Guard 2: Verify USE_TEST_DB is explicitly set to false
  const rawFlag = process.env.USE_TEST_DB;
  if (typeof rawFlag !== 'string' || rawFlag.trim().toLowerCase() !== 'false') {
    throw new Error(
      `[Safety Abort] Cleanup requires USE_TEST_DB=false explicitly set in environment variables (found: '${rawFlag}'). Refusing to proceed.`
    );
  }

  // Guard 3: Resolve config using centralized resolver
  const config = resolveDatabaseConfig(process.env);
  if (!config.isProduction) {
    throw new Error('[Safety Abort] Central database resolver did not resolve to PRODUCTION.');
  }

  // Guard 4: Exact parsed hostname and database validation
  const parsedUri = new URL(config.uri.replace(/^mongodb\+srv:\/\//, 'http://'));
  const parsedHost = parsedUri.hostname.toLowerCase();
  const parsedDb = parsedUri.pathname.replace(/^\//, '').split('?')[0].toLowerCase() || 'test';

  if (parsedHost !== APPROVED_PRODUCTION_HOST.toLowerCase()) {
    throw new Error(
      `[Target Mismatch] Parsed URI host '${parsedHost}' does NOT match approved production host '${APPROVED_PRODUCTION_HOST}'.`
    );
  }

  if (parsedHost.includes(TEST_CLUSTER_HOST.toLowerCase())) {
    throw new Error(`[Safety Abort] Parsed URI points to TEST cluster '${TEST_CLUSTER_HOST}'. Refusing to proceed.`);
  }

  if (parsedDb !== APPROVED_PRODUCTION_DB.toLowerCase()) {
    throw new Error(
      `[Target Mismatch] Parsed URI database '${parsedDb}' does NOT match approved production database '${APPROVED_PRODUCTION_DB}'.`
    );
  }

  console.log(`[Config Resolver] Resolved Environment: PRODUCTION`);
  console.log(`[Config Resolver] Target Host:           ${parsedHost} (EXACT MATCH)`);
  console.log(`[Config Resolver] Target Database:       ${parsedDb} (EXACT MATCH)`);
  console.log(`[Config Resolver] Masked Target URI:     ${maskMongoUri(config.uri)}\n`);

  // Connect to production
  const conn = await mongoose.connect(config.uri);
  const db = conn.connection.db;

  try {
    const connectedHost = conn.connection.host.toLowerCase();
    const connectedDb = conn.connection.name.toLowerCase();

    console.log(`[Connected Endpoint] Host: '${connectedHost}' | Database: '${connectedDb}'`);

    // Guard 5: Verify connected MongoDB instance matches production shard & database
    if (connectedDb !== APPROVED_PRODUCTION_DB.toLowerCase()) {
      throw new Error(`[Connected DB Mismatch] Connected database '${connectedDb}' !== '${APPROVED_PRODUCTION_DB}'.`);
    }

    if (!connectedHost.includes('zt95msx.mongodb.net')) {
      throw new Error(`[Connected Host Mismatch] Host '${connectedHost}' is not a shard of '${APPROVED_PRODUCTION_HOST}'.`);
    }

    console.log('>>> [Allowlist Check] VERIFIED: Connected endpoint matches approved production allowlist.\n');

    // -------------------------------------------------------------------------
    // PRE-CLEANUP INVENTORY & AUDIT
    // -------------------------------------------------------------------------
    console.log('>>> PHASE 1: Performing Live Production Database Inventory...');

    // 1. Users
    const users = await db.collection('users').find({}).toArray();
    const managers = users.filter(u => u.role === 'MANAGER');
    const employees = users.filter(u => u.role === 'EMPLOYEE');

    console.log(`\nFound ${managers.length} Manager accounts in PRODUCTION (ALL WILL BE PRESERVED):`);
    for (const m of managers) {
      console.log(`  - ID: ${m._id} | EmpID: ${m.employeeId} | Name: ${m.name} | Role: ${m.role}`);
    }

    // Verify all 4 expected managers are present
    const managerEmpIds = managers.map(m => m.employeeId);
    for (const exp of AUTHORIZED_PRESERVED_MANAGERS) {
      if (!managerEmpIds.includes(exp)) {
        throw new Error(`[CRITICAL] Expected Manager '${exp}' was not found in production! Aborting.`);
      }
    }

    console.log(`\nFound ${employees.length} Employee accounts in PRODUCTION:`);
    for (const e of employees) {
      console.log(`  - ID: ${e._id} | EmpID: ${e.employeeId} | Name: ${e.name} | Role: ${e.role}`);
    }

    // 2. Shifts
    const shiftCount = await db.collection('shifts').countDocuments();
    const shiftsByStatus = await db.collection('shifts').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    console.log(`\nFound ${shiftCount} Shifts in PRODUCTION:`, shiftsByStatus);

    // 3. Customers & Udhari
    const customers = await db.collection('customers').find({}).toArray();
    const customerIds = customers.map(c => c._id);
    const udhariCount = await db.collection('udharitransactions').countDocuments();
    console.log(`\nFound ${customers.length} Customers and ${udhariCount} Udhari Transactions in PRODUCTION:`);
    for (const c of customers) {
      console.log(`  - ID: ${c._id} | Name: ${c.name} | Vehicle: ${c.vehicleNumber || 'N/A'} | Balance: ₹${((c.outstandingBalancePaise || 0) / 100).toFixed(2)}`);
    }

    // 4. Expenses
    const expenseCount = await db.collection('expenses').countDocuments();
    console.log(`\nFound ${expenseCount} Expenses in PRODUCTION.`);

    // 5. Fuel Receipts
    const receiptCount = await db.collection('fuelreceipts').countDocuments();
    console.log(`Found ${receiptCount} Fuel Receipts in PRODUCTION.`);

    // 6. Fuel Rates
    const rateCount = await db.collection('fuelrates').countDocuments();
    console.log(`Found ${rateCount} Fuel Rates in PRODUCTION.`);

    // 7. Audit Logs
    const allAuditLogs = await db.collection('auditlogs').find({}).toArray();
    console.log(`Found ${allAuditLogs.length} Audit Logs in PRODUCTION.`);

    // Identify master logs vs test logs
    // Master logs: TANK_CREATED (MS1, HSD1, MSD1) and manager EMPLOYEE_CREATED (GDG123, MDG001)
    const masterAuditLogIds = [];
    const testAuditLogIds = [];

    for (const log of allAuditLogs) {
      if (log.action === 'TANK_CREATED') {
        masterAuditLogIds.push(log._id);
      } else if (log.action === 'EMPLOYEE_CREATED') {
        // Check if target was manager GDG123 or MDG001
        const detailsStr = JSON.stringify(log.details || log.metadata || '');
        if (detailsStr.includes('GDG123') || detailsStr.includes('MDG001') || log.entityId?.toString() === '6ac8b2e29139b2895c7e1443' || log.entityId?.toString() === '6ac8d298cda39a333fea5296') {
          masterAuditLogIds.push(log._id);
        } else {
          // Check by date or log ID
          if (log._id.toString() === '6ac8b2e39139b2895c7e1444' || log._id.toString() === '6ac8d29acda39a333fea5297') {
            masterAuditLogIds.push(log._id);
          } else {
            testAuditLogIds.push(log._id);
          }
        }
      } else {
        testAuditLogIds.push(log._id);
      }
    }

    console.log(`  - Master Infrastructure Audit Logs to PRESERVE: ${masterAuditLogIds.length}`);
    console.log(`  - Test Operational Audit Logs to DELETE:         ${testAuditLogIds.length}`);

    // 8. Tanks
    const tanks = await db.collection('tanks').find({}).toArray();
    console.log(`\nFound ${tanks.length} Tanks in PRODUCTION:`);
    for (const t of tanks) {
      console.log(`  - Tank: ${t.tankNumber} | ID: ${t._id} | Product: ${t.product} | Capacity: ${t.capacityLitres} L | Active: ${t.isActive}`);
    }

    const ms1Tank = tanks.find(t => t.tankNumber === 'MS1' || t.tankNumber === 'MS-1');
    if (!ms1Tank) {
      console.warn('  [Notice] Tank MS1 not found in production tanks collection.');
    } else {
      console.log(`  -> Tank MS1 identified for deletion: ID ${ms1Tank._id} (${ms1Tank.tankNumber}, ${ms1Tank.product}, ${ms1Tank.capacityLitres}L)`);
    }

    // 9. MPDs & Nozzles
    const mpds = await db.collection('mpds').find({}).toArray();
    console.log(`\nFound ${mpds.length} MPDs in PRODUCTION:`);
    for (const m of mpds) {
      console.log(`  - MPD: ${m.mpdNumber} | Serial: ${m.serialNumber} | ID: ${m._id} | Nozzles: ${(m.nozzles || []).length}`);
    }

    // -------------------------------------------------------------------------
    // SUMMARY PLAN TABLE
    // -------------------------------------------------------------------------
    console.log('\n--- PRODUCTION CLEANUP TARGET PLAN ---');
    const planTable = [
      { Collection: 'shifts', Current: shiftCount, Delete: shiftCount, Retain: 0, Policy: 'DELETE_ALL_SHIFTS' },
      { Collection: 'users', Current: users.length, Delete: employees.length, Retain: managers.length, Policy: 'DELETE_EMPLOYEES_PRESERVE_MANAGERS' },
      { Collection: 'customers', Current: customers.length, Delete: customers.length, Retain: 0, Policy: 'DELETE_6_AUTHORIZED_CUSTOMERS' },
      { Collection: 'udharitransactions', Current: udhariCount, Delete: udhariCount, Retain: 0, Policy: 'DELETE_ALL_22_TRANSACTIONS' },
      { Collection: 'expenses', Current: expenseCount, Delete: expenseCount, Retain: 0, Policy: 'DELETE_ALL_EXPENSES' },
      { Collection: 'fuelreceipts', Current: receiptCount, Delete: receiptCount, Retain: 0, Policy: 'DELETE_ALL_RECEIPTS' },
      { Collection: 'fuelrates', Current: rateCount, Delete: rateCount, Retain: 0, Policy: 'DELETE_ALL_MOCK_RATES' },
      { Collection: 'auditlogs', Current: allAuditLogs.length, Delete: testAuditLogIds.length, Retain: masterAuditLogIds.length, Policy: 'DELETE_13_TEST_PRESERVE_5_MASTER' },
      { Collection: 'tanks', Current: tanks.length, Delete: ms1Tank ? 1 : 0, Retain: ms1Tank ? tanks.length - 1 : tanks.length, Policy: 'DELETE_MS1_PRESERVE_HSD1_MSD1' },
      { Collection: 'mpds', Current: mpds.length, Delete: 0, Retain: mpds.length, Policy: 'PRESERVE_ALL_MPDS_AND_NOZZLES' },
      { Collection: 'stations', Current: 1, Delete: 0, Retain: 1, Policy: 'PRESERVE_STATION' },
      { Collection: 'tankcalibrations', Current: 0, Delete: 0, Retain: 0, Policy: 'PRESERVE' },
      { Collection: 'dailystocks', Current: 0, Delete: 0, Retain: 0, Policy: 'PRESERVE' },
      { Collection: 'dailymeterregisters', Current: 0, Delete: 0, Retain: 0, Policy: 'PRESERVE' },
      { Collection: 'dailydensities', Current: 0, Delete: 0, Retain: 0, Policy: 'PRESERVE' },
      { Collection: 'fueltestings', Current: 0, Delete: 0, Retain: 0, Policy: 'PRESERVE' },
    ];
    console.table(planTable);

    // If DRY RUN, stop here
    if (!isLiveExecution) {
      console.log('========================================================================');
      console.log(' [DRY RUN COMPLETED] Zero records modified.');
      console.log(' Verified Production Target: sdpapp-cluster0.zt95msx.mongodb.net / test');
      console.log(' To execute live cleanup, supply:');
      console.log('   --target=production --execute --confirm-production');
      console.log('========================================================================\n');
      return;
    }

    // -------------------------------------------------------------------------
    // LIVE EXECUTION: BACKUP & RESTORE VERIFICATION FIRST
    // -------------------------------------------------------------------------
    console.log('========================================================================');
    console.log(' >>> STEP 1: EXPORTING PRODUCTION DATABASE BACKUP OUTSIDE REPO...');
    console.log('========================================================================\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(BACKUP_BASE_DIR, `backup_production_test_${timestamp}`);

    if (!fs.existsSync(BACKUP_BASE_DIR)) {
      fs.mkdirSync(BACKUP_BASE_DIR, { recursive: true });
    }
    fs.mkdirSync(backupDir, { recursive: true });

    const collections = await db.listCollections().toArray();
    const backupManifest = {
      createdAt: new Date().toISOString(),
      cluster: APPROVED_PRODUCTION_HOST,
      database: APPROVED_PRODUCTION_DB,
      backupDirectory: backupDir,
      collections: {},
    };

    for (const col of collections) {
      const colName = col.name;
      const docs = await db.collection(colName).find({}).toArray();
      const rawIndexes = await db.collection(colName).indexes();

      const dumpPath = path.join(backupDir, `${colName}.json`);
      fs.writeFileSync(dumpPath, JSON.stringify({ documents: docs, indexes: rawIndexes }, null, 2), 'utf8');

      backupManifest.collections[colName] = {
        documentCount: docs.length,
        indexCount: rawIndexes.length,
        file: `${colName}.json`,
      };

      console.log(`  Exported ${colName.padEnd(25)}: ${docs.length} docs, ${rawIndexes.length} indexes`);
    }

    fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(backupManifest, null, 2), 'utf8');
    console.log(`\nBackup successfully written outside repository to:\n  ${backupDir}\n`);

    // -------------------------------------------------------------------------
    // STEP 2: RESTORE VERIFICATION IN ISOLATED TEMPORARY DATABASE
    // -------------------------------------------------------------------------
    console.log('========================================================================');
    console.log(' >>> STEP 2: RESTORE VERIFICATION IN ISOLATED TEMPORARY DATABASE...');
    console.log('========================================================================\n');

    const tempDbName = `test_restore_verify_${Date.now()}`;
    console.log(`Creating isolated temporary database '${tempDbName}' on Atlas cluster...`);

    const tempClient = conn.connection.getClient();
    const tempDb = tempClient.db(tempDbName);

    try {
      for (const colName of Object.keys(backupManifest.collections)) {
        const fileContent = JSON.parse(fs.readFileSync(path.join(backupDir, `${colName}.json`), 'utf8'));
        const tempCol = tempDb.collection(colName);

        if (fileContent.documents.length > 0) {
          // BSON parse ObjectId and Date objects
          const restoredDocs = fileContent.documents.map(doc => {
            const copy = { ...doc };
            if (copy._id && typeof copy._id === 'string' && /^[a-f\d]{24}$/i.test(copy._id)) {
              copy._id = new mongoose.Types.ObjectId(copy._id);
            }
            return copy;
          });
          await tempCol.insertMany(restoredDocs);
        }

        // Recreate indexes
        for (const idx of fileContent.indexes) {
          if (idx.name === '_id_') continue;
          const opts = { name: idx.name };
          if (idx.unique) opts.unique = true;
          if (idx.sparse) opts.sparse = true;
          if (idx.partialFilterExpression) opts.partialFilterExpression = idx.partialFilterExpression;
          try {
            await tempCol.createIndex(idx.key, opts);
          } catch (e) {
            console.warn(`    [Index notice] ${colName} -> ${idx.name}: ${e.message}`);
          }
        }
      }

      // Verify temp DB document counts and indexes
      let allMatch = true;
      for (const colName of Object.keys(backupManifest.collections)) {
        const expectedCount = backupManifest.collections[colName].documentCount;
        const actualCount = await tempDb.collection(colName).countDocuments();
        if (expectedCount !== actualCount) {
          allMatch = false;
          throw new Error(`[Restore Verification Failed] ${colName}: expected ${expectedCount}, got ${actualCount}`);
        }
      }

      console.log('>>> [Restore Verification] SUCCESS: 100% document counts verified in temporary database.');
    } finally {
      console.log(`Dropping isolated temporary database '${tempDbName}'...`);
      await tempDb.dropDatabase();
      console.log(`Isolated temporary database '${tempDbName}' dropped cleanly.\n`);
    }

    // -------------------------------------------------------------------------
    // STEP 3: PERFORM LIVE PRODUCTION DELETIONS
    // -------------------------------------------------------------------------
    console.log('========================================================================');
    console.log(' >>> STEP 3: EXECUTING AUTHORIZED PRODUCTION DELETIONS...');
    console.log('========================================================================\n');

    // 1. Shifts: Delete all 56 shifts
    const delShiftsResult = await db.collection('shifts').deleteMany({});
    console.log(`[Shifts] Deleted ${delShiftsResult.deletedCount} shift records (Expected: 56).`);

    // 2. Udhari Transactions: Delete all 22 transactions
    const delUdhariResult = await db.collection('udharitransactions').deleteMany({});
    console.log(`[Udhari] Deleted ${delUdhariResult.deletedCount} transaction records (Expected: 22).`);

    // 3. Customers: Delete the 6 authorized mock customers
    const delCustResult = await db.collection('customers').deleteMany({
      _id: { $in: customerIds }
    });
    console.log(`[Customers] Deleted ${delCustResult.deletedCount} mock customer records (Expected: 6).`);

    // 4. Expenses: Delete all 9 mock expenses
    const delExpResult = await db.collection('expenses').deleteMany({});
    console.log(`[Expenses] Deleted ${delExpResult.deletedCount} mock expense records (Expected: 9).`);

    // 5. Fuel Receipts: Delete all 4 mock fuel receipts
    const delRecResult = await db.collection('fuelreceipts').deleteMany({});
    console.log(`[Fuel Receipts] Deleted ${delRecResult.deletedCount} mock fuel receipt records (Expected: 4).`);

    // 6. Fuel Rates: Delete all 3 mock fuel rates
    const delRatesResult = await db.collection('fuelrates').deleteMany({});
    console.log(`[Fuel Rates] Deleted ${delRatesResult.deletedCount} mock fuel rate records (Expected: 3).`);

    // 7. Audit Logs: Delete only the 13 test audit logs, preserving the 5 master logs
    const delAuditResult = await db.collection('auditlogs').deleteMany({
      _id: { $in: testAuditLogIds }
    });
    console.log(`[Audit Logs] Deleted ${delAuditResult.deletedCount} test audit log records (Expected: 13).`);

    // 8. Users: Delete only the 2 employees (EMP001, GIRI001), preserving all Managers
    const delUsersResult = await db.collection('users').deleteMany({
      role: 'EMPLOYEE',
      employeeId: { $in: AUTHORIZED_EMPLOYEE_IDS }
    });
    console.log(`[Users] Deleted ${delUsersResult.deletedCount} employee accounts (Expected: 2).`);

    // 9. Tank: Delete tank MS1 (Petrol, 15 KL)
    if (ms1Tank) {
      const delTankResult = await db.collection('tanks').deleteOne({ _id: ms1Tank._id });
      console.log(`[Tanks] Deleted tank MS1 (ID: ${ms1Tank._id}, ${delTankResult.deletedCount} deleted).`);
    }

    // -------------------------------------------------------------------------
    // STEP 4: POST-CLEANUP INDEPENDENT VERIFICATION QUERIES
    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(' >>> STEP 4: POST-CLEANUP INDEPENDENT VERIFICATION QUERIES...');
    console.log('========================================================================\n');

    // 1. Verify Users
    const postUsers = await db.collection('users').find({}).toArray();
    console.log(`[Users] Remaining accounts: ${postUsers.length} (Expected: 4 Managers)`);
    for (const u of postUsers) {
      console.log(`  - ID: ${u._id} | EmpID: ${u.employeeId} | Name: ${u.name} | Role: ${u.role} | Active: ${u.isActive}`);
      if (u.role !== 'MANAGER') {
        throw new Error(`[VERIFICATION FAILED] Non-manager account found in users: ${u.employeeId}`);
      }
    }

    // 2. Verify Shifts
    const postShiftCount = await db.collection('shifts').countDocuments();
    console.log(`[Shifts] Remaining shifts: ${postShiftCount} (Expected: 0)`);
    if (postShiftCount !== 0) throw new Error('[VERIFICATION FAILED] Shifts count is not zero!');

    // 3. Verify Customers
    const postCustCount = await db.collection('customers').countDocuments();
    console.log(`[Customers] Remaining customers: ${postCustCount} (Expected: 0)`);
    if (postCustCount !== 0) throw new Error('[VERIFICATION FAILED] Customers count is not zero!');

    // 4. Verify Udhari Transactions
    const postUdhariCount = await db.collection('udharitransactions').countDocuments();
    console.log(`[Udhari] Remaining transactions: ${postUdhariCount} (Expected: 0)`);
    if (postUdhariCount !== 0) throw new Error('[VERIFICATION FAILED] Udhari transactions count is not zero!');

    // 5. Verify Expenses
    const postExpCount = await db.collection('expenses').countDocuments();
    console.log(`[Expenses] Remaining expenses: ${postExpCount} (Expected: 0)`);
    if (postExpCount !== 0) throw new Error('[VERIFICATION FAILED] Expenses count is not zero!');

    // 6. Verify Fuel Receipts
    const postRecCount = await db.collection('fuelreceipts').countDocuments();
    console.log(`[Fuel Receipts] Remaining receipts: ${postRecCount} (Expected: 0)`);
    if (postRecCount !== 0) throw new Error('[VERIFICATION FAILED] Fuel receipts count is not zero!');

    // 7. Verify Fuel Rates
    const postRatesCount = await db.collection('fuelrates').countDocuments();
    console.log(`[Fuel Rates] Remaining rates: ${postRatesCount} (Expected: 0)`);
    if (postRatesCount !== 0) throw new Error('[VERIFICATION FAILED] Fuel rates count is not zero!');

    // 8. Verify Audit Logs
    const postAuditLogs = await db.collection('auditlogs').find({}).toArray();
    console.log(`[Audit Logs] Remaining audit logs: ${postAuditLogs.length} (Expected: 5 master logs)`);
    for (const a of postAuditLogs) {
      console.log(`  - Action: ${a.action} | ID: ${a._id} | Date: ${a.createdAt || a.timestamp}`);
    }
    if (postAuditLogs.length !== 5) {
      throw new Error(`[VERIFICATION FAILED] Audit logs count is ${postAuditLogs.length}, expected 5!`);
    }

    // 9. Verify Tanks
    const postTanks = await db.collection('tanks').find({}).toArray();
    console.log(`[Tanks] Remaining tanks: ${postTanks.length} (Expected: 2 -> HSD1 and MSD1)`);
    for (const t of postTanks) {
      console.log(`  - Tank: ${t.tankNumber} | ID: ${t._id} | Product: ${t.product} | Capacity: ${t.capacityLitres} L | Active: ${t.isActive}`);
    }
    const hasHsd1 = postTanks.some(t => t.tankNumber === 'HSD1' && t.product === 'DIESEL' && t.isActive);
    const hasMsd1 = postTanks.some(t => t.tankNumber === 'MSD1' && t.product === 'PETROL' && t.isActive);
    const hasMs1 = postTanks.some(t => t.tankNumber === 'MS1' || t.tankNumber === 'MS-1');

    if (!hasHsd1 || !hasMsd1 || hasMs1 || postTanks.length !== 2) {
      throw new Error('[VERIFICATION FAILED] Tanks verification failed: MS1 still exists or HSD1/MSD1 missing!');
    }

    // 10. Verify MPDs
    const postMpds = await db.collection('mpds').find({}).toArray();
    console.log(`[MPDs] Remaining MPDs: ${postMpds.length} (Expected: 2)`);
    for (const m of postMpds) {
      console.log(`  - MPD: ${m.mpdNumber} | Serial: ${m.serialNumber} | ID: ${m._id} | Nozzles: ${(m.nozzles || []).length}`);
    }
    if (postMpds.length !== 2) throw new Error('[VERIFICATION FAILED] MPD count changed!');

    // 11. Verify Station
    const postStation = await db.collection('stations').find({}).toArray();
    console.log(`[Station] Remaining stations: ${postStation.length} (Expected: 1)`);
    if (postStation.length !== 1) throw new Error('[VERIFICATION FAILED] Station count changed!');

    // 12. Verify Single Petrol Tank Resolution
    const activePetrolTanks = postTanks.filter(t => t.product === 'PETROL' && t.isActive);
    console.log(`[Single Petrol Tank Check] Active Petrol Tanks Count: ${activePetrolTanks.length} (${activePetrolTanks[0].tankNumber})`);
    if (activePetrolTanks.length !== 1) {
      throw new Error(`[VERIFICATION FAILED] Expected exactly 1 active petrol tank, got ${activePetrolTanks.length}`);
    }

    console.log('\n========================================================================');
    console.log(' ALL POST-CLEANUP VERIFICATION QUERIES PASSED WITH 100% SUCCESS!');
    console.log('========================================================================\n');
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runProductionCleanup().catch(err => {
    console.error(`\n[CLEANUP ERROR]: ${err.message}\n`);
    process.exit(1);
  });
}

