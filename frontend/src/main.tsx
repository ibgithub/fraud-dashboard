import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/index.css';
import { initFetchInterceptor } from './app/utils/setupFetchInterceptor';

// Initialize global fetch interceptor for 401/403 session expiration
initFetchInterceptor();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

