import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from 'react-typescript-ui';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  // Matches the style guide's 1024px shell breakpoint (section 12).
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

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
