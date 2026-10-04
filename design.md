# design.md — Shobhadamodar Petroleum UI/UX Design System

## 1. Design Status

**Version:** V1.0 — First Deployment / Manager Approval Baseline  
**Last Updated:** 04 October 2026

The Manager UI must feel like the same product as the Employee UI, not a separate generic administration dashboard.

---

## 2. Core Design Philosophy

### Field-ready clarity

The application is used in a real petrol-pump environment. Prioritize:

- readability
- high contrast
- clear grouping
- large touch targets
- fast scanning
- low cognitive load

### Manager-first information hierarchy

The manager should immediately understand:

```text
What is happening now?
↓
What happened today?
↓
Why do the numbers look this way?
```

### Practical, not decorative

Do not design the Manager UI as a generic SaaS dashboard.

Avoid:

- excessive charts
- decorative gradients
- glassmorphism
- tiny data-dense tables
- excessive colors
- large empty hero areas

---

## 3. Relationship to Employee UI

Reuse the same visual language:

- same brand colors
- same typography
- same rounded-card language
- same icon family
- same spacing rhythm
- same language switcher
- same general header/bottom-navigation style

The Manager UI may use denser information than Employee UI, but it must remain touch-friendly.

---

## 4. Typography

### English and numerals

Primary: **Inter**

### Hindi / Marathi

Primary: **Mukta** or the existing equivalent already configured in the application.

### Scale guidance

Use responsive sizing rather than forcing oversized type into every small card.

Suggested levels:

- Screen title: 20–24px
- Section title: 14–18px
- Primary financial number: 22–32px depending on context
- Primary content: 14–16px
- Secondary text: 11–13px
- Micro labels: 9–11px

The current implementation may use smaller mobile text than this where space requires it, but readability must remain the priority.

---

## 5. Color Palette

### Brand/UI

- Emerald Primary: `#059669`
- Emerald Dark / Press: `#047857`
- Background: `#F3F4F6`
- Surface: `#FFFFFF`
- Primary Text: `#111827`
- Muted Text: `#6B7280`
- Border: soft slate/gray

### Fuel semantics

- Petrol: green family
- Diesel: blue family

### Status semantics

- Active / Match / Healthy: green
- Pending / Attention: amber
- Shortage / Error / Destructive: red
- Neutral / Free / Inactive: slate/gray

Use red sparingly. A red state should mean something important.

---

## 6. Layout Rules

Use the existing app's 8-point spacing rhythm.

General guidance:

- page horizontal padding: 16–20px
- major card spacing: 12–16px
- card internal padding: 16–20px
- small metric spacing: 8–12px
- bottom navigation safe-area padding must be preserved

Do not compress cards merely to fit more data on one screen.

---

## 7. Standard Components

### Header

Manager pages use the shared ManagerHeader.

It includes:

- back control where appropriate
- station/app identity
- current page title
- manager profile
- language switcher
- logout in profile menu

### Manager bottom navigation

Use the shared ManagerBottomNav.

Primary destinations:

- Dashboard
- Operations
- Accounting
- Stock
- Udhari
- Employees

Do not add more bottom-nav items unless the information architecture is deliberately changed.

### Tabs

Use tabs only when switching between closely related datasets.

Manager V1 examples:

Operations:

```text
Live MPDs | Today's Shifts
```

Stock:

```text
Current Stock | Receipts & Density | Rates
```

Do not use tabs to hide unrelated features.

### Cards

Standard:

- white background
- 18–22px radius
- soft shadow
- clear internal sections

Avoid excessive nested cards. A card inside a card should only be used when it improves hierarchy.

---

# 8. DASHBOARD DESIGN

The Manager Dashboard is intentionally minimal.

Use a 2-column action grid:

```text
┌──────────────┐ ┌──────────────┐
│ Sales &      │ │ Operations   │
│ Accounting   │ │              │
└──────────────┘ └──────────────┘

┌──────────────┐ ┌──────────────┐
│ Stock &      │ │ Udhari       │
│ Rates        │ │              │
└──────────────┘ └──────────────┘

┌──────────────┐
│ Employees    │
└──────────────┘
```

Each card should contain:

- icon
- title
- one-line description
- chevron/arrow

No large statistic cards are required in V1.

---

# 9. OPERATIONS DESIGN

## 9.1 Live MPDs

The MPD is the primary visual object.

Recommended hierarchy:

```text
MPD 1                    ● ACTIVE
Rahul
Started 08:12 AM

N1        N2        N3        N4
PETROL    DIESEL    DIESEL    PETROL
Current   Current   Current   Current
Reading   Reading   Reading   Reading
Shift L   Shift L   Shift L   Shift L

Current Shift
Petrol     xxx L
Diesel     xxx L
Total      xxxx L
Sale       ₹xxxxx

Today's Shift History →
```

### Nozzle cards

Four nozzles should remain clearly visible.

Do not reduce them to tiny decorative chips.

A live nozzle should prioritize:

1. Nozzle ID
2. Fuel type
3. Current totalizer
4. Current-shift dispensed litres
5. Opening reading as secondary information

For a free MPD:

- always show current totalizer readings
- show no active shift
- show last completed shift when useful
- do not show fake live-sale totals

### Status

Use a clear pill:

- `● ACTIVE`
- `● FREE`

The status color must be immediately recognizable.

---

## 9.2 Today's Shifts

Group by MPD.

```text
TODAY'S SHIFTS
02 Oct 2026

MPD 1
────────────────
08:00 AM – 02:00 PM
Amit              ● ENDED

Petrol     620.40 L
Diesel     580.20 L
Total    1,200.60 L
Sale       ₹1,40,330

                    →
```

Each shift card should have a strong primary row, then metrics.

Avoid dense tables on the small screen.

---

## 9.3 Shift Detail

Use clear stacked sections:

1. Shift header
2. Fuel Sales
3. Nozzle Readings
4. Collections
5. Expenses
6. Udhari
7. Reconciliation

All four nozzles must be individually readable.

The detail view should feel like an organized digital shift report, not a form.

---

# 10. SALES & ACCOUNTING DESIGN

Top:

```text
Today | Week | Month
```

Then:

- selected period/date
- station totals
- petrol/diesel summary
- MPD comparison
- collections
- reconciliation
- expenses

Financial values should have stronger typography than their labels.

Example:

```text
TOTAL SALE
₹2,84,530
```

Do not make every number huge.

Use tables only when comparison truly benefits from tabular layout.

---

# 11. STOCK & RATES DESIGN

Top tabs:

```text
Current Stock | Receipts & Density | Rates
```

## 11.1 Current Stock

Show product selector:

```text
Petrol (MS) | Diesel (HSD)
```

Stock Calculation section:

```text
Opening Stock
+ Receipt Stock
──────────────
Total Available

Actual Sales
──────────────
Calculated Closing
```

Then a visually distinct:

**Physical Verification**

```text
Product Dip
Actual Dip Stock
Variation
Water Dip
Water Dip Volume
```

The manager should be able to distinguish:

- calculated/accounting value
- physical observation

### Variation

Positive variation can use green/neutral emphasis.
Negative variation can use red/amber depending on the configured business semantics.

---

## 11.2 Receipts & Density

Secondary tabs:

```text
Daily Density | Fuel Receipts
```

Daily Density should use a clean mobile table/card hybrid:

```text
Date | Hydrometer | Temp | Density @15°C
```

Fuel Receipts should be a list of receipt cards showing:

- invoice
- date
- product
- quantity
- density-check summary

Tap to open Receipt Detail.

Receipt Detail sections:

- receipt identity
- before receipt
- challan details
- after decantation
- differences

Use subtle section colors only where they communicate a semantic difference.

---

## 11.3 Rates

Current rate cards:

```text
Petrol
₹112.15 / L
Effective 01 Oct 2026

Diesel
₹98.77 / L
Effective 01 Oct 2026
```

Then Rate History.

The edit action must be visually obvious but not dominant.

---

# 12. UDHARI DESIGN

Primary screen:

- Total Outstanding
- Customer Count
- Search
- Add Customer
- customer list

Customer rows should show:

- avatar/initial
- name
- contact/secondary detail
- outstanding amount
- status
- chevron

Customer detail should show outstanding balance prominently.

Settlement should use a simple amount + payment method flow.

Do not turn Udhari into a spreadsheet.

---

# 13. EMPLOYEES DESIGN

Employee list:

```text
Amit Kumar
EMP002
● Active

Rahul
EMP003
● Active

Suresh
EMP004
● Banned
```

Use clear status chips.

Employee Detail should separate:

- Profile
- Current Shift
- Shift History
- Actions

Destructive actions such as Ban should never be placed directly beside a normal edit control without confirmation.

---

# 14. Forms

Manager forms should use:

- top-aligned labels
- large enough values
- clear validation
- strong primary action
- cancel/back behavior

Financial amount fields must support decimal rupee input safely.

Density, temperature and meter values should use numeric-friendly input handling.

---

# 15. Accessibility and Usability

Clickable elements should generally be at least 48x48px.

Ensure:

- sufficient text contrast
- icons have accessible labels
- buttons have visible states
- important status is not communicated by color alone
- Hindi/Marathi do not overflow containers

---

# 16. Motion

Use only subtle interaction feedback:

- scale/press feedback
- short transitions
- small state changes

Do not use heavy animated dashboards.

Live refresh should update data without making the whole screen visibly jump.

---

# 17. First Deployment Design Principle

The Manager should be able to operate the app after seeing the six-page structure once.

If a screen requires an explanation of where to find a basic operational function, the navigation is too complicated.
