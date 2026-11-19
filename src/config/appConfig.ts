/**
 * Google connection settings, edited by an Admin in Settings > Google
 * connection and stored in this browser. Empty means offline only.
 */
const STORAGE_KEY = 'homeocare_google_config';

export interface GoogleConfig {
  /** Apps Script web-app URL used for login and data sync. */
  appsScriptUrl: string;
  /** Base URL of the Google Sheets data endpoint. */
  sheetsUrl: string;
}

function readSaved(): Partial<GoogleConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      appsScriptUrl: typeof parsed.appsScriptUrl === 'string' ? parsed.appsScriptUrl : undefined,
      sheetsUrl: typeof parsed.sheetsUrl === 'string' ? parsed.sheetsUrl : undefined,
    };
  } catch {
    return {};
  }
}

export function getGoogleConfig(): GoogleConfig {
  const saved = readSaved();
  return {
    appsScriptUrl: saved.appsScriptUrl ?? '',
    sheetsUrl: saved.sheetsUrl ?? '',
  };
}

export const getAppsScriptUrl = () => getGoogleConfig().appsScriptUrl;
export const getSheetsUrl = () => getGoogleConfig().sheetsUrl;
export const isSheetsConfigured = () => Boolean(getSheetsUrl());

/** Returns an error message, or null when the value is acceptable. Empty means "not connected". */
export function validateGoogleUrl(value: string, kind: 'appsScript' | 'sheets'): string | null {
  const v = value.trim();
  if (!v) return null;
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return 'Enter a full web address starting with https://';
  }
  if (url.protocol !== 'https:') return 'The address must start with https://';
  if (kind === 'appsScript' && url.hostname !== 'script.google.com') {
    return 'An Apps Script web-app address starts with https://script.google.com/';
  }
  return null;
}

export function saveGoogleConfig(config: GoogleConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    appsScriptUrl: config.appsScriptUrl.trim().replace(/\/+$/, ''),
    sheetsUrl: config.sheetsUrl.trim().replace(/\/+$/, ''),
  }));
}
