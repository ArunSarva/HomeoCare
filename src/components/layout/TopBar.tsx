import { useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumb, Menu, Popover, type MenuItemDef } from 'react-typescript-ui';
import { Search, Plus, Bell, Sun, Moon, PanelLeft } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../hooks/useToast';

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  patients: 'Patients',
  appointments: 'Appointments',
  cases: 'Cases',
  prescriptions: 'Prescriptions',
  followups: 'Follow-ups',
  inventory: 'Inventory',
  billing: 'Billing',
  search: 'Search',
  settings: 'Settings',
  new: 'New',
  edit: 'Edit',
};

function buildBreadcrumb(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return [{ label: 'Dashboard' }];
  return segments.map((seg, i) => {
    const label = SEGMENT_LABELS[seg] ?? (/^[0-9a-zA-Z-]+$/.test(seg) && seg.length > 12 ? 'Detail' : seg);
    const isLast = i === segments.length - 1;
    return isLast ? { label } : { label, href: '/' + segments.slice(0, i + 1).join('/') };
  });
}

function todayChip() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

interface TopBarProps {
  onOpenCommandPalette: () => void;
  onOpenMobileMenu: () => void;
  isDesktop: boolean;
}

export function TopBar({ onOpenCommandPalette, onOpenMobileMenu, isDesktop }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const newMenuItems: MenuItemDef[] = [
    { label: 'New patient', onSelect: () => navigate('/patients/new') },
    { label: 'New appointment', onSelect: () => navigate('/appointments/new') },
    { label: 'New prescription', onSelect: () => navigate('/prescriptions/new') },
    { label: 'New bill', onSelect: () => navigate('/billing/new') },
  ];

  return (
    <header className="h-16 shrink-0 flex items-center gap-3 px-4 md:px-6 border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-10">
      {!isDesktop && (
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="focus-ring w-9 h-9 flex items-center justify-center rounded-md text-muted hover:bg-surface-2"
          aria-label="Open menu"
        >
          <PanelLeft size={18} />
        </button>
      )}

      <div className="min-w-0 hidden sm:block">
        <Breadcrumb items={buildBreadcrumb(location.pathname)} />
      </div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onOpenCommandPalette}
        className="focus-ring hidden sm:flex items-center gap-2 w-56 md:w-80 h-9 px-3 rounded-md bg-surface-2 text-sm text-faint hover:text-muted"
        aria-label="Open search (Ctrl K)"
      >
        <Search size={15} />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="text-[11px] font-medium border border-border-strong rounded px-1.5 py-0.5 text-faint">Ctrl K</kbd>
      </button>
      <button
        type="button"
        onClick={onOpenCommandPalette}
        className="focus-ring sm:hidden w-9 h-9 flex items-center justify-center rounded-md text-muted hover:bg-surface-2"
        aria-label="Search"
      >
        <Search size={18} />
      </button>

      <span className="hidden md:inline-flex items-center h-9 px-3 rounded-md border border-border text-sm text-muted">
        {todayChip()}
      </span>

      <Menu
        align="end"
        items={newMenuItems}
        trigger={
          <button
            type="button"
            className="focus-ring inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-700"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New</span>
          </button>
        }
      />

      {/* topbar-popover-end: RTU's Popover aligns its left edge to the
          trigger, which pushed this panel off the right of the screen. */}
      <div className="topbar-popover-end">
      <Popover
        placement="bottom"
        trigger={
          <button
            type="button"
            className="focus-ring w-9 h-9 flex items-center justify-center rounded-md text-muted hover:bg-surface-2"
            aria-label="Notifications"
          >
            <Bell size={18} />
          </button>
        }
      >
        <div className="w-64 p-3">
          <p className="text-sm font-semibold text-text mb-1">Notifications</p>
          <p className="text-sm text-muted">No new notifications.</p>
        </div>
      </Popover>
      </div>

      <button
        type="button"
        onClick={() => {
          toggleTheme().catch((error: unknown) => {
            showToast('error', error instanceof Error ? error.message : 'Could not save the theme preference.');
          });
        }}
        className="focus-ring w-9 h-9 flex items-center justify-center rounded-md text-muted hover:bg-surface-2"
        aria-label="Toggle dark mode"
      >
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
}

export default TopBar;
