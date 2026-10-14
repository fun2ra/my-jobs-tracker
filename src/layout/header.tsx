import { type Session } from '@/lib/google';
import { config } from '@/lib/config';
import Logo from '@/assets/images/logo.png';
import { useJobs } from '@/hooks/useJobs';
import { Button } from '@/components/ui/button';


export default function Header({ session }: { session: Session | undefined; }) {

    const jobs = useJobs();

    console.log(session)
    return <header className="px-14 py-5  bg-slate-100 text-slate-900">
        <div className='flex justify-between header-content'>
            {!session ?
                <>
                    <a className='flex gap-2.5 items-center' href='/'>
                        <figure>
                            <img src={Logo} alt="jobb tracker logo" />
                        </figure>
                        <div className='text-2xl font-semibold'>Jobs tracker</div>
                    </a>
                    <ul className='flex gap-2.5'>
                        <li>
                            <a href="/how-it-works" className='underline text-blue-500'>
                                How it works
                            </a>
                        </li>
                        <li>
                            <a href="/privacy-terms" className='underline text-blue-500'>
                                Privacy
                            </a>
                        </li>
                    </ul>
                </>

                : <div className=' mx-9 flex justify-between w-full'>
                    <div>
                        <div className='text-2xl font-bold'>Applications</div>
                        <div className='text-xs text-slate-700'>
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
                        </div>
                    </div>
                    <div className='flex gap-4'>
                        <label
                            htmlFor="csv-file"
                            className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-white border border-slate-500 px-4 py-2 text-sm font-medium text-slate-700 transition-colors"
                        >
                            Import CSV
                        </label>
                        <input
                            accept=".csv,text/csv"
                            id="csv-file"
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files) {
                                    jobs.importCsv(Array.from(e.target.files))
                                    e.target.value = ""
                                }
                            }}
                        />
                        <Button onClick={() => jobs.updateFromGmail(session, config.scriptId)} disabled={jobs.updating} className={'py-6  font-semibold bg-blue-600'}>
                            Update from Gmail
                        </Button>
                        {/* <Button
                            onClick={() => confirm('Remove all job emails stored in this browser?') && jobs.clear()}
                            disabled={!jobs.events.length}
                        >
                            Remove data from this browser
                        </Button> */}
                    </div>
                </div>}
        </div>
    </header >
}