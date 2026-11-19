import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from 'react-typescript-ui';
import { UserX } from 'lucide-react';
import PatientForm from '../components/PatientForm';
import { patientService } from '../services/patientService';
import { PageHeader } from '../../../components/ui/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Patient } from '../../../types';

/**
 * /patients/:id/edit. The list and detail pages already linked here and
 * PatientForm already supported editing via its `patient` prop; only the
 * route was missing, so Edit used to land on Not Found.
 */
export function PatientEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: async () => (id ? patientService.getPatientById(id) : null),
  });

  const handleSubmit = async (updated: Patient) => {
    try {
      await patientService.updatePatient(updated.id, updated);
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', updated.id] });
      navigate(`/patients/${updated.id}`);
    } catch (error) {
      console.error('Error updating patient:', error);
      throw new Error("Couldn't save your changes. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="text" width="30%" height={32} />
        <Skeleton variant="rect" height={320} />
      </div>
    );
  }

  if (!patient) {
    return (
      <EmptyState
        icon={UserX}
        title="Patient not found"
        description="This patient may have been deleted."
        actionLabel="Back to patients"
        onAction={() => navigate('/patients')}
      />
    );
  }

  return (
    <div>
      <PageHeader title={`Edit ${patient.fullName}`} subtitle={`Patient ID ${patient.patientId}`} />
      <PatientForm patient={patient} onSubmit={handleSubmit} />
    </div>
  );
}

export default PatientEdit;
