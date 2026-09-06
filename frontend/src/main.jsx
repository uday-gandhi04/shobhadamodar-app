// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './i18n';

// 1. Import the jeep-sqlite loader
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';

// 2. Define the custom element on the window
jeepSqlite(window);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);