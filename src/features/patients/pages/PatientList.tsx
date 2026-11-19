import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Avatar, Button, Input } from 'react-typescript-ui';
import { ChevronRight, Pencil, Search, SearchX, Trash, UserPlus, Users } from 'lucide-react';
import { Patient } from '../../../types';
import { patientService } from '../services/patientService';
import { PageHeader } from '../../../components/ui/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DataTable, TablePagination, type DataTableColumn } from '../../../components/ui/DataTable';
import { formatDate } from '../../dashboard/components/format';
import { ageFromDob } from '../utils/age';

const currentAge = (p: Patient) => ageFromDob(p.dob) ?? p.age;

type SortKey = 'fullName' | 'patientId' | 'registrationDate';

const PatientList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('registrationDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pendingDelete, setPendingDelete] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: patients = [], isLoading, error } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const patients = await patientService.getAllPatients();
      return patients;
    },
  });

  const filteredPatients = patients.filter(patient =>
    patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.mobile.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedPatients = sortedPatients.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleSort = (field: string) => {
    const key = field as SortKey;
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  const handleView = (id: string) => {
    navigate(`/patients/${id}`);
  };

  const handleEdit = (patient: Patient) => {
    // Store patient data in localStorage for the edit page
    localStorage.setItem('editingPatient', JSON.stringify(patient));
    navigate(`/patients/${patient.id}/edit`);
  };

  const handleDelete = async (id: string) => {
    try {
      await patientService.deletePatient(id);
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    } catch (error) {
      console.error('Failed to delete patient:', error);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    await handleDelete(pendingDelete.id);
    setDeleting(false);
    setPendingDelete(null);
  };

  const handleAddNew = () => {
    navigate('/patients/new');
  };

  const columns: DataTableColumn<Patient>[] = [
    {
      key: 'patient',
      header: 'Patient',
      sortKey: 'fullName',
      render: p => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={p.fullName} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text truncate">{p.fullName}</p>
            <p className="text-xs text-muted tabular-nums">{p.patientId} · {p.mobile}</p>
          </div>
        </div>
      ),
    },
    { key: 'age', header: 'Age / gender', render: p => <span className="text-text">{currentAge(p) ? `${currentAge(p)} y` : '—'} · {p.gender}</span> },
    { key: 'city', header: 'City', render: p => <span className="text-muted">{p.city || '—'}</span> },
    {
      key: 'registered',
      header: 'Registered',
      sortKey: 'registrationDate',
      render: p => <span className="text-muted tabular-nums">{p.registrationDate ? formatDate(p.registrationDate) : '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12 text-right',
      // Row click opens the patient; these show on row hover or keyboard
      // focus. Inline buttons rather than a dropdown, which the table's
      // horizontal-scroll wrapper would clip on the bottom rows.
      render: p => (
        <div
          onClick={e => e.stopPropagation()}
          className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
        >
          <button
            type="button"
            onClick={() => handleEdit(p)}
            className="focus-ring w-8 h-8 rounded-md flex items-center justify-center text-muted hover:bg-surface hover:text-text"
            aria-label={`Edit ${p.fullName}`}
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={() => setPendingDelete(p)}
            className="focus-ring w-8 h-8 rounded-md flex items-center justify-center text-muted hover:bg-surface hover:text-danger"
            aria-label={`Delete ${p.fullName}`}
          >
            <Trash size={15} />
          </button>
        </div>
      ),
    },
  ];

  const isSearching = searchTerm.trim().length > 0;

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle={isLoading ? 'Loading…' : `${patients.length} registered ${patients.length === 1 ? 'patient' : 'patients'}`}
        actions={
          <Button leftIcon={<UserPlus size={16} />} onClick={handleAddNew}>
            Add patient
          </Button>
        }
      />

      {error ? (
        <Alert color="danger" title="Couldn't load patients">
          Please try again. If this keeps happening, check that the app has storage access.
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          rows={paginatedPatients}
          rowKey={p => p.id}
          loading={isLoading}
          onRowClick={p => handleView(p.id)}
          sort={{ key: sortBy, order: sortOrder }}
          onSort={handleSort}
          toolbar={
            <div className="max-w-sm">
              <Input
                type="search"
                placeholder="Search by name, ID, mobile or email"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                leftAddon={<Search size={16} className="text-faint" />}
                aria-label="Search patients"
              />
            </div>
          }
          empty={
            isSearching ? (
              <EmptyState
                icon={SearchX}
                title="No matching patients"
                description={`Nothing matches "${searchTerm}". Try a name, patient ID or mobile number.`}
                actionLabel="Clear search"
                onAction={() => setSearchTerm('')}
              />
            ) : (
              <EmptyState
                icon={Users}
                title="No patients yet"
                description="Registered patients will be listed here."
                actionLabel="Add patient"
                onAction={handleAddNew}
              />
            )
          }
          renderMobile={p => (
            <button
              type="button"
              onClick={() => handleView(p.id)}
              className="focus-ring w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2"
            >
              <Avatar name={p.fullName} size="sm" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-text truncate">{p.fullName}</span>
                <span className="block text-xs text-muted tabular-nums">
                  {p.patientId} · {currentAge(p) ? `${currentAge(p)} y` : '—'} · {p.gender}
                </span>
              </span>
              <ChevronRight size={16} className="text-faint shrink-0" aria-hidden="true" />
            </button>
          )}
          footer={
            <TablePagination
              page={page}
              pageSize={itemsPerPage}
              total={filteredPatients.length}
              noun="patients"
              onPageChange={setPage}
              onPageSizeChange={size => {
                setItemsPerPage(size);
                setPage(1);
              }}
            />
          }
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete patient?"
        message={
          pendingDelete
            ? `${pendingDelete.fullName} (${pendingDelete.patientId}) will be removed from this device. This can't be undone.`
            : ''
        }
        confirmLabel="Delete patient"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

export default PatientList;
