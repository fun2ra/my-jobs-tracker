import { useJobs } from '@/hooks/useJobs';
import { type Session } from '@/lib/google';
import SideBar from '@/layout/sideBar';
interface MainDashboardProps {
    session: Session | undefined;
    signOut: () => void;
}

export default function MainDashboard({ session, signOut }: MainDashboardProps) {
    if (!session) return;

    const jobs = useJobs();

    return (
        <>
            <SideBar signOut={signOut} />
            <main className='py-12 pl-9'>
                <h1>Jobs Tracker</h1>
                <p>
                    {session.email} <button onClick={signOut}>Sign out</button>
                </p>
                <p>
                    {jobs.events.length} emails → {jobs.applications.length} applications ({jobs.unassigned.length} unassigned,{' '}
                    {jobs.noise.length} noise)
                </p>
                <table className='rounded-xl border-slate-700 border'>
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
        </>

    )
}