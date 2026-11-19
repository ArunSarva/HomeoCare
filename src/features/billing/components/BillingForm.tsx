import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, Select, Card } from 'react-typescript-ui';
import { billingService } from '../services/billingService';
import { patientService } from '../../patients/services/patientService';
import { Patient, Billing } from '../../../types';
import Editor from 'react_typescript_editor';

interface BillingFormProps {
  billingId?: string;
  patientId?: string;
  patientName?: string;
}

export function BillingForm({ billingId, patientId, patientName }: BillingFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState(patientId || searchParams.get('patientId') || '');
  const [patientFullName, setPatientFullName] = useState(patientName || searchParams.get('patientName') || '');
  const [consultationFee, setConsultationFee] = useState<string>('0');
  const [medicineCharges, setMedicineCharges] = useState<string>('0');
  const [followUpCharges, setFollowUpCharges] = useState<string>('0');
  const [otherCharges, setOtherCharges] = useState<string>('0');
  const [discount, setDiscount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Online' | 'Upi'>('Cash');
  const [status, setStatus] = useState<'Paid' | 'Pending' | 'Partial'>('Pending');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const totalAmount = parseFloat(consultationFee) + parseFloat(medicineCharges) + parseFloat(followUpCharges) + parseFloat(otherCharges) - parseFloat(discount);
  const paidAmount = status === 'Paid' ? totalAmount : status === 'Partial' ? totalAmount * 0.5 : 0;
  const balanceAmount = totalAmount - paidAmount;

  useEffect(() => {
    fetchPatients();
  }, []);

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

    if (totalAmount <= 0) {
      setError('Total amount must be greater than 0');
      return;
    }

    setLoading(true);

    try {
      const patient = patients.find(p => p.id === selectedPatient);
      if (!patient) {
        throw new Error('Patient not found');
      }

      const billingData: Omit<Billing, 'id' | 'createdAt' | 'updatedAt'> = {
        patientId: selectedPatient,
        patientName: patientFullName,
        consultationFee: parseFloat(consultationFee) || 0,
        medicineCharges: parseFloat(medicineCharges) || 0,
        followUpCharges: parseFloat(followUpCharges) || 0,
        otherCharges: parseFloat(otherCharges) || 0,
        discount: parseFloat(discount) || 0,
        totalAmount,
        paidAmount,
        balanceAmount,
        paymentMethod,
        status,
        invoiceNumber: `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        notes,
      };

      if (billingId) {
        await billingService.updateBilling(billingId, billingData);
      } else {
        await billingService.createBilling(billingData);
      }

      navigate('/billing');
    } catch (err: any) {
      setError(err.message || 'Failed to save billing record');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/billing');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {billingId ? 'Edit Billing Record' : 'New Billing Record'}
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

          {/* Charges */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Consultation Fee (₹)
              </label>
              <Input
                type="number"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                min="0"
                step="0.01"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medicine Charges (₹)
              </label>
              <Input
                type="number"
                value={medicineCharges}
                onChange={(e) => setMedicineCharges(e.target.value)}
                min="0"
                step="0.01"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Follow-Up Charges (₹)
              </label>
              <Input
                type="number"
                value={followUpCharges}
                onChange={(e) => setFollowUpCharges(e.target.value)}
                min="0"
                step="0.01"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Other Charges (₹)
              </label>
              <Input
                type="number"
                value={otherCharges}
                onChange={(e) => setOtherCharges(e.target.value)}
                min="0"
                step="0.01"
                className="w-full"
              />
            </div>
          </div>

          {/* Discount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount (₹)
            </label>
            <Input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              min="0"
              step="0.01"
              className="w-full"
            />
          </div>

          {/* Total Calculation */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Amount:</span>
                <span className="ml-2 font-semibold text-blue-600">₹{totalAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-600">Paid Amount:</span>
                <span className="ml-2 font-semibold text-green-600">₹{paidAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-600">Balance Amount:</span>
                <span className="ml-2 font-semibold text-orange-600">₹{balanceAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method *
              </label>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                options={[
                  { value: 'Cash', label: 'Cash' },
                  { value: 'Card', label: 'Card' },
                  { value: 'Online', label: 'Online' },
                  { value: 'Upi', label: 'UPI' },
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
                  { value: 'Paid', label: 'Paid' },
                  { value: 'Partial', label: 'Partial' },
                  { value: 'Pending', label: 'Pending' },
                ]}
                className="w-full"
              />
            </div>
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
              {loading ? 'Saving...' : billingId ? 'Update Billing' : 'Create Billing'}
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

export default BillingForm;