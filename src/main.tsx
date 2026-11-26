import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register AETHER's Service Worker strictly within its own subpath scope ('./')
// so it installs as a standalone PWA on Android/iOS without conflicting with
// any other apps hosted on the same GitHub Pages domain.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .catch((err) => console.warn('[AETHER SW] Registration skipped:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
