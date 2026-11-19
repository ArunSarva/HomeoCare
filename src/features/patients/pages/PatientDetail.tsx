import type { ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Badge, Button, Card, Skeleton } from 'react-typescript-ui';
import { CalendarPlus, FilePlus, MessageCircle, Pencil, Phone, UserX } from 'lucide-react';
import { patientService } from '../services/patientService';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatDate, whatsappLink } from '../../dashboard/components/format';
import { ageFromDob } from '../utils/age';

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card padding="md" className="shadow-xs">
      <h2 className="text-[15px] font-semibold text-text mb-3">{title}</h2>
      <dl className="grid grid-cols-[minmax(110px,40%)_1fr] gap-x-4 gap-y-2.5 text-[13px]">{children}</dl>
    </Card>
  );
}

function Row({ label, value }: { label: string; value?: ReactNode }) {
  const empty = value === undefined || value === null || value === '';
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className={empty ? 'text-faint' : 'text-text'}>{empty ? 'Not recorded' : value}</dd>
    </>
  );
}

const actionLinkClass =
  'focus-ring inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface text-sm font-medium text-text hover:bg-surface-2';

export function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      if (id) {
        const patient = await patientService.getPatientById(id);
        return patient;
      }
      return null;
    },
  });

  const handleEdit = () => {
    navigate(`/patients/${id}/edit`);
  };

  const handleBack = () => {
    navigate('/patients');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rect" height={120} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton variant="rect" height={180} />
          <Skeleton variant="rect" height={180} />
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <EmptyState
        icon={UserX}
        title="Patient not found"
        description="This patient may have been deleted, or the link is out of date."
        actionLabel="Back to patients"
        onAction={handleBack}
      />
    );
  }

  const whatsapp = patient.whatsapp || patient.mobile;
  const age = ageFromDob(patient.dob) ?? patient.age;
  const address = [patient.street, patient.city, patient.state, patient.pincode].filter(Boolean).join(', ');

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card padding="md" className="shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Avatar name={patient.fullName} src={patient.photo} size="lg" />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold leading-8 text-text truncate">{patient.fullName}</h1>
              <p className="mt-0.5 text-sm text-muted tabular-nums">
                {patient.patientId}
                {age ? ` · ${age} years` : ''} · {patient.gender}
                {patient.mobile ? ` · ${patient.mobile}` : ''}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
                  <Badge color="neutral" variant="soft" size="sm">Blood {patient.bloodGroup}</Badge>
                )}
                {patient.registrationDate && (
                  <Badge color="primary" variant="soft" size="sm">Registered {formatDate(patient.registrationDate)}</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {patient.mobile && (
              <a href={`tel:${patient.mobile}`} className={actionLinkClass}>
                <Phone size={16} aria-hidden="true" /> Call
              </a>
            )}
            {whatsapp && (
              <a href={whatsappLink(whatsapp)} target="_blank" rel="noopener noreferrer" className={actionLinkClass}>
                <MessageCircle size={16} aria-hidden="true" /> WhatsApp
              </a>
            )}
            <Button variant="outline" color="neutral" leftIcon={<CalendarPlus size={16} />} onClick={() => navigate('/appointments/new')}>
              New appointment
            </Button>
            <Button variant="outline" color="neutral" leftIcon={<Pencil size={16} />} onClick={handleEdit}>
              Edit
            </Button>
            <Button leftIcon={<FilePlus size={16} />} onClick={() => navigate(`/prescriptions/new?patientId=${patient.id}`)}>
              New prescription
            </Button>
          </div>
        </div>
      </Card>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InfoCard title="Contact">
          <Row label="Mobile" value={patient.mobile} />
          <Row label="WhatsApp" value={patient.whatsapp} />
          <Row label="Email" value={patient.email} />
          <Row label="Address" value={address} />
        </InfoCard>

        <InfoCard title="Personal details">
          <Row label="Date of birth" value={patient.dob ? formatDate(patient.dob) : undefined} />
          <Row label="Age" value={age ? `${age} years` : undefined} />
          <Row label="Gender" value={patient.gender} />
          <Row label="Marital status" value={patient.maritalStatus} />
          <Row label="Occupation" value={patient.occupation} />
        </InfoCard>

        <InfoCard title="Medical background">
          <Row label="Height" value={patient.height ? `${patient.height} cm` : undefined} />
          <Row label="Weight" value={patient.weight ? `${patient.weight} kg` : undefined} />
          <Row label="BMI" value={patient.bmi ? patient.bmi.toFixed(1) : undefined} />
          <Row label="Blood group" value={patient.bloodGroup && patient.bloodGroup !== 'Unknown' ? patient.bloodGroup : undefined} />
        </InfoCard>

        <InfoCard title="Emergency contact">
          <Row label="Name" value={patient.emergencyContact?.name} />
          <Row label="Relationship" value={patient.emergencyContact?.relationship} />
          <Row label="Mobile" value={patient.emergencyContact?.mobile} />
        </InfoCard>
      </div>
    </div>
  );
}

export default PatientDetail;
