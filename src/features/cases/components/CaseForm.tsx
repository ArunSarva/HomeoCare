import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardHeader, CardBody,
  Button, Input, Select,
  Field, Heading
} from 'react-typescript-ui';
import NoteEditor, { type NoteEditorRef } from '../../../components/NoteEditor';
import { Case, ChiefComplaint, MentalSymptom, PhysicalGeneral } from '../../../types';
import { caseService } from '../services/caseService';

// Mental symptoms options
const MENTAL_SYMPTOMS: { label: string; value: string }[] = [
  { label: 'Anxiety', value: 'Anxiety' },
  { label: 'Fear', value: 'Fear' },
  { label: 'Anger', value: 'Anger' },
  { label: 'Irritability', value: 'Irritability' },
  { label: 'Jealousy', value: 'Jealousy' },
  { label: 'Grief', value: 'Grief' },
  { label: 'Depression', value: 'Depression' },
  { label: 'Memory', value: 'Memory' },
  { label: 'Other', value: 'Other' }
];

// Severity options
const SEVERITY_OPTIONS: { label: string; value: string }[] = [
  { label: 'Mild', value: 'Mild' },
  { label: 'Moderate', value: 'Moderate' },
  { label: 'Severe', value: 'Severe' }
];

interface CaseFormProps {
  caseData?: Case;
  patientId?: string;
  patientName?: string;
}

const CaseForm: React.FC<CaseFormProps> = ({ caseData, patientId, patientName }) => {
  const navigate = useNavigate();
  const editorRef = useRef<NoteEditorRef>(null);
  
  const [formData, setFormData] = useState<Partial<Case>>({
    chiefComplaints: [],
    mentalSymptoms: [],
    physicalGenerals: [],
    foodPreferences: {
      likes: [],
      dislikes: [],
    },
    thermalState: 'Mixed',
    appetite: 'Normal',
    thirst: 'Normal',
    sleep: 'Normal',
    stool: 'Normal',
    urine: 'Normal',
    sweat: 'Normal',
    totalDuration: '',
    severity: 'Moderate',
    onset: '',
    notes: '',
  });
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with existing case data
  useEffect(() => {
    if (caseData) {
      setFormData(caseData);
    }
    // If patient info provided, use it
    if (patientId) {
      setFormData(prev => ({ ...prev, patientId }));
    }
    if (patientName) {
      setFormData(prev => ({ ...prev, patientName }));
    }
  }, [caseData, patientId, patientName]);

  // Handle chief complaints section
  const [newComplaint, setNewComplaint] = useState('');
  const [complaintDuration, setComplaintDuration] = useState('');
  const [complaintSeverity, setComplaintSeverity] = useState('Moderate');
  const [complaintOnset, setComplaintOnset] = useState('');

  const addChiefComplaint = () => {
    if (!newComplaint.trim()) {
      setError('Complaint is required');
      return;
    }

    const newComplaintObj: ChiefComplaint = {
      complaint: newComplaint,
      duration: complaintDuration,
      severity: complaintSeverity as 'Mild' | 'Moderate' | 'Severe',
      onset: complaintOnset,
    };

    setFormData(prev => ({
      ...prev,
      chiefComplaints: [...(prev.chiefComplaints || []), newComplaintObj],
    }));

    setNewComplaint('');
    setComplaintDuration('');
    setComplaintSeverity('Moderate');
    setComplaintOnset('');
    setError(null);
  };

  const removeChiefComplaint = (index: number) => {
    setFormData(prev => ({
      ...prev,
      chiefComplaints: prev.chiefComplaints?.filter((_, i) => i !== index),
    }));
  };

  // Handle mental symptoms section
  const [selectedMentalSymptom, setSelectedMentalSymptom] = useState('');
  const [mentalDescription, setMentalDescription] = useState('');
  const [mentalSeverity, setMentalSeverity] = useState('Moderate');

  const addMentalSymptom = () => {
    if (!selectedMentalSymptom) {
      setError('Please select a mental symptom');
      return;
    }

    const newMentalSymptom: MentalSymptom = {
      symptom: selectedMentalSymptom as 'Anxiety' | 'Fear' | 'Anger' | 'Irritability' | 'Jealousy' | 'Grief' | 'Depression' | 'Memory' | 'Other',
      description: mentalDescription,
      severity: mentalSeverity as 'Mild' | 'Moderate' | 'Severe',
    };

    setFormData(prev => ({
      ...prev,
      mentalSymptoms: [...(prev.mentalSymptoms || []), newMentalSymptom],
    }));

    setSelectedMentalSymptom('');
    setMentalDescription('');
    setMentalSeverity('Moderate');
    setError(null);
  };

  const removeMentalSymptom = (index: number) => {
    setFormData(prev => ({
      ...prev,
      mentalSymptoms: prev.mentalSymptoms?.filter((_, i) => i !== index),
    }));
  };

  // Handle physical generals section
  const PHYSICAL_GENERAL_SYMPTOMS: { label: string; value: string }[] = [
    { label: 'Appetite', value: 'Appetite' },
    { label: 'Thirst', value: 'Thirst' },
    { label: 'Sleep', value: 'Sleep' },
    { label: 'Dreams', value: 'Dreams' },
    { label: 'Stool', value: 'Stool' },
    { label: 'Urine', value: 'Urine' },
    { label: 'Sweat', value: 'Sweat' },
    { label: 'Thermal State', value: 'Thermal State' },
  ];

  const [selectedPhysicalSymptom, setSelectedPhysicalSymptom] = useState('');
  const [physicalDescription, setPhysicalDescription] = useState('');

  const addPhysicalGeneral = () => {
    if (!selectedPhysicalSymptom) {
      setError('Please select a physical general');
      return;
    }

    const newPhysicalGeneral: PhysicalGeneral = {
      symptom: selectedPhysicalSymptom as 'Appetite' | 'Thirst' | 'Sleep' | 'Dreams' | 'Stool' | 'Urine' | 'Sweat' | 'Thermal State',
      description: physicalDescription,
    };

    setFormData(prev => ({
      ...prev,
      physicalGenerals: [...(prev.physicalGenerals || []), newPhysicalGeneral],
    }));

    setSelectedPhysicalSymptom('');
    setPhysicalDescription('');
    setError(null);
  };

  const removePhysicalGeneral = (index: number) => {
    setFormData(prev => ({
      ...prev,
      physicalGenerals: prev.physicalGenerals?.filter((_, i) => i !== index),
    }));
  };

  // Handle food preferences
  const [foodLikes, setFoodLikes] = useState('');
  const [foodDislikes, setFoodDislikes] = useState('');

  const addFoodLike = () => {
    if (foodLikes.trim()) {
      setFormData(prev => ({
        ...prev,
        foodPreferences: {
          likes: [...(prev.foodPreferences?.likes || []), foodLikes.trim()],
          dislikes: prev.foodPreferences?.dislikes || [],
        },
      }));
      setFoodLikes('');
    }
  };

  const addFoodDislike = () => {
    if (foodDislikes.trim()) {
      setFormData(prev => ({
        ...prev,
        foodPreferences: {
          likes: prev.foodPreferences?.likes || [],
          dislikes: [...(prev.foodPreferences?.dislikes || []), foodDislikes.trim()],
        },
      }));
      setFoodDislikes('');
    }
  };

  const removeFoodItem = (index: number, type: 'likes' | 'dislikes') => {
    setFormData(prev => {
      const currentLikes = prev.foodPreferences?.likes || [];
      const currentDislikes = prev.foodPreferences?.dislikes || [];
      
      return {
        ...prev,
        foodPreferences: {
          likes: type === 'likes' ? currentLikes.filter((_, i) => i !== index) : currentLikes,
          dislikes: type === 'dislikes' ? currentDislikes.filter((_, i) => i !== index) : currentDislikes,
        },
      };
    });
  };

  // Handle editor slash commands (disabled until RichEditor API supports it)
  // const handleEditorKeyDown = async (e: React.KeyboardEvent) => {
  //   if (e.key === 'Enter' && e.shiftKey) {
  //     // Allow new line
  //     return;
  //   }
  //   
  //   // Check for slash command
  //   const editorValue = editorRef.current?.getValue?.() || '';
  //   const command = parseSlashCommand(editorValue);
  //   
  //   if (command) {
  //     e.preventDefault();
  //     // Insert the command content
  //     await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure content is updated
  //     editorRef.current?.insertContent('\n' + command.content);
  //   }
  // };

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.patientId) {
      setError('Patient ID is required');
      return false;
    }
    if (!formData.patientName) {
      setError('Patient name is required');
      return false;
    }
    if (!formData.chiefComplaints || formData.chiefComplaints.length === 0) {
      setError('At least one chief complaint is required');
      return false;
    }
    return true;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const caseToSubmit: Case = {
        id: caseData?.id || crypto.randomUUID(),
        patientId: formData.patientId || '',
        patientName: formData.patientName || '',
        chiefComplaints: formData.chiefComplaints || [],
        mentalSymptoms: formData.mentalSymptoms || [],
        physicalGenerals: formData.physicalGenerals || [],
        thermalState: formData.thermalState || 'Mixed',
        appetite: formData.appetite || 'Normal',
        thirst: formData.thirst || 'Normal',
        sleep: formData.sleep || 'Normal',
        dreams: formData.dreams,
        stool: formData.stool || 'Normal',
        urine: formData.urine || 'Normal',
        sweat: formData.sweat || 'Normal',
        foodPreferences: formData.foodPreferences || { likes: [], dislikes: [] },
        aversions: formData.aversions,
        cravings: formData.cravings,
        totalDuration: formData.totalDuration || '',
        severity: formData.severity || 'Moderate',
        onset: formData.onset || '',
        notes: formData.notes,
        doctorId: formData.doctorId,
        createdAt: caseData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (caseData) {
        await caseService.updateCase(caseData.id, caseToSubmit);
      } else {
        await caseService.createCase(caseToSubmit);
      }

      navigate('/cases');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save case');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/cases');
  };

  return (
    <Card>
      <CardHeader>
        <Heading>{caseData ? 'Edit Case' : 'New Case'}</Heading>
      </CardHeader>
      
      <CardBody className="space-y-6">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {/* Chief Complaints Section */}
        <div className="border-b border-gray-200 pb-6">
          <Heading className="mb-4 text-primary">Chief Complaints</Heading>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Field label="Complaint *">
                <Input
                  type="text"
                  value={newComplaint}
                  onChange={e => setNewComplaint(e.target.value)}
                  placeholder="Enter complaint"
                />
              </Field>
              
              <Field label="Duration">
                <Input
                  type="text"
                  value={complaintDuration}
                  onChange={e => setComplaintDuration(e.target.value)}
                  placeholder="e.g., 2 weeks"
                />
              </Field>
              
              <Field label="Severity">
                <Select
                  value={complaintSeverity}
                  onChange={e => setComplaintSeverity(e.target.value)}
                  options={SEVERITY_OPTIONS}
                />
              </Field>
              
              <Field label="Onset">
                <Input
                  type="text"
                  value={complaintOnset}
                  onChange={e => setComplaintOnset(e.target.value)}
                  placeholder="e.g., Sudden, Gradual"
                />
              </Field>
            </div>
            
            <Button type="button" onClick={addChiefComplaint}>
              + Add Chief Complaint
            </Button>
            
            {formData.chiefComplaints && formData.chiefComplaints.length > 0 && (
              <div className="mt-4 space-y-2">
                <Heading className="text-sm text-gray-600 mb-2">Added Complaints:</Heading>
                {formData.chiefComplaints.map((complaint, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{complaint.complaint}</p>
                      <p className="text-sm text-gray-500">
                        Duration: {complaint.duration || 'N/A'} | 
                        Severity: {complaint.severity} | 
                        Onset: {complaint.onset || 'N/A'}
                      </p>
                    </div>
                    <Button type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => removeChiefComplaint(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mental Symptoms Section */}
        <div className="border-b border-gray-200 pb-6">
          <Heading className="mb-4 text-primary">Mental Symptoms</Heading>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Symptom">
                <Select
                  value={selectedMentalSymptom}
                  onChange={e => setSelectedMentalSymptom(e.target.value)}
                  options={MENTAL_SYMPTOMS}
                />
              </Field>
              
              <Field label="Description">
                <Input
                  type="text"
                  value={mentalDescription}
                  onChange={e => setMentalDescription(e.target.value)}
                  placeholder="Describe the symptom"
                />
              </Field>
              
              <Field label="Severity">
                <Select
                  value={mentalSeverity}
                  onChange={e => setMentalSeverity(e.target.value)}
                  options={SEVERITY_OPTIONS}
                />
              </Field>
            </div>
            
            <Button type="button" onClick={addMentalSymptom}>
              + Add Mental Symptom
            </Button>
            
            {formData.mentalSymptoms && formData.mentalSymptoms.length > 0 && (
              <div className="mt-4 space-y-2">
                <Heading className="text-sm text-gray-600 mb-2">Added Symptoms:</Heading>
                {formData.mentalSymptoms.map((symptom, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{symptom.symptom}</p>
                      <p className="text-sm text-gray-500">
                        {symptom.description} | Severity: {symptom.severity}
                      </p>
                    </div>
                    <Button type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => removeMentalSymptom(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Physical Generals Section */}
        <div className="border-b border-gray-200 pb-6">
          <Heading className="mb-4 text-primary">Physical Generals</Heading>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Symptom">
                <Select
                  value={selectedPhysicalSymptom}
                  onChange={e => setSelectedPhysicalSymptom(e.target.value)}
                  options={PHYSICAL_GENERAL_SYMPTOMS}
                />
              </Field>
              
              <Field label="Description">
                <Input
                  type="text"
                  value={physicalDescription}
                  onChange={e => setPhysicalDescription(e.target.value)}
                  placeholder="Describe the symptom"
                />
              </Field>
            </div>
            
            <Button type="button" onClick={addPhysicalGeneral}>
              + Add Physical General
            </Button>
            
            {formData.physicalGenerals && formData.physicalGenerals.length > 0 && (
              <div className="mt-4 space-y-2">
                <Heading className="text-sm text-gray-600 mb-2">Added Generals:</Heading>
                {formData.physicalGenerals.map((general, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{general.symptom}</p>
                      <p className="text-sm text-gray-500">{general.description}</p>
                    </div>
                    <Button type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => removePhysicalGeneral(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Food Preferences Section */}
        <div className="border-b border-gray-200 pb-6">
          <Heading className="mb-4 text-primary">Food Preferences</Heading>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Field label="Likes">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={foodLikes}
                      onChange={e => setFoodLikes(e.target.value)}
                      placeholder="Enter food item"
                    />
                    <Button type="button" onClick={addFoodLike}>Add</Button>
                  </div>
                </Field>
                
                {formData.foodPreferences?.likes && formData.foodPreferences.likes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.foodPreferences.likes.map((item, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
                        {item}
                        <button type="button"
                          onClick={() => removeFoodItem(index, 'likes')}
                          aria-label={`Remove liked food ${item}`}
                          className="ml-2 hover:text-green-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <Field label="Dislikes">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={foodDislikes}
                      onChange={e => setFoodDislikes(e.target.value)}
                      placeholder="Enter food item"
                    />
                    <Button type="button" onClick={addFoodDislike}>Add</Button>
                  </div>
                </Field>
                
                {formData.foodPreferences?.dislikes && formData.foodPreferences.dislikes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.foodPreferences.dislikes.map((item, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm">
                        {item}
                        <button type="button"
                          onClick={() => removeFoodItem(index, 'dislikes')}
                          aria-label={`Remove disliked food ${item}`}
                          className="ml-2 hover:text-red-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="border-b border-gray-200 pb-6">
          <Heading className="mb-4 text-primary">Additional Information</Heading>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Total Duration">
              <Input
                type="text"
                value={formData.totalDuration || ''}
                onChange={e => setFormData(prev => ({ ...prev, totalDuration: e.target.value }))}
                placeholder="e.g., 3 months"
              />
            </Field>
            
            <Field label="Severity">
              <Select
                value={formData.severity || 'Moderate'}
                onChange={e => setFormData(prev => ({ ...prev, severity: e.target.value as 'Mild' | 'Moderate' | 'Severe' }))}
                options={SEVERITY_OPTIONS}
              />
            </Field>
            
            <Field label="Onset">
              <Input
                type="text"
                value={formData.onset || ''}
                onChange={e => setFormData(prev => ({ ...prev, onset: e.target.value }))}
                placeholder="e.g., Sudden, Gradual"
              />
            </Field>
          </div>
        </div>

        {/* Rich Text Notes */}
        <div>
          <Heading className="mb-4 text-primary">Additional Notes</Heading>
          
          <NoteEditor
            ref={editorRef}
            value={formData.notes || ''}
            onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))}
            placeholder="Type /case for case note headings or /followup for follow-up headings..."
            height="300px"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : caseData ? 'Update Case' : 'Save Case'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

export default CaseForm;
