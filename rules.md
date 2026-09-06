# rules.md (AI & Development Guidelines)

## 1. Coding Constraints & Standards
*   **JavaScript Only:** Do not generate or suggest TypeScript (`.ts`/`.tsx`) files. Use modern ES6+ features (destructuring, async/await, optional chaining).
*   **JSDoc is Mandatory:** Document all complex functions, Express controllers, and Mongoose models using JSDoc comments to ensure IDE intellisense.
*   **No Floating-Point Math for Money:** Never use standard JS operators (`+`, `-`, `*`) for currency. All financial calculations on both frontend and backend MUST use integer paise (e.g., ₹100.50 = `10050`) or a safe library like `currency.js`.
*   **Zero-Trust Backend:** The backend must NEVER trust calculated totals sent from the frontend. The frontend sends *only* source data (Opening/Closing readings, Cash Denomination counts). The backend calculates the final totals.

## 2. Validation & Error Handling
*   **Strict Zod Validation:** Every `POST`/`PUT` Express route must pass through a Zod validation middleware before hitting the controller.
*   **Centralized Error Handling:** Do not use `console.log` for production error handling. Use a dedicated Express error middleware. Return consistent JSON structures: `{ success: false, message: "...", code: "..." }`.
*   **Nozzle Math Rule:** The system must strictly block payloads where `closingReading < openingReading` unless an explicit `isMeterReset: true` boolean is attached.

## 3. UI/UX Rules
*   **Touch Targets:** Any clickable element must be a minimum of 48x48 pixels.
*   **Custom Numpad:** Do not use native HTML `<input type="number">` standard keyboards for critical data entry. Rely on the custom `MassiveNumpad` component.
*   **Tailwind CSS:** Use Tailwind for all styling. Avoid custom `.css` files unless absolutely necessary for complex animations.

## 4. AI Interaction Rules
*   **Step-by-Step:** Do not generate the entire backend or frontend in one massive response. Work module by module (e.g., "Let's build the Auth flow first").
*   **Ask for Clarification:** If a business rule is ambiguous (e.g., how to handle a specific error state), stop and ask the user before writing the code.
*   **Adhere to Structures:** Strictly follow the file names, variable names, and database schemas established in these Markdown files to prevent continuity errors.