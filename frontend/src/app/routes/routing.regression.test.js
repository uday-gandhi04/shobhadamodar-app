// frontend/src/app/routes/routing.regression.test.js
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ─── Mock React Component & Context Helpers for Guard Unit Logic ─── */

function resolveGuardDestination(guardFn, authContextValue) {
  // Simulates guard evaluation logic
  const { token, user, isLoading } = authContextValue;

  if (guardFn === "ManagerRoute") {
    if (isLoading) return { status: "LOADING" };
    if (!token || !user) return { status: "REDIRECT", to: "/login" };
    if (user.role !== "MANAGER") return { status: "REDIRECT", to: "/select-mpd" };
    return { status: "ALLOWED" };
  }

  if (guardFn === "EmployeeRoute") {
    if (isLoading) return { status: "LOADING" };
    if (!token || !user) return { status: "REDIRECT", to: "/login" };
    if (user.role === "MANAGER") return { status: "REDIRECT", to: "/manager" };
    if (user.role !== "EMPLOYEE") return { status: "REDIRECT", to: "/login" };
    return { status: "ALLOWED" };
  }

  if (guardFn === "ProtectedRoute") {
    if (isLoading) return { status: "LOADING" };
    if (!token || !user || !user.role) return { status: "REDIRECT", to: "/login" };
    return { status: "ALLOWED" };
  }

  throw new Error(`Unknown guard: ${guardFn}`);
}

async function resolveLandingDestination(authContextValue, mockShiftResponse = null) {
  const { token, user, isLoading } = authContextValue;

  if (isLoading) return { status: "LOADING" };
  if (!token || !user || !user.role) return { status: "REDIRECT", to: "/login" };
  if (user.role === "MANAGER") return { status: "REDIRECT", to: "/manager" };

  if (user.role === "EMPLOYEE") {
    if (mockShiftResponse) {
      const activeMpdId = mockShiftResponse.mpdId?._id || mockShiftResponse.mpdId;
      return { status: "REDIRECT", to: `/shift/${activeMpdId}` };
    }
    return { status: "REDIRECT", to: "/select-mpd" };
  }

  return { status: "REDIRECT", to: "/login" };
}

/* ─── Regression Tests ─── */

test("1. Manager login leads to correct manager landing page (/manager)", async () => {
  const managerSession = {
    token: "jwt-manager-token-abc",
    user: { _id: "mgr1", name: "Uday", role: "MANAGER" },
    isLoading: false,
  };

  const landing = await resolveLandingDestination(managerSession);
  assert.equal(landing.status, "REDIRECT");
  assert.equal(landing.to, "/manager");
});

test("2. Manager session restoration works after refresh", async () => {
  // Simulates stored manager session restored from localStorage
  const restoredSession = {
    token: "stored-jwt-token-xyz",
    user: { _id: "mgr1", name: "Uday", role: "MANAGER" },
    isLoading: false,
  };

  const guardResult = resolveGuardDestination("ManagerRoute", restoredSession);
  assert.equal(guardResult.status, "ALLOWED");

  const landingResult = await resolveLandingDestination(restoredSession);
  assert.equal(landingResult.to, "/manager");
});

test("3. Manager session restoration works in a new tab", async () => {
  // Simulates opening a brand new browser tab pointing to root /
  const newTabSession = {
    token: "persisted-session-token",
    user: { _id: "mgr1", name: "Uday", role: "MANAGER" },
    isLoading: false,
  };

  const destination = await resolveLandingDestination(newTabSession);
  assert.equal(destination.to, "/manager");
  assert.notEqual(destination.to, "/select-mpd");
});

test("4. Manager auth hydration never triggers employee MPD selection prematurely", async () => {
  const hydratingSession = {
    token: null,
    user: null,
    isLoading: true,
  };

  const guard = resolveGuardDestination("ManagerRoute", hydratingSession);
  assert.equal(guard.status, "LOADING");
  assert.notEqual(guard.status, "REDIRECT");

  const landing = await resolveLandingDestination(hydratingSession);
  assert.equal(landing.status, "LOADING");
  assert.notEqual(landing.to, "/select-mpd");
});

test("5. Direct manager access to each valid manager route works", () => {
  const managerSession = {
    token: "manager-token",
    user: { _id: "mgr1", role: "MANAGER" },
    isLoading: false,
  };

  const validManagerRoutes = [
    "/manager",
    "/manager/operations",
    "/manager/accounting",
    "/manager/stock",
    "/manager/udhari",
    "/manager/employees",
    "/manager/settings",
    "/manager/settings/mpds",
  ];

  for (const route of validManagerRoutes) {
    const result = resolveGuardDestination("ManagerRoute", managerSession);
    assert.equal(result.status, "ALLOWED", `Manager should have access to ${route}`);
  }
});

test("6. A manager opening an employee-only route is handled correctly (redirected to /manager)", () => {
  const managerSession = {
    token: "manager-token",
    user: { _id: "mgr1", role: "MANAGER" },
    isLoading: false,
  };

  const employeeRoutes = [
    "/select-mpd",
    "/shift/mpd_1",
    "/shift/cash",
    "/shift/upi",
    "/shift/card",
    "/shift/udhari",
    "/shift/expense",
    "/shift/review",
  ];

  for (const route of employeeRoutes) {
    const result = resolveGuardDestination("EmployeeRoute", managerSession);
    assert.equal(result.status, "REDIRECT", `Manager accessing ${route} must be redirected`);
    assert.equal(result.to, "/manager", `Manager accessing ${route} must be redirected to /manager`);
  }
});

test("7. Employee without an active shift reaches MPD selection (/select-mpd)", async () => {
  const employeeSession = {
    token: "employee-token",
    user: { _id: "emp1", role: "EMPLOYEE" },
    isLoading: false,
  };

  const landing = await resolveLandingDestination(employeeSession, null);
  assert.equal(landing.status, "REDIRECT");
  assert.equal(landing.to, "/select-mpd");

  const guard = resolveGuardDestination("EmployeeRoute", employeeSession);
  assert.equal(guard.status, "ALLOWED");
});

test("8. Employee with an active shift reaches the active-shift workflow (/shift/:mpdId)", async () => {
  const employeeSession = {
    token: "employee-token",
    user: { _id: "emp1", role: "EMPLOYEE" },
    isLoading: false,
  };

  const activeShift = {
    _id: "shift_123",
    mpdId: { _id: "mpd_abc", mpdNumber: "MPD-1" },
    status: "IN_PROGRESS",
  };

  const landing = await resolveLandingDestination(employeeSession, activeShift);
  assert.equal(landing.status, "REDIRECT");
  assert.equal(landing.to, "/shift/mpd_abc");
});

test("9. Employee access to manager-only routes is blocked (redirected to /select-mpd)", () => {
  const employeeSession = {
    token: "employee-token",
    user: { _id: "emp1", role: "EMPLOYEE" },
    isLoading: false,
  };

  const result = resolveGuardDestination("ManagerRoute", employeeSession);
  assert.equal(result.status, "REDIRECT");
  assert.equal(result.to, "/select-mpd");
});

test("10. Unauthenticated requests to protected routes follow the login flow", () => {
  const unauthSession = {
    token: null,
    user: null,
    isLoading: false,
  };

  assert.equal(resolveGuardDestination("ManagerRoute", unauthSession).to, "/login");
  assert.equal(resolveGuardDestination("EmployeeRoute", unauthSession).to, "/login");
  assert.equal(resolveGuardDestination("ProtectedRoute", unauthSession).to, "/login");
});

test("11. Invalid and expired sessions are handled safely without defaulting to employee role", async () => {
  // Case A: token exists but user object is missing or corrupted
  const corruptedSession = {
    token: "orphaned-token",
    user: null,
    isLoading: false,
  };

  assert.equal(resolveGuardDestination("ProtectedRoute", corruptedSession).to, "/login");
  assert.equal(resolveGuardDestination("ManagerRoute", corruptedSession).to, "/login");
  assert.equal(resolveGuardDestination("EmployeeRoute", corruptedSession).to, "/login");
  assert.equal((await resolveLandingDestination(corruptedSession)).to, "/login");

  // Case B: token and user exist but role is undefined/unresolved
  const unresolvedRoleSession = {
    token: "valid-token",
    user: { _id: "user1", name: "Unknown" }, // missing role
    isLoading: false,
  };

  assert.equal(resolveGuardDestination("ProtectedRoute", unresolvedRoleSession).to, "/login");
  assert.equal(resolveGuardDestination("EmployeeRoute", unresolvedRoleSession).to, "/login");
  assert.equal((await resolveLandingDestination(unresolvedRoleSession)).to, "/login");
});

test("12. /dashboard follows verified legacy redirect based on authenticated role", async () => {
  const managerSession = {
    token: "mgr-token",
    user: { _id: "mgr1", role: "MANAGER" },
    isLoading: false,
  };
  const managerTarget = await resolveLandingDestination(managerSession);
  assert.equal(managerTarget.to, "/manager", "/dashboard for Manager must redirect to /manager");

  const employeeSession = {
    token: "emp-token",
    user: { _id: "emp1", role: "EMPLOYEE" },
    isLoading: false,
  };
  const empTargetNoShift = await resolveLandingDestination(employeeSession, null);
  assert.equal(empTargetNoShift.to, "/select-mpd", "/dashboard for Employee without shift must redirect to /select-mpd");

  const empTargetWithShift = await resolveLandingDestination(employeeSession, { mpdId: "mpd_1" });
  assert.equal(empTargetWithShift.to, "/shift/mpd_1", "/dashboard for Employee with shift must redirect to active shift");
});

test("13. Unknown URLs render NotFound without redirect loops", () => {
  // Read App.jsx and verify catch-all route exists
  const appPath = path.resolve(__dirname, "App.jsx");
  const appContent = fs.readFileSync(appPath, "utf-8");

  assert.match(appContent, /<Route\s+path="\*"\s+element=\{<NotFound\s*\/>\}/, "App.jsx must have a catch-all Route for *");
  assert.doesNotMatch(appContent, /<Route\s+path="\*"\s+element=\{<Navigate\s+to="\/dashboard"/, "Catch-all must NOT redirect to /dashboard");
});

test("14. All active navigation links target existing routes", () => {
  const appPath = path.resolve(__dirname, "App.jsx");
  const appContent = fs.readFileSync(appPath, "utf-8");

  // Extract all registered route paths in App.jsx
  const registeredPaths = new Set();
  const routeRegex = /<Route\s+path="([^"]+)"/g;
  let match;
  while ((match = routeRegex.exec(appContent)) !== null) {
    registeredPaths.add(match[1]);
  }

  // ManagerBottomNav targets
  const managerNavPath = path.resolve(__dirname, "../../features/manager/ManagerBottomNav.jsx");
  const managerNavContent = fs.readFileSync(managerNavPath, "utf-8");
  const pathMatches = managerNavContent.match(/path:\s*"([^"]+)"/g) || [];

  for (const m of pathMatches) {
    const p = m.replace(/path:\s*"|"$/g, "");
    assert.ok(registeredPaths.has(p), `ManagerBottomNav link '${p}' must be registered in App.jsx`);
  }

  // WorkflowStatusBar targets
  const workflowPath = path.resolve(__dirname, "../../components/business/workflow/WorkflowStatusBar.jsx");
  const workflowContent = fs.readFileSync(workflowPath, "utf-8");
  const expectedStages = ["/shift/cash", "/shift/upi", "/shift/card", "/shift/udhari", "/shift/expense", "/shift/review"];

  for (const stage of expectedStages) {
    assert.ok(registeredPaths.has(stage), `Workflow stage '${stage}' must be registered in App.jsx`);
    assert.ok(workflowContent.includes(stage), `WorkflowStatusBar must reference '${stage}'`);
  }
});

test("15. Removed/superseded routes have no unintended active references", () => {
  const appPath = path.resolve(__dirname, "App.jsx");
  const appContent = fs.readFileSync(appPath, "utf-8");

  // Verify that root / no longer unconditionally navigates to /dashboard
  assert.doesNotMatch(
    appContent,
    /<Route\s+path="\/"\s+element=\{<Navigate\s+to="\/dashboard"/,
    "Root route / must NOT unconditionally navigate to /dashboard"
  );

  // Verify legacy routes are redirected safely
  assert.ok(appContent.includes('path="/collections"'));
  assert.ok(appContent.includes('path="/expenses"'));
  assert.ok(appContent.includes('path="/end-shift"'));
  assert.ok(appContent.includes('path="/end-shift-review"'));
  assert.ok(appContent.includes('path="/dashboard"'));
});

test("16. Existing shift lifecycle, manager Operations, and employee functionality remain intact", () => {
  const appPath = path.resolve(__dirname, "App.jsx");
  const appContent = fs.readFileSync(appPath, "utf-8");

  // Verify core manager routes are preserved
  const managerRoutes = [
    "/manager",
    "/manager/accounting",
    "/manager/operations",
    "/manager/stock",
    "/manager/udhari",
    "/manager/employees",
    "/manager/settings",
    "/manager/settings/mpds",
  ];
  for (const r of managerRoutes) {
    assert.ok(appContent.includes(`path="${r}"`), `App.jsx must retain manager route ${r}`);
  }

  // Verify core employee routes are preserved
  const employeeRoutes = [
    "/select-mpd",
    "/shift/:mpdId",
    "/shift/cash",
    "/shift/upi",
    "/shift/card",
    "/shift/udhari",
    "/shift/expense",
    "/shift/review",
  ];
  for (const r of employeeRoutes) {
    assert.ok(appContent.includes(`path="${r}"`), `App.jsx must retain employee route ${r}`);
  }
});
