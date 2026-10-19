import { useRef } from 'react';
import { FileUp, RefreshCw } from 'lucide-react';
import { type Session } from '@/lib/google';
import { config } from '@/lib/config';
import type { useJobs } from '@/hooks/useJobs';
import Logo from '@/assets/images/logo.png';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HeaderProps {
    session?: Session;
    jobs?: ReturnType<typeof useJobs>;
}

const navLink =
    'rounded-sm text-body text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary-hover hover:decoration-current';

export default function Header({ session, jobs }: HeaderProps) {
    const fileInput = useRef<HTMLInputElement>(null);

    if (!session || !jobs) {
        return (
            <header className="border-b border-border bg-surface py-5">
                <div className="page-container flex items-center justify-between">
                    <a className="flex items-center gap-2.5 rounded-lg" href={import.meta.env.BASE_URL}>
                        <img src={Logo} alt="" />
                        <span className="text-title">Jobs tracker</span>
                    </a>
                    <nav aria-label="Site">
                        <ul className="flex gap-6">
                            <li>
                                <a href="/how-it-works" className={navLink}>How it works</a>
                            </li>
                            <li>
                                <a href="/privacy-terms" className={navLink}>Privacy</a>
                            </li>
                        </ul>
                    </nav>
                </div>
            </header>
        );
    }

    return (
        <header className="border-b border-border bg-surface px-9 py-5">
            <div className="flex items-center justify-between gap-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-title">Applications</h1>
                    <div className="text-caption text-fg-muted" aria-live="polite">
                        {jobs.updating && <p>Searching Gmail… <span className="font-mono tabular-nums">{jobs.elapsed}s</span></p>}
                        {jobs.message && <p>{jobs.message}</p>}
                        {jobs.error && <p role="alert" className="text-danger-strong">{jobs.error}</p>}
                        {jobs.sync && (
                            <p>
                                Last update{' '}
                                <span className="font-mono tabular-nums">{new Date(jobs.sync.at).toLocaleString()}</span> (
                                <span className="font-mono tabular-nums">{jobs.sync.emails}</span> emails)
                                {jobs.sync.spreadsheetUrl && (
                                    <>
                                        {' · '}
                                        <a href={jobs.sync.spreadsheetUrl} target="_blank" rel="noreferrer" className={cn(navLink, 'text-caption')}>
                                            Open spreadsheet
                                        </a>
                                    </>
                                )}
                                {jobs.sync.warnings?.length ? ` · Searches that hit their limit: ${jobs.sync.warnings.join(', ')}` : ''}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex shrink-0 gap-3">
                    <input
                        ref={fileInput}
                        accept=".csv,text/csv"
                        type="file"
                        hidden
                        onChange={(e) => {
                            if (e.target.files) {
                                jobs.importCsv(Array.from(e.target.files));
                                e.target.value = '';
                            }
                        }}
                    />
                    <Button variant="secondary" onClick={() => fileInput.current?.click()} disabled={jobs.updating}>
                        <FileUp />
                        Import CSV
                    </Button>
                    <Button onClick={() => jobs.updateFromGmail(session, config.scriptId)} disabled={jobs.updating}>
                        <RefreshCw className={jobs.updating ? 'animate-spin' : undefined} />
                        {jobs.updating ? 'Updating…' : 'Update from Gmail'}
                    </Button>
                </div>
            </div>
        </header>
    );
}
