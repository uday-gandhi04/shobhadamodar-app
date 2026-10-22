// src/App.jsx
import { IonApp, IonRouterOutlet, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Route, Navigate, useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

/* Core CSS */
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Pages & Contexts */
import Login from "../../features/auth/Login";
import SelectMpd from "../../features/employee/shift/SelectMpd";
import EndShift from "../../features/employee/shift/EndShift";
import ManagerDashboard from "../../features/manager/ManagerDashboard";
import { AuthProvider, AuthContext } from "../../context/AuthContext";
import { SyncProvider } from "../../context/SyncContext";
import EndShiftReview from "../../features/employee/review/EndShiftReview";
import Expenses from "../../features/employee/expenses/Expenses";
import CashCollectionPage from "../../features/employee/collections/CashCollectionPage";
import UpiCollectionPage from "../../features/employee/collections/UpiCollectionPage";
import CardCollectionPage from "../../features/employee/collections/CardCollectionPage";
import UdhariCollectionPage from "../../features/employee/collections/UdhariCollectionPage";

import Accounting from "../../features/manager/Accounting";
import Operations from "../../features/manager/Operations";
import Stock from "../../features/manager/Stock";
import Udhari from "../../features/manager/Udhari";
import Employees from "../../features/manager/Employees";
import Settings from "../../features/manager/Settings";
import MpdConfig from "../../features/manager/MpdConfig";
import NotFound from "../../features/common/NotFound";
import { getCurrentShift } from "../../services/shiftApi";
setupIonicReact();

export const LoadingFallback = () => (
  <div className="grid min-h-[100dvh] w-full place-items-center bg-[#F3F4F6]">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#047857]" />
      <span className="text-[12px] font-semibold text-slate-500">Loading…</span>
    </div>
  </div>
);

// Wrapper to require valid session
export const ProtectedRoute = ({ children }) => {
  const { token, user, isLoading } = useContext(AuthContext);
  if (isLoading) return <LoadingFallback />;
  if (!token || !user || !user.role) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Manager-only route guard
export const ManagerRoute = ({ children }) => {
  const { token, user, isLoading } = useContext(AuthContext);

  if (isLoading) return <LoadingFallback />;

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "MANAGER") {
    return <Navigate to="/select-mpd" replace />;
  }

  return children;
};

// Employee-only route guard
export const EmployeeRoute = ({ children }) => {
  const { token, user, isLoading } = useContext(AuthContext);

  if (isLoading) return <LoadingFallback />;

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "MANAGER") {
    return <Navigate to="/manager" replace />;
  }

  if (user.role !== "EMPLOYEE") {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Role-aware landing dispatcher for root / and legacy /dashboard
export const LandingRedirect = () => {
  const { token, user, isLoading } = useContext(AuthContext);
  const [employeeShiftPath, setEmployeeShiftPath] = useState(null);

  useEffect(() => {
    let mounted = true;

    if (!token || !user || user.role !== "EMPLOYEE") {
      return;
    }

    getCurrentShift()
      .then((response) => {
        if (!mounted) return;
        const currentShift = response?.data;
        if (currentShift) {
          const activeMpdId = currentShift.mpdId?._id || currentShift.mpdId;
          setEmployeeShiftPath(`/shift/${activeMpdId}`);
        } else {
          setEmployeeShiftPath("/select-mpd");
        }
      })
      .catch(() => {
        if (!mounted) return;
        setEmployeeShiftPath("/select-mpd");
      });

    return () => {
      mounted = false;
    };
  }, [token, user]);

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (!token || !user || !user.role) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "MANAGER") {
    return <Navigate to="/manager" replace />;
  }

  if (user.role === "EMPLOYEE") {
    if (!employeeShiftPath) {
      return <LoadingFallback />;
    }
    return <Navigate to={employeeShiftPath} replace />;
  }

  return <Navigate to="/login" replace />;
};

const NativeBackButtonHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle = null;

    const register = async () => {
      handle = await CapApp.addListener("backButton", ({ canGoBack }) => {
        // 1. Dispatch Escape for open dropdowns and menus
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Escape",
            code: "Escape",
            bubbles: true,
            cancelable: true,
          })
        );

        // 2. Dismiss open HTML dialog if present
        const openDialog = document.querySelector("dialog[open]");
        if (openDialog) {
          openDialog.close();
          return;
        }

        // 3. For root destinations, exit/minimize app cleanly rather than popping session
        const currentPath = window.location.pathname;
        const rootPaths = ["/login", "/manager", "/select-mpd"];

        if (rootPaths.includes(currentPath)) {
          CapApp.exitApp();
          return;
        }

        // 4. Safely navigate back in inner workflow
        if (canGoBack || window.history.length > 1) {
          navigate(-1);
        } else {
          CapApp.exitApp();
        }
      });
    };

    register();

    return () => {
      if (handle) {
        handle.remove();
      }
    };
  }, [navigate]);

  return null;
};

function App() {
  return (
    <IonApp>
      <AuthProvider>
        <SyncProvider>
          <IonReactRouter>
            <NativeBackButtonHandler />
            <IonRouterOutlet>
              {/* Authentication */}
              <Route path="/login" element={<Login />} />

              {/* Employee entry */}
              <Route
                path="/select-mpd"
                element={
                  <EmployeeRoute>
                    <SelectMpd />
                  </EmployeeRoute>
                }
              />

              {/* Legacy dashboard visit -> Role-aware redirect */}
              <Route path="/dashboard" element={<LandingRedirect />} />

              {/* Manager area */}
              <Route
                path="/manager"
                element={
                  <ManagerRoute>
                    <ManagerDashboard />
                  </ManagerRoute>
                }
              />

              <Route
                path="/manager/accounting"
                element={
                  <ManagerRoute>
                    <Accounting />
                  </ManagerRoute>
                }
              />

              <Route
                path="/manager/operations"
                element={
                  <ManagerRoute>
                    <Operations />
                  </ManagerRoute>
                }
              />

              <Route
                path="/manager/stock"
                element={
                  <ManagerRoute>
                    <Stock />
                  </ManagerRoute>
                }
              />

              <Route
                path="/manager/udhari"
                element={
                  <ManagerRoute>
                    <Udhari />
                  </ManagerRoute>
                }
              />

              <Route
                path="/manager/employees"
                element={
                  <ManagerRoute>
                    <Employees />
                  </ManagerRoute>
                }
              />

              <Route
                path="/manager/settings"
                element={
                  <ManagerRoute>
                    <Settings />
                  </ManagerRoute>
                }
              />

              <Route
                path="/manager/settings/mpds"
                element={
                  <ManagerRoute>
                    <MpdConfig />
                  </ManagerRoute>
                }
              />

              {/* Employee shift workflow */}
              <Route
                path="/shift/:mpdId"
                element={
                  <EmployeeRoute>
                    <EndShift />
                  </EmployeeRoute>
                }
              />

              <Route
                path="/shift/cash"
                element={
                  <EmployeeRoute>
                    <CashCollectionPage />
                  </EmployeeRoute>
                }
              />
              <Route
                path="/shift/upi"
                element={
                  <EmployeeRoute>
                    <UpiCollectionPage />
                  </EmployeeRoute>
                }
              />
              <Route
                path="/shift/card"
                element={
                  <EmployeeRoute>
                    <CardCollectionPage />
                  </EmployeeRoute>
                }
              />
              <Route
                path="/shift/udhari"
                element={
                  <EmployeeRoute>
                    <UdhariCollectionPage />
                  </EmployeeRoute>
                }
              />
              <Route
                path="/shift/expense"
                element={
                  <EmployeeRoute>
                    <Expenses />
                  </EmployeeRoute>
                }
              />
              <Route
                path="/shift/review"
                element={
                  <EmployeeRoute>
                    <EndShiftReview />
                  </EmployeeRoute>
                }
              />

              {/* Legacy operational aliases -> Canonical routes */}
              <Route
                path="/collections"
                element={
                  <EmployeeRoute>
                    <Navigate to="/shift/cash" replace />
                  </EmployeeRoute>
                }
              />

              <Route
                path="/expenses"
                element={
                  <EmployeeRoute>
                    <Navigate to="/shift/expense" replace />
                  </EmployeeRoute>
                }
              />

              <Route
                path="/end-shift-review"
                element={
                  <EmployeeRoute>
                    <Navigate to="/shift/review" replace />
                  </EmployeeRoute>
                }
              />

              <Route
                path="/end-shift"
                element={
                  <EmployeeRoute>
                    <LandingRedirect />
                  </EmployeeRoute>
                }
              />

              {/* Application root -> Role-aware redirect */}
              <Route path="/" element={<LandingRedirect />} />

              {/* Catch-all unknown routes */}
              <Route path="*" element={<NotFound />} />
            </IonRouterOutlet>
          </IonReactRouter>
        </SyncProvider>
      </AuthProvider>
    </IonApp>
  );
}

export default App;
