import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardHeader, CardBody, Heading, Table, TableBody, TableRow, TableCell, TableHeaderCell } from 'react-typescript-ui';
import { appointmentService } from '../services/appointmentService';

export function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: appointment, isLoading, error } = useQuery({
    queryKey: ['appointment', id],
    queryFn: async () => {
      if (id) {
        const appointment = await appointmentService.getAppointmentById(id);
        return appointment;
      }
      return null;
    },
  });

  const handleEdit = () => {
    navigate(`/appointments/${id}/edit`);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        await appointmentService.deleteAppointment(id || '');
        navigate('/appointments');
      } catch (error) {
        console.error('Error deleting appointment:', error);
      }
    }
  };

  const handleBack = () => {
    navigate('/appointments');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
      Completed: 'bg-green-100 text-green-800 border-green-200',
      Cancelled: 'bg-red-100 text-red-800 border-red-200',
      'No Show': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Heading>Appointment Details</Heading>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error || !appointment) {
    return (
      <Card>
        <CardHeader>
          <Heading>Appointment Details</Heading>
        </CardHeader>
        <CardBody>
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
            Appointment not found
          </div>
          <Button onClick={handleBack} className="mt-4">
            Back to List
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <Heading>Appointment Details</Heading>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleBack}>
              Back to List
            </Button>
            <Button onClick={handleEdit}>
              Edit Appointment
            </Button>
            <Button onClick={handleDelete} color="danger">
              Delete
            </Button>
          </div>
        </CardHeader>
        
        <CardBody className="space-y-6">
          <div>
            <Heading className="mb-4 text-primary">Appointment Information</Heading>
            <Table>
              <TableBody>
                <TableRow>
                  <TableHeaderCell>Appointment ID</TableHeaderCell>
                  <TableCell>{appointment.id}</TableCell>
                </TableRow>
                <TableRow>
                  <TableHeaderCell>Patient</TableHeaderCell>
                  <TableCell>{appointment.patientName}</TableCell>
                </TableRow>
                <TableRow>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableCell>{new Date(appointment.appointmentDate).toLocaleDateString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableHeaderCell>Time</TableHeaderCell>
                  <TableCell>
                    {appointment.startTime} - {appointment.endTime}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableCell>{getTypeLabel(appointment.type)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableCell>
                    <span className={`px-3 py-1 rounded text-sm font-medium border ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {appointment.reason && (
            <div>
              <Heading className="mb-4 text-primary">Reason</Heading>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-900">{appointment.reason}</p>
              </div>
            </div>
          )}

          {appointment.reason && (
            <div>
              <Heading className="mb-4 text-primary">Reason</Heading>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-900">{appointment.reason}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Heading className="mb-4 text-primary">Doctor</Heading>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableHeaderCell>Doctor ID</TableHeaderCell>
                    <TableCell>{appointment.doctorId || 'N/A'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHeaderCell>Doctor Name</TableHeaderCell>
                    <TableCell>{appointment.doctorName || 'N/A'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div>
              <Heading className="mb-4 text-primary">Timestamps</Heading>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableHeaderCell>Created</TableHeaderCell>
                    <TableCell>{new Date(appointment.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHeaderCell>Updated</TableHeaderCell>
                    <TableCell>{new Date(appointment.updatedAt).toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default AppointmentDetail;
