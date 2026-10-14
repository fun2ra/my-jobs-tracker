import Logo from '@/assets/images/logo.png';

export default function SideBar({ signOut }: { signOut: () => void }) {
    return (
        <aside className="fixed top-0 h-screen w-56 p-6 bg-slate-900 text-slate-100">
            <nav className=' flex flex-col h-full'>
                <a className='flex gap-2.5 items-center mb-11' href='/'>
                    <figure>
                        <img src={Logo} alt="jobb tracker logo" />
                    </figure>
                    <div className='text-xl font-semibold'>Jobs tracker</div>
                </a>
                <ul className='flex flex-col gap-6 text-slate-100 h-full [&>li]:cursor-pointer'>
                    <li>Overview</li>
                    <li>Applications</li>
                    <li>Emails</li>
                    <li className='text-blue-400 text-sm underline mt-auto' onClick={signOut}>Sign out</li>
                </ul>
            </nav>
        </aside>
    )
}