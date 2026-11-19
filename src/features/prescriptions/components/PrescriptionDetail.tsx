import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, Button, Field, Heading } from 'react-typescript-ui';
import { Prescription, PrescriptionMedicine } from '../../../types';
import { prescriptionService } from '../services/prescriptionService';

interface PrescriptionDetailProps {}

const PrescriptionDetail: React.FC<PrescriptionDetailProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPrescription(id);
    }
  }, [id]);

  const fetchPrescription = async (prescriptionId: string) => {
    try {
      const data = await prescriptionService.getPrescriptionById(prescriptionId);
      setPrescription(data);
    } catch (error) {
      console.error('Error fetching prescription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (prescription) {
      prescriptionService.openPrescriptionPDF(prescription, {
        name: 'HomeoCare Pro Clinic',
        address: '123 Clinic Road, Medical District',
        phone: '+91-XXXX-XXXXXX',
        doctorName: 'Dr. User',
        qualification: 'BHMS, MD',
      });
    }
  };

  const handleBack = () => {
    navigate('/prescriptions');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Prescription not found</div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Heading>Prescription Details</Heading>
      </CardHeader>
      
      <CardBody className="space-y-6">
        {/* Patient Information */}
        <div className="border-b border-gray-200 pb-6">
          <Heading className="mb-4 text-primary">Patient Information</Heading>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Patient Name">
              {prescription.patientName}
            </Field>
            <Field label="Patient ID">
              {prescription.patientId}
            </Field>
            <Field label="Prescription Date">
              {new Date(prescription.createdAt).toLocaleDateString()}
            </Field>
            <Field label="Doctor">
              {prescription.doctorName}
            </Field>
          </div>
        </div>

        {/* Medicines */}
        <div className="border-b border-gray-200 pb-6">
          <Heading className="mb-4 text-primary">Medicines</Heading>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 border">Medicine</th>
                  <th className="px-4 py-2 border">Potency</th>
                  <th className="px-4 py-2 border">Dosage</th>
                  <th className="px-4 py-2 border">Frequency</th>
                  <th className="px-4 py-2 border">Duration</th>
                  <th className="px-4 py-2 border">Notes</th>
                </tr>
              </thead>
              <tbody>
                {prescription.medicines.map((medicine: PrescriptionMedicine, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-2">{medicine.medicine}</td>
                    <td className="px-4 py-2">{medicine.potency}</td>
                    <td className="px-4 py-2">{medicine.dosage}</td>
                    <td className="px-4 py-2">{medicine.frequency}</td>
                    <td className="px-4 py-2">{medicine.duration}</td>
                    <td className="px-4 py-2">{medicine.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Notes */}
        {prescription.notes && (
          <div className="border-b border-gray-200 pb-6">
            <Heading className="mb-4 text-primary">Additional Instructions</Heading>
            <div 
              className="bg-gray-50 p-4 rounded"
              dangerouslySetInnerHTML={{ __html: prescription.notes }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={handlePrint}>
            Print Prescription
          </Button>
          <Button variant="outline" onClick={handleBack}>
            Back to Prescriptions
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

export default PrescriptionDetail;
