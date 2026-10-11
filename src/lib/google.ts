import type { AppConfig } from './config';
import { readScriptResponse, type ExportResult } from './scriptRun';

/** Minimal types for Google Identity Services (https://accounts.google.com/gsi/client). */
interface TokenResponse {
  access_token: string;
  expires_in: number | string;
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

/** A signed-in Google account. The token lives in memory only: a reload signs you out. */
export interface Session {
  token: string;
  email: string;
  /** Milliseconds since epoch, a minute before Google's expiry (tokens last about an hour). */
  expiresAt: number;
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

/** Opens Google's sign-in popup and resolves with a token covering SCOPES. */
function requestToken(oauth2: GoogleOAuth2, config: AppConfig): Promise<TokenResponse> {
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: config.clientId,
      scope: SCOPES.join(' '),
      login_hint: config.allowedEmail || undefined,
      callback: response => {
        if (response.error) return reject(new Error(response.error_description || response.error));
        if (!oauth2.hasGrantedAllScopes(response, ...SCOPES)) {
          oauth2.revoke(response.access_token);
          return reject(new Error('Some permissions were not granted. Continue with Google again and allow all of them.'));
        }
        resolve(response);
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

/** Why this account may not use the app, or '' when it may. No allowed address means any verified account. */
export function accountProblem(email: string, allowedEmail: string): string {
  if (!email) return 'Google did not confirm the account\'s email address.';
  if (allowedEmail && email !== allowedEmail.trim().toLowerCase()) return `Signed in as ${email}, which is not allowed here.`;
  return '';
}

/** "Continue with Google": popup, permission check, account check. A refused account's token is revoked at once. */
export async function signIn(config: AppConfig): Promise<Session> {
  const oauth2 = await loadGis();
  const response = await requestToken(oauth2, config);
  try {
    const email = await signedInEmail(response.access_token);
    const problem = accountProblem(email, config.allowedEmail);
    if (problem) throw new Error(problem);
    const lifetime = (Number(response.expires_in) || 3600) * 1000;
    return { token: response.access_token, email, expiresAt: Date.now() + lifetime - 60_000 };
  } catch (e) {
    oauth2.revoke(response.access_token);
    throw e;
  }
}

/** Revokes the token, so it can't be used again even before it expires. */
export function signOut(session: Session): void {
  window.google?.accounts.oauth2.revoke(session.token);
}

/** Runs runExport in the Apps Script project as the signed-in account and returns its rows. */
export async function runExport(session: Session, scriptId: string): Promise<ExportResult> {
  if (Date.now() >= session.expiresAt) throw new Error('Your sign-in expired. Continue with Google again.');
  const response = await fetch(`https://script.googleapis.com/v1/scripts/${encodeURIComponent(scriptId)}:run`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
    // devMode runs the latest saved script, and only for the script's owner.
    body: JSON.stringify({ function: 'runExport', devMode: true }),
  });
  const body: unknown = await response.json().catch(() => null);
  return readScriptResponse(response.status, body);
}
