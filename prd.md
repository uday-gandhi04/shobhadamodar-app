# prd.md — Product Requirements Document

## 1. Product Overview

**Product:** Shobhadamodar Petroleum Operations App  
**Business:** BPCL-authorized retail petrol pump in India  
**Primary Goal:** Replace fragmented paper/spreadsheet-based operational accounting with a reliable mobile system for employees and managers.

The first deployment must be simple enough for day-to-day station use while preserving financial accuracy and the structure of the station's existing registers.

---

## 2. Users

### Employee / Pump Attendant

Non-technical staff working in a fast-paced physical environment.

Needs:

- large touch targets
- very little typing
- clear workflow
- English/Hindi/Marathi
- reliable operation during weak connectivity

### Manager

Administrative/operator responsible for the whole station.

Needs:

- live MPD visibility
- today's shift history
- daily/weekly/monthly accounting
- stock visibility
- fuel rates
- Udhari control
- employee management
- ability to intervene when necessary
- clear reconciliation

---

## 3. First Deployment Manager Scope

The Manager V1 application contains **six main pages**:

1. Dashboard
2. Operations
3. Sales & Accounting
4. Stock & Rates
5. Udhari
6. Employees

Supporting internal views:

- Shift Detail
- MPD-specific Today's Shift History
- Udhari Customer Detail / Ledger / Settlement
- Employee Detail
- Manager Profile
- Settings

These supporting views must not create a confusing navigation tree.

---

# 4. PAGE 1 — MANAGER DASHBOARD

## Purpose

Provide a simple launcher into the Manager's main functions.

## UI

Use a 2-column grid of large buttons/cards.

```text
Sales & Accounting | Operations
Stock & Rates      | Udhari
Employees
```

The Dashboard does not need dense charts or accounting tables in V1.

## Actions

- Open Sales & Accounting
- Open Operations
- Open Stock & Rates
- Open Udhari
- Open Employees

## Header

- Shobhadamodar Petroleum
- Manager identity
- language switcher
- profile/logout menu

---

# 5. PAGE 2 — OPERATIONS

## Purpose

Answer:

> What is happening right now?

and:

> What happened earlier today?

## Main tabs

```text
Live MPDs | Today's Shifts
```

No separate top-level Nozzle tab in V1.

---

## 5.1 Live MPDs

Default tab.

Show MPD 1 and MPD 2.

For each MPD:

### Machine status

- MPD number
- ACTIVE / FREE
- current employee when active
- employee ID where useful
- shift start time

### Four nozzle readings

Always show all four nozzles for the physical MPD.

Each nozzle must show:

- nozzle ID
- fuel type
- current totalizer reading

When there is an active shift, also show:

- shift opening reading
- current/closing reading as available
- litres dispensed in current shift

Petrol and Diesel must remain visually distinguishable.

### Active shift summary

Only for ACTIVE MPDs:

- Petrol litres
- Diesel litres
- Total litres
- Estimated current sale

### Free MPD

Show:

- No active shift
- latest nozzle readings
- last completed shift information when available

Do not make a free MPD look like an active shift with fake ₹0 values.

### Live refresh

Refresh conservative live data while the Live MPDs tab is visible.

---

## 5.2 Today's Shifts

Show all shifts for the current business date.

Group by MPD.

For each shift show:

- employee
- start time
- end time or LIVE
- status
- Petrol litres
- Diesel litres
- Total litres
- Sale
- difference/reconciliation status when available

Active shift must be visually distinct from completed shifts.

---

## 5.3 MPD-specific Today's Shift History

From an MPD card:

```text
MPD 1 → Today's Shift History
```

show only MPD 1 shifts for today's business date.

Same for MPD 2.

This must preserve MPD context.

---

## 5.4 Shift Detail

Read-only detail for V1 unless an action is explicitly enabled later.

Sections:

### Shift header

- MPD
- employee
- date
- start/end
- status

### Fuel sales

- Petrol litres
- Petrol sale
- Diesel litres
- Diesel sale
- Total litres
- Expected total sale

### Nozzle readings

All four nozzles:

- opening
- closing/current
- dispensed litres
- sale if available

### Collections

- cash
- coins
- UPI
- card/ATM
- Udhari
- total collected

### Expenses

- each expense
- total expense

Expenses stay separate from reconciliation.

### Udhari transactions

- customer
- amount
- fuel type
- litres
- vehicle number if stored
- transaction time/date if stored

### Reconciliation

- expected sale
- accounted/collected
- difference
- status

---

## 5.5 Manager Shift Intervention

Required for first production deployment, but should be implemented only after the read-only Shift Detail flow is stable.

Manager must be able to force-close an active shift when operationally necessary.

Examples:

- employee left unexpectedly
- device failure
- employee forgot to end shift
- emergency replacement

Force close must require:

- explicit confirmation
- reason
- manager authorization
- audit record

It must never silently alter a shift.

---

# 6. PAGE 3 — SALES & ACCOUNTING

## Purpose

Provide station-wide and MPD-wise accounting.

## Period selector

```text
Today | Week | Month
```

The page must support historical dates/periods where required.

---

## 6.1 Station totals

For the selected period:

- Petrol litres
- Diesel litres
- Total litres
- Petrol sale
- Diesel sale
- Total sale

---

## 6.2 MPD-wise accounting

Show:

| | MPD 1 | MPD 2 | Total |
|---|---:|---:|---:|
| Petrol L | | | |
| Diesel L | | | |
| Total L | | | |
| Petrol ₹ | | | |
| Diesel ₹ | | | |
| Total ₹ | | | |

---

## 6.3 Shift accounting

Allow drill-down:

```text
Period
 ↓
Day
 ↓
MPD
 ↓
Shift
```

A shift can open the same Shift Detail view used by Operations.

---

## 6.4 Collections

Show:

- Cash
- Coins
- UPI / PhonePe
- Card / ATM
- Udhari
- Total customer collection

---

## 6.5 Reconciliation

Show:

```text
Expected Sale
Accounted / Collected
Difference
Status
```

Shortage/excess must be clearly identified.

Expenses are NOT included in this customer collection reconciliation.

---

## 6.6 Expenses

Show a separate expense summary:

- total expenses
- category/reason
- shift/employee where available
- selected period totals

Expense information is for management visibility and does not alter expected fuel-sale calculations.

---

## 6.7 Nozzle drill-down

The accounting page may drill down to nozzle detail where useful:

```text
Day → MPD → Shift → Nozzle
```

A dedicated top-level nozzle report is not required for V1.

---

## 6.8 Export

Manager may export important accounting results to PDF/Excel/CSV where implemented.

The export should represent the same trusted backend totals shown in the UI.

---

# 7. PAGE 4 — STOCK & RATES

## Purpose

Digitize the station's physical tank, density, receipt and pricing registers.

## Main tabs

```text
Current Stock | Receipts & Density | Rates
```

---

## 7.1 Current Stock

Products:

- Petrol / MS
- Diesel / HSD

Each tank must store/display its capacity and identity.

### Stock fields

- Opening Stock (L)
- Receipt Stock (L)
- Total Available (L)
- Actual Sales (L)
- Calculated Closing Stock (L)

### Physical verification

- Product Dip (cm)
- Actual Dip Stock (L)
- Variation (L)
- Water Dip (cm)
- Water Dip Volume (L)

### Formula

```text
Total Available = Opening Stock + Receipt Stock

Calculated Closing = Total Available - Actual Sales

Variation = Actual Dip Stock - Calculated Closing
```

The UI should clearly distinguish calculated values from physically observed values.

---

## 7.2 Daily Density

The existing paper register records daily morning density/temperature.

Capture:

- date
- hydrometer reading
- temperature
- density at 15°C
- product

Daily entries may exist even when there is no fuel receipt.

---

## 7.3 Fuel Receipts

A receipt record captures:

### Basic receipt

- Invoice number
- Date
- Quantity
- Product
- Tank

### Before receipt / observed

- Hydrometer reading
- Temperature
- Density at 15°C

### Challan

- Challan density at 15°C

### Difference

- observed/challan density difference

### After decantation

- Hydrometer reading
- Temperature
- Density at 15°C
- Challan density at 15°C
- difference

Receipt details should open in a dedicated internal detail view.

---

## 7.4 Fuel Rates

Manager controls date-effective rates.

Show:

- Petrol current rate
- Diesel current rate
- effective date
- rate history

Changing a rate must:

- preserve historical rates
- not retroactively modify old shifts
- be recorded as a manager action

---

# 8. PAGE 5 — UDHARI

## Purpose

Manage customer credit accounts and settlements.

## Main screen

Show:

- total outstanding
- customer count
- search
- customer list
- outstanding amounts
- customer status

## Customer management

Manager can:

- create account
- edit account
- set credit limit
- disable/block customer
- view account

## Customer detail

Show:

- name
- contact details where stored
- credit limit
- current outstanding
- complete ledger

## Ledger

Each transaction can include:

- date/time
- credit/debit or settlement type
- amount
- fuel type
- litres where applicable
- vehicle number where applicable
- employee/source where available
- resulting balance

## Settlement

Manager can record payment and show:

- payment amount
- payment method
- reference/notes when applicable
- remaining outstanding

Settlement must not delete the original credit transaction.

---

# 9. PAGE 6 — EMPLOYEES

## Purpose

Manage staff accounts and operational access.

## Employee list

Show:

- name
- employee ID
- status
- current shift indicator

Supported statuses:

- Active
- Disabled
- Banned

## Create Employee

Manager can create an employee account with the minimum required identity and login information.

## Employee detail

Show:

- profile
- account status
- current shift
- recent shifts
- historical shifts
- operational history where appropriate

## Account actions

Manager can:

- edit profile
- reset password/PIN
- activate
- disable
- ban
- unban

Every sensitive status/credential action should be auditable.

---

# 10. SUPPORTING MANAGER SETTINGS

Settings is not one of the six main operational pages.

Accessible through the manager profile menu.

V1 configuration includes only what is required to operate the station:

### Station

- station name
- address/contact information where required

### MPDs / Nozzles

- MPD details
- serial information
- nozzle mapping
- fuel type per nozzle
- active/inactive status

### Tanks

- tank identity
- product
- capacity
- minimal tank configuration is managed inside Stock & Rates

### Security

- manager credential settings
- session/security behavior where already supported

Fuel rate editing remains available directly from Stock & Rates.

---

# 11. Data Relationships

```text
Employee
   ↓
Shift
   ↓
MPD
   ↓
Nozzles
   ↓
Fuel sale
```

```text
Fuel Receipt
   ↓
Daily Product Stock (tank context only)
   ↓
Nozzle Sales
   ↓
Expected Closing Stock
   ↓
Physical Dip
   ↓
Variation
```

Daily stock remains one record per station, business date, and product. Tank configuration is returned as product context; a tank is not attached to daily stock because a product total may span multiple physical tanks.

```text
Customer
   ↓
Udhari Transactions
   ↓
Outstanding Balance
   ↓
Settlement
```

---

# 12. First Deployment Non-Goals

Do not include these as separate Manager pages in V1:

- dedicated Notifications page
- dedicated Audit page UI
- global search page
- advanced analytics dashboard
- advanced employee scoring
- advanced permission administration
- sync monitoring dashboard
- backup administration screen
- complex purchase/accounting ERP functionality

These can be added later based on real manager feedback.

---

# 13. V1 Acceptance Criteria

A manager should be able to:

1. Open a simple Dashboard and understand the five main actions.
2. See live MPD 1 and MPD 2 status.
3. See all four nozzles on each MPD.
4. See current live shift employee and readings.
5. See every shift that happened earlier today.
6. Open any shift and inspect all its financial/operational detail.
7. View day/week/month accounting.
8. Compare MPD 1, MPD 2 and station totals.
9. View cash/UPI/card/Udhari collections.
10. See reconciliation differences.
11. View stock, dip, variation and water dip.
12. Record/review daily density and fuel receipts.
13. Change fuel rates while preserving historical rates.
14. Create and settle Udhari accounts.
15. Create, disable, ban and manage employee accounts.
16. Force-close a shift when properly authorized once that capability is enabled.
17. Use English, Hindi and Marathi throughout the Manager UI.

The first deployment is considered successful only when the above is understandable without requiring the manager to navigate through a large admin system.
