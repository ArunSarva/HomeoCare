import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, Textarea, Card } from 'react-typescript-ui';
import { appointmentService } from '../services/appointmentService';
import { patientService } from '../../patients/services/patientService';
import { Patient, Appointment } from '../../../types';
import Editor from 'react_typescript_editor';
import { useAuth } from '../../auth/AuthContext';

interface AppointmentFormProps {
  appointmentId?: string;
  patientId?: string;
  patientName?: string;
}

export function AppointmentForm({ appointmentId, patientId, patientName }: AppointmentFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState(patientId || '');
  const [patientFullName, setPatientFullName] = useState(patientName || '');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [type, setType] = useState<'Consultation' | 'Follow-Up' | 'Emergency' | 'Other'>('Consultation');
  const [status, setStatus] = useState<'Scheduled' | 'Completed' | 'Cancelled' | 'No Show'>('Scheduled');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  // The signed-in doctor. This used to read localStorage['user'], but login
  // stores the session under 'auth_user', so every appointment was saved
  // with an empty doctor.
  useEffect(() => {
    setDoctorId(user?.id || '');
    setDoctorName(user?.name || '');
  }, [user]);

  // Editing: load the saved appointment into the form. Without this the
  // edit page opened with today's date and 9:00-10:00 defaults, and saving
  // it overwrote the real appointment with those defaults.
  useEffect(() => {
    if (!appointmentId) return;
    let cancelled = false;
    appointmentService.getAppointmentById(appointmentId).then(apt => {
      if (!apt || cancelled) return;
      setSelectedPatient(apt.patientId);
      setPatientFullName(apt.patientName);
      setAppointmentDate(apt.appointmentDate);
      setStartTime(apt.startTime);
      setEndTime(apt.endTime);
      setType(apt.type);
      setStatus(apt.status);
      setReason(apt.reason || '');
      setNotes(apt.notes || '');
      // Keep the appointment's own doctor when editing.
      if (apt.doctorId) setDoctorId(apt.doctorId);
      if (apt.doctorName) setDoctorName(apt.doctorName);
    }).catch(err => console.error('Error loading appointment:', err));
    return () => { cancelled = true; };
  }, [appointmentId]);

  const fetchPatients = async () => {
    try {
      const patientsData = await patientService.getAllPatients();
      setPatients(patientsData);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  useEffect(() => {
    if (selectedPatient) {
      const patient = patients.find(p => p.id === selectedPatient);
      if (patient) {
        setPatientFullName(patient.fullName);
      }
    }
  }, [selectedPatient, patients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedPatient) {
      setError('Please select a patient');
      return;
    }

    if (!appointmentDate) {
      setError('Please select a date');
      return;
    }

    if (!startTime || !endTime) {
      setError('Please select start and end times');
      return;
    }

    // Validate times
    const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
    if (endMinutes <= startMinutes) {
      setError('End time must be after start time');
      return;
    }

    setLoading(true);

    try {
      const patient = patients.find(p => p.id === selectedPatient);
      if (!patient) {
        throw new Error('Patient not found');
      }

      const appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'> = {
        patientId: selectedPatient,
        patientName: patientFullName,
        appointmentDate,
        startTime,
        endTime,
        type,
        status,
        reason,
        doctorId,
        doctorName,
        notes,
      };

      if (appointmentId) {
        await appointmentService.updateAppointment(appointmentId, appointmentData);
      } else {
        await appointmentService.createAppointment(appointmentData);
      }

      navigate('/appointments');
    } catch (err: any) {
      setError(err.message || 'Failed to save appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/appointments');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {appointmentId ? 'Edit Appointment' : 'New Appointment'}
        </h2>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Patient *
            </label>
            <Select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              options={[
                { value: '', label: 'Select a patient' },
                ...patients.map(patient => ({
                  value: patient.id,
                  label: `${patient.patientId} - ${patient.fullName}`
                }))
              ]}
              className="w-full"
              disabled={!!patientId}
            />
            {patientFullName && (
              <p className="mt-1 text-sm text-gray-600">
                Selected: {patientFullName}
              </p>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <Input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time *
              </label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time *
              </label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Type and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type *
              </label>
              <Select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                options={[
                  { value: 'Consultation', label: 'Consultation' },
                  { value: 'Follow-Up', label: 'Follow-Up' },
                  { value: 'Emergency', label: 'Emergency' },
                  { value: 'Other', label: 'Other' },
                ]}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                options={[
                  { value: 'Scheduled', label: 'Scheduled' },
                  { value: 'Completed', label: 'Completed' },
                  { value: 'Cancelled', label: 'Cancelled' },
                  { value: 'No Show', label: 'No Show' },
                ]}
                className="w-full"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason/Note
            </label>
            <Textarea
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
              placeholder="Enter reason for appointment..."
              rows={3}
              className="w-full"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <div className="border rounded-lg p-2">
              <Editor
                value={notes}
                onChange={(value: string) => setNotes(value)}
                toolbar={[['bold', 'italic', 'underline', 'orderedList', 'bulletList', 'undo', 'redo']]}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button type="submit" color="primary" disabled={loading}>
              {loading ? 'Saving...' : appointmentId ? 'Update Appointment' : 'Create Appointment'}
            </Button>
            <Button type="button" onClick={handleCancel} variant="outline" disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default AppointmentForm;
