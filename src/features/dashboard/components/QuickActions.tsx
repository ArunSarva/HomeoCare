import { useNavigate } from 'react-router-dom';
import { Card } from 'react-typescript-ui';
import { CalendarPlus, FilePlus, ReceiptText, UserPlus, type LucideIcon } from 'lucide-react';

const ACTIONS: { label: string; path: string; icon: LucideIcon }[] = [
  { label: 'New patient', path: '/patients/new', icon: UserPlus },
  { label: 'New appointment', path: '/appointments/new', icon: CalendarPlus },
  { label: 'New prescription', path: '/prescriptions/new', icon: FilePlus },
  { label: 'New bill', path: '/billing/new', icon: ReceiptText },
];

export function QuickActions() {
  const navigate = useNavigate();
  return (
    <Card padding="md" className="shadow-xs">
      <h2 className="text-lg font-semibold text-text mb-3">Quick actions</h2>
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map(({ label, path, icon: Icon }) => (
          <button
            key={path}
            type="button"
            onClick={() => navigate(path)}
            className="focus-ring flex flex-col items-start gap-2 p-3 rounded-md border border-border text-left hover:bg-surface-2"
          >
            <Icon size={18} className="text-primary-600" aria-hidden="true" />
            <span className="text-[13px] font-medium text-text">{label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

export default QuickActions;
