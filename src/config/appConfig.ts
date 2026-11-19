/** Sheet URL configuration for Google Sheets sync. */
const STORAGE_KEY = 'homeocare_google_config';
export const DEFAULT_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1N-IBiRIrXOZKib9CsikP0b9p5ZnbFuMSho9SOSiRh1w/edit?gid=0#gid=0';

export interface GoogleConfig {
  /** Google Sheets document URL. */
  sheetsUrl: string;
}

function readSavedSheetsUrl(): string | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return typeof parsed.sheetsUrl === 'string' ? parsed.sheetsUrl : undefined;
  } catch {
    return undefined;
  }
}

export function getGoogleConfig(): GoogleConfig {
  const envSheetsUrl = import.meta.env.VITE_GOOGLE_SHEETS_URL?.trim();
  return {
    sheetsUrl: envSheetsUrl || readSavedSheetsUrl() || DEFAULT_SHEETS_URL,
  };
}

export const getSheetsUrl = () => getGoogleConfig().sheetsUrl;
export const isSheetsConfigured = () => Boolean(getSheetsUrl());
