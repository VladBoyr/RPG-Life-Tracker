import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { ThemeProvider } from './contexts/ThemeContext';
import * as Sentry from "@sentry/react";

const GLITCHTIP_FRONTEND_DSN = import.meta.env.VITE_GLITCHTIP_FRONTEND_DSN;
const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';

if (GLITCHTIP_FRONTEND_DSN) {
  Sentry.init({
    dsn: GLITCHTIP_FRONTEND_DSN,
    integrations: [],
    release: APP_VERSION,
    tracesSampleRate: 0.0,
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
