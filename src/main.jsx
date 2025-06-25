import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ToastProvider } from './pages/ToastProvider';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);
