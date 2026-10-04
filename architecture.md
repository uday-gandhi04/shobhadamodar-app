# architecture.md — Shobhadamodar Petroleum

## 1. Document Status

**Version:** V1.0 — First Deployment / Manager Approval Baseline  
**Last Updated:** 04 October 2026  
**Scope:** Architecture for the current employee workflow plus the first production-ready Manager application.

This document describes both the current technical direction and the Manager V1 structure that the application will implement.

---

## 2. System Architecture

The application follows an **Offline-First, API-Driven Architecture**.

### Client / Edge

The React + Ionic application is the operational client used on Android devices.

It must be able to continue working when connectivity is unreliable. Employee shift work is expected to become increasingly local-first using SQLite, with synchronization to the centralized backend.

The Manager side is primarily a monitoring and administration interface. Manager pages read authoritative server data for historical/accounting information and may use conservative polling for live MPD status.

### API / Backend

The Node.js + Express API is the trusted business layer.

The backend:

- authenticates users
- authorizes Manager vs Employee access
- validates source data
- calculates financial totals
- calculates fuel sales from meter readings
- stores the authoritative record
- controls manager-only operations
- records sensitive administrative actions

The backend must not trust totals calculated by the client.

### Database

MongoDB + Mongoose is the centralized system of record.

The important domain entities are:

- User
- Station
- MPD
- Shift
- FuelRate
- Customer
- UdhariTransaction
- Expense

Additional collections may be introduced later only when a business requirement justifies them.

---

## 3. Technology Stack

- **Language:** JavaScript ES6+. No TypeScript.
- **Frontend:** React.js + Ionic Framework + Capacitor.
- **Styling:** Tailwind CSS.
- **Local/offline storage:** Capacitor SQLite and the existing synchronization architecture.
- **Backend:** Node.js + Express.js.
- **Database:** MongoDB + Mongoose.
- **Authentication:** JWT-based authentication already used by the application.
- **Validation:** Zod is the intended strict backend validation layer.
- **Financial representation:** integer paise for money; use safe decimal/currency handling where appropriate.
- **Date/business timezone:** Asia/Kolkata.

---

## 4. Current Frontend Structure

The current project uses a feature-oriented structure.

```text
frontend/src/
├── app/
│   └── routes/
│       └── App.jsx
│
├── features/
│   ├── auth/
│   ├── employee/
│   │   ├── shift/
│   │   ├── collections/
│   │   ├── expenses/
│   │   └── review/
│   └── manager/
│       ├── ManagerDashboard.jsx
│       ├── ManagerLayout.jsx
│       ├── ManagerHeader.jsx
│       ├── ManagerBottomNav.jsx
│       ├── Operations.jsx
│       ├── Accounting.jsx
│       ├── Stock.jsx
│       ├── Udhari.jsx
│       └── Employees.jsx
│
├── components/
│   ├── business/
│   ├── collections/
│   └── ui/
│
├── context/
├── database/
├── services/
├── utils/
├── locales/
├── i18n.js
└── main.jsx
```

The Manager feature must reuse shared components where useful but must not destabilize the employee workflow.

---

## 5. Core Petrol Pump Domain

### Station

The system currently represents one real petrol pump:

**Shobhadamodar Petroleum** — BPCL-authorized retail outlet.

### MPDs

The station has:

- MPD 1
- MPD 2

Each MPD has four nozzles:

- 2 Petrol
- 2 Diesel

The exact nozzle configuration remains data-driven so it can be adjusted later if hardware changes.

### Nozzle readings

Nozzle readings are cumulative totalizers.

For a normal meter:

```text
Litres Dispensed = Closing Totalizer - Opening Totalizer
```

The backend is responsible for validating and calculating the trusted result.

### Fuel rates

Fuel selling rates are date-specific.

A historical shift must use the applicable fuel rate for its business date rather than today's rate.

---

## 6. Shift Architecture

A Shift belongs to:

- one employee
- one MPD
- one business date

Shift lifecycle:

```text
IN_PROGRESS
    ↓
ENDED
```

or:

```text
IN_PROGRESS
    ↓
FORCE_CLOSED
```

There must be at most one active shift per employee and one active shift per MPD.

The MPD lock is derived from an `IN_PROGRESS` shift; there is no separate MPD lock field.

Active shifts must be queryable independently of business date because a shift may cross midnight.

---

## 7. Employee Data Flow

The employee workflow remains:

```text
Login
  ↓
Select MPD
  ↓
Nozzle Reading
  ↓
Cash
  ↓
UPI / PhonePe
  ↓
Card / ATM
  ↓
Udhari
  ↓
Expense
  ↓
Review
  ↓
End Shift
```

The Manager system reads the resulting shift data and does not duplicate employee calculations unnecessarily.

---

## 8. Manager Application Architecture

Manager V1 has **six main pages**:

```text
1. Dashboard
2. Operations
3. Sales & Accounting
4. Stock & Rates
5. Udhari
6. Employees
```

There are also supporting internal views that are not top-level navigation pages:

- Shift Detail
- MPD-specific Today's Shift History
- Udhari Customer Detail / Ledger / Settlement flow
- Employee Detail
- Manager Profile
- Settings

These internal views should reuse the parent page layout rather than creating a large navigation tree.

---

## 9. Manager Page Responsibilities

### 9.1 Dashboard

The Dashboard is a control panel, not an accounting report.

It shows five large navigation actions in a simple 2-column grid:

- Sales & Accounting
- Operations
- Stock & Rates
- Udhari
- Employees

No large analytics dashboard is required for V1.

### 9.2 Operations

Operations is the live operational control center.

It answers:

> What is happening now at MPD 1 and MPD 2?

and:

> What shifts happened earlier today?

Top-level tabs:

```text
Live MPDs | Today's Shifts
```

Live MPDs show:

- MPD status
- active employee
- active shift start time
- four nozzles
- current totalizer readings
- active-shift litres
- active-shift estimated sale
- Today's Shift History action

Today's Shifts show all shifts for the current business date, grouped by MPD.

A past shift opens Shift Detail.

Shift Detail is read-only in the initial manager UI, with Force Close/correction actions introduced only where the deployment phase explicitly enables them.

### 9.3 Sales & Accounting

Sales & Accounting is the manager's financial/reporting center.

Supported periods:

- Today
- Week
- Month

The page must support station-wide and MPD-specific accounting and allow drill-down from:

```text
Period
 ↓
Day
 ↓
MPD
 ↓
Shift
 ↓
Nozzle
```

It includes:

- Petrol litres and sale
- Diesel litres and sale
- Total litres and sale
- MPD 1 totals
- MPD 2 totals
- cash
- UPI
- card/ATM
- Udhari
- total customer collections
- expenses as a separate informational amount
- reconciliation / difference
- shift counts
- historical shift review
- export capability where implemented

Expenses must never be treated as customer collection for fuel-sale reconciliation.

### 9.4 Stock & Rates

This page digitizes the physical stock, density and rate records used at the station.

Top-level tabs:

```text
Current Stock | Receipts & Density | Rates
```

Current Stock supports Petrol/MS and Diesel/HSD.

It captures the register's stock-accounting fields:

- opening stock
- receipt stock
- total available
- actual sales
- calculated closing stock
- product dip in cm
- actual dip stock in litres
- variation in litres
- water dip in cm
- water dip volume in litres
- tank capacity
- tank number / product identifier

The stock calculation is:

```text
Opening Stock
+ Receipt Stock
= Total Available

Total Available
- Actual Sales
= Calculated Closing Stock

Actual Dip Stock
- Calculated Closing Stock
= Variation
```

Receipts & Density supports the physical register's daily density and fuel receipt records.

Daily density may include:

- date
- hydrometer reading
- temperature
- observed density at 15°C

A fuel receipt may include:

- invoice number
- date
- quantity
- product
- tank
- before-receipt observed hydrometer reading
- before-receipt temperature
- before-receipt density at 15°C
- challan density at 15°C
- density difference
- after-decantation hydrometer reading
- after-decantation temperature
- after-decantation density at 15°C
- after-decantation challan density at 15°C
- after-decantation density difference

Rates include:

- current Petrol rate
- current Diesel rate
- effective date
- rate history
- manager-controlled changes

### 9.5 Udhari

Udhari is the manager's customer-credit control center.

Manager V1 supports:

- customer list
- search
- create customer account
- edit customer information
- outstanding balance
- credit limit
- customer status / blocked status
- complete ledger
- individual credit transactions
- settlement/payment recording
- remaining balance after settlement
- transaction history
- employee who created the transaction where available

Udhari settlement is a separate money movement and must not be confused with fuel-sale reconciliation for the originating shift.

### 9.6 Employees

Employees is the manager's staff-account management center.

Manager V1 supports:

- employee list
- search/filter
- create employee
- edit employee profile
- employee ID
- name
- mobile/contact information where stored
- account status
- activate/deactivate
- ban/unban
- reset credentials
- current shift status
- shift history
- operational history visible to the manager

Sensitive actions require manager authorization and should be audited.

---

## 10. Supporting Manager Views

### Shift Detail

A Shift Detail view is an internal drill-down from Operations and Accounting.

It contains:

- shift identity
- employee
- MPD
- business date
- start/end time
- status
- petrol litres/sale
- diesel litres/sale
- total litres/sale
- all four nozzle readings
- cash
- coins
- UPI
- card/ATM
- Udhari
- total collected
- expenses
- Udhari transactions
- reconciliation

### Udhari Customer Detail

Shows:

- customer identity
- current outstanding
- credit limit
- status
- complete ledger
- settlement action

### Employee Detail

Shows:

- profile
- account status
- current shift
- shift history
- operational history
- manager actions

### Manager Profile / Settings

Not part of the six main pages.

Profile supports:

- manager identity
- language
- logout

Settings supports only configuration that is necessary for V1:

- station information
- MPD configuration
- nozzle configuration
- tank configuration
- manager/security settings

Frequently used fuel-rate changes remain accessible from Stock & Rates.

---

## 11. Accounting and Financial Source of Truth

The backend is authoritative for financial calculations.

The frontend may display derived values for responsiveness, but final stored values must be based on trusted backend calculations.

Money is stored/processed in paise.

Collections are:

- Cash
- Coins
- UPI / PhonePe
- Card / ATM
- Udhari

Expenses are separate operational information and are not included in customer-collection reconciliation.

---

## 12. Stock Source of Truth

Physical tank verification is distinct from nozzle sales.

The system therefore keeps these concepts separate:

```text
Fuel Receipt
     ↓
Tank Stock
     ↓
Nozzle Sales
     ↓
Expected Tank Closing
     ↓
Physical Dip
     ↓
Variation
```

Nozzle readings belong to Operations/Shift data.

Tank dip and density belong to Stock & Rates.

---

## 13. Live Manager Monitoring

Live MPD status may be refreshed by conservative polling while the Live MPDs view is active.

Recommended interval:

**10–15 seconds**.

The client must:

- stop polling when leaving the view
- prevent overlapping requests
- stop polling when unmounted
- avoid effect loops
- not introduce websocket infrastructure for V1

---

## 14. Authorization Boundary

Manager pages are protected by Manager authorization.

Employees must not be able to access Manager API endpoints or Manager UI solely by typing a URL.

Authorization must be enforced in the backend even if the frontend hides the routes.

---

## 15. Audit Boundary

Sensitive manager actions should be recorded, especially:

- force close shift
- fuel-rate change
- stock adjustment
- employee ban/unban
- employee credential reset
- Udhari correction/settlement correction
- historical correction

A visible Audit page is not required for the first Manager UI, but the backend must preserve sufficient audit information for those actions.

---

## 16. First Deployment Principle

V1 intentionally prefers a small number of high-value pages over a large admin system.

The first deployment should be understandable to a real manager after minimal explanation.

Advanced analytics, alerts, global search, advanced permissions, sync dashboards, and dedicated audit reports may be added after real-world feedback.
