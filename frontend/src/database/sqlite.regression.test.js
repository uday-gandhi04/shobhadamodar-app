// src/database/sqlite.regression.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseService, DB_NAME } from './sqlite.js';

// Helper to create a controllable mock SQLiteConnection and SQLiteDBConnection
function createMockSqlite(options = {}) {
  let createConnectionCalls = 0;
  let retrieveConnectionCalls = 0;
  let closeConnectionCalls = 0;
  let isConnectionCalls = 0;
  let checkConsistencyCalls = 0;
  let executeCalls = [];
  let queryCalls = [];
  let runCalls = [];

  const mockDb = {
    isOpen: options.initiallyOpen ?? false,
    open: async () => {
      mockDb.isOpen = true;
    },
    isDBOpen: async () => {
      return { result: mockDb.isOpen };
    },
    execute: async (sql) => {
      executeCalls.push(sql);
      return { changes: { changes: 0 } };
    },
    query: async (sql, values) => {
      queryCalls.push({ sql, values });
      return { values: [{ id: 1, name: 'test' }] };
    },
    run: async (sql, values) => {
      runCalls.push({ sql, values });
      return { changes: { changes: 1 } };
    },
  };

  const mockSqlite = {
    isConnectionResult: options.isConnectionResult ?? false,
    throwOnCreate: options.throwOnCreate ?? null,
    retrieveFailsOnce: options.retrieveFailsOnce ?? false,

    isConnection: async () => {
      isConnectionCalls++;
      return { result: mockSqlite.isConnectionResult };
    },
    retrieveConnection: async (dbName) => {
      retrieveConnectionCalls++;
      if (mockSqlite.retrieveFailsOnce) {
        mockSqlite.retrieveFailsOnce = false;
        throw new Error(`Connection ${dbName} does not exist in memory`);
      }
      return mockDb;
    },
    createConnection: async () => {
      createConnectionCalls++;
      if (mockSqlite.throwOnCreate) {
        const err = mockSqlite.throwOnCreate;
        if (!options.persistThrowOnCreate) {
          mockSqlite.throwOnCreate = null;
        }
        throw err;
      }
      mockSqlite.isConnectionResult = true;
      return mockDb;
    },
    closeConnection: async () => {
      closeConnectionCalls++;
      mockSqlite.isConnectionResult = false;
    },
    checkConnectionsConsistency: async () => {
      checkConsistencyCalls++;
      return { result: true };
    },
    initWebStore: async () => {},
    saveToStore: async () => {},

    getStats: () => ({
      createConnectionCalls,
      retrieveConnectionCalls,
      closeConnectionCalls,
      isConnectionCalls,
      checkConsistencyCalls,
      executeCalls,
      queryCalls,
      runCalls,
    }),
  };

  return { mockSqlite, mockDb };
}

test('SQLite Singleton: repeated sequential initialize() calls reuse the existing connection', async () => {
  const { mockSqlite, mockDb } = createMockSqlite();
  const dbService = new DatabaseService(mockSqlite, DB_NAME, () => 'android');

  const conn1 = await dbService.initialize();
  const conn2 = await dbService.initialize();
  const conn3 = await dbService.initialize();

  assert.equal(conn1, mockDb);
  assert.equal(conn2, conn1);
  assert.equal(conn3, conn1);

  const stats = mockSqlite.getStats();
  // Connection should only be created once
  assert.equal(stats.createConnectionCalls, 1);
  // Schema executed only once
  assert.equal(stats.executeCalls.length, 1);
  // Connection was opened
  assert.equal(mockDb.isOpen, true);
});

test('SQLite Singleton: concurrent initialize() calls share a single promise and invoke creation once', async () => {
  const { mockSqlite, mockDb } = createMockSqlite();
  const dbService = new DatabaseService(mockSqlite, DB_NAME, () => 'android');

  // Trigger 5 concurrent initialization calls simultaneously
  const promises = [
    dbService.initialize(),
    dbService.initialize(),
    dbService.initialize(),
    dbService.initialize(),
    dbService.initialize(),
  ];

  const results = await Promise.all(promises);

  // All 5 callers receive the exact same connection instance
  for (const conn of results) {
    assert.equal(conn, mockDb);
  }

  const stats = mockSqlite.getStats();
  assert.equal(stats.createConnectionCalls, 1);
  assert.equal(stats.executeCalls.length, 1);
});

test('SQLite Reuse: retrieves and reuses connection when isConnection indicates it already exists', async () => {
  const { mockSqlite, mockDb } = createMockSqlite({ isConnectionResult: true });
  const dbService = new DatabaseService(mockSqlite, DB_NAME, () => 'android');

  const conn = await dbService.initialize();

  assert.equal(conn, mockDb);
  const stats = mockSqlite.getStats();
  assert.equal(stats.createConnectionCalls, 0, 'Must not call createConnection when connection already exists');
  assert.equal(stats.retrieveConnectionCalls, 1, 'Must call retrieveConnection to reuse existing connection');
  assert.equal(stats.executeCalls.length, 1, 'Executes schema once');
});

test('SQLite Resilience: handles native "Connection already exists" exception by retrieving connection', async () => {
  const { mockSqlite, mockDb } = createMockSqlite({
    isConnectionResult: false,
    throwOnCreate: new Error(`CreateConnection: Connection ${DB_NAME} already exists`),
  });
  const dbService = new DatabaseService(mockSqlite, DB_NAME, () => 'android');

  // initialize should not throw; it should catch the native error and retrieve the existing connection
  const conn = await dbService.initialize();

  assert.equal(conn, mockDb);
  const stats = mockSqlite.getStats();
  assert.equal(stats.createConnectionCalls, 1);
  assert.equal(stats.retrieveConnectionCalls, 1);
  assert.equal(stats.executeCalls.length, 1);
});

test('SQLite Resilience: when native connection is orphaned and unretrievable, closes and recreates cleanly', async () => {
  const { mockSqlite, mockDb } = createMockSqlite({
    isConnectionResult: false,
    throwOnCreate: new Error(`CreateConnection: Connection ${DB_NAME} already exists`),
    retrieveFailsOnce: true,
  });
  const dbService = new DatabaseService(mockSqlite, DB_NAME, () => 'android');

  const conn = await dbService.initialize();

  assert.equal(conn, mockDb);
  const stats = mockSqlite.getStats();
  assert.equal(stats.closeConnectionCalls, 1, 'Closed orphaned native connection');
  assert.equal(stats.createConnectionCalls, 2, 'Initial create failed, retry create succeeded');
});

test('SQLite Error Recovery: failed initialization can be retried without leaving the singleton permanently stuck', async () => {
  let attempt = 0;
  const { mockSqlite, mockDb } = createMockSqlite();
  
  // Custom mock where attempt 1 throws a transient error
  const failingSqlite = {
    ...mockSqlite,
    createConnection: async () => {
      attempt++;
      if (attempt === 1) {
        throw new Error('Transient I/O failure');
      }
      return mockDb;
    },
  };

  const dbService = new DatabaseService(failingSqlite, DB_NAME, () => 'android');

  // First attempt fails
  await assert.rejects(
    async () => {
      await dbService.initialize();
    },
    /Transient I\/O failure/
  );

  assert.equal(dbService.isInitialized, false);
  assert.equal(dbService.initPromise, null, 'initPromise must be cleared after failure');

  // Second attempt succeeds and does not remain stuck
  const conn = await dbService.initialize();
  assert.equal(conn, mockDb);
  assert.equal(dbService.isInitialized, true);
});

test('SQLite Consumers: executeQuery and executeRun automatically await initialization', async () => {
  const { mockSqlite } = createMockSqlite();
  const dbService = new DatabaseService(mockSqlite, DB_NAME, () => 'android');

  // Never explicitly called initialize()
  assert.equal(dbService.isInitialized, false);

  const queryResult = await dbService.executeQuery('SELECT * FROM customers WHERE id = ?', [1]);
  assert.deepEqual(queryResult.values, [{ id: 1, name: 'test' }]);
  assert.equal(dbService.isInitialized, true);

  const runResult = await dbService.executeRun('UPDATE customers SET name = ? WHERE id = ?', ['Bob', 1]);
  assert.equal(runResult.changes.changes, 1);

  const stats = mockSqlite.getStats();
  assert.equal(stats.createConnectionCalls, 1);
});

test('SQLite Schema Preservation: schema uses CREATE TABLE IF NOT EXISTS without dropping data', async () => {
  const { mockSqlite } = createMockSqlite();
  const dbService = new DatabaseService(mockSqlite, DB_NAME, () => 'android');

  await dbService.initialize();

  const stats = mockSqlite.getStats();
  assert.equal(stats.executeCalls.length, 1);
  const executedSchema = stats.executeCalls[0];

  assert.ok(executedSchema.includes('CREATE TABLE IF NOT EXISTS'), 'Schema must use IF NOT EXISTS');
  assert.ok(!executedSchema.includes('DROP TABLE'), 'Schema must never DROP tables');
  assert.ok(!executedSchema.includes('DELETE FROM'), 'Schema execution must never wipe rows');
});
