import { useEffect, useMemo, useState } from 'react';
import { updateFromGmail, type GoogleSettings, type Step } from './lib/google';
import { groupApplications } from './lib/group';
import { mergeEvents, parseExport, parseTable } from './lib/parse';
import { limitWarnings } from './lib/scriptRun';
import { clearData, loadData, loadSettings, saveData, saveSettings, type SyncInfo } from './lib/storage';
import type { EmailEvent } from './lib/types';

const STEP_TEXT: Record<Step, string> = {
  'signing-in': 'Waiting for Google sign-in…',
  'checking-account': 'Checking the account…',
  'running-script': 'Searching Gmail and updating the spreadsheet (this can take a minute)…',
};

const complete = (s: GoogleSettings) => Boolean(s.clientId.trim() && s.scriptId.trim() && s.allowedEmail.trim());

/** Interim page: update from Gmail and list the applications. The real table and dashboard come in phases 2–3. */
export function App() {
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [sync, setSync] = useState<SyncInfo>();
  const [settings, setSettings] = useState<GoogleSettings>(loadSettings);
  const [step, setStep] = useState<Step>();
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { applications, unassigned, noise } = useMemo(() => groupApplications(events), [events]);

  useEffect(() => {
    loadData().then(saved => {
      setEvents(saved.events);
      setSync(saved.sync);
    });
  }, []);

  // Elapsed time while the script runs, so a long run doesn't look stuck.
  useEffect(() => {
    if (step !== 'running-script') return;
    setSeconds(0);
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [step]);

  async function store(next: EmailEvent[], nextSync: SyncInfo | undefined, done: string) {
    setEvents(next);
    setSync(nextSync);
    const saved = await saveData(next, nextSync);
    setMessage(saved ? done : `${done} This browser blocks storage, so the data will be gone after a reload.`);
  }

  async function update() {
    setError('');
    setMessage('');
    try {
      const result = await updateFromGmail(settings, setStep);
      const { events: incoming } = parseTable(result.headers, result.rows);
      const warnings = limitWarnings(result);
      await store(
        mergeEvents(events, incoming),
        { at: new Date().toISOString(), emails: incoming.length, spreadsheetUrl: result.spreadsheetUrl, warnings },
        `Updated: ${incoming.length} emails from Gmail.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStep(undefined);
    }
  }

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    setError('');
    let merged = events;
    for (const file of Array.from(files)) {
      try {
        merged = mergeEvents(merged, parseExport(await file.text()).events);
      } catch (e) {
        setError(`${file.name}: ${(e as Error).message}`);
      }
    }
    await store(merged, sync, `Imported ${files.length} file(s).`);
  }

  async function clearAll() {
    if (!confirm('Remove all job emails stored in this browser? Gmail and the spreadsheet are not touched.')) return;
    await clearData();
    setEvents([]);
    setSync(undefined);
    setMessage('Data removed from this browser.');
  }

  function changeSetting(key: keyof GoogleSettings, value: string) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <h1>Jobs Tracker</h1>

      <section>
        <button onClick={update} disabled={Boolean(step) || !complete(settings)}>
          Update from Gmail
        </button>{' '}
        {step && (
          <span aria-live="polite">
            {STEP_TEXT[step]}
            {step === 'running-script' && ` ${seconds}s`}
          </span>
        )}
        {!complete(settings) && <span> Fill in the settings below first.</span>}
        {message && <p aria-live="polite">{message}</p>}
        {error && <p role="alert" style={{ color: '#b3261e' }}>{error}</p>}
        {sync && (
          <p>
            Last update {new Date(sync.at).toLocaleString()} ({sync.emails} emails)
            {sync.spreadsheetUrl && (
              <>
                {' · '}
                <a href={sync.spreadsheetUrl} target="_blank" rel="noreferrer">
                  Open spreadsheet
                </a>
              </>
            )}
            {sync.warnings?.length ? ` · Searches that hit their limit: ${sync.warnings.join(', ')}` : ''}
          </p>
        )}
      </section>

      <details open={!complete(settings)}>
        <summary>Settings (stored in this browser only)</summary>
        <p>See SETUP.md for where to find these.</p>
        {(
          [
            ['clientId', 'OAuth client ID', 'xxxx.apps.googleusercontent.com'],
            ['scriptId', 'Apps Script Script ID', 'Project Settings → IDs → Script ID'],
            ['allowedEmail', 'Allowed Google account', 'you@gmail.com'],
          ] as const
        ).map(([key, label, placeholder]) => (
          <label key={key} style={{ display: 'block', marginBottom: 8 }}>
            {label}
            <br />
            <input
              value={settings[key]}
              placeholder={placeholder}
              onChange={e => changeSetting(key, e.target.value)}
              style={{ width: '100%', maxWidth: 480 }}
              spellCheck={false}
              autoComplete="off"
            />
          </label>
        ))}
      </details>

      <details>
        <summary>Other options</summary>
        <p>
          Import CSV (fallback):{' '}
          <input type="file" accept=".csv,text/csv" multiple onChange={e => importFiles(e.target.files)} />
        </p>
        <button onClick={clearAll} disabled={!events.length}>
          Remove data from this browser
        </button>
      </details>

      {events.length > 0 && (
        <>
          <p>
            {events.length} emails → {applications.length} applications ({unassigned.length} unassigned,{' '}
            {noise.length} noise)
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  {['Stage', 'Company', 'Role', 'Source', 'Field', 'Applied', 'Last update', 'Emails'].map(h => (
                    <th key={h} style={{ textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {applications.map(a => (
                  <tr key={a.id}>
                    <td>{a.stage}{a.needsAction ? ' ⚠' : ''}</td>
                    <td>{a.company || '—'}</td>
                    <td>{a.role || '—'}</td>
                    <td>{a.source}</td>
                    <td>{a.track}</td>
                    <td>{a.appliedAt.toLocaleDateString()}</td>
                    <td>{a.lastUpdate.toLocaleDateString()}</td>
                    <td>{a.events.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
