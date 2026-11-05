// backend/src/utils/productionCleanup.js
export * from '../scripts/productionCleanup.js';
import { runProductionCleanup } from '../scripts/productionCleanup.js';

if (process.argv[1] && process.argv[1].endsWith('productionCleanup.js')) {
  runProductionCleanup().catch(err => {
    console.error(`\n[CLEANUP ERROR]: ${err.message}\n`);
    process.exit(1);
  });
}
