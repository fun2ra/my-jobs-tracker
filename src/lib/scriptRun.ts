/** What runExport in apps-script/exportJobEmails.gs returns. */
export interface ExportResult {
  headers: string[];
  rows: string[][];
  /** [search group, threads found, new threads, warning, query] per Gmail search. */
  runInfo: (string | number)[][];
  spreadsheetUrl: string;
}

/** Hints for the setup mistakes the Apps Script API reports. */
const HINTS: [RegExp, string][] = [
  [/has not been used|is disabled|SERVICE_DISABLED/i, 'Enable the Apps Script API in the Google Cloud project (SETUP.md, step 1).'],
  [/User has not enabled the Apps Script API/i, 'Turn on "Google Apps Script API" at script.google.com/home/usersettings (SETUP.md, step 4).'],
  [/Requested entity was not found|NOT_FOUND/i, 'Check the Script ID in Settings, and that the script is deployed as an API executable (SETUP.md, step 5).'],
  [/Script function not found/i, 'The Script ID in Settings must be the Apps Script project where the new exportJobEmails.gs is saved (Project Settings → IDs → Script ID, not the deployment ID). Save the code and try again (SETUP.md, troubleshooting).'],
  [/PERMISSION_DENIED|caller does not have permission/i, 'The script must use the same Google Cloud project as the OAuth client (SETUP.md, step 4).'],
  [/UNAUTHENTICATED|invalid authentication credentials/i, 'Your sign-in expired or was revoked. Sign out and continue with Google again.'],
  [/Quota exceeded|rate ?limit/i, "Google's per-minute Gmail limit was reached. Wait a minute and try again; if it keeps happening, check that Apps Script has the latest exportJobEmails.gs (it paces its Gmail calls)."],
  [/insufficient|scope/i, 'Sign in again and allow every permission on the Google consent screen.'],
];

/**
 * Reads the Apps Script API's `scripts.run` response: the export on success, otherwise an
 * error saying what to fix. The script's own errors come back with HTTP 200 and an `error` field.
 */
export function readScriptResponse(httpStatus: number, body: unknown): ExportResult {
  const json = (body ?? {}) as {
    error?: { message?: string; details?: { errorMessage?: string }[] };
    response?: { result?: ExportResult };
  };
  if (json.error || httpStatus >= 400) {
    const message =
      json.error?.details?.find(d => d.errorMessage)?.errorMessage ??
      json.error?.message ??
      `HTTP ${httpStatus}`;
    const hint = HINTS.find(([pattern]) => pattern.test(message))?.[1];
    throw new Error(hint ? `${message} ${hint}` : message);
  }
  const result = json.response?.result;
  if (!result || !Array.isArray(result.headers) || !Array.isArray(result.rows)) {
    throw new Error('The script returned no data. Is runExport the latest version of apps-script/exportJobEmails.gs?');
  }
  return result;
}

/** Searches that hit their limit, so older emails may be missing. */
export function limitWarnings(result: ExportResult): string[] {
  return result.runInfo.filter(row => String(row[3] ?? '').startsWith('HIT LIMIT')).map(row => String(row[0]));
}
