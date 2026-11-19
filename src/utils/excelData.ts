import * as XLSX from 'xlsx';
import { getDB } from '../hooks/useIndexedDB';

/**
 * Excel backup of all clinic data: one worksheet per IndexedDB store.
 * Nested values (complaint lists, medicines, emergency contact...) are kept
 * as JSON text in their cell so a file exported here imports back unchanged.
 * Import merges by `id`: rows with an existing id replace that record, rows
 * with a new id are added, nothing else is deleted.
 */

export const DATA_SHEETS = [
  { store: 'patients', sheet: 'Patients' },
  { store: 'appointments', sheet: 'Appointments' },
  { store: 'cases', sheet: 'Cases' },
  { store: 'prescriptions', sheet: 'Prescriptions' },
  { store: 'followups', sheet: 'Follow-ups' },
  { store: 'inventory', sheet: 'Inventory' },
  { store: 'billing', sheet: 'Billing' },
] as const;

export type StoreName = (typeof DATA_SHEETS)[number]['store'];
export type StoreCounts = Record<StoreName, number>;

export interface ImportReport {
  imported: StoreCounts;
  /** Rows that were not imported, with the reason, e.g. "Patients row 5: missing id". */
  skipped: string[];
}

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

/** Fields that hold numbers; everything else that Excel turns into a number becomes text again (mobile, pincode...). */
const NUMERIC_FIELDS = new Set([
  'age', 'height', 'weight', 'bmi',
  'quantity', 'unitPrice', 'totalValue',
  'consultationFee', 'medicineCharges', 'followUpCharges', 'otherCharges', 'discount',
  'totalAmount', 'paidAmount', 'balanceAmount',
  'improvementPercentage',
]);
/** Fields that must be present for a row to be usable. */
const REQUIRED: Record<StoreName, string[]> = {
  patients: ['id', 'fullName', 'mobile'],
  appointments: ['id', 'patientId', 'appointmentDate'],
  cases: ['id', 'patientId'],
  prescriptions: ['id', 'patientId'],
  followups: ['id', 'patientId'],
  inventory: ['id', 'medicineName'],
  billing: ['id', 'patientId'],
};
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function getAll(db: IDBDatabase, store: string): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(store)) { resolve([]); return; }
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function putAll(db: IDBDatabase, store: string, rows: Record<string, unknown>[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!rows.length) { resolve(); return; }
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    rows.forEach((r) => os.put(r));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error(`Saving ${store} was cancelled`));
  });
}

function toCell(value: unknown): unknown {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

/** Builds the workbook and starts the download. Returns how many rows went into each sheet. */
export async function exportToExcel(): Promise<StoreCounts> {
  const db = await getDB();
  const wb = XLSX.utils.book_new();
  const counts = {} as StoreCounts;

  const readme = [
    ['HomeoCare Pro data export'],
    [`Exported ${new Date().toLocaleString()}`],
    [''],
    ['Each sheet holds one kind of record. Keep the "id" column: on import, a row whose id already exists replaces that record and a row with a new id is added.'],
    ['Cells that start with [ or { hold lists or groups of values (for example medicines or emergency contact). Edit them carefully or leave them as they are.'],
    ['This About sheet is ignored on import.'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(readme), 'About');

  for (const { store, sheet } of DATA_SHEETS) {
    const records = await getAll(db, store);
    counts[store] = records.length;
    const columns: string[] = [];
    for (const r of records) for (const k of Object.keys(r)) if (!columns.includes(k)) columns.push(k);
    // Put id first so it is easy to find.
    columns.sort((a, b) => (a === 'id' ? -1 : b === 'id' ? 1 : 0));
    const rows = records.map((r) => Object.fromEntries(columns.map((c) => [c, toCell(r[c])])));
    const ws = rows.length ? XLSX.utils.json_to_sheet(rows, { header: columns }) : XLSX.utils.aoa_to_sheet([['id']]);
    XLSX.utils.book_append_sheet(wb, ws, sheet);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `HomeoCare-Pro-data-${stamp}.xlsx`);
  return counts;
}

function safeJsonParse(text: string): unknown {
  return JSON.parse(text, (key, val) => (UNSAFE_KEYS.has(key) ? undefined : val));
}

function fromCell(field: string, value: unknown): unknown {
  if (value === null || value === undefined || value === '') return undefined;
  if (value instanceof Date) {
    // A date typed into Excel: keep the calendar date the user saw.
    const d = value;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  if (typeof value === 'number') return NUMERIC_FIELDS.has(field) ? value : String(value);
  if (typeof value === 'boolean') return value;
  const text = String(value);
  const trimmed = text.trim();
  if (NUMERIC_FIELDS.has(field) && trimmed !== '' && !Number.isNaN(Number(trimmed))) return Number(trimmed);
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try { return safeJsonParse(trimmed); } catch { /* not JSON, keep as text */ }
  }
  return text;
}

/** Reads the file and merges its rows into the local database. */
export async function importFromExcel(file: File): Promise<ImportReport> {
  if (file.size > MAX_IMPORT_BYTES) throw new Error('The file is larger than 10 MB. Please choose a HomeoCare Pro export file.');
  if (!/\.(xlsx|xls)$/i.test(file.name)) throw new Error('Please choose an Excel file (.xlsx or .xls).');

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  } catch {
    throw new Error('This file could not be read as an Excel workbook.');
  }
  const known = DATA_SHEETS.filter(({ sheet }) => wb.SheetNames.includes(sheet));
  if (!known.length) {
    throw new Error(`No HomeoCare Pro sheets found. The workbook needs sheets named ${DATA_SHEETS.map((s) => s.sheet).join(', ')}.`);
  }

  const report: ImportReport = { imported: {} as StoreCounts, skipped: [] };
  const batches: Array<{ store: StoreName; rows: Record<string, unknown>[] }> = [];

  for (const { store, sheet } of DATA_SHEETS) {
    report.imported[store] = 0;
    const ws = wb.Sheets[sheet];
    if (!ws) continue;
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    const rows: Record<string, unknown>[] = [];
    raw.forEach((cells, i) => {
      const record: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(cells)) {
        const field = key.trim();
        if (!field || UNSAFE_KEYS.has(field) || field.startsWith('__EMPTY')) continue;
        const v = fromCell(field, value);
        if (v !== undefined) record[field] = v;
      }
      if (Object.keys(record).length === 0) return; // blank line
      const missing = REQUIRED[store].filter((f) => record[f] === undefined || record[f] === '');
      if (missing.length) {
        report.skipped.push(`${sheet} row ${i + 2}: missing ${missing.join(', ')}`);
        return;
      }
      record.id = String(record.id);
      rows.push(record);
    });
    batches.push({ store, rows });
  }

  // Validate everything first, then write, so a bad file changes nothing.
  const db = await getDB();
  for (const { store, rows } of batches) {
    await putAll(db, store, rows);
    report.imported[store] = rows.length;
  }
  return report;
}
