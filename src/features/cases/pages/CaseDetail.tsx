import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Heading, Table, TableBody, TableRow, TableCell, TableHeaderCell } from 'react-typescript-ui';
import { formatDate } from 'date-fns';
import { caseService } from '../services/caseService';

import { usePatientNumber } from '../../patients/hooks/usePatientNumber';
export function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const patientNumber = usePatientNumber();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: caseData, isLoading, error } = useQuery({
    queryKey: ['case', id],
    queryFn: async () => {
      if (id) {
        const caseItem = await caseService.getCaseById(id);
        if (caseItem) {
          return caseItem;
        }
        throw new Error('Case not found');
      }
      throw new Error('No case ID provided');
    },
  });

  useEffect(() => {
    if (error) {
      console.error('Error loading case:', error);
    }
  }, [error]);

  const handleEdit = () => {
    navigate(`/cases/${id}/edit`);
  };

  const handleBack = () => {
    navigate('/cases');
  };

  if (isLoading) {
    return (
      <Card>
        <Heading className="p-4 border-b">Case Details</Heading>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (error || !caseData) {
    return (
      <Card>
        <Heading className="p-4 border-b">Case Details</Heading>
        <div className="p-4">
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
            Case not found
          </div>
          <Button onClick={handleBack} className="mt-4">
            Back to List
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <Heading className="text-xl">Case Details</Heading>
            <p className="text-sm text-gray-500 mt-1">Case ID: C{caseData.id?.slice(-6)} | Patient: {caseData.patientName}</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleBack}>
              Back to List
            </Button>
            <Button onClick={handleEdit}>
              Edit Case
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'complaints', label: 'Chief Complaints' },
            { id: 'mental', label: 'Mental Symptoms' },
            { id: 'physical', label: 'Physical Generals' },
            { id: 'notes', label: 'Notes' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card>
            <Heading className="p-4 border-b">Basic Information</Heading>
            <div className="p-4">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableHeaderCell>Patient ID</TableHeaderCell>
                    <TableCell>{patientNumber(caseData.patientId)}</TableCell>
                    <TableHeaderCell>Patient Name</TableHeaderCell>
                    <TableCell>{caseData.patientName}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHeaderCell>Visit Date</TableHeaderCell>
                    <TableCell>{formatDate(new Date(caseData.createdAt || ''), 'PPP')}</TableCell>
                    <TableHeaderCell>Created</TableHeaderCell>
                    <TableCell>{formatDate(new Date(caseData.createdAt || ''), 'PPPpp')}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHeaderCell>Severity</TableHeaderCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${caseData.severity === 'Severe' ? 'bg-red-100 text-red-800' : 
                          caseData.severity === 'Moderate' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'}`}>
                        {caseData.severity}
                      </span>
                    </TableCell>
                    <TableHeaderCell>Total Duration</TableHeaderCell>
                    <TableCell>{caseData.totalDuration || 'N/A'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card>
            <Heading className="p-4 border-b">Physical Information</Heading>
            <div className="p-4">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableHeaderCell>Thermal State</TableHeaderCell>
                    <TableCell>{caseData.thermalState}</TableCell>
                    <TableHeaderCell>Appetite</TableHeaderCell>
                    <TableCell>{caseData.appetite}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHeaderCell>Thirst</TableHeaderCell>
                    <TableCell>{caseData.thirst}</TableCell>
                    <TableHeaderCell>Sleep</TableHeaderCell>
                    <TableCell>{caseData.sleep}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHeaderCell>Stool</TableHeaderCell>
                    <TableCell>{caseData.stool}</TableCell>
                    <TableHeaderCell>Urine</TableHeaderCell>
                    <TableCell>{caseData.urine}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHeaderCell>Sweat</TableHeaderCell>
                    <TableCell>{caseData.sweat}</TableCell>
                    <TableHeaderCell>Dreams</TableHeaderCell>
                    <TableCell>{caseData.dreams || 'N/A'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'complaints' && (
        <Card>
          <Heading className="p-4 border-b">Chief Complaints</Heading>
          <div className="p-4 space-y-4">
            {caseData.chiefComplaints && caseData.chiefComplaints.length > 0 ? (
              caseData.chiefComplaints.map((complaint, index) => (
                <div key={index} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-gray-900">{complaint.complaint}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${complaint.severity === 'Severe' ? 'bg-red-100 text-red-800' : 
                        complaint.severity === 'Moderate' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'}`}>
                      {complaint.severity}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    <p>Duration: {complaint.duration || 'N/A'}</p>
                    <p>Onset: {complaint.onset || 'N/A'}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No chief complaints recorded</p>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'mental' && (
        <Card>
          <Heading className="p-4 border-b">Mental Symptoms</Heading>
          <div className="p-4 space-y-4">
            {caseData.mentalSymptoms && caseData.mentalSymptoms.length > 0 ? (
              caseData.mentalSymptoms.map((symptom, index) => (
                <div key={index} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-gray-900">{symptom.symptom}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${symptom.severity === 'Severe' ? 'bg-red-100 text-red-800' : 
                        symptom.severity === 'Moderate' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'}`}>
                      {symptom.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">{symptom.description}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No mental symptoms recorded</p>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'physical' && (
        <Card>
          <Heading className="p-4 border-b">Physical Generals</Heading>
          <div className="p-4 space-y-4">
            {caseData.physicalGenerals && caseData.physicalGenerals.length > 0 ? (
              caseData.physicalGenerals.map((general, index) => (
                <div key={index} className="border-b border-gray-100 pb-4 last:border-0">
                  <h4 className="font-medium text-gray-900">{general.symptom}</h4>
                  <p className="mt-2 text-sm text-gray-500">{general.description}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No physical generals recorded</p>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'notes' && (
        <Card>
          <Heading className="p-4 border-b">Additional Notes</Heading>
          <div className="p-4">
            {caseData.notes ? (
              <div 
                className="prose max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: caseData.notes }}
              />
            ) : (
              <p className="text-gray-500">No additional notes</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export default CaseDetail;
