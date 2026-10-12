

export default function MissingConfig({ missingConfig }: { missingConfig: string[] }) {
    return (
        <main>
            <h1>Jobs Tracker</h1>
            <p role="alert">Missing configuration: {missingConfig.join(', ')}. Copy .env.example to .env and fill it in.</p>
        </main>
    );
}