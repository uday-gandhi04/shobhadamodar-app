import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedTestDatabase(customUri = null) {
  let conn;
  if (mongoose.connection.readyState === 1) {
    conn = mongoose;
  } else {
    const uri = customUri || process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('Cannot seed test database: Neither MONGODB_URI_TEST nor MONGODB_URI is set.');
    }

    // Safety check: ensure we never touch production
    if (!uri.toLowerCase().includes('test')) {
      throw new Error(`Safety Guard: Database URI '${uri}' does not contain 'test'. Aborting test seeding.`);
    }

    conn = await mongoose.connect(uri);
  }

  const dbName = conn.connection.name;
  if (!dbName.toLowerCase().includes('test')) {
    throw new Error(`Safety Guard: Connected database name '${dbName}' does not contain 'test'. Aborting test seeding.`);
  }

  const fixturePath = path.resolve(__dirname, '../data/fixtures/testDbFixture.json');
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Test fixture not found at: ${fixturePath}`);
  }

  const raw = fs.readFileSync(fixturePath, 'utf8');
  const fixture = mongoose.mongo.BSON.EJSON.parse(raw);
  const db = conn.connection.db;

  for (const [collectionName, docs] of Object.entries(fixture)) {
    const col = db.collection(collectionName);
    await col.deleteMany({});
    if (Array.isArray(docs) && docs.length > 0) {
      await col.insertMany(docs, { ordered: false });
    }
  }

  console.log(`[Test Seeder] Successfully initialized isolated test database '${dbName}' with ${Object.keys(fixture).length} collections.`);
  return { dbName, collections: Object.keys(fixture).length };
}

if (process.argv[1] && process.argv[1].endsWith('seedTestDb.js')) {
  try {
    await seedTestDatabase();
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Test Seeder Error]', error.message);
    process.exit(1);
  }
}
