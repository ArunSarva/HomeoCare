import { useState, useEffect, useMemo, Fragment } from 'react';
import { Button, Card, Input } from 'react-typescript-ui';
import { appointmentService } from '../services/appointmentService';
import { Appointment } from '../../../types';
import { addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameDay, subMonths, addMonths } from 'date-fns';

interface AppointmentCalendarProps {
  view?: 'day' | 'week' | 'month';
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AppointmentCalendar({ view: propView = 'month' }: AppointmentCalendarProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<AppointmentCalendarProps['view']>(propView);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const data = await appointmentService.getAllAppointments();
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const view = currentView || propView;

  const getMonthDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const getWeekDays = useMemo(() => {
    const start = subDays(currentDate, getDay(currentDate));
    const end = addDays(start, 6);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const prevPeriod = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, view === 'week' ? 7 : 1));
    }
  };

  const nextPeriod = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, view === 'week' ? 7 : 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setCurrentView(propView);
  };

  const formatMonthName = (date: Date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const formatWeekRange = (date: Date) => {
    const start = subDays(date, getDay(date));
    const end = addDays(date, 6 - getDay(date));
    return `${start.getDate()} ${start.toLocaleString('default', { month: 'short' })} - ${end.getDate()} ${end.toLocaleString('default', { month: 'short' })}`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Scheduled: 'bg-blue-100 border-blue-300 text-blue-800',
      Completed: 'bg-green-100 border-green-300 text-green-800',
      Cancelled: 'bg-red-100 border-red-300 text-red-800',
      'No Show': 'bg-gray-100 border-gray-300 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 border-gray-300 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(status)}`}>
        {status}
      </span>
    );
  };

  const getAppointmentTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hoursNum = parseInt(hours);
    const ampm = hoursNum >= 12 ? 'PM' : 'AM';
    const hours12 = hoursNum % 12 || 12;
    return `${hours12}:${minutes} ${ampm}`;
  };

  // Month View
  const renderMonthView = () => {
    const monthDays = getMonthDays;
    const startingDayIndex = getDay(startOfMonth(currentDate));

    const days = [];
    for (let i = 0; i < startingDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 border border-gray-200 bg-gray-50" />);
    }

    monthDays.forEach((date, index) => {
      const dayAppointments = appointments.filter(apt => isSameDay(new Date(apt.appointmentDate), date));
      const isTodayDate = isToday(date);

      days.push(
        <div
          key={index}
          className={`h-32 border border-gray-200 p-2 flex flex-col ${isTodayDate ? 'bg-blue-50' : 'bg-white'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${isTodayDate ? 'text-blue-600' : 'text-gray-700'}`}>
              {date.getDate()}
            </span>
            <span className="text-xs text-gray-500">
              {daysOfWeek[getDay(date)]}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {dayAppointments.map(apt => (
              <div
                key={apt.id}
                onClick={() => setSelectedAppointment(apt)}
                className={`px-2 py-1 rounded text-xs cursor-pointer truncate ${getStatusColor(apt.status)}`}
              >
                <div className="font-medium">{getAppointmentTime(apt.startTime)} - {getAppointmentTime(apt.endTime)}</div>
                <div>{apt.patientName}</div>
                <div className="text-[10px] opacity-80">{apt.type}</div>
              </div>
            ))}
          </div>
        </div>
      );
    });

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {daysOfWeek.map(day => (
          <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  // Week View
  const renderWeekView = () => {
    const weekDays = getWeekDays;

    return (
      <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {/* Time Column Header */}
        <div className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-600">Time</div>
        {weekDays.map((date, index) => {
          const isTodayDate = isToday(date);
          return (
            <div key={index} className={`p-2 text-center ${isTodayDate ? 'bg-blue-50' : 'bg-white'}`}>
              <div className={`font-medium ${isTodayDate ? 'text-blue-600' : 'text-gray-700'}`}>
                {date.getDate()} {date.toLocaleString('default', { month: 'short' })}
              </div>
              <div className="text-sm text-gray-500">{daysOfWeek[getDay(date)]}</div>
            </div>
          );
        })}

        {/* Time Slots */}
        {[9, 10, 11, 12, 13, 14, 15, 16, 17].map((hour) => (
          <Fragment key={hour}>
            <div className="bg-white p-2 text-sm text-gray-600 text-center">
              {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
            </div>
            {weekDays.map((date, dayIndex) => {
              const dayAppointments = appointments.filter(apt => {
                const aptDate = new Date(apt.appointmentDate);
                const aptHour = parseInt(apt.startTime.split(':')[0]);
                return isSameDay(aptDate, date) && aptHour === hour;
              });

              return (
                <div key={dayIndex} className="bg-white min-h-[60px] p-1">
                  {dayAppointments.map(apt => (
                    <div
                      key={apt.id}
                      onClick={() => setSelectedAppointment(apt)}
                      className={`px-2 py-1 rounded text-xs cursor-pointer mb-1 ${getStatusColor(apt.status)}`}
                    >
                      <div className="font-medium">{getAppointmentTime(apt.startTime)}</div>
                      <div className="truncate">{apt.patientName}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    );
  };

  // Day View
  const renderDayView = () => {
    const day = currentDate;

    return (
      <div className="grid grid-cols-[100px_repeat(1,1fr)] gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {/* Time Column Header */}
        <div className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-600">Time</div>
        <div className={`p-2 text-center ${isToday(day) ? 'bg-blue-50' : 'bg-white'}`}>
          <div className={`font-medium ${isToday(day) ? 'text-blue-600' : 'text-gray-700'}`}>
            {day.getDate()} {day.toLocaleString('default', { month: 'short' })}
          </div>
          <div className="text-sm text-gray-500">{daysOfWeek[getDay(day)]}</div>
        </div>

        {/* Time Slots */}
        {[9, 10, 11, 12, 13, 14, 15, 16, 17].map((hour) => (
          <Fragment key={hour}>
            <div className="bg-white p-2 text-sm text-gray-600 text-center">
              {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
            </div>
            <div className="bg-white min-h-[60px] p-1">
              {appointments.filter(apt => {
                const aptDate = new Date(apt.appointmentDate);
                const aptHour = parseInt(apt.startTime.split(':')[0]);
                return isSameDay(aptDate, day) && aptHour === hour;
              }).map(apt => (
                <div
                  key={apt.id}
                  onClick={() => setSelectedAppointment(apt)}
                  className={`px-2 py-1 rounded text-xs cursor-pointer mb-1 ${getStatusColor(apt.status)}`}
                >
                  <div className="font-medium">{getAppointmentTime(apt.startTime)}</div>
                  <div className="truncate">{apt.patientName}</div>
                </div>
              ))}
            </div>
          </Fragment>
        ))}
      </div>
    );
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentDate(new Date(e.target.value));
  };

  const addAppointment = () => {
    // Navigate to new appointment form
    window.location.href = '/appointments/new';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Appointments Calendar</h2>
        <div className="flex items-center space-x-3">
          <Button onClick={prevPeriod} variant="outline">
            ←
          </Button>
          <span className="text-lg font-semibold text-gray-900 min-w-[150px] text-center">
            {view === 'month' ? formatMonthName(currentDate) : formatWeekRange(currentDate)}
          </span>
          <Button onClick={nextPeriod} variant="outline">
            →
          </Button>
          <Button onClick={goToToday} variant="outline" color="primary">
            Today
          </Button>
          <Button onClick={addAppointment} color="primary">
            + New Appointment
          </Button>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex space-x-2">
        {(['day', 'week', 'month'] as const).map((v) => (
          <Button
            key={v}
            onClick={() => { setCurrentView(v); setCurrentDate(new Date()); }}
            variant={view === v ? 'solid' : 'outline'}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </Button>
        ))}
      </div>

      {/* Date Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Go to Date
        </label>
        <Input
          type="date"
          value={currentDate.toISOString().split('T')[0]}
          onChange={handleDateChange}
          className="w-48"
        />
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>

      {/* Calendar View */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Card className="p-4">
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </Card>
      )}

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedAppointment.patientName}
                </h3>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Date:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(selectedAppointment.appointmentDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Time:</span>
                  <span className="font-medium text-gray-900">
                    {getAppointmentTime(selectedAppointment.startTime)} - {getAppointmentTime(selectedAppointment.endTime)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Type:</span>
                  <span className="font-medium text-gray-900">{selectedAppointment.type}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Status:</span>
                  {getStatusBadge(selectedAppointment.status)}
                </div>
                {selectedAppointment.reason && (
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">Reason:</span>
                    <p className="text-gray-900 text-sm">{selectedAppointment.reason}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button onClick={() => setSelectedAppointment(null)}>
                  Close
                </Button>
                <Button variant="outline" onClick={() => {
                  // Navigate to edit form
                  window.location.href = `/appointments/${selectedAppointment.id}/edit`;
                  setSelectedAppointment(null);
                }}>
                  Edit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppointmentCalendar;
