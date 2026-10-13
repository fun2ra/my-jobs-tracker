import { Button } from "@/components/ui/button";
import { LogIn, Mail, Combine, GlobeOff, CircleAlert } from 'lucide-react';
import GIcon from "@/assets/images/google-logo.svg"

interface AuthErrorProps {
    signingIn: boolean;
    error: string;
    signIn: () => Promise<void>;
}


export default function Authentication({ error, signIn, signingIn }: AuthErrorProps) {
    return (
        <main className='mt-24 flex justify-between pb-16'>
            <div className="max-w-130 flex flex-col gap-8">
                <div className="uppercase font-mono text-xs">Private dashboard - Build from Gmail data</div>
                <h1 className='text-6xl font-bold text-black'>Every application, one place, current stage.</h1>
                <h2 className="text-slate-700">Confirmations, interview invites, asessments and rejections are grouped into applications by company, role or job reference, so you can see every time the staus of eah one of them.</h2>

                <div className="border max-w-117 bg-white rounded-md shadow p-8">
                    <div className="font-bold text-xl mb-4">Sign in</div>
                    {error && <p role="alert" className="p-4 bg-red-50 rounded-sm mb-4 text-red-700 text-sm flex gap-2 items-center">
                        <span>
                            <CircleAlert className="text-sm" />
                        </span>
                        {error}
                    </p>}
                    <Button variant="outline" className={'bg-black text-white font-bold p-6 w-full'} onClick={signIn} disabled={signingIn}>
                        <img src={GIcon} alt="login with google" />
                        {signingIn ? 'Signing in…' : 'Continue with Google'}
                    </Button>
                    <div className="mt-4 text-slate-700 text-sm">Read-only Gmail access, limited to one account. The token is revoked after every run.</div>
                </div>

            </div>

            <div className="bg-white pt-8 pb-12 px-8 shadow rounded-md max-w-148 w-full  mt-6 h-fit">
                <div className="uppercase font-mono text-xs mb-6">What happens when you update</div>
                <div className=" flex flex-col gap-6">
                    <div className=" flex gap-4">
                        <div className="w-11 h-11 relative rounded-sm bg-slate-100 before:block before:h-17 before:bg-slate-100 before:w-0.5 before:left-1/2 before:content-[''] before:relative before:top-12">
                            <LogIn className="absolute top-2.5 right-2.5 text-slate-700" />
                        </div>
                        <div className="max-w-115">
                            <div className="font-semibold text-[18px]">Sign in with Google</div>
                            <div className="text-slate-700 text-sm mb-2">Only the account set in Settings is accepted. Anyone else is refused before anything is read.</div>
                            <div className="font-mono text-xs  text-slate-700 p-1 bg-slate-100 w-fit rounded-b-sm">one account</div>
                        </div>
                    </div>
                    <div className=" flex gap-4">
                        <div className="w-11 h-11 relative rounded-sm bg-blue-50 before:block before:h-17 before:bg-slate-100 before:w-0.5 before:left-1/2 before:content-[''] before:relative before:top-12">
                            <Mail className="absolute top-2.5 right-2.5 text-blue-700" />
                        </div>
                        <div className="max-w-115">
                            <div className="font-semibold text-[18px]">Reads Gmail</div>
                            <div className="text-slate-700 text-sm mb-2">An App Script runs as you, finds jobs emails and labels each one: applied, interview, rejected, noise.</div>
                            <div className="font-mono text-xs  text-slate-700 p-1 bg-slate-100 w-fit rounded-b-sm">read-only</div>
                        </div>
                    </div>
                    <div className=" flex gap-4">
                        <div className="w-11 h-11 relative rounded-sm bg-green-50 before:block before:h-17 before:bg-slate-100 before:w-0.5 before:left-1/2 before:content-[''] before:relative before:top-12">
                            <Combine className="absolute top-2.5 right-2.5 text-green-700" />
                        </div>
                        <div className="max-w-115">
                            <div className="font-semibold text-[18px]">
                                Group into applications
                            </div>
                            <div className="text-slate-700 text-sm mb-2">Updates arrive as new conversations, so emails are matched by company, role or job reference.</div>
                            <div className="font-mono text-xs  text-slate-700 p-1 bg-slate-100 w-fit rounded-b-sm">company + role</div>
                        </div>
                    </div>
                    <div className=" flex gap-4">
                        <div className="w-11 h-11 relative rounded-sm bg-amber-50 ">
                            <GlobeOff className="absolute top-2.5 right-2.5 text-amber-700" />
                        </div>
                        <div className="max-w-115">
                            <div className="font-semibold text-[18px]">
                                Keep it in the browser
                            </div>
                            <div className="text-slate-700 text-sm mb-2">Results are stored in browser only. You can delete them at any time.</div>
                            <div className="font-mono text-xs  text-slate-700 p-1 bg-slate-100 w-fit rounded-b-sm">no backend</div>
                        </div>
                    </div>
                </div>
            </div>

        </main>
    );
}