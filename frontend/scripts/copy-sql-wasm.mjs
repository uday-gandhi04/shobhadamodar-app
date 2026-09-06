import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../node_modules/sql.js/dist/sql-wasm.wasm', import.meta.url));
const assetsDirectory = fileURLToPath(new URL('../public/assets/', import.meta.url));
const destination = fileURLToPath(new URL('../public/assets/sql-wasm.wasm', import.meta.url));

await mkdir(assetsDirectory, { recursive: true });
await copyFile(source, destination);
