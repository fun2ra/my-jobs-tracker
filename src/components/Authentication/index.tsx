import { Button } from "@/components/ui/button";

interface AuthErrorProps {
    signingIn: boolean;
    error: string;
    signIn: () => Promise<void>;
}


export default function Authentication({ error, signIn, signingIn }: AuthErrorProps) {
    return (
        <main className='mt-24 flex justify-between'>
            <div className="max-w-130 flex flex-col gap-8">
                <h1 className='text-6xl font-bold text-black'>Every application, one place, current stage</h1>
                <h2>Confirmations, interview invites, asessments and rejections are grouped into applications by company, role or job reference, so you can see every time the staus of eah one of them</h2>
                <Button variant="outline" className={'bg-black text-white font-bold p-4'} onClick={signIn} disabled={signingIn}>{signingIn ? 'Signing in…' : 'Continue with Google'}</Button>
                {error && <p role="alert">{error}</p>}
            </div>

            <div className="bg-white p-8 shadow rounded-b-md max-w-148 w-full">
                Whats happen when you update
            </div>

        </main>
    );
}