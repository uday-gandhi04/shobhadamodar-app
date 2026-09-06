# phases.md (Project Implementation Phases)

## Phase 1: Backend Foundation & API (Current Phase)
*   **Goal:** Establish a secure, tested, zero-trust backend.
*   **Tasks:**
    *   Initialize Node.js/Express environment.
    *   Set up MongoDB connection.
    *   Create Mongoose Models (`User`, `Station`, `MPD`, `Shift`, `Customer`).
    *   Implement Zod validation middleware.
    *   Build Auth routes (JWT login/verification).
    *   Build Sync endpoints (`/bootstrap` and `/submit`) with deterministic math logic.
    *   Test APIs using Postman/ThunderClient.

## Phase 2: Mobile App Foundation & Offline Engine
*   **Goal:** Set up the React/Ionic app and make it capable of working without internet.
*   **Tasks:**
    *   Initialize React + Vite + Ionic + Tailwind app.
    *   Integrate Capacitor and configure native build environments.
    *   Set up Capacitor SQLite.
    *   Build the `SyncService` that pulls data from `/bootstrap` and stores it locally.
    *   Implement the `i18n` language toggle (English, Hindi, Marathi).

## Phase 3: The Employee Workflow UI
*   **Goal:** Build the 4-iteration, field-ready UI for pump attendants.
*   **Tasks:**
    *   Build the high-contrast Dashboard.
    *   Build the custom `MassiveNumpad` component.
    *   Build the `NozzleSelector` UI and local reading math.
    *   Build the Cash Denomination Grid and Udhari Search interface.
    *   Wire UI components to the local SQLite state.

## Phase 4: Submission & Manager Dashboard
*   **Goal:** Complete the shift lifecycle and build manager tools.
*   **Tasks:**
    *   Implement the idempotency queue (sending local SQLite data to the backend).
    *   Build the visual Reconciliation Success/Error screens.
    *   Build the Manager Web/Mobile Dashboard to view completed shifts.
    *   Implement "Force Close Shift" and "Initial Seed" edge-case features.

## Phase 5: Polish & Deployment Preparation
*   **Goal:** Get the app ready for real-world pump usage.
*   **Tasks:**
    *   Implement audit logging for sensitive manager actions.
    *   Test offline reconnection flows (turning WiFi off and on).
    *   (Optional) Explore Bluetooth Thermal Printer integration for Udhari receipts.
    *   Production deployment (Render/AWS for backend, APK generation for mobile).