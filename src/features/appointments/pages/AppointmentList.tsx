import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, Card } from 'react-typescript-ui';
import { appointmentService } from '../services/appointmentService';
import { Appointment } from '../../../types';
import AppointmentCalendar from '../components/AppointmentCalendar';

export function AppointmentList() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [view] = useState<'day' | 'week' | 'month'>('month');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      let data = await appointmentService.getAllAppointments();
      
      // Apply filters
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        data = data.filter(apt => 
          apt.patientName.toLowerCase().includes(term) ||
          apt.id.toLowerCase().includes(term)
        );
      }
      
      if (statusFilter) {
        data = data.filter(apt => apt.status === statusFilter);
      }
      
      if (typeFilter) {
        data = data.filter(apt => apt.type === typeFilter);
      }
      
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewAppointment = () => {
    navigate('/appointments/new');
  };

  const handleEdit = (id: string) => {
    navigate(`/appointments/${id}/edit`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        await appointmentService.deleteAppointment(id);
        fetchAppointments();
      } catch (error) {
        console.error('Error deleting appointment:', error);
      }
    }
  };

  const statusColors = {
    Scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    Completed: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    Cancelled: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    'No Show': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
  };

  const getStatusBadge = (status: string) => {
    const colors = statusColors[status as keyof typeof statusColors];
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text} ${colors.border} border`}>
        {status}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      Consultation: 'Consultation',
      'Follow-Up': 'Follow-up',
      Emergency: 'Emergency',
      Other: 'Other',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Appointments</h2>
        <Button onClick={handleNewAppointment} color="primary">
          + New Appointment
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              type="text"
              placeholder="Search by patient name or ID..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Select
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              placeholder="Filter by status"
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Scheduled', label: 'Scheduled' },
                { value: 'Completed', label: 'Completed' },
                { value: 'Cancelled', label: 'Cancelled' },
                { value: 'No Show', label: 'No Show' },
              ]}
            />
          </div>
          <div>
            <Select
              value={typeFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value)}
              placeholder="Filter by type"
              options={[
                { value: '', label: 'All Types' },
                { value: 'Consultation', label: 'Consultation' },
                { value: 'Follow-Up', label: 'Follow-up' },
                { value: 'Emergency', label: 'Emergency' },
                { value: 'Other', label: 'Other' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Calendar View */}
      <AppointmentCalendar view={view} />

      {/* List View */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Appointment List</h3>
        {appointments.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No appointments found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <Card key={appointment.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">{appointment.patientName}</h4>
                      {getStatusBadge(appointment.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      <div>
                        <p className="text-sm text-gray-500">Appointment ID</p>
                        <p className="text-gray-900 font-medium">{appointment.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="text-gray-900">
                          {new Date(appointment.appointmentDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Time</p>
                        <p className="text-gray-900">
                          {appointment.startTime} - {appointment.endTime}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-sm text-gray-500">Type</p>
                        <p className="text-gray-900">{getTypeLabel(appointment.type)}</p>
                      </div>
                      {appointment.reason && (
                        <div>
                          <p className="text-sm text-gray-500">Reason</p>
                          <p className="text-gray-900 text-sm">{appointment.reason}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <Button
                      variant="outline"
                      onClick={() => handleEdit(appointment.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDelete(appointment.id)}
                      color="danger"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AppointmentList;
