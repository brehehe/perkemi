import PanelSidebar from '@/Components/UI/Navigation/PanelSidebar';
import ThemeToggle from '@/Components/UI/Elements/ThemeToggle';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function RefereeLayout({ children, title = 'Portal Wasit', portal = {} }) {
    const { url, props } = usePage();
    const user = props.auth?.user;
    const flash = props.flash || {};
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const eventQuery = portal.event?.id ? `?event_id=${encodeURIComponent(portal.event.id)}` : '';
    const isDashboard = url === '/wasit' || url.startsWith('/wasit?');
    const isAttendanceHistory = url.startsWith('/absensi-wasit');
    const navigation = [
        { label: 'Dashboard Wasit', href: `/wasit${eventQuery}`, icon: 'fa-id-card-clip', active: isDashboard },
        { label: 'History Absensi', href: `/absensi-wasit${eventQuery}`, icon: 'fa-calendar-check', active: isAttendanceHistory },
        { label: 'Papan Penilaian', href: `/admin/arbitrase/scoring${eventQuery}`, icon: 'fa-star', active: url.startsWith('/admin/arbitrase/scoring') },
        { label: 'Riwayat Penilaian', href: `/wasit/history${eventQuery}`, icon: 'fa-clock-rotate-left', active: url.startsWith('/wasit/history') },
    ];

    useEffect(() => {
        setSidebarOpen(false);
    }, [url]);

    useEffect(() => {
        const closeProfile = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
        };
        document.addEventListener('mousedown', closeProfile);
        return () => document.removeEventListener('mousedown', closeProfile);
    }, []);

    const initials = user?.name
        ? user.name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
        : 'WS';

    return (
        <div className="theme-shell min-h-screen bg-[#f7f4ef] font-dm text-[#0f0d0b] antialiased dark:bg-[#0f1115] dark:text-slate-100">
            <Head title={`${title} | Portal Wasit`} />

            <PanelSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} subtitle="Portal Wasit · 2026">
                <div className="mx-3 mt-3 rounded-xl border border-[#d4a843]/30 bg-[#d4a843]/10 p-3">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#d4a843]/20 text-[#f0c060]">
                            <i className="fa-solid fa-gavel text-sm" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-[11px] font-semibold text-white">{portal.event?.name || 'Event belum dipilih'}</p>
                            <p className="mt-0.5 truncate text-[9.5px] uppercase tracking-wide text-[#d4a843]">{portal.referee?.name || 'Akun Wasit'}</p>
                        </div>
                    </div>
                </div>

                <nav aria-label="Navigasi portal wasit" className="relative flex-1 overflow-y-auto py-3">
                    <p className="px-6 py-2 text-[10px] font-bold uppercase tracking-wider text-[#b5afa6]/70">Perwasitan</p>
                    <div className="space-y-0.5 pl-2">
                        {navigation.map((item) => (
                            <Link key={item.href} href={item.href} aria-current={item.active ? 'page' : undefined}
                                className={`flex min-h-11 items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${item.active
                                    ? 'border-l-3 border-[#e74c3c] bg-[#c0392b]/20 font-medium text-[#f0c060]'
                                    : 'text-white/65 hover:bg-white/5 hover:text-white'}`}>
                                <i className={`fa-solid ${item.icon} w-4 text-[11px] ${item.active ? 'text-[#f0c060]' : 'text-[#d4a843]'}`} aria-hidden="true" />
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>
                    <div className="mt-3 border-t border-white/10 pt-2">
                        <Link href={portal.event?.slug ? `/event/${portal.event.slug}` : '/'} className="flex min-h-11 items-center gap-3 px-6 py-2 text-[12.5px] text-white/60 hover:bg-white/5 hover:text-white">
                            <i className="fa-solid fa-globe w-4 text-[#d4a843]" aria-hidden="true" />
                            <span>Lihat Website Utama</span>
                        </Link>
                        <button type="button" onClick={() => router.post('/logout')} className="flex min-h-11 w-full items-center gap-3 px-6 py-2 text-left text-[12.5px] text-[#e74c3c]/80 hover:bg-white/5 hover:text-[#e74c3c]">
                            <i className="fa-solid fa-right-from-bracket w-4" aria-hidden="true" />
                            <span>Keluar Sistem</span>
                        </button>
                    </div>
                </nav>
            </PanelSidebar>

            <div className="min-h-screen lg:pl-[260px]">
                <header className="sticky top-0 z-40 flex h-16 items-center border-b border-[#ede9e1] bg-[#f7f4ef]/95 px-3 backdrop-blur-md dark:border-slate-800 dark:bg-[#11151b]/95 sm:px-4 md:px-7">
                    <button type="button" className="mr-3 flex h-11 w-11 items-center justify-center rounded-xl border border-[#e4ddd3] bg-white text-[#514a43] lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Buka navigasi">
                        <i className="fa-solid fa-bars" aria-hidden="true" />
                    </button>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold md:text-base">{title}</p>
                        <p className="hidden truncate text-xs text-[#888078] sm:block">{portal.event?.name}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <ThemeToggle />
                    <div ref={profileRef} className="relative">
                        <button type="button" onClick={() => setProfileOpen((value) => !value)} className="flex min-h-11 items-center gap-2 rounded-xl px-1.5 hover:bg-[#f1ede7]" aria-expanded={profileOpen} aria-haspopup="menu">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#b92f24] text-xs font-bold text-white">{initials}</span>
                            <span className="hidden max-w-44 text-left md:block"><span className="block truncate text-xs font-bold">{user?.name}</span><span className="block truncate text-[10px] text-[#958d85]">Akun Wasit</span></span>
                            <i className={`fa-solid fa-chevron-down hidden text-[10px] text-[#938a82] transition md:block ${profileOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </button>
                        {profileOpen && <div role="menu" className="absolute right-0 top-[calc(100%+10px)] z-[80] w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-[#e4ddd3] bg-white shadow-2xl shadow-black/15 sm:w-72"><div className="border-b border-[#eee8e0] px-4 py-3.5"><p className="truncate text-sm font-bold">{user?.name}</p><p className="mt-0.5 truncate text-xs text-[#8c847c]">{user?.email}</p></div><button role="menuitem" type="button" onClick={() => router.post('/logout')} className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#bc3026] hover:bg-red-50"><i className="fa-solid fa-right-from-bracket w-4" aria-hidden="true" /> Keluar Sistem</button></div>}
                    </div>
                    </div>
                </header>

                <main className="min-w-0 px-3 py-4 sm:px-4 sm:py-5 md:px-7 md:py-7">
                    {(flash.success || flash.status || flash.error) && <div role="status" className={`mb-5 rounded-xl border px-4 py-3 text-sm ${flash.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{flash.error || flash.success || flash.status}</div>}
                    {children}
                </main>
                <footer className="border-t border-[#e7e0d8] px-5 py-4 text-center text-[11px] text-[#aaa29a] dark:border-slate-800 dark:text-slate-500">© 2026 SMART-PERKEMI · Portal Wasit Shorinji Kempo Indonesia</footer>
            </div>
        </div>
    );
}
