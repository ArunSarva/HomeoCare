import { useMemo, useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Field, Select, Skeleton } from 'react-typescript-ui';
import { Users } from 'lucide-react';
import FollowUpForm from '../components/FollowUpForm';
import { patientService } from '../../patients/services/patientService';
import { followUpService } from '../services/followUpService';
import { FollowUp } from '../../../types';
import { PageHeader } from '../../../components/ui/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';

/**
 * /followups/new. The list's "New Follow-Up" button linked here but the route
 * didn't exist, so it landed on Not Found. FollowUpForm reads its patient
 * once on mount, so this page picks the patient first and remounts the form
 * when it changes. Accepts ?patientId=<id> to preselect one.
 * Also handles /followups/:id/edit for editing an existing follow-up.
 */
export function FollowUpNew() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const selectedId = params.get('patientId') ?? '';

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientService.getAllPatients(),
  });

  const patient = useMemo(() => patients.find(p => p.id === selectedId), [patients, selectedId]);
  
  // For edit mode, load the existing follow-up to pre-fill the form
  const [existingFollowUp, setExistingFollowUp] = useState<FollowUp | null>(null);
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  
  useEffect(() => {
    if (id) {
      setIsFollowUpLoading(true);
      followUpService.getFollowUpById(id)
        .then(followUp => {
          if (followUp) {
            setExistingFollowUp(followUp);
            // Pre-select the patient from the follow-up
            setParams({ patientId: followUp.patientId }, { replace: true });
          }
        })
        .catch(err => {
          console.error('Error loading follow-up:', err);
          navigate('/followups');
        })
        .finally(() => setIsFollowUpLoading(false));
    }
  }, [id, navigate, setParams]);

  if (isLoading || (isEdit && isFollowUpLoading)) {
    return (
      <div className="space-y-4">
        <Skeleton variant="text" width="30%" height={32} />
        <Skeleton variant="rect" height={96} />
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div>
        <PageHeader title={isEdit ? "Edit follow-up" : "New follow-up"} />
        <EmptyState
          icon={Users}
          title="Add a patient first"
          description="A follow-up visit is always recorded for a registered patient."
          actionLabel="Add patient"
          onAction={() => navigate('/patients/new')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!patient && !existingFollowUp && <PageHeader title="New follow-up" subtitle="Choose the patient whose progress you're reviewing." />}
      {existingFollowUp && <PageHeader title="Edit follow-up" subtitle={`Editing follow-up ${existingFollowUp.id}`} />}

      {!existingFollowUp && (
        <Card padding="md" className="shadow-xs">
          <div className="max-w-md">
            <Field label="Patient" required>
              <Select
                value={selectedId}
                placeholder="Select a patient"
                onChange={e => setParams(e.target.value ? { patientId: e.target.value } : {}, { replace: true })}
                options={patients.map(p => ({ value: p.id, label: `${p.fullName} · ${p.patientId}` }))}
                aria-label="Patient"
              />
            </Field>
          </div>
        </Card>
      )}

      {patient && <FollowUpForm key={patient.id} patient={patient} />}
      {existingFollowUp && <FollowUpForm key={existingFollowUp.id} patient={existingFollowUp} existingData={existingFollowUp} />}
    </div>
  );
}

export default FollowUpNew;
