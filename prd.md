# prd.md (Project Requirements Document)

## 1. Project Overview
**Name:** Shobhadamodar Petroleum Operations App
**Business Context:** A BPCL-authorized retail outlet / petrol pump in India.
**Objective:** To digitize and secure the manual, paper-based accounting and operational workflows of a real-world petrol pump. The system must enforce financial integrity, support intermittent internet connectivity, and provide clear reconciliation of expected sales vs. collected funds.

## 2. Target Audience & Roles
*   **Pump Attendants (Employees):** Non-technical staff operating in fast-paced, outdoor environments. Require large touch targets, minimal typing, and multi-language support (English, Hindi, Marathi).
*   **Station Managers / Owners:** Administrative users who manage fuel rates, oversee shift handovers, investigate financial discrepancies (Short/Excess), and finalize daily accounts.

## 3. Core Features & Scope
*   **Shift-Based Operations:** Data is logged per shift (e.g., Morning, Evening, Night) rather than just daily.
*   **Smart Nozzle Readings:** Automated calculation of dispensed fuel (Closing Reading - Opening Reading) mapped against real-time fuel rates.
*   **Multi-Mode Collections:** Tracking of Cash (via denomination grid), UPI, Card/ATM, and Udhari (Customer Credit).
*   **Udhari (Credit) Ledger:** A searchable directory of frequent credit customers (e.g., transporters) to maintain running balances.
*   **Automated Reconciliation:** Server-side deterministic calculation of `Expected Sale` vs. `Total Collected` to flag discrepancies.
*   **Offline-First Resilience:** The app must function seamlessly during internet outages, queuing data locally and syncing automatically when reconnected using idempotency keys.
*   **Multi-Lingual Interface:** Instant toggle between English, Hindi, and Marathi.

## 4. Edge Cases & Constraints
*   **System Bootstrap (Day 1):** Manager must physically seed the initial opening meter readings on day one.
*   **Shift Overrides:** Manager capability to force-close a shift if an employee forgets to log out.
*   **Midnight Rate Changes:** Shifts spanning a fuel rate change must be handled logically (e.g., forcing a shift split at 11:59 PM).
*   **Hardware Limitations:** Built for Android smartphones used in bright daylight; UI relies on high contrast and custom oversized numpads rather than native OS keyboards.