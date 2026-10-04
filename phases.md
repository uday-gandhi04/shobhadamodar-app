# phases.md — Implementation Phases

## Project Strategy

Build the system in small, testable modules.

The Employee workflow is already substantially implemented and must be treated as a stable area.

The Manager V1 work should be completed page-by-page and data flow by data flow.

---

# Phase 0 — Baseline & Freeze

## Goal

Establish a known-good baseline before continuing Manager work.

### Tasks

- keep the latest working employee workflow unchanged
- verify manager shell/routes
- verify authentication and Manager authorization
- verify language persistence using localStorage
- record current build status
- keep the existing database models unless a confirmed requirement requires a change

### Exit condition

Employee workflow still works and Manager routes resolve.

---

# Phase 1 — Manager Shell

## Goal

Create the Manager navigation framework without changing business logic.

### Pages

- Dashboard
- Operations
- Sales & Accounting
- Stock & Rates
- Udhari
- Employees

### Supporting shell

- ManagerLayout
- ManagerHeader
- ManagerBottomNav
- profile menu
- language switcher
- logout
- ManagerRoute authorization

### Exit condition

Manager can navigate between all six pages without touching employee routes.

---

# Phase 2 — Manager Operations

## Goal

Provide a trustworthy live operational view and today's shift history.

### Step 2.1 — Live MPDs

Implement:

- MPD 1
- MPD 2
- active/free state
- employee
- shift start
- four nozzle readings
- current totalizers
- current-shift litres
- current-shift estimated sale

### Step 2.2 — Live refresh

Implement conservative polling only while Live MPDs is visible.

### Step 2.3 — Today's Shifts

Implement:

- current business date
- all shifts today
- MPD grouping
- active vs completed state

### Step 2.4 — MPD-specific history

Implement:

- Today's Shift History from each MPD
- MPD-context preservation

### Step 2.5 — Shift Detail

Implement read-only complete shift detail:

- header
- fuel
- four nozzles
- collections
- expenses
- Udhari
- reconciliation

### Step 2.6 — Manager intervention

Implement Force Close after read-only flow is stable.

Requirements:

- confirmation
- reason
- authorization
- audit
- correct final state

### Exit condition

A manager can see the live station and inspect every shift that occurred earlier that day.

---

# Phase 3 — Sales & Accounting

## Goal

Create the main manager accounting view.

### Tasks

1. Today accounting
2. Week accounting
3. Month accounting
4. Station total
5. MPD 1 / MPD 2 comparison
6. Petrol/Diesel split
7. Collections breakdown
8. Reconciliation
9. Expense visibility separated from collections
10. Shift drill-down
11. Nozzle drill-down where required
12. Export

### Important

Reuse backend source-of-truth calculations.

Do not implement a second accounting engine in frontend.

### Exit condition

Manager can reconcile a selected period and drill from station total down to shift/nozzle detail.

---

# Phase 4 — Stock & Rates

## Goal

Digitize the station's physical tank and density registers while keeping the UI manageable.

### Step 4.1 — Current Stock

Implement:

- Petrol/MS
- Diesel/HSD
- opening stock
- receipts
- total available
- actual sales
- calculated closing
- product dip
- actual dip stock
- variation
- water dip cm
- water dip litres
- tank capacity

### Step 4.2 — Daily Density

Implement:

- daily date entry
- hydrometer reading
- temperature
- density @15°C

### Step 4.3 — Fuel Receipts

Implement:

- invoice
- date
- quantity
- product
- tank
- before receipt observed values
- challan density
- before difference
- after decantation values
- after difference
- receipt detail

### Step 4.4 — Rates

Implement:

- Petrol rate
- Diesel rate
- effective date
- rate history
- protected historical values
- manager-only change action

### Exit condition

The Manager can maintain and review the same operational information represented in the station's physical stock/density/receipt registers.

---

# Phase 5 — Udhari

## Goal

Provide manager-level credit account control.

### Tasks

- customer list
- search
- create customer
- edit customer
- outstanding balance
- credit limit
- customer status
- ledger
- settlement
- remaining balance
- correction controls where required

### Exit condition

A manager can answer:

> Who owes us money, how much, why, and when was it settled?

---

# Phase 6 — Employees

## Goal

Provide manager control of employee accounts.

### Tasks

- employee list
- create employee
- edit employee
- active/disabled/banned
- reset credentials
- employee detail
- current shift
- shift history
- operational history

### Exit condition

A manager can create and control employee accounts without backend/manual database intervention.

---

# Phase 7 — Manager Settings & Station Configuration

## Goal

Expose only the settings required for first deployment.

### Tasks

- station information
- MPD configuration
- nozzle configuration
- tank configuration
- security/session settings already supported

Fuel rates remain accessible from Stock & Rates.

### Exit condition

Station configuration needed for daily operation can be maintained by the Manager.

---

# Phase 8 — Security, Audit & Reliability

## Goal

Harden the first deployment for real-world use.

### Tasks

- audit sensitive manager actions
- manager-only authorization checks
- force-close audit trail
- rate-change audit
- stock-change audit
- employee-account audit
- Udhari correction/settlement audit
- historical correction handling
- offline/reconnection tests
- duplicate submission/idempotency tests
- date/time boundary tests
- overnight shift tests

### Exit condition

Sensitive manager operations are traceable and the application remains reliable under normal connectivity failures.

---

# Phase 9 — First Deployment / Pilot

## Goal

Put the system in controlled use at the station.

### Pilot scope

- employee workflow
- manager Dashboard
- Operations
- Sales & Accounting
- Stock & Rates
- Udhari
- Employees

### Pilot focus

Observe:

- what managers actually use
- which fields are unnecessary
- which reports are missing
- which register fields need adjustment
- whether live MPD information is sufficient
- whether Udhari settlement flow matches real practice

Do not add advanced features merely because they are technically possible.

---

# Phase 10 — Post-Deployment Enhancements

Possible later additions:

- Notifications/Alerts
- dedicated Audit UI
- global search
- advanced analytics
- more advanced stock analytics
- richer export/reporting
- advanced permissions
- sync dashboard
- backup administration
- more product categories
- printer integrations

These are deliberately outside the first deployment baseline.
