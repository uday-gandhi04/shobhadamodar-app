import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveDatabaseConfig, maskMongoUri } from './db.js';

const MOCK_TEST_URI = 'mongodb+srv://test_user:test_pass@test-cluster.mongodb.net/test_db';
const MOCK_PROD_URI = 'mongodb+srv://prod_user:prod_pass@prod-cluster.mongodb.net/prod_db';

const baseEnv = {
  MONGODB_URI_TEST: MOCK_TEST_URI,
  MONGODB_URI_PROD: MOCK_PROD_URI,
  MONGO_URI: MOCK_PROD_URI,
};

test('1. USE_TEST_DB matrix evaluation', async (t) => {
  await t.test('Missing USE_TEST_DB defaults to TEST', () => {
    const env = { ...baseEnv };
    delete env.USE_TEST_DB;
    const config = resolveDatabaseConfig(env);
    assert.equal(config.environment, 'TEST');
    assert.equal(config.uri, MOCK_TEST_URI);
    assert.equal(config.isProduction, false);
    assert.equal(config.isTest, true);
  });

  await t.test('USE_TEST_DB="true" connects to TEST', () => {
    const config = resolveDatabaseConfig({ ...baseEnv, USE_TEST_DB: 'true' });
    assert.equal(config.environment, 'TEST');
    assert.equal(config.uri, MOCK_TEST_URI);
  });

  await t.test('USE_TEST_DB="TRUE" connects to TEST', () => {
    const config = resolveDatabaseConfig({ ...baseEnv, USE_TEST_DB: 'TRUE' });
    assert.equal(config.environment, 'TEST');
    assert.equal(config.uri, MOCK_TEST_URI);
  });

  await t.test('USE_TEST_DB="false" connects to PRODUCTION', () => {
    const config = resolveDatabaseConfig({ ...baseEnv, USE_TEST_DB: 'false' });
    assert.equal(config.environment, 'PRODUCTION');
    assert.equal(config.uri, MOCK_PROD_URI);
    assert.equal(config.isProduction, true);
    assert.equal(config.isTest, false);
  });

  await t.test('USE_TEST_DB="FALSE" connects to PRODUCTION', () => {
    const config = resolveDatabaseConfig({ ...baseEnv, USE_TEST_DB: 'FALSE' });
    assert.equal(config.environment, 'PRODUCTION');
    assert.equal(config.uri, MOCK_PROD_URI);
    assert.equal(config.isProduction, true);
  });

  await t.test('USE_TEST_DB="False" connects to PRODUCTION', () => {
    const config = resolveDatabaseConfig({ ...baseEnv, USE_TEST_DB: 'False' });
    assert.equal(config.environment, 'PRODUCTION');
    assert.equal(config.uri, MOCK_PROD_URI);
    assert.equal(config.isProduction, true);
  });

  await t.test('USE_TEST_DB="" (empty string) connects to TEST', () => {
    const config = resolveDatabaseConfig({ ...baseEnv, USE_TEST_DB: '' });
    assert.equal(config.environment, 'TEST');
    assert.equal(config.uri, MOCK_TEST_URI);
  });

  await t.test('USE_TEST_DB="0" connects to TEST', () => {
    const config = resolveDatabaseConfig({ ...baseEnv, USE_TEST_DB: '0' });
    assert.equal(config.environment, 'TEST');
    assert.equal(config.uri, MOCK_TEST_URI);
  });

  await t.test('USE_TEST_DB="1" connects to TEST', () => {
    const config = resolveDatabaseConfig({ ...baseEnv, USE_TEST_DB: '1' });
    assert.equal(config.environment, 'TEST');
    assert.equal(config.uri, MOCK_TEST_URI);
  });
});

test('2. Safety Guard: Missing TEST URI causes clear failure in TEST mode', () => {
  const envWithoutTestUri = {
    USE_TEST_DB: 'true',
    MONGODB_URI_PROD: MOCK_PROD_URI,
    MONGO_URI: MOCK_PROD_URI,
  };

  assert.throws(
    () => resolveDatabaseConfig(envWithoutTestUri),
    /\[Database Configuration Error\] Environment is TEST.*MONGODB_URI_TEST is not defined/
  );
});

test('3. Safety Guard: Missing Production URI causes clear failure in PRODUCTION mode', () => {
  const envWithoutProdUri = {
    USE_TEST_DB: 'false',
    MONGODB_URI_TEST: MOCK_TEST_URI,
  };

  assert.throws(
    () => resolveDatabaseConfig(envWithoutProdUri),
    /\[Database Configuration Error\] Environment is PRODUCTION.*neither MONGODB_URI_PROD nor MONGO_URI is defined/
  );
});

test('4. Safety Guard: Mismatched production URI aliases cause clear failure', () => {
  const mismatchedEnv = {
    USE_TEST_DB: 'false',
    MONGODB_URI_PROD: 'mongodb+srv://user:pass@cluster1.mongodb.net/prod1',
    MONGO_URI: 'mongodb+srv://user:pass@cluster2.mongodb.net/prod2',
  };

  assert.throws(
    () => resolveDatabaseConfig(mismatchedEnv),
    /\[Database Configuration Error\] Mismatched production MongoDB URIs/
  );
});

test('5. Compatibility Alias: MONGO_URI works as fallback when MONGODB_URI_PROD is absent in PRODUCTION mode', () => {
  const legacyProdEnv = {
    USE_TEST_DB: 'false',
    MONGO_URI: MOCK_PROD_URI,
  };

  const config = resolveDatabaseConfig(legacyProdEnv);
  assert.equal(config.environment, 'PRODUCTION');
  assert.equal(config.uri, MOCK_PROD_URI);
});

test('6. Compatibility Alias: MONGODB_URI_PROD works when MONGO_URI is absent in PRODUCTION mode', () => {
  const modernProdEnv = {
    USE_TEST_DB: 'false',
    MONGODB_URI_PROD: MOCK_PROD_URI,
  };

  const config = resolveDatabaseConfig(modernProdEnv);
  assert.equal(config.environment, 'PRODUCTION');
  assert.equal(config.uri, MOCK_PROD_URI);
});

test('7. Safety Guard: TEST mode NEVER connects to production URI', () => {
  const env = {
    USE_TEST_DB: 'true',
    MONGODB_URI_TEST: MOCK_TEST_URI,
    MONGODB_URI_PROD: MOCK_PROD_URI,
  };

  const config = resolveDatabaseConfig(env);
  assert.notEqual(config.uri, MOCK_PROD_URI);
  assert.equal(config.uri, MOCK_TEST_URI);
});

test('8. Safety Guard: PRODUCTION mode NEVER silently connects to test URI', () => {
  const env = {
    USE_TEST_DB: 'false',
    MONGODB_URI_TEST: MOCK_TEST_URI,
    MONGODB_URI_PROD: MOCK_PROD_URI,
  };

  const config = resolveDatabaseConfig(env);
  assert.notEqual(config.uri, MOCK_TEST_URI);
  assert.equal(config.uri, MOCK_PROD_URI);
});

test('9. URI Masking Helper hides credentials', () => {
  const masked = maskMongoUri('mongodb+srv://db_user:SecretPassword123@cluster.mongodb.net/db_name?retryWrites=true');
  assert.equal(masked, 'mongodb+srv://db_user:***@cluster.mongodb.net/db_name?retryWrites=true');
  assert.doesNotMatch(masked, /SecretPassword123/);
});
