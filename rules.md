# rules.md — AI & Development Guidelines

## 1. Scope Discipline

This is a real operational application.

The first priority is **reliability and financial correctness**, not architectural novelty.

### Mandatory rules

- Do not make broad refactors for small feature requests.
- Work one module/page at a time.
- Preserve working employee behavior.
- Do not change unrelated routes, services, models or styles.
- Prefer the smallest safe change.
- Read existing code before assuming field names or architecture.
- Do not duplicate an existing API when an existing one can be corrected/reused.
- Do not add libraries unless there is a justified requirement.

---

## 2. JavaScript Only

Use JavaScript/JSX.

Do not introduce TypeScript files.

Use modern ES6+ patterns.

Use JSDoc for complex functions where it materially improves maintainability.

---

## 3. Financial Integrity

### Money

Never use unsafe floating-point math as the trusted financial source.

Preferred representation:

```text
₹100.50 = 10050 paise
```

Frontend may display rupees, but backend-trusted calculations must use safe representations.

### Backend authority

The backend must not trust:

- total sale from client
- total collected amount from client
- reconciliation difference from client
- calculated stock totals from client

The client submits source data and the backend calculates authoritative totals.

---

## 4. Nozzle Rules

Normal meter rule:

```text
Closing Reading >= Opening Reading
```

Reject invalid readings unless an explicit supported meter-reset workflow exists.

Do not silently adjust meter values.

All four nozzles on an MPD must remain identifiable.

Nozzle data must include a clear fuel type.

---

## 5. Shift Rules

Only one active shift per employee.

Only one active shift per MPD.

MPD availability is derived from active shifts.

Shift status:

- IN_PROGRESS
- ENDED
- FORCE_CLOSED

An active shift must not disappear just because the calendar date crossed midnight.

Historical shift detail must be read-only unless an explicitly authorized manager correction flow exists.

Force close must require:

- manager authorization
- explicit confirmation
- reason
- audit record

---

## 6. Business Date and Time

Business timezone:

**Asia/Kolkata**

Use the application's existing business-date utility where possible.

Do not mix:

- browser local date
- server UTC date
- business date

without an explicit conversion.

When displaying manager data, use Indian date/time formatting consistent with the existing application.

---

## 7. Manager Authorization

Hiding a Manager page in React is not sufficient protection.

Every Manager API must enforce Manager authorization on the backend.

An Employee must not gain access by manually entering a manager URL.

Manager actions that mutate business data must be protected server-side.

---

## 8. Manager Operations Rules

The Manager Operations page must answer:

1. What is happening live?
2. What happened earlier today?

### Live MPDs

- Show MPD 1 and MPD 2.
- Show all four nozzles for each MPD.
- Free MPDs still show their latest totalizer readings.
- Do not show fake active-shift financial values for free MPDs.
- Active shift data may be refreshed conservatively.

### Today's Shifts

- show all shifts for the current business date
- group by MPD
- active shift visually distinct
- preserve MPD context from MPD-specific history

### Shift Detail

Must show all important shift information without requiring the manager to jump through unrelated pages.

---

## 9. Accounting Rules

The Manager Accounting page must use trusted backend totals.

It must support:

- Today
- Week
- Month

Station total must be reconcilable to:

```text
MPD 1 + MPD 2
```

Nozzle totals must reconcile to shift totals.

Shift totals must reconcile to station totals for the selected period.

Expenses must remain separate from customer collections.

Do not add expenses to the fuel-sale reconciliation unless an explicit future requirement changes this rule.

---

## 10. Collection Rules

Customer collection methods are:

- Cash
- Coins
- UPI / PhonePe
- Card / ATM
- Udhari

Coins are part of physical cash but may be stored separately.

Manager UI must not accidentally double count coins.

Card/ATM totals should use the existing `atmEntries` source where applicable rather than relying on obsolete summary fields if the backend already derives from entries.

UPI data must preserve existing transaction timing/amount structure.

---

## 11. Rate Rules

Fuel rates are date-effective.

Changing today's rate must not change historical shifts.

Do not overwrite rate history destructively.

A rate change should preserve:

- old rate
- new rate
- effective date
- manager who changed it
- time of change where audit support exists

---

## 12. Stock Rules

Stock calculations must reflect the physical register structure.

Use:

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

Observed physical values and calculated accounting values must remain distinguishable.

Do not silently modify stock because a physical dip differs from calculated closing.

Variation must be visible rather than hidden.

Water dip must be stored separately from product dip.

---

## 13. Density / Receipt Rules

Daily density records and fuel receipts are related but distinct.

Daily density should support:

- date
- hydrometer
- temperature
- density at 15°C

Fuel receipt should support:

- invoice
- date
- quantity
- product
- tank
- before receipt observed density data
- challan density data
- before difference
- after-decantation observed density data
- after difference

Do not invent additional density fields unless the station's actual register requires them.

---

## 14. Udhari Rules

Udhari customer accounts are persistent records.

Creating a settlement must not delete the underlying credit transaction.

The ledger must remain auditable.

Customer balance must be derived from ledger transactions using safe money logic.

Blocking a customer must prevent new credit where the business rule requires it.

Do not silently modify historical Udhari transactions.

---

## 15. Employee Management Rules

Manager may:

- create employee
- edit employee
- activate
- disable
- ban
- unban
- reset credentials

Sensitive actions should be audited.

Banned/disabled employees must not authenticate as active staff.

Do not delete employee records simply to remove their access; preserve history unless a deliberate archival system is introduced later.

---

## 16. Audit Rules

Any sensitive administrative mutation should retain enough information to answer:

- what changed?
- old value?
- new value?
- who changed it?
- when?
- why?

Important V1-sensitive actions:

- force close shift
- fuel-rate change
- stock adjustment
- employee ban/unban
- credential reset
- Udhari correction
- historical correction

A visible audit screen is not required for V1, but the information must be recoverable.

---

## 17. UI/UX Rules

### Touch targets

Clickable controls should generally be at least 48x48px.

### Mobile-first

The application is primarily used on Android phones.

### Readability

Do not make critical values tiny just to fit more information.

### Information hierarchy

Each screen should have:

```text
Primary information
↓
Supporting information
↓
Action
```

### Colors

Use existing brand tokens.

Do not introduce random colors per component.

### Status

Do not communicate important state using color alone.

### No generic admin UI

Avoid dense desktop-style grids on mobile.

---

## 18. Localization Rules

Supported languages:

- English
- Hindi
- Marathi

All user-visible text must use react-i18next.

Do not hard-code newly added labels in JSX.

Use the existing localStorage language preference.

Do not clear the language preference on logout.

Hindi and Marathi text must not be placed in tiny fixed-height containers that can clip script rendering.

---

## 19. Live Polling Rules

For Operations Live MPDs:

- use conservative polling around 10–15 seconds if required
- poll only while Live MPDs is visible
- no overlapping requests
- clean up intervals/timeouts
- avoid infinite effects
- do not use websockets for V1

---

## 20. Navigation Rules

Main Manager navigation remains six pages.

Supporting detail should be reached through contextual navigation.

Examples:

```text
Operations
  ↓
MPD 1
  ↓
Today's Shift History
  ↓
Shift Detail
```

Back should return to the manager's previous context, not always to Dashboard.

Do not create extra top-level pages for every table/detail.

---

## 21. Data Loading Rules

Avoid duplicate requests.

Do not create request loops caused by unstable effect dependencies.

Prefer existing cached/current-shift mechanisms where already implemented.

Do not make a separate backend request merely to reconstruct data already available in the current Manager response unless pagination or correctness requires it.

---

## 22. Development Workflow

Always work in this order:

```text
Inspect existing code
↓
Plan smallest change
↓
Implement one module
↓
Build/lint/test
↓
Manually verify
↓
Move to next module
```

Do not make several unrelated changes in one step.

When modifying a shared component, verify both Employee and Manager consumers.

---

## 23. Validation Rules

After significant changes:

### Frontend

```bash
npm --prefix frontend run build
```

Run focused ESLint on modified files.

### Backend

Run syntax/tests available in the repository.

### Repository hygiene

Run a whitespace/diff check where available.

Check for:

- broken imports
- duplicate routes
- accidental employee-file changes
- stale UI labels
- duplicate API endpoints

---

## 24. No-Break Rule

When working on Manager features:

DO NOT modify employee business behavior merely to make Manager easier.

The Manager should consume and display the existing employee-produced data correctly.

If an existing employee-side bug affects Manager correctness, isolate and fix only the necessary shared/backend logic, then re-test the employee workflow.

---

## 25. First Deployment Rule

Do not build advanced features just because they may be useful someday.

V1 should cover:

- live operations
- today's shift history
- accounting
- stock/register records
- rates
- Udhari
- employee management
- required manager intervention

Everything else is optional until actual station usage demonstrates the need.
