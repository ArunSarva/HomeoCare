const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

class GoogleAuthorizationError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = 'GoogleAuthorizationError';
  }
}

interface GoogleTokenClient {
  requestAccessToken(options?: { prompt?: string }): void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient(options: {
            client_id: string;
            scope: string;
            callback(response: GoogleTokenResponse): void;
            error_callback(error: { type?: string; message?: string }): void;
          }): GoogleTokenClient;
        };
      };
    };
  }
}

let identityScriptPromise: Promise<void> | null = null;
let currentAccessToken: string | null = null;
let accessTokenExpiresAt = 0;

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim());
}

export function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (identityScriptPromise) return identityScriptPromise;

  identityScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.oauth2) {
        resolve();
      } else {
        reject(new Error('Google Identity Services loaded without its OAuth API.'));
      }
    };
    script.onerror = () => reject(new Error('Could not load Google Identity Services.'));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    identityScriptPromise = null;
    throw error;
  });

  return identityScriptPromise;
}

export function requestGoogleSheetsAccessToken(options: { prompt?: string } = {}): Promise<string> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const tokenClient = window.google?.accounts?.oauth2;
  if (!clientId) {
    return Promise.reject(new Error('Set VITE_GOOGLE_CLIENT_ID in .env.local before connecting Google Sheets.'));
  }
  if (!tokenClient) {
    return Promise.reject(new Error('Google sign-in is not ready. Reload the page and try again.'));
  }

  return new Promise<string>((resolve, reject) => {
    const client = tokenClient.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPES,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new GoogleAuthorizationError(
            response.error_description || response.error || 'Google authorization did not return an access token.',
            response.error,
          ));
          return;
        }
        currentAccessToken = response.access_token;
        accessTokenExpiresAt = Date.now() + (response.expires_in ?? 3600) * 1000;
        resolve(response.access_token);
      },
      error_callback: (error) => {
        reject(new GoogleAuthorizationError(error.message || error.type || 'Google authorization failed.', error.type));
      },
    });
    client.requestAccessToken({ prompt: options.prompt ?? '' });
  });
}

export async function tryRestoreGoogleSheetsAccessToken(): Promise<boolean> {
  try {
    await requestGoogleSheetsAccessToken();
    return true;
  } catch (error) {
    const silentAuthUnavailableCodes = [
      'account_selection_required',
      'consent_required',
      'interaction_required',
      'login_required',
      'popup_closed',
      'popup_failed_to_open',
    ];
    if (error instanceof GoogleAuthorizationError && silentAuthUnavailableCodes.includes(error.code ?? '')) {
      return false;
    }
    throw error;
  }
}

export function getActiveGoogleSheetsAccessToken(): string {
  if (!currentAccessToken || Date.now() >= accessTokenExpiresAt) {
    currentAccessToken = null;
    throw new Error('Google authorization expired. Reconnect Google from Settings before using cloud data.');
  }
  return currentAccessToken;
}

export function isGoogleSheetsAuthorized(): boolean {
  return Boolean(currentAccessToken && Date.now() < accessTokenExpiresAt);
}

export function clearGoogleSheetsAuthorization(): void {
  currentAccessToken = null;
  accessTokenExpiresAt = 0;
}

export async function uploadDriveFile(dataUrl: string, name: string): Promise<string> {
  const token = getActiveGoogleSheetsAccessToken();
  const fileResponse = await fetch(dataUrl);
  if (!fileResponse.ok) throw new Error(`Could not read the file to upload (${fileResponse.status}).`);
  const file = await fileResponse.blob();
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({ name, mimeType: file.type || 'application/octet-stream' })], {
    type: 'application/json',
  }));
  form.append('file', file, name);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message || `Google Drive upload failed (${response.status}).`);
  }
  const result = await response.json() as { id?: string };
  if (!result.id) throw new Error('Google Drive did not return an ID for the uploaded file.');
  return result.id;
}
