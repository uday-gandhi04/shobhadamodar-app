// src/App.jsx
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';

/* Core CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Pages & Contexts */
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ShiftEntry from './pages/ShiftEntry';
import Collections from './pages/Collections';
import ManagerDashboard from './pages/ManagerDashboard';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';

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
              <Route path="/login" element={<Login />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />

              <Route path="/manager" element={
                <ProtectedRoute>
                  <ManagerDashboard />
                </ProtectedRoute>
              } />

              <Route path="/shift/:mpdId" element={
                <ProtectedRoute>
                  <ShiftEntry />
                </ProtectedRoute>
              } />

              <Route path="/collections" element={
                <ProtectedRoute>
                  <Collections />
                </ProtectedRoute>
              } />
              
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </IonRouterOutlet>
          </IonReactRouter>
        </SyncProvider>
      </AuthProvider>
    </IonApp>
  );
}

export default App;