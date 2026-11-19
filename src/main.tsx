import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider as RtuThemeProvider } from 'react-typescript-ui';
import { homeoCareTheme } from './theme/theme';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './features/auth/AuthContext';
import App from './App.tsx';
import './index.css';

// The dev server used to register a PWA service worker (now disabled for
// dev in vite.config.ts). Browsers keep an already-registered worker, which
// can keep serving stale files, so remove it on the dev server only.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    if (registrations.length === 0) return;
    Promise.all(registrations.map(r => r.unregister()))
      .then(() => caches.keys())
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => window.location.reload());
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RtuThemeProvider theme={homeoCareTheme}>
          <ToastProvider>
            <AuthProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </AuthProvider>
          </ToastProvider>
        </RtuThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);


