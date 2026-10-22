import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/routes/App.jsx';
import './index.css';
import './i18n';

import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import '@fontsource/mukta/400.css';
import '@fontsource/mukta/500.css';
import '@fontsource/mukta/600.css';
import '@fontsource/mukta/700.css';

import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
import { initializeOtaUpdater } from './services/otaUpdateService.js';

jeepSqlite(window);

// Notify native runtime that JS initialized successfully to disarm the rollback timer,
// and trigger a non-blocking background check for OTA updates.
initializeOtaUpdater().catch((err) => {
  console.warn('[OTA] Updater initialization warning:', err);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);