import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from 'react-typescript-ui';
import { CheckCircle2, AlertCircle, Download, Upload, Link2, RefreshCw } from 'lucide-react';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { exportToExcel, importFromExcel, DATA_SHEETS, type ImportReport, type StoreCounts } from '../../../utils/excelData';
import { getGoogleConfig } from '../../../config/appConfig';
import {
  isGoogleOAuthConfigured,
  isGoogleSheetsAuthorized,
  loadGoogleIdentity,
  requestGoogleSheetsAccessToken,
} from '../../../services/googleSheetsService';
import { migrateLegacyLocalDataToGoogleDrive, type LocalMigrationReport } from '../../../services/googleCloudStore';

const card = 'bg-white rounded-lg shadow-sm border border-gray-200 p-6';
const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary';

function Notice({ kind, title, children }: { kind: 'ok' | 'error'; title: string; children?: React.ReactNode }) {
  const ok = kind === 'ok';
  const Icon = ok ? CheckCircle2 : AlertCircle;
  return (
    <div role={ok ? 'status' : 'alert'} className={`mt-4 flex items-start gap-2 rounded-lg border p-4 text-sm ${ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
      <Icon className="h-5 w-5 flex-shrink-0" />
      <div>
        <p className="font-medium">{title}</p>
        {children}
      </div>
    </div>
  );
}

function countsText(c: StoreCounts) {
  return DATA_SHEETS.map(({ store, sheet }) => `${c[store] ?? 0} ${sheet.toLowerCase()}`).join(', ');
}

/** Google connection for all users; migration and backup tools are admin-only. */
export function AdminDataTools({
  onGoogleConnected,
  onLegacyMigrationComplete,
  adminFeatures = true,
}: {
  onGoogleConnected?: () => Promise<void> | void;
  onLegacyMigrationComplete?: () => Promise<void> | void;
  adminFeatures?: boolean;
}) {
  const queryClient = useQueryClient();

  // ---------- Google connection ----------
  const initial = getGoogleConfig();
  const googleOAuthConfigured = isGoogleOAuthConfigured();
  const [identityReady, setIdentityReady] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(isGoogleSheetsAuthorized());
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationReport, setMigrationReport] = useState<LocalMigrationReport | null>(null);

  useEffect(() => {
    if (!googleOAuthConfigured) return;
    let active = true;
    loadGoogleIdentity()
      .then(() => { if (active) setIdentityReady(true); })
      .catch((error: unknown) => {
        if (active) setConnectionError(error instanceof Error ? error.message : 'Could not load Google sign-in.');
      });
    return () => { active = false; };
  }, [googleOAuthConfigured]);

  async function handleGoogleConnect() {
    setConnecting(true);
    setConnectionError(null);
    setConnectionMessage(null);
    try {
      await requestGoogleSheetsAccessToken();
      setGoogleConnected(true);
      await onGoogleConnected?.();
      setConnectionMessage('Google is connected for this browser session. Business data will be read from and written directly to this spreadsheet.');
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Google connection failed.');
    } finally {
      setConnecting(false);
    }
  }

  async function handleLegacyMigration() {
    setMigrating(true);
    setConnectionError(null);
    try {
      setMigrationReport(await migrateLegacyLocalDataToGoogleDrive());
      setMigrationPending(false);
      await queryClient.invalidateQueries();
      try {
        await onLegacyMigrationComplete?.();
      } catch (error) {
        setConnectionError(`Migration was verified, but settings could not be refreshed: ${error instanceof Error ? error.message : 'Unknown error.'}`);
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Legacy data migration failed.');
    } finally {
      setMigrating(false);
    }
  }

  // ---------- Export ----------
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState<StoreCounts | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    setExported(null);
    try {
      setExported(await exportToExcel());
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  }

  // ---------- Import ----------
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = ''; // allow choosing the same file again later
    setReport(null);
    setImportError(null);
    if (file) setPendingFile(file);
  }

  async function handleImport() {
    if (!pendingFile) return;
    setImporting(true);
    try {
      const result = await importFromExcel(pendingFile);
      setReport(result);
      await queryClient.invalidateQueries();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
      setPendingFile(null);
    }
  }

  return (
    <>
      <div className={card}>
        <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Link2 className="h-5 w-5" /> Google connection
        </h3>
        <p className="text-gray-600 mb-4 text-sm">
          Connect to use the spreadsheet as the app's live backend. Records are not saved to a local cache;
          access tokens stay in memory and are not saved to local storage or the spreadsheet.
        </p>
        <div>
          <label htmlFor="sheetsUrl" className="block text-sm font-medium text-gray-700 mb-1">Connected Google Sheet</label>
          <input id="sheetsUrl" type="url" className={`${input} bg-gray-50`} value={initial.sheetsUrl} readOnly />
        </div>
        {!googleOAuthConfigured && (
          <Notice kind="error" title="Google OAuth is not configured.">
            <p className="mt-1">Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>.env.local</code>, then restart the dev server.</p>
          </Notice>
        )}
        {googleOAuthConfigured && !identityReady && !connectionError && (
          <p className="mt-3 text-sm text-gray-600">Loading Google authorization…</p>
        )}
        <div className="mt-4">
          <Button
            color="primary"
            onClick={handleGoogleConnect}
            loading={connecting}
            disabled={!googleOAuthConfigured || !identityReady || connecting}
            leftIcon={<RefreshCw size={16} />}
          >
            {googleConnected ? 'Reconnect Google' : 'Connect Google'}
          </Button>
        </div>
        {connectionMessage && <Notice kind="ok" title={connectionMessage} />}
        {connectionError && <Notice kind="error" title={connectionError} />}
        {adminFeatures && <div className="mt-5 border-t border-gray-200 pt-4">
          <h4 className="font-medium text-gray-900">Move existing browser data to Google</h4>
          <p className="mt-1 text-sm text-gray-600">
            One-time migration of older data from this browser's IndexedDB and local settings. Local records are
            cleared only after Google Sheets confirms the migrated rows.
          </p>
          <Button
            variant="outline"
            color="primary"
            className="mt-3"
            onClick={() => setMigrationPending(true)}
            loading={migrating}
            disabled={!googleConnected || migrating}
            leftIcon={<RefreshCw size={16} />}
          >
            Migrate legacy browser data
          </Button>
          {migrationReport && (
            <Notice kind="ok" title={`Migration verified: ${migrationReport.total} record(s) moved.`}>
              <p className="mt-1">{Object.entries(migrationReport.migrated).map(([name, count]) => `${count} ${name}`).join(', ')}.</p>
            </Notice>
          )}
        </div>}
      </div>

      {adminFeatures && <div className={card}>
        <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Download className="h-5 w-5" /> Export to Excel
        </h3>
        <p className="text-gray-600 mb-4 text-sm">
          Downloads one Excel file with a sheet each for patients, appointments, cases, prescriptions,
          follow-ups, inventory and billing. Use it as a backup or to move data to another computer.
        </p>
        <Button color="primary" onClick={handleExport} loading={exporting} leftIcon={<Download size={16} />}>Export to Excel</Button>
        {exported && <Notice kind="ok" title="Export downloaded."><p className="mt-1">{countsText(exported)}.</p></Notice>}
        {exportError && <Notice kind="error" title={exportError} />}
      </div>}

      {adminFeatures && <div className={card}>
        <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Upload className="h-5 w-5" /> Import from Excel
        </h3>
        <p className="text-gray-600 mb-4 text-sm">
          Choose a file made with Export to Excel. Rows whose id already exists replace that record;
          rows with a new id are added. Nothing is deleted. Rows missing required values are skipped and listed.
        </p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChosen} aria-label="Choose Excel file to import" />
        <Button variant="outline" color="primary" onClick={() => fileRef.current?.click()} loading={importing} leftIcon={<Upload size={16} />}>Choose Excel file</Button>
        {report && (
          <Notice kind="ok" title="Import finished.">
            <p className="mt-1">Imported {countsText(report.imported)}.</p>
            {report.skipped.length > 0 && (
              <>
                <p className="mt-2 font-medium">{report.skipped.length} row(s) skipped:</p>
                <ul className="mt-1 list-disc pl-5">
                  {report.skipped.slice(0, 10).map((s) => <li key={s}>{s}</li>)}
                  {report.skipped.length > 10 && <li>and {report.skipped.length - 10} more</li>}
                </ul>
              </>
            )}
          </Notice>
        )}
        {importError && <Notice kind="error" title={importError} />}
      </div>}

      {adminFeatures && <>
        <ConfirmDialog
          open={pendingFile !== null}
          title="Import from Excel"
          message={`Import "${pendingFile?.name ?? ''}"? Records with the same id are overwritten with the values in the file; new ids are added. Existing records not in the file stay as they are. Consider exporting first as a backup.`}
          confirmLabel="Import"
          busy={importing}
          onConfirm={handleImport}
          onCancel={() => setPendingFile(null)}
        />
        <ConfirmDialog
          open={migrationPending}
          title="Migrate legacy browser data"
          message="This copies business records, prescription templates, search history and the saved theme from this browser to the configured Google Sheet. Existing Google rows with matching IDs will be replaced. Local records are deleted only after verification. Continue?"
          confirmLabel="Migrate and verify"
          busy={migrating}
          onConfirm={handleLegacyMigration}
          onCancel={() => setMigrationPending(false)}
        />
      </>}
    </>
  );
}

export default AdminDataTools;
