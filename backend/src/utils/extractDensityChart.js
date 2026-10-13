import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import ExcelJS from 'exceljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extracts and validates the official ASTM Table 53B (1980 Edition) conversion chart.
 *
 * @param {string} filePath - Path to DENSITY CONVERSION CHART.xlsx
 * @returns {Promise<object>} Structured dataset containing metadata, axes, and grid data.
 */
export async function extractDensityChart(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const sheet = wb.getWorksheet(1);

  if (!sheet) {
    throw new Error(`Worksheet not found in ${filePath}`);
  }

  // 1. Validate Sheet Title
  const titleCell = sheet.getRow(1).getCell(1).value;
  const title = String(titleCell || '').trim();
  if (!title.includes('ASTM TABLE 53B')) {
    throw new Error(`Unexpected workbook title: '${title}' (expected ASTM TABLE 53B)`);
  }

  // 2. Extract Hydrometer axis from Row 6
  const row6 = sheet.getRow(6);
  const hydrometers = [];
  const hydColMap = new Map();

  for (let c = 2; c <= sheet.columnCount; c++) {
    const v = row6.getCell(c).value;
    if (v !== null && v !== undefined && v !== '') {
      const hydNum = Number(v);
      if (!isNaN(hydNum)) {
        hydrometers.push(hydNum);
        hydColMap.set(hydNum, c);
      }
    }
  }

  if (hydrometers.length === 0) {
    throw new Error('No hydrometer reading columns found in Row 6');
  }

  const minHydrometer = hydrometers[0];
  const maxHydrometer = hydrometers[hydrometers.length - 1];

  // Verify consecutive step 1
  for (let i = 1; i < hydrometers.length; i++) {
    if (hydrometers[i] !== hydrometers[i - 1] + 1) {
      throw new Error(`Non-consecutive hydrometer reading at col ${i}: ${hydrometers[i - 1]} followed by ${hydrometers[i]}`);
    }
  }

  // 3. Extract Temperature axis from Column 1 (Rows 7..107)
  const temperatures = [];
  const tempRowMap = new Map();

  for (let r = 7; r <= sheet.rowCount; r++) {
    const v = sheet.getRow(r).getCell(1).value;
    if (v !== null && v !== undefined && v !== '') {
      const tempNum = Number(v);
      if (!isNaN(tempNum)) {
        temperatures.push(tempNum);
        tempRowMap.set(tempNum, r);
      }
    }
  }

  if (temperatures.length === 0) {
    throw new Error('No temperature rows found in Column 1');
  }

  const minTemperature = temperatures[0];
  const maxTemperature = temperatures[temperatures.length - 1];

  // Verify consecutive step 0.5
  for (let i = 1; i < temperatures.length; i++) {
    const diff = Number((temperatures[i] - temperatures[i - 1]).toFixed(4));
    if (diff !== 0.5) {
      throw new Error(`Non-consecutive temperature at row ${i}: ${temperatures[i - 1]} followed by ${temperatures[i]}`);
    }
  }

  // 4. Extract 2D Grid: grid[tempIndex][hydIndex]
  // Dimensions: temperatures.length (rows) x hydrometers.length (cols)
  const grid = [];
  const missingPoints = [];

  for (let tIdx = 0; tIdx < temperatures.length; tIdx++) {
    const temp = temperatures[tIdx];
    const r = tempRowMap.get(temp);
    const row = sheet.getRow(r);
    const rowValues = [];

    for (let hIdx = 0; hIdx < hydrometers.length; hIdx++) {
      const hyd = hydrometers[hIdx];
      const c = hydColMap.get(hyd);
      const cell = row.getCell(c);
      const rawVal = typeof cell.value === 'object' && cell.value !== null ? (cell.value.result ?? cell.value.value) : cell.value;

      if (rawVal === null || rawVal === undefined || rawVal === '') {
        rowValues.push(null);
        missingPoints.push({ temperatureC: temp, hydrometerReading: hyd, row: r, col: c });
      } else {
        const numVal = Number(rawVal);
        if (isNaN(numVal)) {
          throw new Error(`Non-numeric density value at Temp ${temp}, Hyd ${hyd}: ${rawVal}`);
        }
        rowValues.push(Number(numVal.toFixed(1)));
      }
    }
    grid.push(rowValues);
  }

  const dataset = {
    source: 'EXTRACT OF ASTM TABLE 53B (1980 EDITION)',
    units: {
      hydrometerReading: 'kg/m³',
      temperatureC: '°C',
      density15: 'kg/m³',
    },
    axes: {
      minHydrometer,
      maxHydrometer,
      stepHydrometer: 1,
      totalHydrometers: hydrometers.length,
      minTemperature,
      maxTemperature,
      stepTemperature: 0.5,
      totalTemperatures: temperatures.length,
    },
    missingPoints,
    grid,
  };

  return dataset;
}

// Direct execution
if (process.argv[1] && process.argv[1].endsWith('extractDensityChart.js')) {
  (async () => {
    try {
      const excelPath = path.resolve(__dirname, '../../data/density/DENSITY CONVERSION CHART.xlsx');
      console.log('Extracting ASTM Table 53B from:', excelPath);
      const data = await extractDensityChart(excelPath);

      console.log('Extracted successfully:');
      console.log(`- Hydrometer range: ${data.axes.minHydrometer} to ${data.axes.maxHydrometer} (Count: ${data.axes.totalHydrometers})`);
      console.log(`- Temperature range: ${data.axes.minTemperature}°C to ${data.axes.maxTemperature}°C (Count: ${data.axes.totalTemperatures})`);
      console.log(`- Total grid cells: ${data.axes.totalTemperatures * data.axes.totalHydrometers}`);
      console.log(`- Missing cells in source: ${data.missingPoints.length}`);

      // Save backend JSON
      const backendDir = path.resolve(__dirname, '../data/density');
      fs.mkdirSync(backendDir, { recursive: true });
      const backendFile = path.join(backendDir, 'astm_table_53b_1980.json');
      fs.writeFileSync(backendFile, JSON.stringify(data, null, 2));
      console.log('Saved backend dataset to:', backendFile);

      // Save frontend JSON
      const frontendDir = path.resolve(__dirname, '../../../frontend/src/data/density');
      fs.mkdirSync(frontendDir, { recursive: true });
      const frontendFile = path.join(frontendDir, 'astm_table_53b_1980.json');
      fs.writeFileSync(frontendFile, JSON.stringify(data, null, 2));
      console.log('Saved frontend dataset to:', frontendFile);
    } catch (err) {
      console.error('Extraction failed:', err);
      process.exit(1);
    }
  })();
}
