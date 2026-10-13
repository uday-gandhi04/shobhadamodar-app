import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extracts calibration points from an official BPCL tank calibration Excel workbook.
 *
 * Requirements:
 * - Scans header rows for explicit 'HEIGHT (CM)' and 'VOLUME (LTR)' pairs.
 * - Explicitly ignores 'HEIGHT (MM)' columns.
 * - Extracts valid, positive numeric pairs.
 * - Validates strict sorting, uniqueness, range coverage, and precision.
 *
 * @param {string} filePath - Absolute or relative path to the Excel file.
 * @param {object} options - Options including expectedCapacity and product label.
 * @returns {Promise<Array<{dipCm: number, volumeLitres: number}>>}
 */
export async function extractCalibrationPoints(filePath, options = {}) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const sheet = wb.getWorksheet(1);

  if (!sheet) {
    throw new Error(`Worksheet not found in workbook: ${filePath}`);
  }

  // 1. Locate all header rows that contain both 'HEIGHT' and 'VOLUME'
  const headerRows = [];
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    let hasHeightCm = false;
    let hasVolumeLtr = false;

    for (let c = 1; c <= sheet.columnCount; c++) {
      const cellVal = String(row.getCell(c).value || '').toUpperCase();
      if (cellVal.includes('HEIGHT') && cellVal.includes('(CM)')) hasHeightCm = true;
      if (cellVal.includes('VOLUME') && cellVal.includes('(LTR)')) hasVolumeLtr = true;
    }

    if (hasHeightCm && hasVolumeLtr) {
      headerRows.push(r);
    }
  }

  if (headerRows.length === 0) {
    throw new Error(`No valid calibration header rows found in ${filePath}`);
  }

  const rawPoints = [];

  // 2. Extract (dipCm, volumeLitres) pairs across every page block
  for (let i = 0; i < headerRows.length; i++) {
    const headerRowIdx = headerRows[i];
    const headerRow = sheet.getRow(headerRowIdx);
    const nextHeaderRowIdx = headerRows[i + 1] || (sheet.rowCount + 1);

    const pairs = [];
    for (let c = 1; c <= sheet.columnCount; c++) {
      const hVal = String(headerRow.getCell(c).value || '').toUpperCase().trim();
      if (hVal.includes('HEIGHT') && hVal.includes('(CM)')) {
        const nextHVal = String(headerRow.getCell(c + 1).value || '').toUpperCase().trim();
        if (nextHVal.includes('VOLUME') && nextHVal.includes('(LTR)')) {
          pairs.push({ dipCol: c, volCol: c + 1 });
        } else {
          throw new Error(`Inconsistent column structure at row ${headerRowIdx}: Col ${c} is HEIGHT (CM) but Col ${c + 1} is '${nextHVal}' (expected VOLUME (LTR))`);
        }
      }
    }

    for (let r = headerRowIdx + 1; r < nextHeaderRowIdx; r++) {
      const row = sheet.getRow(r);
      for (const pair of pairs) {
        const rawDip = row.getCell(pair.dipCol).value;
        const rawVol = row.getCell(pair.volCol).value;

        // ExcelJS returns formula result objects if formula exists
        const dipVal = typeof rawDip === 'object' && rawDip !== null ? (rawDip.result ?? rawDip.value) : rawDip;
        const volVal = typeof rawVol === 'object' && rawVol !== null ? (rawVol.result ?? rawVol.value) : rawVol;

        if (dipVal !== null && dipVal !== undefined && dipVal !== '' &&
            volVal !== null && volVal !== undefined && volVal !== '') {
          const dipNum = Number(dipVal);
          const volNum = Number(volVal);

          if (!isNaN(dipNum) && !isNaN(volNum) && dipNum > 0 && volNum > 0) {
            rawPoints.push({ dipCm: dipNum, volumeLitres: volNum });
          }
        }
      }
    }
  }

  // 3. Validation & ordering
  rawPoints.sort((a, b) => a.dipCm - b.dipCm);

  // Check uniqueness & conflicting duplicates
  const dipMap = new Map();
  for (const p of rawPoints) {
    if (dipMap.has(p.dipCm)) {
      const existingVol = dipMap.get(p.dipCm);
      if (Math.abs(existingVol - p.volumeLitres) > 1e-6) {
        throw new Error(`Conflicting volume values for dip ${p.dipCm} cm: ${existingVol} vs ${p.volumeLitres} in ${filePath}`);
      }
    } else {
      dipMap.set(p.dipCm, p.volumeLitres);
    }
  }

  const uniquePoints = Array.from(dipMap.entries()).map(([dipCm, volumeLitres]) => ({
    dipCm: Number(dipCm.toFixed(1)), // normalize dip representation (0.2, 0.4, ...)
    volumeLitres,
  }));

  uniquePoints.sort((a, b) => a.dipCm - b.dipCm);

  if (uniquePoints.length === 0) {
    throw new Error(`No valid calibration points extracted from ${filePath}`);
  }

  // Verify monotonicity
  for (let i = 1; i < uniquePoints.length; i++) {
    if (uniquePoints[i].dipCm <= uniquePoints[i - 1].dipCm) {
      throw new Error(`Calibration dip points are not strictly increasing: ${uniquePoints[i - 1].dipCm} followed by ${uniquePoints[i].dipCm}`);
    }
    if (uniquePoints[i].volumeLitres <= uniquePoints[i - 1].volumeLitres) {
      throw new Error(`Calibration volume points are not strictly increasing: ${uniquePoints[i - 1].volumeLitres} at dip ${uniquePoints[i - 1].dipCm} followed by ${uniquePoints[i].volumeLitres} at dip ${uniquePoints[i].dipCm}`);
    }
  }

  return uniquePoints;
}
