# architecture.md (Architecture & Tech Stack)

## 1. System Architecture
The application follows an **Offline-First, API-Driven Architecture**.
*   **Client (Edge):** Acts as a smart, semi-autonomous terminal. It hydrates (downloads) necessary shift data upon login, performs operations locally, and sends a bulk payload (Sync) at the end of the shift.
*   **API Gateway:** A stateless Node.js REST API that never trusts client math. It re-calculates all financial derivations.
*   **Database:** A centralized MongoDB instance acting as the immutable system of record.

## 2. Technology Stack
*   **Language:** JavaScript (ES6+). *Strictly NO TypeScript.* Use JSDoc for type-hinting.
*   **Frontend Mobile:** React.js, Ionic Framework (for mobile UI components), Capacitor (for native device compilation).
*   **Frontend Local Storage:** Capacitor SQLite (for persistent offline storage).
*   **Backend:** Node.js, Express.js.
*   **Database:** MongoDB with Mongoose ODM.
*   **Validation:** Zod (for strict schema validation on the backend).
*   **Financial Math:** `currency.js` or `dinero.js` (to prevent JS floating-point rounding errors).

## 3. High-Level Data Flow
1.  **Hydration:** `GET /api/sync/bootstrap` -> Pulls active MPDs, rates, and last closing readings to SQLite.
2.  **Local Operation:** Employee inputs data. App calculates preview math using local JS.
3.  **Submission:** App generates an `idempotencyKey` and sends payload to `POST /api/sync/submit`.
4.  **Verification:** Backend ignores client math, re-calculates using raw readings, and saves to MongoDB.
5.  **Confirmation:** Backend returns the true reconciled receipt to the client.

## 4. Folder Structure (Monorepo Setup)

```text
/shobhadamodar-app
│
├── /backend                 # Node.js + Express API
│   ├── /src
│   │   ├── /config          # DB connection, Env vars
│   │   ├── /controllers     # Business logic & calculations
│   │   ├── /middlewares     # Auth (JWT), Error handling
│   │   ├── /models          # Mongoose Schemas (Users, Shifts, Customers)
│   │   ├── /routes          # Express route definitions
│   │   ├── /utils           # Math helpers, idempotency checks
│   │   └── /validations     # Zod schemas for request payloads
│   ├── .env
│   └── server.js            # Entry point
│
└── /frontend                # React + Ionic + Capacitor
    ├── /src
    │   ├── /assets          # Images, Nozzle vectors, Icons
    │   ├── /components
    │   │   ├── /ui          # Buttons, MassiveNumpad, Headers
    │   │   └── /business    # NozzleSelector, CashGrid
    │   ├── /context         # AuthContext, SyncContext
    │   ├── /database        # SQLite wrapper and local queries
    │   ├── /hooks           # Custom React hooks (e.g., useOfflineSync)
    │   ├── /i18n            # Locales (en.json, hi.json, mr.json)
    │   ├── /pages           # App screens (Dashboard, Readings, Finalize)
    │   ├── /services        # API client (Axios/Fetch)
    │   └── App.jsx          # Root component & Routing
    ├── capacitor.config.json
    └── tailwind.config.js