import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Skeleton, Select } from 'react-typescript-ui';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartArea, ChartColumn, ChartPie, type LucideIcon } from 'lucide-react';
import { EmptyState, GhostBars } from '../../../components/ui/EmptyState';

export interface ChartPoint {
  name: string;
  value: number;
}

// Chart colors from style guide section 8.4. Series colors are fixed hex
// (primary-500 is the same in both themes); grid, axis and tooltip use the
// CSS variables so they follow dark mode.
const SERIES = '#10A37F';
const DONUT_COLORS = ['#10A37F', '#F59E0B', '#CBD5D0', '#0A7058', '#D97706'];
const CHART_HEIGHT = 220;

const axisProps = {
  tick: { fontSize: 12, fill: 'var(--text-faint)' },
  tickLine: false,
  axisLine: false,
} as const;

const tooltipProps = {
  contentStyle: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    boxShadow: 'var(--sg-shadow-md)',
    fontSize: 12,
    color: 'var(--text)',
  },
  labelStyle: { color: 'var(--text-muted)' },
  cursor: { fill: 'var(--surface-2)' },
} as const;

function compactNumber(value: number) {
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function hasData(data: ChartPoint[]) {
  return data.some(d => d.value > 0);
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  loading: boolean;
  empty: boolean;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel?: string;
  emptyActionPath?: string;
  children: ReactNode;
}

function ChartCard({
  title,
  subtitle,
  loading,
  empty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  emptyActionPath,
  children,
}: ChartCardProps) {
  const navigate = useNavigate();
  return (
    <Card padding="md" className="shadow-xs">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
      </div>
      {loading ? (
        <Skeleton variant="rect" height={CHART_HEIGHT} />
      ) : empty ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          onAction={emptyActionPath ? () => navigate(emptyActionPath) : undefined}
          background={<GhostBars />}
          minHeight={CHART_HEIGHT}
        />
      ) : (
        <div style={{ height: CHART_HEIGHT }}>{children}</div>
      )}
    </Card>
  );
}

interface TrendChartProps {
  title: string;
  subtitle?: string;
  data: ChartPoint[];
  loading: boolean;
  valueFormatter?: (v: number) => string;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel?: string;
  emptyActionPath?: string;
  view?: 'yearly' | 'monthly' | 'weekly';
  onViewChange?: (view: 'yearly' | 'monthly' | 'weekly') => void;
}

export function AreaTrendChart({ title, subtitle, data, loading, valueFormatter = String, view = 'monthly', onViewChange, ...empty }: TrendChartProps) {
  const gradientId = `grad-${title.replace(/\W/g, '')}`;
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} empty={!hasData(data)} emptyIcon={ChartArea} {...empty}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1" />
        {onViewChange && (
          <Select
            value={view}
            onChange={(e) => onViewChange(e.target.value as 'yearly' | 'monthly' | 'weekly')}
            className="w-32"
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly' },
            ]}
          />
        )}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES} stopOpacity={0.2} />
              <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--border)" />
          <XAxis dataKey="name" {...axisProps} />
          <YAxis {...axisProps} tickFormatter={compactNumber} width={48} />
          <Tooltip {...tooltipProps} formatter={(v: number) => [valueFormatter(v), title]} />
          <Area type="monotone" dataKey="value" stroke={SERIES} strokeWidth={2} fill={`url(#${gradientId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function BarTrendChart({ title, subtitle, data, loading, valueFormatter = String, ...empty }: Omit<TrendChartProps, 'view' | 'onViewChange'>) {
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} empty={!hasData(data)} emptyIcon={ChartColumn} {...empty}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--border)" />
          <XAxis dataKey="name" {...axisProps} />
          <YAxis {...axisProps} tickFormatter={compactNumber} width={48} allowDecimals={false} />
          <Tooltip {...tooltipProps} formatter={(v: number) => [valueFormatter(v), title]} />
          <Bar dataKey="value" fill={SERIES} radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function DonutChart({ title, subtitle, data, loading, ...empty }: Omit<TrendChartProps, 'valueFormatter'>) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} empty={!hasData(data)} emptyIcon={ChartPie} {...empty}>
      <div className="flex items-center h-full gap-6">
        <div className="relative h-full flex-1 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke="none">
                {data.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltipProps} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-text tabular-nums">{total}</span>
            <span className="text-xs text-muted">total</span>
          </div>
        </div>
        <ul className="space-y-2 text-[13px] shrink-0">
          {data.map((d, i) => (
            <li key={d.name} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} aria-hidden="true" />
              <span className="text-muted">{d.name}</span>
              <span className="font-medium text-text tabular-nums">{d.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}
