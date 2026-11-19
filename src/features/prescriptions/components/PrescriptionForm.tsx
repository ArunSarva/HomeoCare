import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardHeader, CardBody,
  Button, Input, Field, Heading,
  Modal
} from 'react-typescript-ui';
import NoteEditor, { type NoteEditorRef } from '../../../components/NoteEditor';
import { Prescription } from '../../../types';
import { prescriptionService, COMMON_REMEDIES } from '../services/prescriptionService';

interface PrescriptionFormProps {
  patientId: string;
  patientName: string;
  onPrescribe?: (prescription: Prescription) => void | Promise<void>;
}

interface MedicineForm {
  medicine: string;
  potency: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

const PrescriptionForm: React.FC<PrescriptionFormProps> = ({ patientId, patientName, onPrescribe }) => {
  const navigate = useNavigate();
  const editorRef = React.useRef<NoteEditorRef>(null);
  
  const [medicines, setMedicines] = useState<MedicineForm[]>([
    {
      medicine: '',
      potency: '',
      dosage: '',
      frequency: '',
      duration: '',
    },
  ]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    prescriptionService.getTemplates()
      .then((savedTemplates) => { if (active) setTemplates(savedTemplates); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load prescription templates.');
      });
    return () => { active = false; };
  }, []);

  const handleMedicineChange = (index: number, field: keyof MedicineForm, value: string) => {
    const updatedMedicines = [...medicines];
    updatedMedicines[index] = { ...updatedMedicines[index], [field]: value };
    setMedicines(updatedMedicines);
  };

  const addMedicine = () => {
    setMedicines([
      ...medicines,
      {
        medicine: '',
        potency: '',
        dosage: '',
        frequency: '',
        duration: '',
      },
    ]);
  };

  const removeMedicine = (index: number) => {
    if (medicines.length > 1) {
      setMedicines(medicines.filter((_, i) => i !== index));
    }
  };

  const loadTemplate = async (templateId: string) => {
    const templateMedicines = await prescriptionService.loadTemplate(templateId);
    if (templateMedicines) {
      setMedicines(templateMedicines as MedicineForm[]);
    }
    setShowTemplateModal(false);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      setError('Template name is required');
      return;
    }

    const prescriptionData: Prescription = {
      id: crypto.randomUUID(),
      patientId,
      patientName,
      medicines: medicines.map(m => ({
        medicine: m.medicine,
        potency: m.potency,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        notes: m.notes,
      })),
      notes,
      doctorId: '', // Will be set by service
      doctorName: '', // Will be set by service
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await prescriptionService.saveAsTemplate(prescriptionData, templateName);
      setTemplates(await prescriptionService.getTemplates());
      setTemplateName('');
      setShowSaveTemplateModal(false);
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save prescription template.');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await prescriptionService.deleteTemplate(templateId);
      setTemplates(await prescriptionService.getTemplates());
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete prescription template.');
    }
  };

  const validateForm = (): boolean => {
    const hasMedicine = medicines.some(m => m.medicine?.trim());
    if (!hasMedicine) {
      setError('At least one medicine is required');
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
      const prescriptionToSubmit: Prescription = {
        id: crypto.randomUUID(),
        patientId,
        patientName,
        medicines: medicines.map(m => ({
          medicine: m.medicine,
          potency: m.potency,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          notes: m.notes,
        })),
        notes,
        doctorId: '', // Will be set by service
        doctorName: '', // Will be set by service
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (onPrescribe) {
        await onPrescribe(prescriptionToSubmit);
      } else {
        // Call the service directly if no custom handler
        await prescriptionService.createPrescription(prescriptionToSubmit);
        navigate('/prescriptions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prescription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/prescriptions');
  };

  const handlePrint = () => {
    const prescriptionData: Prescription = {
      id: crypto.randomUUID(),
      patientId,
      patientName,
      medicines: medicines.map(m => ({
        medicine: m.medicine,
        potency: m.potency,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        notes: m.notes,
      })),
      notes,
      doctorId: '', // Will be set by service
      doctorName: '', // Will be set by service
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    prescriptionService.openPrescriptionPDF(prescriptionData, {
      name: 'HomeoCare Pro Clinic',
      address: '123 Clinic Road, Medical District',
      phone: '+91-XXXX-XXXXXX',
      doctorName: 'Dr. User',
      qualification: 'BHMS, MD',
    });
  };

  return (
    <Card>
      <CardHeader>
        <Heading>Prescription for {patientName}</Heading>
      </CardHeader>
      
      <CardBody className="space-y-6">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Medicines Section */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center justify-between mb-4">
            <Heading className="text-primary">Medicines</Heading>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowTemplateModal(true)}>
                Load Template
              </Button>
              <Button variant="outline" onClick={() => setShowSaveTemplateModal(true)}>
                Save as Template
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            {medicines.map((medicine, index) => (
              <div key={index} className="border border-gray-200 rounded p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Heading className="text-sm text-gray-600">Medicine {index + 1}</Heading>
                  {medicines.length > 1 && (
                    <Button variant="outline" size="sm" onClick={() => removeMedicine(index)}>
                      Remove
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Medicine *">
                    {/* Free text with suggestions: this was a Select limited to
                        the 10 common remedies, so nothing else could be
                        prescribed despite the "or type" hint. */}
                    <Input
                      type="text"
                      list="common-remedies"
                      value={medicine.medicine}
                      onChange={e => handleMedicineChange(index, 'medicine', e.target.value)}
                      placeholder="Select or type medicine"
                      autoComplete="off"
                    />
                  </Field>
                  
                  <Field label="Potency *">
                    <Input
                      type="text"
                      value={medicine.potency}
                      onChange={e => handleMedicineChange(index, 'potency', e.target.value)}
                      placeholder="e.g., 30C, 200C, 1M"
                    />
                  </Field>
                  
                  <Field label="Dosage *">
                    <Input
                      type="text"
                      value={medicine.dosage}
                      onChange={e => handleMedicineChange(index, 'dosage', e.target.value)}
                      placeholder="e.g., 2 drops, 1 pill"
                    />
                  </Field>
                  
                  <Field label="Frequency *">
                    <Input
                      type="text"
                      value={medicine.frequency}
                      onChange={e => handleMedicineChange(index, 'frequency', e.target.value)}
                      placeholder="e.g., 3 times daily"
                    />
                  </Field>
                  
                  <Field label="Duration *">
                    <Input
                      type="text"
                      value={medicine.duration}
                      onChange={e => handleMedicineChange(index, 'duration', e.target.value)}
                      placeholder="e.g., 1 week, 2 weeks"
                    />
                  </Field>
                </div>
                
                <Field label="Notes">
                  <Input
                    type="text"
                    value={medicine.notes}
                    onChange={e => handleMedicineChange(index, 'notes', e.target.value)}
                    placeholder="Additional instructions for this medicine"
                  />
                </Field>
              </div>
            ))}
            
            <datalist id="common-remedies">
              {COMMON_REMEDIES.map(remedy => <option key={remedy} value={remedy} />)}
            </datalist>
            <Button type="button" onClick={addMedicine}>
              + Add Medicine
            </Button>
          </div>
        </div>

        {/* Additional Notes Section */}
        <div className="border-b border-gray-200 pb-6">
          <Heading className="mb-4 text-primary">Additional Instructions</Heading>
          <NoteEditor
            ref={editorRef}
            value={notes}
            onChange={(value) => setNotes(value)}
            placeholder="Enter any additional instructions or notes..."
            height="200px"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between space-x-3 pt-4">
          <Button variant="outline" onClick={handlePrint}>
            Print Prescription
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Prescription'}
          </Button>
        </div>

        {/* Load Template Modal */}
        <Modal
          open={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          title="Load Prescription Template"
        >
          <div className="max-h-96 overflow-y-auto">
            {templates.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No templates saved yet.</p>
            ) : (
              <div className="space-y-2">
                {templates.map(template => (
                  <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="font-medium">{template.name}</span>
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={() => loadTemplate(template.id)}>
                        Load
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteTemplate(template.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>

        {/* Save Template Modal */}
        <Modal
          open={showSaveTemplateModal}
          onClose={() => setShowSaveTemplateModal(false)}
          title="Save as Template"
        >
          <div className="space-y-4">
            <Field label="Template Name *">
              <Input
                type="text"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="Enter template name"
              />
            </Field>
            <div className="flex items-center justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowSaveTemplateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate}>
                Save Template
              </Button>
            </div>
          </div>
        </Modal>
      </CardBody>
    </Card>
  );
};

export default PrescriptionForm;
