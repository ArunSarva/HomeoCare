import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from 'react-typescript-ui';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';
import { useAuth } from '../../features/auth/AuthContext';
import {
  isGoogleOAuthConfigured,
  isGoogleSheetsAuthorized,
  loadGoogleIdentity,
  requestGoogleSheetsAccessToken,
  tryRestoreGoogleSheetsAccessToken,
} from '../../services/googleSheetsService';
import { useTheme } from '../../context/ThemeContext';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { refreshThemeFromCloud } = useTheme();
  // Matches the style guide's 1024px shell breakpoint (section 12).
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [googleIdentityReady, setGoogleIdentityReady] = useState(false);
  const [googleConnectionError, setGoogleConnectionError] = useState<string | null>(null);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [googleRestoring, setGoogleRestoring] = useState(false);

  useEffect(() => {
    if (!user || !isGoogleOAuthConfigured()) return;
    let active = true;
    setGoogleRestoring(true);
    loadGoogleIdentity()
      .then(async () => {
        if (!active) return;
        setGoogleIdentityReady(true);
        try {
          const restored = await tryRestoreGoogleSheetsAccessToken();
          if (!active) return;
          if (restored) {
            await refreshThemeFromCloud();
          } else {
            setGoogleConnectionError('Google authorization needs your attention. Select Connect Google to continue.');
          }
        } catch (error) {
          if (active) setGoogleConnectionError(error instanceof Error ? error.message : 'Could not restore Google authorization.');
        } finally {
          if (active) setGoogleRestoring(false);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setGoogleConnectionError(error instanceof Error ? error.message : 'Could not load Google sign-in.');
          setGoogleRestoring(false);
        }
      });
    return () => { active = false; };
  }, [user, refreshThemeFromCloud]);

  async function connectGoogle() {
    setGoogleConnecting(true);
    setGoogleConnectionError(null);
    try {
      await requestGoogleSheetsAccessToken();
      await refreshThemeFromCloud();
    } catch (error) {
      setGoogleConnectionError(error instanceof Error ? error.message : 'Google connection failed.');
    } finally {
      setGoogleConnecting(false);
    }
  }

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  // Global keyboard shortcuts (style guide section 11): Ctrl/Cmd+K opens
  // the command palette from anywhere, "N" starts a new patient unless
  // the user is typing in a field or an overlay is already open.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isSearchShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
      if (isSearchShortcut) {
        e.preventDefault();
        setPaletteOpen(open => !open);
        return;
      }

      // Never treat a keystroke as a shortcut while the user is typing:
      // form fields, and rich-text editors (the notes editor is a
      // contenteditable, which the tag check alone missed, so typing "n"
      // in a note jumped to New patient). Also skip inside any dialog.
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
          target.isContentEditable ||
          !!target.closest('[contenteditable=""], [contenteditable="true"], [role="textbox"], [role="dialog"]'));
      if (
        !isTyping &&
        !paletteOpen &&
        !e.defaultPrevented &&
        !e.repeat &&
        e.key.toLowerCase() === 'n' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.shiftKey
      ) {
        e.preventDefault();
        navigate('/patients/new');
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, paletteOpen]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-bg text-muted">Loading…</div>;
  }

  if (user && !isGoogleSheetsAuthorized()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-6">
        <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-text">Connect to the clinic spreadsheet</h1>
          <p className="mt-2 text-sm text-muted">
            HomeoCare reads and writes clinic data directly to Google Sheets. Connect a Google account that has
            access to the configured spreadsheet. This app does not keep a local record cache.
          </p>
          {!isGoogleOAuthConfigured() ? (
            <p role="alert" className="mt-4 text-sm text-danger">
              Google OAuth is not configured. Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>.env.local</code> and restart the app.
            </p>
          ) : (
            <>
              {!googleIdentityReady && !googleConnectionError && (
                <p className="mt-4 text-sm text-muted">Loading Google authorization…</p>
              )}
              {googleRestoring && (
                <p className="mt-4 text-sm text-muted">Restoring your Google connection…</p>
              )}
              {googleConnectionError && <p role="alert" className="mt-4 text-sm text-danger">{googleConnectionError}</p>}
              <button
                type="button"
                onClick={connectGoogle}
                disabled={!googleIdentityReady || googleConnecting || googleRestoring}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {googleConnecting ? 'Connecting…' : 'Connect Google'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar
        isDesktop={isDesktop}
        mobileOpen={!isDesktop && mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          isDesktop={isDesktop}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenCommandPalette={openPalette}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-360 mx-auto">{children}</div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  );
};

export default Layout;
