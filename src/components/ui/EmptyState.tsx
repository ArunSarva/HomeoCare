import type { ReactNode } from 'react';
import { Button } from 'react-typescript-ui';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Optional faint placeholder drawn behind the message (e.g. a ghost chart). */
  background?: ReactNode;
  minHeight?: number;
}

/**
 * Replaces "No data available" everywhere (style guide section 8.3):
 * a muted icon in a soft circle, a short title, one line of explanation
 * and, where it makes sense, the action that would fill the space.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  background,
  minHeight = 220,
}: EmptyStateProps) {
  return (
    <div className="relative flex items-center justify-center text-center" style={{ minHeight }}>
      {background && (
        <div className="absolute inset-0 opacity-30 pointer-events-none" aria-hidden="true">
          {background}
        </div>
      )}
      <div className="relative flex flex-col items-center max-w-xs px-4">
        <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mb-3">
          <Icon size={22} className="text-faint" aria-hidden="true" />
        </div>
        <p className="text-[15px] font-semibold text-text">{title}</p>
        <p className="mt-1 text-[13px] text-muted">{description}</p>
        {actionLabel && onAction && (
          <Button variant="outline" color="neutral" size="sm" className="mt-4" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Light placeholder bars that keep an empty chart card its shape. */
export function GhostBars() {
  const heights = [40, 65, 50, 80, 60, 90, 70];
  return (
    <div className="flex items-end justify-between gap-3 h-full px-6 pb-6 pt-10">
      {heights.map((h, i) => (
        <div key={i} className="flex-1 rounded-t-md bg-border-strong" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export default EmptyState;
