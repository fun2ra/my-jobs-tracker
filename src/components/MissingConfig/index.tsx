import { Alert } from '@/components/ui/alert';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function MissingConfig({ missingConfig }: { missingConfig: string[] }) {
    return (
        <main className="page-container py-24">
            <Card className="max-w-xl">
                <CardHeader>
                    <CardTitle>Jobs Tracker needs configuration</CardTitle>
                    <CardDescription>Copy .env.example to .env and fill it in, then restart the dev server.</CardDescription>
                </CardHeader>
                <Alert tone="danger">
                    Missing: <span className="font-mono">{missingConfig.join(', ')}</span>
                </Alert>
            </Card>
        </main>
    );
}
