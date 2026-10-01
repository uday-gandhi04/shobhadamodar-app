// src/App.jsx
import { IonApp, IonRouterOutlet, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Route, Navigate } from "react-router-dom";
import { useContext } from "react";

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
setupIonicReact();

// Wrapper to prevent unauthenticated users from seeing the dashboard
const ProtectedRoute = ({ children }) => {
  const { token, isLoading } = useContext(AuthContext);
  if (isLoading) return null;
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <IonApp>
      <AuthProvider>
        <SyncProvider>
          <IonReactRouter>
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
                  <ProtectedRoute>
                    <ManagerDashboard />
                  </ProtectedRoute>
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

              <Route path="/shift/cash" element={<ProtectedRoute><CashCollectionPage /></ProtectedRoute>} />
              <Route path="/shift/upi" element={<ProtectedRoute><UpiCollectionPage /></ProtectedRoute>} />
              <Route path="/shift/card" element={<ProtectedRoute><CardCollectionPage /></ProtectedRoute>} />
              <Route path="/shift/udhari" element={<ProtectedRoute><UdhariCollectionPage /></ProtectedRoute>} />
              <Route path="/shift/expense" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/shift/review" element={<ProtectedRoute><EndShiftReview /></ProtectedRoute>} />

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
