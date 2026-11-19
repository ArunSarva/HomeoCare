import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** Right-aligned actions: at most one primary button per view. */
  actions?: ReactNode;
}

/** Page title row (style guide section 7.3): H1, one muted line, actions right. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-8 text-text">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export default PageHeader;
