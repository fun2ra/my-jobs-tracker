import type { useJobs } from '@/hooks/useJobs';
import type { Track } from '@/lib/types';
import { ActionBadge, StageBadge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableNumber, TableRow } from '@/components/ui/table';

const trackDot: Record<Track, string> = {
    automation: 'bg-field-automation',
    software: 'bg-field-software',
    other: 'bg-field-other',
};

const columns = ['Stage', 'Company', 'Role', 'Source', 'Field', 'Applied', 'Last update', 'Emails'];

export default function MainDashboard({ jobs }: { jobs: ReturnType<typeof useJobs> }) {
    return (
        <main className="flex flex-col gap-6 px-9 py-8">
            <p className="text-body text-fg-muted">
                <span className="font-mono tabular-nums">{jobs.events.length}</span> emails →{' '}
                <span className="font-mono tabular-nums">{jobs.applications.length}</span> applications (
                <span className="font-mono tabular-nums">{jobs.unassigned.length}</span> unassigned,{' '}
                <span className="font-mono tabular-nums">{jobs.noise.length}</span> noise)
            </p>

            {jobs.applications.length === 0 ? (
                <Card className="items-start">
                    <CardTitle>No applications yet</CardTitle>
                    <CardDescription>Use “Update from Gmail” or import a CSV export to fill this table.</CardDescription>
                </Card>
            ) : (
                <Table>
                    <TableHeader>
                        <tr>
                            {columns.map(h => (
                                <TableHead key={h} className={h === 'Emails' ? 'text-right' : undefined}>
                                    {h}
                                </TableHead>
                            ))}
                        </tr>
                    </TableHeader>
                    <TableBody>
                        {jobs.applications.map(a => (
                            <TableRow key={a.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <StageBadge stage={a.stage} />
                                        {a.needsAction && <ActionBadge />}
                                    </div>
                                </TableCell>
                                <TableCell className="font-semibold">{a.company || '—'}</TableCell>
                                <TableCell className="text-fg-muted">{a.role || '—'}</TableCell>
                                <TableCell className="whitespace-nowrap text-fg-muted">{a.source}</TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center gap-2 text-fg-muted capitalize">
                                        <span aria-hidden className={`size-2 rounded-full ${trackDot[a.track]}`} />
                                        {a.track}
                                    </span>
                                </TableCell>
                                <TableNumber>{a.appliedAt.toLocaleDateString()}</TableNumber>
                                <TableNumber>{a.lastUpdate.toLocaleDateString()}</TableNumber>
                                <TableNumber className="text-right">{a.events.length}</TableNumber>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </main>
    );
}
