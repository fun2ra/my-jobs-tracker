import Logo from '@/assets/images/logo.png'

export default function Header() {
    return <header className="px-14 py-5  bg-slate-900 text-slate-100">
        <div className='flex justify-between header-content'>
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
        </div>
    </header>
}