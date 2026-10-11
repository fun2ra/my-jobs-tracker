/**
 * App configuration from VITE_* environment variables: `.env` locally (see `.env.example`),
 * repository variables in GitHub Actions. Vite copies them into the JavaScript bundle, so they are
 * readable on the published site: IDs only, never secrets.
 */
export interface AppConfig {
  /** OAuth client ID ("…apps.googleusercontent.com"). */
  clientId: string;
  /** Apps Script project's Script ID (Project Settings → IDs). */
  scriptId: string;
  /** Optional: the only Google account accepted. Google's test-user list already limits sign-in. */
  allowedEmail: string;
}

/** Variables the app can't work without. vite.config.ts checks the same names at build time. */
export const REQUIRED_ENV = ['VITE_GOOGLE_CLIENT_ID', 'VITE_APPS_SCRIPT_ID'] as const;

export function readConfig(env: Record<string, unknown>): { config: AppConfig; missing: string[] } {
  const value = (key: string) => String(env[key] ?? '').trim();
  return {
    config: {
      clientId: value('VITE_GOOGLE_CLIENT_ID'),
      scriptId: value('VITE_APPS_SCRIPT_ID'),
      allowedEmail: value('VITE_ALLOWED_EMAIL').toLowerCase(),
    },
    missing: REQUIRED_ENV.filter(key => !value(key)),
  };
}

export const { config, missing: missingConfig } = readConfig(import.meta.env);
