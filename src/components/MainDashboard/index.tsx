import { useJobs } from '@/hooks/useJobs';
import { type Session } from '@/lib/google';
import { config } from '@/lib/config';
import { Button } from '@base-ui/react/button';

interface MainDashboardProps {
    session: Session | undefined;
    signOut: () => void;
}

export default function MainDashboard({ session, signOut }: MainDashboardProps) {
    if (!session) return;

    const jobs = useJobs();

    return (
        <main className='pt-12 pb-24'>
            <h1>Jobs Tracker</h1>
            <p>
                {session.email} <button onClick={signOut}>Sign out</button>
            </p>

            <Button onClick={() => jobs.updateFromGmail(session, config.scriptId)} disabled={jobs.updating}>
                Update from Gmail
            </Button>
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
    )
}