import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Field, Input, Select } from 'react-typescript-ui';
import { CircleX, Save } from 'lucide-react';
import { formatDate } from 'date-fns';
import { Patient, EmergencyContact } from '../../../types';
import { generatePatientId, patientService } from '../services/patientService';
import { ageFromDob, todayIso } from '../utils/age';
import { getDriveImageObjectUrl } from '../../../services/googleCloudStore';

interface PatientFormProps {
  patient?: Patient;
  onSubmit?: (patient: Patient) => void | Promise<void>;
}

const PatientForm: React.FC<PatientFormProps> = ({ patient, onSubmit }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Partial<Patient>>({
    fullName: '',
    dob: '',
    age: 0,
    gender: 'Male',
    maritalStatus: 'Single',
    occupation: '',
    mobile: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    registrationDate: formatDate(new Date(), 'yyyy-MM-dd'),
    emergencyContact: {
      name: '',
      relationship: '',
      mobile: '',
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drivePhotoUrl, setDrivePhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (patient) {
      // A stored age goes stale every birthday; refresh it from the DOB.
      const currentAge = ageFromDob(patient.dob);
      setFormData(currentAge !== undefined ? { ...patient, age: currentAge } : patient);
    } else {
      // Set registration date to today if new patient
      setFormData(prev => ({
        ...prev,
        registrationDate: formatDate(new Date(), 'yyyy-MM-dd'),
      }));
    }
  }, [patient]);

  useEffect(() => {
    if (!formData.photo?.startsWith('drive:')) {
      setDrivePhotoUrl(null);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;
    setDrivePhotoUrl(null);
    getDriveImageObjectUrl(formData.photo)
      .then((url) => {
        objectUrl = url;
        if (active) setDrivePhotoUrl(url);
        else if (url) URL.revokeObjectURL(url);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load the patient photo from Google Drive.');
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [formData.photo]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file for the patient photo.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Patient photos must be 5 MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const photoData = reader.result;
      if (typeof photoData !== 'string') {
        setError('Could not read the selected patient photo.');
        return;
      }
      setFormData((current) => ({ ...current, photo: photoData }));
      setError(null);
    };
    reader.onerror = () => setError('Could not read the selected patient photo.');
    reader.readAsDataURL(file);
  };

  const handleChange = (field: keyof Patient, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEmergencyContactChange = (field: keyof EmergencyContact, value: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact!,
        [field]: value,
      },
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.fullName?.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData.mobile?.trim()) {
      setError('Mobile number is required');
      return false;
    }
    if (!formData.gender) {
      setError('Gender is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const patientToSubmit: Patient = {
        id: patient?.id || crypto.randomUUID(),
        patientId: patient?.patientId || await generatePatientId(),
        fullName: formData.fullName || '',
        photo: formData.photo,
        dob: formData.dob || '',
        age: formData.age || 0,
        gender: formData.gender || 'Male',
        maritalStatus: formData.maritalStatus || 'Single',
        occupation: formData.occupation || '',
        mobile: formData.mobile || '',
        whatsapp: formData.whatsapp,
        email: formData.email,
        street: formData.street || '',
        city: formData.city || '',
        state: formData.state || '',
        pincode: formData.pincode || '',
        height: formData.height,
        weight: formData.weight,
        bmi: formData.bmi,
        bloodGroup: formData.bloodGroup,
        emergencyContact: formData.emergencyContact,
        registrationDate: formData.registrationDate || formatDate(new Date(), 'yyyy-MM-dd'),
        createdAt: patient?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: formData.createdBy,
      };

      if (onSubmit) {
        await onSubmit(patientToSubmit);
      } else {
        // Call the service directly if no custom handler
        await patientService.createPatient(patientToSubmit);
        navigate('/patients');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/patients');
  };

  const sectionTitle = 'text-lg font-semibold text-text';
  const grid2 = 'grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div aria-live="polite">
        {error && (
          <Alert color="danger" icon={<CircleX size={18} />}>
            {error}
          </Alert>
        )}
      </div>

      <Card padding="md" className="shadow-xs">
        <h2 className={sectionTitle}>Personal details</h2>
        <p className="text-[13px] text-muted mb-4">Basic identity details for the patient record.</p>
        <div className={grid2}>
          <div className="md:col-span-2">
            <Field label="Patient photo" helperText="The photo uploads to Google Drive when you save. Maximum size: 5 MB.">
              <div className="flex flex-wrap items-center gap-4">
                {(formData.photo?.startsWith('drive:') ? drivePhotoUrl : formData.photo) && (
                  <img
                    src={formData.photo?.startsWith('drive:') ? drivePhotoUrl ?? undefined : formData.photo}
                    alt="Patient"
                    className="h-16 w-16 rounded-full object-cover"
                  />
                )}
                <input type="file" accept="image/*" onChange={handlePhotoChange} aria-label="Choose patient photo" />
                {formData.photo && (
                  <button
                    type="button"
                    onClick={() => setFormData((current) => ({ ...current, photo: undefined }))}
                    className="text-sm text-danger hover:underline"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </Field>
          </div>
          <Field label="Full name" required>
            <Input
              type="text"
              value={formData.fullName}
              onChange={e => handleChange('fullName', e.target.value)}
              required
              placeholder="e.g. Ravi Kumar"
              autoComplete="name"
            />
          </Field>
          <Field label="Gender" required>
            <Select
              value={formData.gender}
              onChange={e => handleChange('gender', e.target.value)}
              options={[
                { label: 'Male', value: 'Male' },
                { label: 'Female', value: 'Female' },
                { label: 'Other', value: 'Other' },
              ]}
            />
          </Field>
          <Field label="Date of birth">
            <Input
              type="date"
              value={formData.dob}
              max={todayIso()}
              onChange={e => {
                const dob = e.target.value;
                const age = ageFromDob(dob);
                setFormData(prev => ({ ...prev, dob, ...(age !== undefined ? { age } : {}) }));
              }}
            />
          </Field>
          <Field
            label="Age"
            helperText={
              ageFromDob(formData.dob) !== undefined
                ? 'Calculated from the date of birth.'
                : "In years, if the date of birth isn't known."
            }
          >
            <Input
              type="number"
              value={formData.age || ''}
              onChange={e => handleChange('age', parseInt(e.target.value, 10) || 0)}
              min="0"
              max="150"
              placeholder="Age"
              readOnly={ageFromDob(formData.dob) !== undefined}
              aria-readonly={ageFromDob(formData.dob) !== undefined}
              className={ageFromDob(formData.dob) !== undefined ? 'bg-surface-2' : undefined}
            />
          </Field>
          <Field label="Marital status">
            <Select
              value={formData.maritalStatus}
              onChange={e => handleChange('maritalStatus', e.target.value)}
              options={[
                { label: 'Single', value: 'Single' },
                { label: 'Married', value: 'Married' },
                { label: 'Divorced', value: 'Divorced' },
                { label: 'Widowed', value: 'Widowed' },
              ]}
            />
          </Field>
          <Field label="Occupation">
            <Input
              type="text"
              value={formData.occupation}
              onChange={e => handleChange('occupation', e.target.value)}
              placeholder="e.g. Teacher"
            />
          </Field>
          <Field label="Registration date">
            <Input
              type="date"
              value={formData.registrationDate}
              onChange={e => handleChange('registrationDate', e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card padding="md" className="shadow-xs">
        <h2 className={sectionTitle}>Contact</h2>
        <p className="text-[13px] text-muted mb-4">Used for appointment reminders and follow-up calls.</p>
        <div className={grid2}>
          <Field label="Mobile" required>
            <Input
              type="tel"
              value={formData.mobile}
              onChange={e => handleChange('mobile', e.target.value)}
              required
              placeholder="10-digit mobile number"
              autoComplete="tel"
              inputMode="tel"
            />
          </Field>
          <Field label="WhatsApp" helperText="Leave empty if it's the same as mobile.">
            <Input
              type="tel"
              value={formData.whatsapp}
              onChange={e => handleChange('whatsapp', e.target.value)}
              placeholder="WhatsApp number"
              inputMode="tel"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
            />
          </Field>
        </div>
      </Card>

      <Card padding="md" className="shadow-xs">
        <h2 className={sectionTitle}>Address</h2>
        <p className="text-[13px] text-muted mb-4">Where the patient lives.</p>
        <div className={grid2}>
          <div className="md:col-span-2">
            <Field label="Street">
              <Input
                type="text"
                value={formData.street}
                onChange={e => handleChange('street', e.target.value)}
                placeholder="House number, street, area"
                autoComplete="street-address"
              />
            </Field>
          </div>
          <Field label="City">
            <Input type="text" value={formData.city} onChange={e => handleChange('city', e.target.value)} placeholder="City" />
          </Field>
          <Field label="State">
            <Input type="text" value={formData.state} onChange={e => handleChange('state', e.target.value)} placeholder="State" />
          </Field>
          <Field label="Pincode">
            <Input
              type="text"
              value={formData.pincode}
              onChange={e => handleChange('pincode', e.target.value)}
              placeholder="6-digit pincode"
              inputMode="numeric"
              autoComplete="postal-code"
            />
          </Field>
        </div>
      </Card>

      <Card padding="md" className="shadow-xs">
        <h2 className={sectionTitle}>Medical background</h2>
        <p className="text-[13px] text-muted mb-4">Baseline measurements recorded at registration.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Height (cm)">
            <Input
              type="number"
              value={formData.height || ''}
              onChange={e => handleChange('height', parseFloat(e.target.value) || 0)}
              min="0"
              max="300"
              placeholder="cm"
            />
          </Field>
          <Field label="Weight (kg)">
            <Input
              type="number"
              value={formData.weight || ''}
              onChange={e => handleChange('weight', parseFloat(e.target.value) || 0)}
              min="0"
              max="300"
              placeholder="kg"
            />
          </Field>
          <Field label="BMI">
            <Input
              type="number"
              value={formData.bmi || ''}
              onChange={e => handleChange('bmi', parseFloat(e.target.value) || 0)}
              min="0"
              max="100"
              placeholder="BMI"
            />
          </Field>
          <Field label="Blood group">
            <Select
              value={formData.bloodGroup || 'Unknown'}
              onChange={e => handleChange('bloodGroup', e.target.value)}
              options={[
                { label: 'A+', value: 'A+' },
                { label: 'A-', value: 'A-' },
                { label: 'B+', value: 'B+' },
                { label: 'B-', value: 'B-' },
                { label: 'AB+', value: 'AB+' },
                { label: 'AB-', value: 'AB-' },
                { label: 'O+', value: 'O+' },
                { label: 'O-', value: 'O-' },
                { label: 'Unknown', value: 'Unknown' },
              ]}
            />
          </Field>
        </div>
      </Card>

      <Card padding="md" className="shadow-xs">
        <h2 className={sectionTitle}>Emergency contact</h2>
        <p className="text-[13px] text-muted mb-4">Who to call if the patient can't be reached.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Name">
            <Input
              type="text"
              value={formData.emergencyContact?.name || ''}
              onChange={e => handleEmergencyContactChange('name', e.target.value)}
              placeholder="Full name"
            />
          </Field>
          <Field label="Relationship">
            <Input
              type="text"
              value={formData.emergencyContact?.relationship || ''}
              onChange={e => handleEmergencyContactChange('relationship', e.target.value)}
              placeholder="e.g. Spouse"
            />
          </Field>
          <Field label="Mobile">
            <Input
              type="tel"
              value={formData.emergencyContact?.mobile || ''}
              onChange={e => handleEmergencyContactChange('mobile', e.target.value)}
              placeholder="Mobile number"
              inputMode="tel"
            />
          </Field>
        </div>
      </Card>

      {/* Sticky footer bar for long forms (style guide section 9.2). */}
      <div className="sticky bottom-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 border-t border-border bg-surface/90 backdrop-blur">
        <div className="max-w-360 mx-auto flex items-center justify-end gap-2">
          <Button variant="outline" color="neutral" type="button" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} leftIcon={!isSubmitting ? <Save size={16} /> : undefined}>
            {patient ? 'Save changes' : 'Save patient'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default PatientForm;
