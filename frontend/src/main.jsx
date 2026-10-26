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
import { logApiStartupConfig } from './services/api';

jeepSqlite(window);
logApiStartupConfig();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);