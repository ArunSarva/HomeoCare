import type { ThemeOverride } from 'react-typescript-ui';

/**
 * react-typescript-ui's own theme, driving its internal --rui-color-*
 * variables (Button, Avatar, Card borders, focus rings, ...). This is a
 * SEPARATE system from the Tailwind @theme tokens in src/index.css — a
 * class name like `bg-primary` is this app's own CSS; it does not touch
 * what the library's components render with their own styles. Both must
 * carry the same palette or RTU's native elements will visibly disagree
 * with the rest of the page (as the login page's "Sign in" button did
 * when only index.css was updated and this file was missed).
 *
 * Values from "HomeoCare Pro — UI UX Style Guide.md" section 4.
 */
export const homeoCareTheme: ThemeOverride = {
  name: 'homeocare',
  colors: {
    primary: { light: '#0b8a6b', dark: '#2dd4a4' },
    primaryText: '#ffffff',
    secondary: { light: '#f59e0b', dark: '#f59e0b' },
    secondaryText: '#ffffff',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#2563eb',
    background: {
      light: '#f6f8f7',
      dark: '#0c1311',
    },
    surface: {
      light: '#ffffff',
      dark: '#131c19',
    },
    surfaceHover: {
      light: '#f0f4f2',
      dark: '#1a2521',
    },
    border: {
      light: '#e3e9e6',
      dark: '#243230',
    },
    text: {
      light: '#14201c',
      dark: '#e8f0ec',
    },
    textMuted: {
      light: '#5b6b65',
      dark: '#9db0a8',
    },
    focusRing: {
      light: '#0b8a6b',
      dark: '#2dd4a4',
    },
  },
  radii: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 3px rgba(16, 32, 28, 0.08), 0 1px 2px rgba(16, 32, 28, 0.04)',
    md: '0 6px 16px rgba(16, 32, 28, 0.08)',
    lg: '0 16px 40px rgba(16, 32, 28, 0.12)',
  },
  typography: {
    fontFamily:
      '"InterVariable", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  },
};
