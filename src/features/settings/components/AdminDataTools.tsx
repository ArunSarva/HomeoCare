import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from 'react-typescript-ui';
import { CheckCircle2, AlertCircle, Download, Upload, Link2, Save } from 'lucide-react';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { exportToExcel, importFromExcel, DATA_SHEETS, type ImportReport, type StoreCounts } from '../../../utils/excelData';
import { getGoogleConfig, saveGoogleConfig, validateGoogleUrl } from '../../../config/appConfig';

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

/** Admin-only: Google connection, Excel export and Excel import. */
export function AdminDataTools() {
  const queryClient = useQueryClient();

  // ---------- Google connection ----------
  const initial = getGoogleConfig();
  const [appsScriptUrl, setAppsScriptUrl] = useState(initial.appsScriptUrl);
  const [sheetsUrl, setSheetsUrl] = useState(initial.sheetsUrl);
  const [urlErrors, setUrlErrors] = useState<{ appsScript?: string; sheets?: string }>({});
  const [urlSaved, setUrlSaved] = useState(false);

  function handleSaveUrls(e: React.FormEvent) {
    e.preventDefault();
    const errs = {
      appsScript: validateGoogleUrl(appsScriptUrl, 'appsScript') ?? undefined,
      sheets: validateGoogleUrl(sheetsUrl, 'sheets') ?? undefined,
    };
    setUrlErrors(errs);
    setUrlSaved(false);
    if (errs.appsScript || errs.sheets) return;
    saveGoogleConfig({ appsScriptUrl, sheetsUrl });
    setUrlSaved(true);
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
      <form className={card} onSubmit={handleSaveUrls} noValidate>
        <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Link2 className="h-5 w-5" /> Google connection
        </h3>
        <p className="text-gray-600 mb-4 text-sm">
          Addresses the app uses to sign in through Google Apps Script and to sync data with Google Sheets.
          Leave both empty to work offline only. Saved in this browser.
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor="appsScriptUrl" className="block text-sm font-medium text-gray-700 mb-1">Apps Script web-app URL</label>
            <input id="appsScriptUrl" type="url" className={input} value={appsScriptUrl}
              placeholder="https://script.google.com/macros/s/.../exec"
              aria-invalid={Boolean(urlErrors.appsScript)} aria-describedby={urlErrors.appsScript ? 'appsScriptUrl-err' : undefined}
              onChange={(e) => { setAppsScriptUrl(e.target.value); setUrlSaved(false); }} />
            {urlErrors.appsScript && <p id="appsScriptUrl-err" className="mt-1 text-sm text-red-600">{urlErrors.appsScript}</p>}
          </div>
          <div>
            <label htmlFor="sheetsUrl" className="block text-sm font-medium text-gray-700 mb-1">Google Sheets data URL</label>
            <input id="sheetsUrl" type="url" className={input} value={sheetsUrl}
              placeholder="https://..."
              aria-invalid={Boolean(urlErrors.sheets)} aria-describedby={urlErrors.sheets ? 'sheetsUrl-err' : undefined}
              onChange={(e) => { setSheetsUrl(e.target.value); setUrlSaved(false); }} />
            {urlErrors.sheets && <p id="sheetsUrl-err" className="mt-1 text-sm text-red-600">{urlErrors.sheets}</p>}
          </div>
        </div>
        <div className="mt-4">
          <Button type="submit" color="primary" leftIcon={<Save size={16} />}>Save connection</Button>
        </div>
        {urlSaved && (
          <Notice kind="ok" title="Connection saved.">
            <p className="mt-1">{appsScriptUrl.trim() || sheetsUrl.trim() ? 'New sign-ins and syncs use these addresses.' : 'Both addresses are empty, so the app works offline only.'}</p>
          </Notice>
        )}
      </form>

      <div className={card}>
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
      </div>

      <div className={card}>
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
      </div>

      <ConfirmDialog
        open={pendingFile !== null}
        title="Import from Excel"
        message={`Import "${pendingFile?.name ?? ''}"? Records with the same id are overwritten with the values in the file; new ids are added. Existing records not in the file stay as they are. Consider exporting first as a backup.`}
        confirmLabel="Import"
        busy={importing}
        onConfirm={handleImport}
        onCancel={() => setPendingFile(null)}
      />
    </>
  );
}

export default AdminDataTools;
