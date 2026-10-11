import { describe, expect, it } from 'vitest';
import { readConfig } from './config';
import { accountProblem } from './google';

describe('readConfig', () => {
  it('reads and trims the IDs, and lower-cases the allowed address', () => {
    const { config, missing } = readConfig({
      VITE_GOOGLE_CLIENT_ID: ' 123.apps.googleusercontent.com ',
      VITE_APPS_SCRIPT_ID: 'script-id',
      VITE_ALLOWED_EMAIL: 'Someone@Example.com',
    });
    expect(config).toEqual({ clientId: '123.apps.googleusercontent.com', scriptId: 'script-id', allowedEmail: 'someone@example.com' });
    expect(missing).toEqual([]);
  });

  it('lists missing required variables; the allowed address is optional', () => {
    const { config, missing } = readConfig({ VITE_APPS_SCRIPT_ID: '  ' });
    expect(missing).toEqual(['VITE_GOOGLE_CLIENT_ID', 'VITE_APPS_SCRIPT_ID']);
    expect(config.allowedEmail).toBe('');
  });
});

describe('accountProblem', () => {
  it('accepts the allowed address in any case, or any verified address when none is set', () => {
    expect(accountProblem('someone@example.com', 'Someone@Example.com')).toBe('');
    expect(accountProblem('anyone@example.com', '')).toBe('');
  });

  it('refuses other or unverified accounts', () => {
    expect(accountProblem('other@example.com', 'someone@example.com')).toMatch(/not allowed/);
    expect(accountProblem('', '')).toMatch(/did not confirm/);
  });
});
