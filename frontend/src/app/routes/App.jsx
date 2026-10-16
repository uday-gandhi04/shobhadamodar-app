// src/App.jsx
import { IonApp, IonRouterOutlet, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Route, Navigate, useNavigate } from "react-router-dom";
import { useContext, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

/* Core CSS */
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Pages & Contexts */
import Login from "../../features/auth/Login";
import Dashboard from "../../features/employee/shift/Dashboard";
import SelectMpd from "../../features/employee/shift/SelectMpd";
import EndShift from "../../features/employee/shift/EndShift";
import Collections from "../../features/employee/collections/Collections";
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
setupIonicReact();

// Wrapper to prevent unauthenticated users from seeing the dashboard
const ProtectedRoute = ({ children }) => {
  const { token, isLoading } = useContext(AuthContext);
  if (isLoading) return null;
  return token ? children : <Navigate to="/login" replace />;
};

const ManagerRoute = ({ children }) => {
  const { token, user, isLoading } = useContext(AuthContext);

  if (isLoading) return null;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "MANAGER") {
    return <Navigate to="/select-mpd" replace />;
  }

  return children;
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
        const rootPaths = ["/login", "/dashboard", "/select-mpd", "/manager"];

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
                  <ProtectedRoute>
                    <SelectMpd />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

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
                  <ProtectedRoute>
                    <EndShift />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/shift/cash"
                element={
                  <ProtectedRoute>
                    <CashCollectionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shift/upi"
                element={
                  <ProtectedRoute>
                    <UpiCollectionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shift/card"
                element={
                  <ProtectedRoute>
                    <CardCollectionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shift/udhari"
                element={
                  <ProtectedRoute>
                    <UdhariCollectionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shift/expense"
                element={
                  <ProtectedRoute>
                    <Expenses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shift/review"
                element={
                  <ProtectedRoute>
                    <EndShiftReview />
                  </ProtectedRoute>
                }
              />

              {/* Shared operational routes */}
              <Route
                path="/collections"
                element={
                  <ProtectedRoute>
                    <Collections />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/expenses"
                element={
                  <ProtectedRoute>
                    <Expenses />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/end-shift-review"
                element={
                  <ProtectedRoute>
                    <EndShiftReview />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/end-shift"
                element={
                  <ProtectedRoute>
                    <EndShift />
                  </ProtectedRoute>
                }
              />

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </IonRouterOutlet>
          </IonReactRouter>
        </SyncProvider>
      </AuthProvider>
    </IonApp>
  );
}

export default App;
