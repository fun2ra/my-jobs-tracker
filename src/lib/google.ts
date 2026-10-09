import { readScriptResponse, type ExportResult } from './scriptRun';

/** Minimal types for Google Identity Services (https://accounts.google.com/gsi/client). */
interface TokenResponse {
  access_token: string;
  scope: string;
  error?: string;
  error_description?: string;
}
interface GoogleOAuth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    login_hint?: string;
    prompt?: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string; message?: string }) => void;
  }): { requestAccessToken(): void };
  hasGrantedAllScopes(response: TokenResponse, ...scopes: string[]): boolean;
  revoke(token: string, done?: () => void): void;
}
declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOAuth2 } };
  }
}

export interface GoogleSettings {
  /** OAuth client ID ("…apps.googleusercontent.com"). */
  clientId: string;
  /** Apps Script project's Script ID (Project Settings → IDs). */
  scriptId: string;
  /** The only Google account allowed to use the app. */
  allowedEmail: string;
}

/**
 * The token must cover every scope the script declares (apps-script/appsscript.json),
 * plus openid/email so the app can check who signed in.
 */
const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
];

const GIS_SRC = 'https://accounts.google.com/gsi/client';
let gisLoading: Promise<GoogleOAuth2> | undefined;

function loadGis(): Promise<GoogleOAuth2> {
  gisLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () =>
      window.google ? resolve(window.google.accounts.oauth2) : reject(new Error('Google sign-in did not load.'));
    script.onerror = () => {
      gisLoading = undefined;
      reject(new Error('Could not load Google sign-in. Check your connection.'));
    };
    document.head.appendChild(script);
  });
  return gisLoading;
}

/** Opens Google's sign-in popup and resolves with an access token for SCOPES. */
async function signIn(settings: GoogleSettings): Promise<string> {
  const oauth2 = await loadGis();
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: settings.clientId,
      scope: SCOPES.join(' '),
      login_hint: settings.allowedEmail,
      callback: response => {
        if (response.error) return reject(new Error(response.error_description || response.error));
        if (!oauth2.hasGrantedAllScopes(response, ...SCOPES)) {
          oauth2.revoke(response.access_token);
          return reject(new Error('Some permissions were not granted. Sign in again and allow all of them.'));
        }
        resolve(response.access_token);
      },
      error_callback: error =>
        reject(new Error(error.type === 'popup_closed' ? 'Sign-in was cancelled.' : error.message || error.type)),
    });
    client.requestAccessToken();
  });
}

async function signedInEmail(token: string): Promise<string> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Could not check the signed-in account (HTTP ${response.status}).`);
  const info = (await response.json()) as { email?: string; email_verified?: boolean };
  return info.email_verified ? (info.email ?? '').toLowerCase() : '';
}

async function runExportScript(token: string, scriptId: string): Promise<ExportResult> {
  const response = await fetch(`https://script.googleapis.com/v1/scripts/${encodeURIComponent(scriptId)}:run`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    // devMode runs the latest saved script, and only for the script's owner.
    body: JSON.stringify({ function: 'runExport', devMode: true }),
  });
  const body: unknown = await response.json().catch(() => null);
  return readScriptResponse(response.status, body);
}

export type Step = 'signing-in' | 'checking-account' | 'running-script';

/**
 * Signs in, makes sure it's the allowed account, runs the export script as that account and
 * returns its rows. The token only lives in memory and is revoked at the end, whatever happens.
 */
export async function updateFromGmail(settings: GoogleSettings, onStep: (step: Step) => void): Promise<ExportResult> {
  onStep('signing-in');
  const token = await signIn(settings);
  try {
    onStep('checking-account');
    const email = await signedInEmail(token);
    if (!email || email !== settings.allowedEmail.trim().toLowerCase()) {
      throw new Error(`Signed in as ${email || 'an unverified account'}, which is not allowed here.`);
    }
    onStep('running-script');
    return await runExportScript(token, settings.scriptId.trim());
  } finally {
    window.google?.accounts.oauth2.revoke(token);
  }
}
