import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Avatar, Drawer, Menu, Popper, type MenuItemDef } from 'react-typescript-ui';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
  Pill,
  BellRing,
  Boxes,
  Receipt,
  Search,
  Stethoscope,
  ChevronsLeft,
  ChevronsRight,
  UserCog,
  Settings,
  Keyboard,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { dashboardService } from '../../features/dashboard/services/dashboardService';
import { inventoryService } from '../../features/inventory/services/inventoryService';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badgeKey?: 'followUpsDue' | 'lowStock';
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { label: 'Overview', items: [{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }] },
  {
    label: 'Clinic',
    items: [
      { label: 'Patients', path: '/patients', icon: Users },
      { label: 'Appointments', path: '/appointments', icon: CalendarDays },
      { label: 'Cases', path: '/cases', icon: ClipboardList },
      { label: 'Prescriptions', path: '/prescriptions', icon: Pill },
      { label: 'Follow-ups', path: '/followups', icon: BellRing, badgeKey: 'followUpsDue' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Inventory', path: '/inventory', icon: Boxes, badgeKey: 'lowStock' },
      { label: 'Billing', path: '/billing', icon: Receipt },
    ],
  },
  { label: 'Tools', items: [{ label: 'Search', path: '/search', icon: Search }] },
];

const COLLAPSE_STORAGE_KEY = 'homeocare_sidebar_collapsed';

/**
 * Label tooltip for collapsed nav items. RTU's Tooltip is absolutely
 * positioned inside its wrapper, so the nav's scroll container
 * (overflow-y-auto) clipped it. Popper renders through a portal with
 * position: fixed, so it always shows beside the sidebar.
 */
function NavTooltip({ label, children }: { label: string; children: ReactNode }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <div
      ref={setAnchor}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <Popper open={open} anchorEl={anchor} placement="right">
        <div
          role="tooltip"
          className="ml-5 mt-2 px-2 py-1 rounded-sm bg-text text-surface text-xs font-medium whitespace-nowrap shadow-md pointer-events-none"
        >
          {label}
        </div>
      </Popper>
    </div>
  );
}

interface SidebarProps {
  /** Controls the mobile overlay drawer; desktop uses its own collapse state. */
  mobileOpen: boolean;
  onMobileClose: () => void;
  isDesktop: boolean;
}

export function Sidebar({ mobileOpen, onMobileClose, isDesktop }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [badgeCounts, setBadgeCounts] = useState<{ followUpsDue: number; lowStock: number }>({
    followUpsDue: 0,
    lowStock: 0,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadBadges() {
      try {
        const [followUpsDue, alerts] = await Promise.all([
          dashboardService.fetchFollowUpsDue(),
          inventoryService.getAlerts(),
        ]);
        if (cancelled) return;
        setBadgeCounts({
          followUpsDue: followUpsDue.length,
          lowStock: alerts.lowStock.length + alerts.nearExpiry.length + alerts.expired.length,
        });
      } catch {
        // Badge counts are a nice-to-have; a failed fetch just leaves them at 0.
      }
    }
    loadBadges();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, String(collapsed));
    } catch {
      // Storage can be unavailable (e.g. private browsing); collapse still
      // works for the session, it just won't persist.
    }
  }, [collapsed]);

  const isActive = (path: string) =>
    location.pathname === path || (location.pathname.startsWith(path + '/') && path !== '/search');

  const handleNavigate = (path: string) => {
    navigate(path);
    onMobileClose();
  };

  const accountMenuItems: MenuItemDef[] = [
    { label: <span className="flex items-center gap-2"><UserCog size={16} /> Profile</span>, onSelect: () => navigate('/settings') },
    { label: <span className="flex items-center gap-2"><Settings size={16} /> Settings</span>, onSelect: () => navigate('/settings') },
    { label: <span className="flex items-center gap-2"><Keyboard size={16} /> Keyboard shortcuts</span> },
    { label: <span className="flex items-center gap-2"><LogOut size={16} /> Logout</span>, danger: true, onSelect: () => { logout(); navigate('/login'); } },
  ];

  // Collapsed width on desktop only; mobile is always full width inside its overlay drawer.
  const widthClass = isDesktop && collapsed ? 'w-[72px]' : 'w-[264px]';

  const content = (
    <div className={`flex flex-col h-full ${widthClass} bg-surface transition-[width] duration-200`} role="navigation" aria-label="Main menu">
      <div className={`flex items-center gap-2.5 h-16 border-b border-border shrink-0 ${isDesktop && collapsed ? 'justify-center px-0' : 'px-4'}`}>
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shrink-0">
          <Stethoscope size={16} className="text-white" />
        </div>
        {(!collapsed || !isDesktop) && (
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-text leading-tight truncate">HomeoCare Pro</p>
          </div>
        )}
        {isDesktop && !collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="focus-ring ml-auto shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-faint hover:bg-surface-2 hover:text-muted"
            aria-label="Collapse sidebar"
          >
            <ChevronsLeft size={16} />
          </button>
        )}
      </div>

      {/* Collapsed: the 72px header only fits the logo, so expand lives here. */}
      {isDesktop && collapsed && (
        <div className="px-3 pt-3">
          <NavTooltip label="Expand sidebar">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="focus-ring w-full h-9 rounded-md flex items-center justify-center text-faint hover:bg-surface-2 hover:text-muted"
              aria-label="Expand sidebar"
            >
              <ChevronsRight size={16} />
            </button>
          </NavTooltip>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-3 space-y-4">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {(!collapsed || !isDesktop) && (
              <p className="px-6 mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
                {group.label}
              </p>
            )}
            <div className="px-3 space-y-0.5">
              {group.items.map(item => {
                const active = isActive(item.path);
                const Icon = item.icon;
                const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
                const row = (
                  <button
                    type="button"
                    onClick={() => handleNavigate(item.path)}
                    aria-current={active ? 'page' : undefined}
                    aria-label={collapsed && isDesktop ? item.label : undefined}
                    className={`focus-ring relative w-full h-10 flex items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                      collapsed && isDesktop ? 'justify-center' : ''
                    } ${
                      active
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-muted hover:bg-surface-2'
                    }`}
                  >
                    {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.75 rounded-full bg-primary" aria-hidden="true" />}
                    <Icon size={18} className={active ? 'text-primary shrink-0' : 'text-faint shrink-0'} />
                    {(!collapsed || !isDesktop) && <span className="truncate">{item.label}</span>}
                    {(!collapsed || !isDesktop) && badgeCount > 0 && (
                      <span className="ml-auto text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-warning/15 text-warning">
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
                return (
                  <div key={item.path}>
                    {collapsed && isDesktop ? (
                      <NavTooltip label={item.label}>{row}</NavTooltip>
                    ) : (
                      row
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* sidebar-account-menu: makes this Menu open upward (see index.css).
          RTU's Menu always opens below its trigger, which here is the very
          bottom of the screen, so the dropdown rendered off-screen. */}
      <div className="sidebar-account-menu border-t border-border p-3 shrink-0">
        <Menu
          align="start"
          items={accountMenuItems}
          trigger={
            <button
              type="button"
              className={`focus-ring w-full flex items-center gap-2.5 rounded-md p-2 hover:bg-surface-2 ${collapsed && isDesktop ? 'justify-center' : ''}`}
            >
              <Avatar name={user?.name} size="sm" />
              {(!collapsed || !isDesktop) && (
                <div className="min-w-0 text-left">
                  <p className="text-sm font-medium text-text truncate">{user?.name}</p>
                  <p className="text-xs text-muted truncate">{user?.role}</p>
                </div>
              )}
            </button>
          }
        />
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <div className="border-r border-border shrink-0" style={{ boxShadow: 'none' }}>
        {content}
      </div>
    );
  }

  // Mobile: a temporary overlay drawer (backdrop, click-away, Escape) built
  // on react-typescript-ui's own Drawer, same pattern as before the redesign.
  return (
    <Drawer open={mobileOpen} onClose={onMobileClose} anchor="left" variant="temporary">
      {content}
    </Drawer>
  );
}

export default Sidebar;
