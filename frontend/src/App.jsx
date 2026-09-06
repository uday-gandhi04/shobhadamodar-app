// src/App.jsx
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Navigate } from 'react-router-dom';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

import Login from './pages/Login';
import { AuthProvider } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext'; // Import the new provider

setupIonicReact();

function App() {
  return (
    <IonApp>
      <AuthProvider>
        {/* SyncProvider wrapped inside AuthProvider */}
        <SyncProvider>
          <IonReactRouter>
            <IonRouterOutlet>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </IonRouterOutlet>
          </IonReactRouter>
        </SyncProvider>
      </AuthProvider>
    </IonApp>
  );
}

export default App;