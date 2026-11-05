// backend/src/utils/auditProductionDb.js
export * from '../scripts/auditProductionDb.js';
import { auditProductionDatabase } from '../scripts/auditProductionDb.js';

if (process.argv[1] && process.argv[1].endsWith('auditProductionDb.js')) {
  auditProductionDatabase().catch(err => {
    console.error(`\n[AUDIT ERROR]: ${err.message}\n`);
    process.exit(1);
  });
}
