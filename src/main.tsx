import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { ToastProvider } from './contexts/ToastContext';
import { InstalledProvidersProvider } from './contexts/InstalledProvidersContext';
import './tailwind.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <InstalledProvidersProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </InstalledProvidersProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
