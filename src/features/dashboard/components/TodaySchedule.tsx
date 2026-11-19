import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Skeleton } from 'react-typescript-ui';
import { CalendarX, ChevronRight } from 'lucide-react';
import type { Appointment } from '../../../types';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatTime12h, appointmentStatusColor } from './format';

interface TodayScheduleProps {
  appointments: Appointment[];
  loading: boolean;
}

export function TodaySchedule({ appointments, loading }: TodayScheduleProps) {
  const navigate = useNavigate();

  return (
    <Card padding="md" className="shadow-xs h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-text">Today's schedule</h2>
          <p className="text-[13px] text-muted">
            {loading ? 'Loading…' : `${appointments.length} ${appointments.length === 1 ? 'appointment' : 'appointments'}`}
          </p>
        </div>
        <Button variant="ghost" color="neutral" size="sm" onClick={() => navigate('/appointments')} rightIcon={<ChevronRight size={16} />}>
          View calendar
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <Skeleton key={i} variant="rect" height={52} />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title="No appointments today"
          description="Your schedule is clear. Book a visit and it will show up here."
          actionLabel="Add appointment"
          onAction={() => navigate('/appointments/new')}
        />
      ) : (
        <ul className="divide-y divide-border -mx-1">
          {appointments.map(apt => (
            <li key={apt.id}>
              <button
                type="button"
                onClick={() => navigate(`/appointments/${apt.id}`)}
                className="focus-ring w-full flex items-center gap-3 px-1 py-2.5 rounded-md text-left hover:bg-surface-2"
              >
                <span className="w-17 shrink-0 text-[13px] font-medium text-text tabular-nums">
                  {formatTime12h(apt.startTime)}
                </span>
                <Avatar name={apt.patientName} size="sm" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-text truncate">{apt.patientName}</span>
                  <span className="block text-xs text-muted truncate">
                    {apt.type}
                    {apt.reason ? ` · ${apt.reason}` : ''}
                  </span>
                </span>
                <Badge color={appointmentStatusColor(apt.status)} variant="soft" size="sm">
                  {apt.status}
                </Badge>
                <ChevronRight size={16} className="text-faint shrink-0" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default TodaySchedule;
