import { useAuth } from './hooks/useAuth';
import { useJobs } from './hooks/useJobs';
import { config, missingConfig } from './lib/config';

/**
 * Bare placeholder UI: it shows how the hooks fit together and is meant to be replaced by the
 * real design. All the logic is in hooks/useAuth.ts and hooks/useJobs.ts.
 */
export function App() {
  const auth = useAuth(config);
  const jobs = useJobs();

  if (missingConfig.length) {
    return (
      <main>
        <h1>Jobs Tracker</h1>
        <p role="alert">Missing configuration: {missingConfig.join(', ')}. Copy .env.example to .env and fill it in.</p>
      </main>
    );
  }

  if (!auth.session) {
    return (
      <main className='border h-96' >
        <h1 className='text-5xl text-black'>Every application, one place, current stage</h1>
        <button onClick={auth.signIn} disabled={auth.signingIn} className=' p-5 rounded-b-sm bg-black text-white mt-14 w-full max-w-2xl'>
          {auth.signingIn ? 'Signing in…' : 'Continue with Google'}
        </button>
        {auth.error && <p role="alert">{auth.error}</p>}
      </main>
    );
  }

  const { session } = auth;

  return (
    <main>
      <h1>Jobs Tracker</h1>
      <p>
        {session.email} <button onClick={auth.signOut}>Sign out</button>
      </p>

      <button onClick={() => jobs.updateFromGmail(session, config.scriptId)} disabled={jobs.updating}>
        Update from Gmail
      </button>
      {jobs.updating && <span aria-live="polite"> Searching Gmail… {jobs.elapsed}s</span>}
      {jobs.message && <p aria-live="polite">{jobs.message}</p>}
      {jobs.error && <p role="alert">{jobs.error}</p>}
      {jobs.sync && (
        <p>
          Last update {new Date(jobs.sync.at).toLocaleString()} ({jobs.sync.emails} emails)
          {jobs.sync.spreadsheetUrl && (
            <>
              {' · '}
              <a href={jobs.sync.spreadsheetUrl} target="_blank" rel="noreferrer">
                Open spreadsheet
              </a>
            </>
          )}
          {jobs.sync.warnings?.length ? ` · Searches that hit their limit: ${jobs.sync.warnings.join(', ')}` : ''}
        </p>
      )}

      <details>
        <summary>Other options</summary>
        <p>
          Import CSV:{' '}
          <input type="file" accept=".csv,text/csv" multiple onChange={e => e.target.files && jobs.importCsv(e.target.files)} />
        </p>
        <button
          onClick={() => confirm('Remove all job emails stored in this browser?') && jobs.clear()}
          disabled={!jobs.events.length}
        >
          Remove data from this browser
        </button>
      </details>

      <p>
        {jobs.events.length} emails → {jobs.applications.length} applications ({jobs.unassigned.length} unassigned,{' '}
        {jobs.noise.length} noise)
      </p>
      <table>
        <thead>
          <tr>
            {['Stage', 'Company', 'Role', 'Source', 'Field', 'Applied', 'Last update', 'Emails'].map(h => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.applications.map(a => (
            <tr key={a.id}>
              <td>
                {a.stage}
                {a.needsAction ? ' ⚠' : ''}
              </td>
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
    </main>
  );
}
