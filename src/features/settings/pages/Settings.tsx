import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from 'react-typescript-ui';
import { Database, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { seedDemoData, removeDemoData, type SeedSummary } from '../../../utils/seedDemoData';
import { patientService } from '../../patients/services/patientService';
import { useAuth } from '../../auth/AuthContext';
import { AdminDataTools } from '../components/AdminDataTools';

export function Settings() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<SeedSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removed, setRemoved] = useState<SeedSummary | null>(null);
  const [hasDemoData, setHasDemoData] = useState(false);
  const [patientCount, setPatientCount] = useState<number>(0);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  // Check if demo data exists
  const checkDemoData = useCallback(async () => {
    try {
      const count = await patientService.getPatientCount();
      setPatientCount(count);
      // Demo data has about 30 patients, so if we have 15+, it's likely demo data
      setHasDemoData(count >= 15);
    } catch (error) {
      console.error('Error checking patient count:', error);
    }
  }, []);

  useEffect(() => {
    checkDemoData();
  }, [checkDemoData]);

  async function handleRemoveDemoData() {
    setBusy(true);
    setError(null);
    try {
      const result = await removeDemoData();
      setRemoved(result);
      setSummary(null);
      await queryClient.invalidateQueries();
      await checkDemoData(); // Re-check after removing
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove demo data.');
    } finally {
      setRemoveOpen(false);
      setBusy(false);
    }
  }

  async function handleLoadDemoData() {
    setBusy(true);
    setError(null);
    try {
      const result = await seedDemoData();
      setSummary(result);
      setRemoved(null);
      await queryClient.invalidateQueries();
      await checkDemoData(); // Re-check after loading
      setConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load demo data.');
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">General Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name</label>
            <input
              type="text"
              defaultValue="HomeoCare Pro Clinic"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Address</label>
            <textarea
              rows={3}
              defaultValue="123 Main St, Mumbai, Maharashtra, India"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              defaultValue="+91 9876543210"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">User Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <input type="checkbox" id="darkMode" defaultChecked className="w-4 h-4 text-primary border-gray-300 rounded" />
            <label htmlFor="darkMode" className="ml-2 text-sm text-gray-700">Enable Dark Mode</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="notifications" defaultChecked className="w-4 h-4 text-primary border-gray-300 rounded" />
            <label htmlFor="notifications" className="ml-2 text-sm text-gray-700">Enable Notifications</label>
          </div>
        </div>
      </div>

      {isAdmin ? (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="h-5 w-5" />
              Demo Data
            </h3>
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600">
                Fill the app with a sample set of patients, appointments, cases, prescriptions,
                follow-ups, inventory and billing records to try out the app.
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={checkDemoData} 
                disabled={busy}
                title="Refresh patient count"
              >
                <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button color="primary" onClick={() => setConfirmOpen(true)} disabled={busy || hasDemoData}>
                Load Demo Data
                {hasDemoData && ' (Already loaded)'}
              </Button>
              <Button variant="outline" color="danger" onClick={() => setRemoveOpen(true)} disabled={busy || !hasDemoData}>
                Remove Demo Data
              </Button>
            </div>

            {summary && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Demo data added.</p>
                  <p className="mt-1">
                    {summary.patients} patients, {summary.appointments} appointments, {summary.cases} cases,{' '}
                    {summary.prescriptions} prescriptions, {summary.followUps} follow-ups,{' '}
                    {summary.inventory} inventory items and {summary.billing} billing records.
                  </p>
                  <p className="mt-1 text-xs opacity-75">
                    Total patients: {patientCount}. The "Load Demo Data" button is now disabled.
                  </p>
                </div>
              </div>
            )}

            {removed && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Demo data removed.</p>
                  <p className="mt-1">
                    {removed.patients} patients, {removed.appointments} appointments, {removed.cases} cases,{' '}
                    {removed.prescriptions} prescriptions, {removed.followUps} follow-ups,{' '}
                    {removed.inventory} inventory items and {removed.billing} billing records deleted.
                  </p>
                  <p className="mt-1 text-xs opacity-75">
                    Total patients now: {patientCount}. You can now load demo data again.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>

          <AdminDataTools />
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-sm text-gray-600">
          Demo data, Google connection and Excel export / import are available to Admin users only.
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">About</h3>
        <p className="text-gray-600">HomeoCare Pro v1.0.0</p>
        <p className="text-gray-600 mt-2">© {new Date().getFullYear()} HomeoCare Pro. All rights reserved.</p>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Load demo data"
        message="This adds about 57 sample records (patients, appointments, cases, prescriptions, follow-ups, inventory and billing) so you can try out the app. It does not remove any existing data. Continue?"
        confirmLabel="Load Demo Data"
        busy={busy}
        onConfirm={handleLoadDemoData}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmDialog
        open={removeOpen}
        title="Remove demo data"
        message="This permanently deletes the 20 sample patients and their appointments, cases, prescriptions, follow-ups and bills, plus the 6 sample medicine batches. Anything you added for those sample patients is deleted too. Records for your own patients are kept. Continue?"
        confirmLabel="Remove Demo Data"
        destructive
        busy={busy}
        onConfirm={handleRemoveDemoData}
        onCancel={() => setRemoveOpen(false)}
      />
    </div>
  )
}

export default Settings