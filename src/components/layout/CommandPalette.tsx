import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, List, ListItem, Input } from 'react-typescript-ui';
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
  UserPlus,
  CalendarPlus,
  FilePlus,
  ReceiptText,
  type LucideIcon,
} from 'lucide-react';

interface Command {
  label: string;
  group: 'Go to' | 'Create';
  icon: LucideIcon;
  path: string;
}

const COMMANDS: Command[] = [
  { label: 'Dashboard', group: 'Go to', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Patients', group: 'Go to', icon: Users, path: '/patients' },
  { label: 'Appointments', group: 'Go to', icon: CalendarDays, path: '/appointments' },
  { label: 'Cases', group: 'Go to', icon: ClipboardList, path: '/cases' },
  { label: 'Prescriptions', group: 'Go to', icon: Pill, path: '/prescriptions' },
  { label: 'Follow-ups', group: 'Go to', icon: BellRing, path: '/followups' },
  { label: 'Inventory', group: 'Go to', icon: Boxes, path: '/inventory' },
  { label: 'Billing', group: 'Go to', icon: Receipt, path: '/billing' },
  { label: 'Search', group: 'Go to', icon: Search, path: '/search' },
  { label: 'New patient', group: 'Create', icon: UserPlus, path: '/patients/new' },
  { label: 'New appointment', group: 'Create', icon: CalendarPlus, path: '/appointments/new' },
  { label: 'New prescription', group: 'Create', icon: FilePlus, path: '/prescriptions/new' },
  { label: 'New bill', group: 'Create', icon: ReceiptText, path: '/billing/new' },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(c => c.label.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Modal mounts via a portal; focus once it is actually in the DOM.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const runCommand = (command: Command) => {
    navigate(command.path);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[activeIndex]) runCommand(results[activeIndex]);
    }
  };

  let groupShown: Command['group'] | null = null;

  return (
    <Modal open={open} onClose={onClose} size="md">
      <div onKeyDown={handleKeyDown}>
        <Input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search pages, or type a command…"
          aria-label="Command palette search"
        />
        <div className="mt-3 max-h-80 overflow-y-auto">
          {results.length === 0 && (
            <p className="text-sm text-muted text-center py-6">No matching pages or commands.</p>
          )}
          <List variant="plain">
            {results.map((command, index) => {
              const showGroupLabel = groupShown !== command.group;
              groupShown = command.group;
              const Icon = command.icon;
              return (
                <div key={command.path + command.label}>
                  {showGroupLabel && (
                    <p className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
                      {command.group}
                    </p>
                  )}
                  <ListItem
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => runCommand(command)}
                    leading={<Icon size={16} className="text-faint" />}
                    className={`rounded-md cursor-pointer px-2 ${index === activeIndex ? 'bg-surface-2' : ''}`}
                  >
                    {command.label}
                  </ListItem>
                </div>
              );
            })}
          </List>
        </div>
      </div>
    </Modal>
  );
}

export default CommandPalette;
