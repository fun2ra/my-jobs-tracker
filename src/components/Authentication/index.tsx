import { LogIn, Mail, Combine, GlobeOff } from 'lucide-react';
import GIcon from '@/assets/images/google-logo.svg';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardEyebrow, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { tones } from '@/components/ui/tone';

interface AuthErrorProps {
    signingIn: boolean;
    error: string;
    signIn: () => Promise<void>;
}

const steps = [
    {
        icon: LogIn,
        tone: tones.neutral,
        title: 'Sign in with Google',
        text: 'Only the account set in Settings is accepted. Anyone else is refused before anything is read.',
        tag: 'one account',
    },
    {
        icon: Mail,
        tone: tones.info,
        title: 'Reads Gmail',
        text: 'An Apps Script runs as you, finds job emails and labels each one: applied, interview, rejected, noise.',
        tag: 'read-only',
    },
    {
        icon: Combine,
        tone: tones.success,
        title: 'Group into applications',
        text: 'Updates arrive as new conversations, so emails are matched by company, role or job reference.',
        tag: 'company + role',
    },
    {
        icon: GlobeOff,
        tone: tones.warning,
        title: 'Keep it in the browser',
        text: 'Results are stored in this browser only. You can delete them at any time.',
        tag: 'no backend',
    },
];

export default function Authentication({ error, signIn, signingIn }: AuthErrorProps) {
    return (
        <main className="page-container flex flex-col gap-12 py-16 lg:flex-row lg:items-start lg:justify-between lg:py-24">
            <div className="flex max-w-130 flex-col gap-6">
                <CardEyebrow>Private dashboard · Built from Gmail data</CardEyebrow>
                <h1 className="text-display text-fg">Every application, one place, current stage.</h1>
                <p className="text-body text-fg-muted">
                    Confirmations, interview invites, assessments and rejections are grouped into applications by company, role or
                    job reference, so you can always see the status of each one.
                </p>

                <Card className="mt-2 max-w-117 gap-4 p-6">
                    <CardTitle className="text-title">Sign in</CardTitle>
                    {error && <Alert tone="danger">{error}</Alert>}
                    <Button variant="inverse" size="lg" className="w-full" onClick={signIn} disabled={signingIn}>
                        <img src={GIcon} alt="" className="size-5" />
                        {signingIn ? 'Signing in…' : 'Continue with Google'}
                    </Button>
                    <p className="text-caption text-fg-muted">
                        Read-only Gmail access, limited to one account. The token is revoked after every run.
                    </p>
                </Card>
            </div>

            <Card className="w-full max-w-148 gap-6 p-8">
                <CardEyebrow>What happens when you update</CardEyebrow>
                <ol className="flex flex-col">
                    {steps.map(({ icon: Icon, tone, title, text, tag }, i) => (
                        <li key={title} className="group flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className={cn(tone, 'grid size-11 shrink-0 place-items-center rounded-lg bg-(--tone-subtle) text-(--tone-strong)')}>
                                    <Icon aria-hidden className="size-5" />
                                </div>
                                {i < steps.length - 1 && <div aria-hidden className="my-1 w-0.5 flex-1 rounded-full bg-border" />}
                            </div>
                            <div className="flex flex-col gap-1 pb-6 group-last:pb-0">
                                <h3 className="text-heading text-fg">{title}</h3>
                                <p className="text-body text-fg-muted">{text}</p>
                                <Badge className="mt-1 font-mono">{tag}</Badge>
                            </div>
                        </li>
                    ))}
                </ol>
            </Card>
        </main>
    );
}
