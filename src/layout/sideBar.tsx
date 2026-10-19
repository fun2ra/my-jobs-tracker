import { Briefcase, LayoutDashboard, LogOut, Mail } from 'lucide-react';
import Logo from '@/assets/images/logo.png';

const items = [
    { label: 'Overview', icon: LayoutDashboard },
    { label: 'Applications', icon: Briefcase, current: true },
    { label: 'Emails', icon: Mail },
];

const itemClass =
    'flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-body text-sidebar-fg-muted transition-colors duration-150 outline-none hover:bg-sidebar-hover hover:text-sidebar-fg focus-visible:ring-3 focus-visible:ring-ring/60 aria-[current=page]:bg-sidebar-hover aria-[current=page]:font-semibold aria-[current=page]:text-sidebar-fg [&_svg]:size-4 [&_svg]:shrink-0';

export default function SideBar({ email, signOut }: { email: string; signOut: () => void }) {
    return (
        <aside className="fixed inset-y-0 left-0 flex w-56 flex-col border-r border-sidebar-border bg-sidebar p-4 text-sidebar-fg">
            <a className="mb-8 flex items-center gap-2.5 rounded-lg px-2 py-1" href={import.meta.env.BASE_URL}>
                <img src={Logo} alt="" />
                <span className="text-heading">Jobs tracker</span>
            </a>
            <nav aria-label="Main" className="flex-1">
                <ul className="flex flex-col gap-1">
                    {items.map(({ label, icon: Icon, current }) => (
                        <li key={label}>
                            <button type="button" className={itemClass} aria-current={current ? 'page' : undefined}>
                                <Icon aria-hidden />
                                {label}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="flex flex-col gap-2 border-t border-sidebar-border pt-4">
                <p className="truncate px-3 text-caption text-sidebar-fg-muted" title={email}>{email}</p>
                <button type="button" className={itemClass} onClick={signOut}>
                    <LogOut aria-hidden />
                    Sign out
                </button>
            </div>
        </aside>
    );
}
