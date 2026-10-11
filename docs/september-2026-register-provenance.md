# September 2026 Physical Register Provenance & Data Architecture

This documentation records the physical register transcription and data classification for the Shobhadamodar Petroleum station records:

## 1. Data Classification

### `SOURCE_REGISTER` (Authoritative Handwritten Physical Records)
The following fields are directly transcribed from the photographs of the pump registers:
- **Station Hardware**: Tank MS-1 (15 KL), Tank HSD-1 (20 KL).
- **MS Meter Readings**: Dates 1–22 opening readings and sales for Nozzles 1, 2, 3, 4; Date 23 opening readings.
- **HSD Meter Readings**: Dates 1–22 opening readings and sales for Nozzles 1, 2, 3, 4; Date 23 opening readings; Date 16 pump testing (235 L).
- **MS Stock Register**: Dates 1–22 Opening Stock, Receipt Stock, Total Available, Actual Sales, Closing Stock, Product Dip (cm), Actual Dip Stock (L), Variation, Water Dip (0 cm / 0 L); Date 23 Opening Stock.
- **HSD Stock Register**: Dates 1–22 Opening Stock, Receipt Stock, Total Available, Actual Sales, Closing Stock, Product Dip (cm), Actual Dip Stock (L), Variation, Water Dip (0 cm / 0 L); Date 23 Opening Stock.
- **MS Density & Receipts**: Morning density (Hydrometer, Temp °C, Density at 15°C) for Dates 1–23; Receipt decantation invoices, quantities, challan density, observed hydrometer/temp, and after-decantation observations.

### `DERIVED` (Mathematically Computed from Source Records)
- **Dispensed Liters per Nozzle**: `Closing Reading - Opening Reading`.
- **Shift Expected Sales**: `Dispensed Litres * Fuel Rate (Paise) / 100`.
- **Total Available Liters**: `Opening Stock + Receipt Stock`.
- **Calculated Closing Stock**: `Total Available - Actual Sales`.
- **Calculated Stock Variation**: `Calculated Closing Stock - Actual Dip Stock`.

### `MOCK_SUPPORTING_DATA` (Synthetic Test Data for Workflow Exercising)
The following fields do not exist in the physical paper registers (which only track meter readings and tank stock balances) and are synthesized for test database completeness:
- **Test User Accounts**:
  - Manager: `TEST MANAGER — SEP 2026` (`TESTMANAGERSEP26`)
  - Employee: `TEST EMPLOYEE — SEP 2026` (`TESTEMPSEP26`)
- **Fuel Rates**: Maharashtra indicative rates for September 2026 (Petrol ₹104.50/L $\rightarrow$ 10450 paise, Diesel ₹92.80/L $\rightarrow$ 9280 paise).
- **Shift Collections**:
  - Employee attribution (`TEST EMPLOYEE — SEP 2026`).
  - Cash breakdown (denominations ₹500, ₹200, ₹100, coins).
  - UPI digital payments, Card/ATM entries.
- **Udhari Transactions**: Test credit transactions with mock customer accounts (`MOCK_CUSTOMER_SEP26`).
- **Expenses**: Test operational pump expenses (e.g., station consumables, electricity).
- **Synthetic Calibration Curve**: A testing calibration curve covering the range 50 cm to 165 cm based on observed dip pairs to allow testing interpolation logic in the test environment.

---

## 2. Nozzle Mapping Architecture
- **MPD 1**:
  - Nozzle 1 (`n1`): PETROL $\rightarrow$ Register MS Nozzle 1
  - Nozzle 2 (`n2`): PETROL $\rightarrow$ Register MS Nozzle 2
  - Nozzle 3 (`n3`): DIESEL $\rightarrow$ Register HSD Nozzle 1
  - Nozzle 4 (`n4`): DIESEL $\rightarrow$ Register HSD Nozzle 2
- **MPD 2**:
  - Nozzle 1 (`n1`): PETROL $\rightarrow$ Register MS Nozzle 3
  - Nozzle 2 (`n2`): PETROL $\rightarrow$ Register MS Nozzle 4
  - Nozzle 3 (`n3`): DIESEL $\rightarrow$ Register HSD Nozzle 3
  - Nozzle 4 (`n4`): DIESEL $\rightarrow$ Register HSD Nozzle 4

---

## 3. Key Findings & Discrepancy Diagnostics

### A. Totalizer Decimals vs. Handwritten Nozzle Sales
- **Observation:** In the daily meter registers for both MS and HSD, nozzle sales columns record integer or rounded liter values (e.g. MS Date 1: N1 = 723, N3 = 598; Sum = 1321.00 L), while the written `Total Meter Sales` column contains exact decimal values from the dispenser's digital master totalizer (e.g. 1321.71 L).
- **Handling:** Source values are preserved faithfully in `DailyMeterRegister`. In shift reconstruction, nozzle closing readings accurately reflect dispensed liters so that totalizer integrity is maintained without double-counting.

### B. Variation Sign Convention in Stock Register
- **Observation:** The pre-printed column header on both stock registers reads `अन्तर (6-8) / Variation (6-8)`, suggesting `Closing Stock (Col 6) - Actual Dip Stock (Col 8)`. However, the handwritten numbers consistently record:
  $$\text{Written Variation} = \text{Actual Dip Stock (Col 8)} - \text{Closing Stock (Col 6)}$$
  For example, MS Date 1: Closing = 10600.95, Dip Stock = 10606.18 $\rightarrow$ Written = `+5.23`.
  MS Date 7: Closing = 11426.87, Dip Stock = 11375.87 $\rightarrow$ Written = `-51.00`.
- **Handling:** Source values are preserved exactly as written. The application's automated calculation remains documented alongside the written values.
