import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card } from 'react-typescript-ui';
import { billingService } from '../services/billingService';
import { Billing } from '../../../types';
import { appointmentService } from '../../appointments/services/appointmentService';
import { Appointment } from '../../../types';

import { usePatientNumber } from '../../patients/hooks/usePatientNumber';
export function BillingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const patientNumber = usePatientNumber();
  const [billing, setBilling] = useState<Billing | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchBilling();
    }
  }, [id]);

  const fetchBilling = async () => {
    setLoading(true);
    try {
      const data = await billingService.getBillingById(id || '');
      setBilling(data);
      if (data?.patientId) {
        fetchPatientAppointments(data.patientId);
      }
    } catch (error) {
      console.error('Error fetching billing:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientAppointments = async (patientId: string) => {
    try {
      const data = await appointmentService.getAppointmentsByPatientId(patientId);
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const handleEdit = () => {
    if (billing) {
      navigate(`/billing/${billing.id}/edit`);
    }
  };

  const handleBack = () => {
    navigate('/billing');
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p>Loading billing details...</p>
      </Card>
    );
  }

  if (!billing) {
    return (
      <Card className="p-6">
        <p>Billing record not found</p>
        <Button onClick={handleBack} className="mt-4">Back to Billing</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Billing Details</h2>
            <p className="text-gray-600 mt-1">Invoice #{billing.invoiceNumber}</p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={handleEdit} color="primary">
              Edit Billing
            </Button>
            <Button onClick={handleBack} variant="outline">
              Back to Billing
            </Button>
          </div>
        </div>
      </Card>

      {/* Basic Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-gray-600 text-sm">Patient Name</span>
            <p className="text-gray-900 font-medium">{billing.patientName}</p>
          </div>
          <div>
            <span className="text-gray-600 text-sm">Patient ID</span>
            <p className="text-gray-900 font-medium">{patientNumber(billing.patientId)}</p>
          </div>
          <div>
            <span className="text-gray-600 text-sm">Invoice Number</span>
            <p className="text-gray-900 font-medium">{billing.invoiceNumber}</p>
          </div>
          <div>
            <span className="text-gray-600 text-sm">Status</span>
            <p className={`font-medium
              ${billing.status === 'Paid' ? 'text-green-600' :
                billing.status === 'Partial' ? 'text-orange-600' : 'text-yellow-600'}`}>
              {billing.status}
            </p>
          </div>
          <div>
            <span className="text-gray-600 text-sm">Payment Method</span>
            <p className="text-gray-900 font-medium">{billing.paymentMethod}</p>
          </div>
          <div>
            <span className="text-gray-600 text-sm">Created Date</span>
            <p className="text-gray-900 font-medium">{billing.createdAt.split('T')[0]}</p>
          </div>
        </div>
      </Card>

      {/* Charges Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Charges Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Charge Type</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3 text-gray-900">Consultation Fee</td>
                <td className="px-4 py-3 text-right text-gray-900">₹{billing.consultationFee.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-900">Medicine Charges</td>
                <td className="px-4 py-3 text-right text-gray-900">₹{billing.medicineCharges.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-900">Follow-Up Charges</td>
                <td className="px-4 py-3 text-right text-gray-900">₹{billing.followUpCharges.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-900">Other Charges</td>
                <td className="px-4 py-3 text-right text-gray-900">₹{billing.otherCharges.toFixed(2)}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-3 text-gray-900">Discount</td>
                <td className="px-4 py-3 text-right text-green-600">- ₹{billing.discount.toFixed(2)}</td>
              </tr>
              <tr className="bg-gray-100">
                <td className="px-4 py-3 font-semibold text-gray-900">Total Amount</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{billing.totalAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-900">Paid Amount</td>
                <td className="px-4 py-3 text-right text-green-600">₹{billing.paidAmount.toFixed(2)}</td>
              </tr>
              <tr className="bg-orange-50">
                <td className="px-4 py-3 font-semibold text-gray-900">Balance Amount</td>
                <td className="px-4 py-3 text-right font-semibold text-orange-600">₹{billing.balanceAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Related Appointments */}
      {appointments.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Related Appointments</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {appointments.map(apt => (
                  <tr key={apt.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{new Date(apt.appointmentDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-600">{apt.type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${apt.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                          apt.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          apt.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {apt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{apt.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Notes */}
      {billing.notes && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Notes</h3>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: billing.notes }}
          />
        </Card>
      )}
    </div>
  );
}

export default BillingDetail;