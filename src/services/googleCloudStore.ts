import { getSheetsUrl } from '../config/appConfig';
import { getActiveGoogleSheetsAccessToken, uploadDriveFile } from './googleSheetsService';
import { getDB } from '../hooks/useIndexedDB';

const DATA_TAB = 'HomeoCareData';
const DATA_HEADERS = ['Collection', 'ID', 'Record JSON', 'Updated At'];
const LEGACY_STORES = ['patients', 'appointments', 'cases', 'prescriptions', 'followups', 'inventory', 'billing', 'syncQueue', 'localCache'];

export type CloudCollection =
  | 'patients'
  | 'appointments'
  | 'cases'
  | 'prescriptions'
  | 'followups'
  | 'inventory'
  | 'billing'
  | 'settings'
  | 'auditLogs'
  | 'prescriptionTemplates'
  | 'searchHistory';

interface StoredRow {
  collection: CloudCollection;
  id: string;
  record: string;
  updatedAt: string;
  rowNumber: number;
}

export interface SettingRecord<T = unknown> {
  id: string;
  value: T;
  updatedAt: string;
}

export interface AuditRecord {
  id: string;
  action: 'create' | 'update' | 'delete' | 'migration';
  collection: string;
  recordId?: string;
  actor: string;
  timestamp: string;
}

export interface LocalMigrationReport {
  migrated: Record<string, number>;
  total: number;
}

let ensuredSpreadsheetId: string | null = null;
let ensurePromise: Promise<void> | null = null;

export async function getCloudRecords<T>(collection: CloudCollection): Promise<T[]> {
  const rows = await readRows();
  return rows
    .filter((row) => row.collection === collection)
    .map((row) => parseRecord<T>(row));
}

export async function getCloudRecord<T>(collection: CloudCollection, id: string): Promise<T | null> {
  const rows = await readRows();
  const row = rows.find((item) => item.collection === collection && item.id === id);
  return row ? parseRecord<T>(row) : null;
}

export async function createCloudRecord<T extends { id: string }>(
  collection: CloudCollection,
  record: T,
): Promise<T> {
  await ensureDataTab();
  const rows = await readRows();
  if (rows.some((row) => row.collection === collection && row.id === record.id)) {
    throw new Error(`A ${collection} record with ID "${record.id}" already exists.`);
  }
  const prepared = await prepareMedia(record);
  await appendRows([[collection, prepared.id, JSON.stringify(prepared), new Date().toISOString()]]);
  await writeAudit('create', collection, record.id);
  return prepared;
}

export async function updateCloudRecord<T extends { id: string }>(
  collection: CloudCollection,
  id: string,
  patch: Partial<T>,
): Promise<T> {
  const rows = await readRows();
  const existing = rows.find((row) => row.collection === collection && row.id === id);
  if (!existing) throw new Error(`${collection} record "${id}" was not found in Google Sheets.`);

  const updated = { ...parseRecord<T>(existing), ...patch, id } as T;
  const prepared = await prepareMedia(updated);
  await writeRow(existing.rowNumber, [collection, id, JSON.stringify(prepared), new Date().toISOString()]);
  await writeAudit('update', collection, id);
  return prepared;
}

export async function deleteCloudRecord(collection: CloudCollection, id: string): Promise<void> {
  const rows = await readRows();
  const existing = rows.find((row) => row.collection === collection && row.id === id);
  if (!existing) throw new Error(`${collection} record "${id}" was not found in Google Sheets.`);

  await clearRow(existing.rowNumber);
  await writeAudit('delete', collection, id);
}

export async function upsertCloudRecord<T extends { id: string }>(
  collection: CloudCollection,
  record: T,
): Promise<void> {
  const rows = await readRows();
  const existing = rows.find((row) => row.collection === collection && row.id === record.id);
  const prepared = await prepareMedia(record);
  const values = [collection, prepared.id, JSON.stringify(prepared), new Date().toISOString()];
  if (existing) {
    await writeRow(existing.rowNumber, values);
  } else {
    await appendRows([values]);
  }
}

export async function bulkUpsertCloudRecords(
  items: Array<{ collection: CloudCollection; record: Record<string, unknown> & { id: string } }>,
): Promise<void> {
  if (items.length === 0) return;
  const rows = await readRows();
  const rowByKey = new Map(rows.map((row) => [`${row.collection}:${row.id}`, row]));
  const appends: Array<Array<string>> = [];
  const updates: Array<{ range: string; values: Array<Array<string>> }> = [];
  const unique = new Map<string, { collection: CloudCollection; record: Record<string, unknown> & { id: string } }>();
  for (const item of items) unique.set(`${item.collection}:${item.record.id}`, item);

  for (const item of unique.values()) {
    const prepared = await prepareMedia(item.record);
    const values = [item.collection, prepared.id, JSON.stringify(prepared), new Date().toISOString()];
    const existing = rowByKey.get(`${item.collection}:${prepared.id}`);
    if (existing) updates.push({ range: rowRange(existing.rowNumber), values: [values] });
    else appends.push(values);
  }
  if (updates.length > 0) await batchWriteRows(updates);
  if (appends.length > 0) await appendRows(appends);
  await writeAudit('migration', 'bulk-import', undefined);
}

export async function nextCloudId(collection: CloudCollection, prefix: string, width = 6): Promise<string> {
  const rows = await getCloudRecords<{ id: string }>(collection);
  const highest = rows.reduce((max, row) => {
    const number = Number.parseInt(row.id.replace(prefix, ''), 10);
    return Number.isNaN(number) ? max : Math.max(max, number);
  }, 0);
  return `${prefix}${String(highest + 1).padStart(width, '0')}`;
}

export async function getCloudSetting<T>(id: string, fallback: T): Promise<T> {
  const setting = await getCloudRecord<SettingRecord<T>>('settings', id);
  return setting ? setting.value : fallback;
}

export async function setCloudSetting<T>(id: string, value: T): Promise<void> {
  const record: SettingRecord<T> = { id, value, updatedAt: new Date().toISOString() };
  await upsertCloudRecord('settings', record);
  await writeAudit('update', 'settings', id);
}

export async function migrateLegacyLocalDataToGoogleDrive(): Promise<LocalMigrationReport> {
  const database = await getDB();
  const snapshot: Array<{ collection: CloudCollection; records: Array<Record<string, unknown> & { id: string }> }> = [];
  const migrated: Record<string, number> = {};

  for (const collection of ['patients', 'appointments', 'cases', 'prescriptions', 'followups', 'inventory', 'billing'] as const) {
    const records = await readLocalStore<Record<string, unknown> & { id: string }>(database, collection);
    snapshot.push({ collection, records });
    migrated[collection] = records.length;
  }

  const templates = readLegacyLocalStorage<Record<string, unknown> & { id: string }>('prescriptionTemplates');
  if (templates.length > 0) snapshot.push({ collection: 'prescriptionTemplates', records: templates });
  migrated.prescriptionTemplates = templates.length;

  const cachedEntries = await readLocalStore<{ key: string; value: { query: string; timestamp: number; resultCount: number } }>(database, 'localCache');
  const history = cachedEntries
    .filter((entry) => entry.key.startsWith('search-history:'))
    .map((entry) => ({ id: entry.key, ...entry.value }));
  if (history.length > 0) snapshot.push({ collection: 'searchHistory', records: history });
  migrated.searchHistory = history.length;

  const theme = readLegacyLocalStorageValue('theme');
  if (theme === 'light' || theme === 'dark') {
    snapshot.push({ collection: 'settings', records: [{ id: 'theme', value: theme, updatedAt: new Date().toISOString() }] });
  }
  migrated.settings = theme === 'light' || theme === 'dark' ? 1 : 0;

  const total = snapshot.reduce((count, item) => count + item.records.length, 0);
  if (total === 0) {
    await clearLegacyLocalStores(database);
    localStorage.removeItem('prescriptionTemplates');
    localStorage.removeItem('theme');
    return { migrated, total };
  }

  const records = snapshot.flatMap(({ collection, records }) => records.map((record) => ({ collection, record })));
  const existingRows = await readRows();
  const rowByKey = new Map(existingRows.map((row) => [`${row.collection}:${row.id}`, row]));
  const appended: Array<Array<string>> = [];
  const updated: Array<{ range: string; values: Array<Array<string>> }> = [];
  const expectedRecords = new Map<string, string>();

  for (const item of records) {
    const prepared = await prepareMedia(item.record);
    const serialized = JSON.stringify(prepared);
    const key = `${item.collection}:${prepared.id}`;
    expectedRecords.set(key, serialized);
    const values = [item.collection, prepared.id, serialized, new Date().toISOString()];
    const existing = rowByKey.get(`${item.collection}:${prepared.id}`);
    if (existing) {
      updated.push({ range: rowRange(existing.rowNumber), values: [values] });
    } else {
      appended.push(values);
    }
  }

  if (updated.length > 0) await batchWriteRows(updated);
  if (appended.length > 0) await appendRows(appended);

  const verified = await readRows();
  const verifiedByKey = new Map(verified.map((row) => [`${row.collection}:${row.id}`, row]));
  const missing = [...expectedRecords].filter(([key, serialized]) => verifiedByKey.get(key)?.record !== serialized);
  if (missing.length > 0) {
    throw new Error(`Migration verification failed for ${missing.length} record(s). Local data has been retained.`);
  }

  await writeAudit('migration', 'all-local-data', undefined);
  await clearLegacyLocalStores(database);
  localStorage.removeItem('prescriptionTemplates');
  localStorage.removeItem('theme');

  return { migrated, total };
}

export async function getDriveImageObjectUrl(photo: string): Promise<string | null> {
  const match = photo.match(/^drive:([a-zA-Z0-9_-]+)$/);
  if (!match) return null;
  const token = getActiveGoogleSheetsAccessToken();
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(match[1])}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await apiError(response, 'Could not load the Drive image.');
  return URL.createObjectURL(await response.blob());
}

async function prepareMedia<T extends object>(record: T): Promise<T> {
  const mediaRecord = record as T & { photo?: unknown; patientId?: unknown; id?: unknown };
  const photo = mediaRecord.photo;
  if (typeof photo !== 'string' || !photo.startsWith('data:')) return record;
  const fileId = await uploadDriveFile(photo, `${String(mediaRecord.patientId ?? mediaRecord.id)}-photo`);
  return { ...record, photo: `drive:${fileId}` } as T;
}

async function readRows(): Promise<StoredRow[]> {
  await ensureDataTab();
  const token = getActiveGoogleSheetsAccessToken();
  const { spreadsheetId } = getConfig();
  const result = await sheetsRequest<{ values?: unknown[][] }>(
    token,
    `${sheetsBase(spreadsheetId)}/values/${encodeURIComponent(`'${DATA_TAB}'!A2:D`)}`,
  );
  return (result.values ?? []).flatMap((values, index) => {
    const collection = String(values[0] ?? '');
    const id = String(values[1] ?? '');
    const record = String(values[2] ?? '');
    if (!collection || !id || !record) return [];
    return [{
      collection: collection as CloudCollection,
      id,
      record,
      updatedAt: String(values[3] ?? ''),
      rowNumber: index + 2,
    }];
  });
}

function parseRecord<T>(row: StoredRow): T {
  try {
    return JSON.parse(row.record) as T;
  } catch {
    throw new Error(`Invalid JSON in the ${DATA_TAB} tab at row ${row.rowNumber}.`);
  }
}

async function ensureDataTab(): Promise<void> {
  const { spreadsheetId } = getConfig();
  if (ensuredSpreadsheetId === spreadsheetId) return;
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    const token = getActiveGoogleSheetsAccessToken();
    const metadata = await sheetsRequest<{ sheets?: Array<{ properties?: { title?: string } }> }>(
      token,
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties(title)`,
    );
    const exists = metadata.sheets?.some((sheet) => sheet.properties?.title === DATA_TAB);
    if (!exists) {
      await sheetsRequest(
        token,
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
        { method: 'POST', body: JSON.stringify({ requests: [{ addSheet: { properties: { title: DATA_TAB } } }] }) },
      );
    }

    const headerResult = await sheetsRequest<{ values?: unknown[][] }>(
      token,
      `${sheetsBase(spreadsheetId)}/values/${encodeURIComponent(`'${DATA_TAB}'!A1:D1`)}`,
    );
    const header = (headerResult.values?.[0] ?? []).map((value) => String(value));
    if (header.length === 0) {
      await sheetsRequest(
        token,
        `${sheetsBase(spreadsheetId)}/values/${encodeURIComponent(`'${DATA_TAB}'!A1:D1`)}?valueInputOption=RAW`,
        { method: 'PUT', body: JSON.stringify({ values: [DATA_HEADERS] }) },
      );
    } else if (DATA_HEADERS.some((value, index) => header[index] !== value)) {
      throw new Error(`The ${DATA_TAB} tab already exists but its headers are not the expected HomeoCare format. No data was changed.`);
    }
    ensuredSpreadsheetId = spreadsheetId;
  })().catch((error: unknown) => {
    ensurePromise = null;
    throw error;
  });

  try {
    await ensurePromise;
  } finally {
    ensurePromise = null;
  }
}

async function appendRows(rows: Array<Array<string>>): Promise<void> {
  if (rows.length === 0) return;
  const token = getActiveGoogleSheetsAccessToken();
  const { spreadsheetId } = getConfig();
  await sheetsRequest(
    token,
    `${sheetsBase(spreadsheetId)}/values/${encodeURIComponent(`'${DATA_TAB}'!A:D`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: rows }) },
  );
}

async function writeRow(rowNumber: number, values: Array<string>): Promise<void> {
  const token = getActiveGoogleSheetsAccessToken();
  const { spreadsheetId } = getConfig();
  await sheetsRequest(
    token,
    `${sheetsBase(spreadsheetId)}/values/${encodeURIComponent(rowRange(rowNumber))}?valueInputOption=RAW`,
    { method: 'PUT', body: JSON.stringify({ values: [values] }) },
  );
}

async function batchWriteRows(data: Array<{ range: string; values: Array<Array<string>> }>): Promise<void> {
  const token = getActiveGoogleSheetsAccessToken();
  const { spreadsheetId } = getConfig();
  await sheetsRequest(
    token,
    `${sheetsBase(spreadsheetId)}/values:batchUpdate`,
    { method: 'POST', body: JSON.stringify({ valueInputOption: 'RAW', data }) },
  );
}

async function clearRow(rowNumber: number): Promise<void> {
  const token = getActiveGoogleSheetsAccessToken();
  const { spreadsheetId } = getConfig();
  await sheetsRequest(
    token,
    `${sheetsBase(spreadsheetId)}/values/${encodeURIComponent(rowRange(rowNumber))}:clear`,
    { method: 'POST', body: '{}' },
  );
}

async function writeAudit(action: AuditRecord['action'], collection: string, recordId?: string): Promise<void> {
  const actor = getAuditActor();
  const record: AuditRecord = {
    id: crypto.randomUUID(),
    action,
    collection,
    recordId,
    actor,
    timestamp: new Date().toISOString(),
  };
  try {
    const values = ['auditLogs', record.id, JSON.stringify(record), record.timestamp];
    await appendRows([values]);
  } catch (error) {
    throw new Error(`Record change may have succeeded, but its audit log could not be written: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function getAuditActor(): string {
  try {
    const user = JSON.parse(localStorage.getItem('auth_user') || 'null') as { username?: string; name?: string } | null;
    return user?.username || user?.name || 'Unknown user';
  } catch {
    return 'Unknown user';
  }
}

function getConfig(): { spreadsheetId: string } {
  const match = getSheetsUrl().match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error('VITE_GOOGLE_SHEETS_URL must be a Google Sheets URL containing /spreadsheets/d/<id>.');
  return { spreadsheetId: match[1] };
}

function sheetsBase(spreadsheetId: string): string {
  return `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`;
}

function rowRange(rowNumber: number): string {
  return `'${DATA_TAB}'!A${rowNumber}:D${rowNumber}`;
}

async function sheetsRequest<T = void>(
  token: string,
  url: string,
  options: { method?: string; body?: string } = {},
): Promise<T> {
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message || `Google Sheets API request failed (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

async function apiError(response: Response, fallback: string): Promise<Error> {
  const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  return new Error(payload?.error?.message || `${fallback} (${response.status}).`);
}

function readLocalStore<T>(database: IDBDatabase, storeName: string): Promise<T[]> {
  if (!database.objectStoreNames.contains(storeName)) return Promise.resolve([]);
  return new Promise<T[]>((resolve, reject) => {
    const request = database.transaction(storeName, 'readonly').objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

function readLegacyLocalStorage<T>(key: string): T[] {
  const value = localStorage.getItem(key);
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error(`Saved ${key} data is not a list.`);
    return parsed as T[];
  } catch (error) {
    throw new Error(`Could not read saved ${key} data: ${error instanceof Error ? error.message : 'Invalid JSON.'}`);
  }
}

function readLegacyLocalStorageValue(key: string): string | null {
  return localStorage.getItem(key);
}

async function clearLegacyLocalStores(database: IDBDatabase): Promise<void> {
  const existing = LEGACY_STORES.filter((name) => database.objectStoreNames.contains(name));
  if (existing.length === 0) return;
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(existing, 'readwrite');
    for (const store of existing) transaction.objectStore(store).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('Local data cleanup was aborted.'));
  });
}
