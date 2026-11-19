import { Card, Skeleton } from 'react-typescript-ui';
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /**
   * Percent change vs the previous period. Pass it only when a previous
   * period with real data exists; otherwise leave it undefined and pass
   * `helper` instead (style guide section 8.2: never show a delta on 0).
   */
  deltaPercent?: number;
  helper?: string;
  onClick?: () => void;
  loading?: boolean;
}

export function KPICard({ label, value, icon: Icon, deltaPercent, helper, onClick, loading }: KPICardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        <div className="w-9 h-9 shrink-0 rounded-md bg-primary-50 flex items-center justify-center">
          <Icon size={18} className="text-primary-600" aria-hidden="true" />
        </div>
      </div>

      {loading ? (
        <div className="mt-1 space-y-2">
          <Skeleton variant="text" width="45%" height={28} />
          <Skeleton variant="text" width="70%" height={14} />
        </div>
      ) : (
        <>
          <p className="mt-1 text-[28px] leading-[34px] font-bold text-text tabular-nums">{value}</p>
          <div className="mt-2 min-h-5 flex items-center gap-1.5 text-xs">
            {deltaPercent !== undefined ? (
              <>
                <span
                  className={`inline-flex items-center gap-0.5 font-medium ${
                    deltaPercent >= 0 ? 'text-success' : 'text-danger'
                  }`}
                >
                  {deltaPercent >= 0 ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownRight size={14} aria-hidden="true" />}
                  {deltaPercent >= 0 ? '+' : ''}
                  {deltaPercent.toFixed(0)}%
                </span>
                <span className="text-faint">vs last month</span>
              </>
            ) : (
              helper && <span className="text-faint">{helper}</span>
            )}
          </div>
        </>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="focus-ring text-left rounded-lg transition-[box-shadow,transform] duration-150 hover:shadow-md hover:-translate-y-px"
        aria-label={`${label}: ${value}. Open`}
      >
        <Card padding="md" className="h-full min-h-31 shadow-xs">
          {body}
        </Card>
      </button>
    );
  }

  return (
    <Card padding="md" className="h-full min-h-31 shadow-xs">
      {body}
    </Card>
  );
}

export default KPICard;
