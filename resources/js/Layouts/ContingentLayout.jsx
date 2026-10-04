import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import PanelSidebar from '@/Components/UI/Navigation/PanelSidebar';

const navigation = [
    { id: 'pendaftaran', label: 'Pendaftaran', items: [
        { label: 'Registrasi Kontingen', href: '/kontingen/registrasi', icon: 'fa-file-signature' },
        { label: 'Riwayat Pendaftaran', href: '/kontingen/riwayat-pendaftaran', icon: 'fa-clock-rotate-left' },
    ] },
    { id: 'pertandingan', label: 'Pertandingan', items: [
        { label: 'Jadwal Pertandingan', href: '/kontingen/jadwal', icon: 'fa-calendar-days' },
    ] },
    { id: 'laporan', label: 'Laporan & Hasil', items: [
        { label: 'Hasil Pertandingan', href: '/kontingen/hasil', icon: 'fa-medal' },
    ] },
    { id: 'master', label: 'Data Kontingen', items: [
        { label: 'Atlet / Kenshi', href: '/kontingen/atlet', icon: 'fa-user-group' },
        { label: 'Official Pendamping', href: '/kontingen/official', icon: 'fa-id-badge' },
    ] },
];

export default function ContingentLayout({ children, title = 'Portal Kontingen', portal = {} }) {
    const { url, props } = usePage();
    const user = props.auth?.user;
    const flash = props.flash || {};
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isActive = (href) => url.split('?')[0] === href
        || (href === '/kontingen/registrasi' && (url.startsWith('/admin/pendaftaran/registrasi') || url.startsWith('/kontingen/registrasi/')));
    const eventQuery = portal.event?.id ? `?event_id=${encodeURIComponent(portal.event.id)}` : '';
    const contextualHref = (href) => href.startsWith('/kontingen/') ? `${href}${eventQuery}` : href;
    const [openSections, setOpenSections] = useState(() => Object.fromEntries(navigation.map((section) =>
        [section.id, section.id === 'pendaftaran' || section.items.some((item) => isActive(item.href))])));
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);

    useEffect(() => {
        setSidebarOpen(false);
        const section = navigation.find((group) => group.items.some((item) => isActive(item.href)));
        if (section) setOpenSections((previous) => ({ ...previous, [section.id]: true }));
    }, [url]);

    useEffect(() => {
        const closeProfile = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setProfileOpen(false);
            }
        };

        document.addEventListener('mousedown', closeProfile);

        return () => document.removeEventListener('mousedown', closeProfile);
    }, []);

    const initials = user?.name
        ? user.name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
        : 'KT';

    return (
        <div className="min-h-screen bg-[#f7f4ef] font-dm text-[#0f0d0b] antialiased">
            <Head title={`${title} | Portal Kontingen`} />

            <PanelSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} subtitle="Portal Kontingen · 2026">
                <div className="mx-3 mt-3 rounded-xl border border-[#d4a843]/30 bg-[#d4a843]/10 p-2.5">
                    <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#d4a843]/20 text-[#f0c060]">
                            <i className="fa-solid fa-trophy text-xs" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-[11px] font-semibold text-white">{portal.event?.name || 'Event belum dipilih'}</p>
                            <p className="mt-0.5 truncate text-[9.5px] uppercase tracking-wide text-[#d4a843]">{portal.contingent?.name || 'Kontingen'}</p>
                        </div>
                    </div>
                </div>
                <nav aria-label="Navigasi portal kontingen" className="relative flex-1 overflow-y-auto py-3">
                    {navigation.map((section) => <div key={section.id} className="mt-1 border-t border-white/5 pt-1">
                        <button type="button" aria-expanded={openSections[section.id]} aria-controls={`contingent-nav-${section.id}`}
                            onClick={() => setOpenSections((previous) => ({ ...previous, [section.id]: !previous[section.id] }))}
                            className="flex w-full items-center justify-between px-6 py-2 text-[10px] font-bold uppercase tracking-wider text-[#b5afa6]/70 transition-colors hover:bg-white/5 hover:text-white">
                            <span>{section.label}</span>
                            <i aria-hidden="true" className={`fa-solid fa-chevron-right text-[8px] transition-transform ${openSections[section.id] ? 'rotate-90 text-[#d4a843]' : ''}`} />
                        </button>
                        <div id={`contingent-nav-${section.id}`} hidden={!openSections[section.id]} className="space-y-0.5 pl-2">
                            {section.items.map((item) => <Link key={item.href} href={contextualHref(item.href)} aria-current={isActive(item.href) ? 'page' : undefined}
                                className={`flex items-center gap-3 px-6 py-2 text-[12.5px] leading-snug transition-colors ${isActive(item.href)
                                    ? 'border-l-3 border-[#e74c3c] bg-[#c0392b]/20 font-medium text-[#f0c060]'
                                    : 'text-white/65 hover:bg-white/5 hover:text-white'}`}>
                                <i aria-hidden="true" className={`fa-solid ${item.icon} w-4 shrink-0 text-[11px] ${isActive(item.href) ? 'text-[#f0c060]' : 'text-[#d4a843]'}`} />
                                <span>{item.label}</span>
                            </Link>)}
                        </div>
                    </div>)}
                    <div className="mt-2 border-t border-white/10 pt-2">
                        <Link href={portal.event?.slug ? `/event/${portal.event.slug}` : '/'} className="flex items-center gap-3 px-6 py-2 text-[12.5px] text-white/60 transition-colors hover:bg-white/5 hover:text-white">
                            <i className="fa-solid fa-globe w-4 text-[12px] text-[#d4a843]" aria-hidden="true" />
                            <span>{portal.event?.slug ? 'Lihat Landing Event' : 'Lihat Website Utama'}</span>
                        </Link>
                        <button type="button" onClick={() => router.post('/logout')} className="flex w-full items-center gap-3 px-6 py-2 text-left text-[12.5px] text-[#e74c3c]/80 transition-colors hover:bg-white/5 hover:text-[#e74c3c]">
                            <i className="fa-solid fa-right-from-bracket w-4 text-[12px]" aria-hidden="true" />
                            <span>Keluar Sistem</span>
                        </button>
                    </div>
                </nav>
            </PanelSidebar>

            <div className="min-h-screen lg:pl-[260px]">
                <header className="sticky top-0 z-40 flex h-16 items-center border-b border-[#ede9e1] bg-[#f7f4ef]/95 px-4 backdrop-blur-md md:px-7">
                    <button type="button" className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[#e4ddd3] bg-white text-[#514a43] lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Buka navigasi">
                        <i className="fa-solid fa-bars" />
                    </button>

                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#1b1714] md:text-base">{title}</p>
                        <p className="hidden truncate text-xs text-[#888078] sm:block">{portal.event?.name}</p>
                    </div>

                    <div className="ml-auto flex items-center gap-2.5">
                        <div ref={profileRef} className="relative">
                            <button type="button" onClick={() => setProfileOpen((value) => !value)} className="flex h-11 items-center gap-2 rounded-xl px-1.5 hover:bg-[#f1ede7]" aria-expanded={profileOpen} aria-haspopup="menu">
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#b92f24] text-xs font-bold text-white">{initials}</span>
                                <span className="hidden max-w-40 text-left md:block">
                                    <span className="block truncate text-xs font-bold">{user?.name}</span>
                                    <span className="block truncate text-[10px] text-[#958d85]">Akun Kontingen</span>
                                </span>
                                <i className={`fa-solid fa-chevron-down hidden text-[10px] text-[#938a82] transition md:block ${profileOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {profileOpen && (
                                <div role="menu" className="absolute right-0 top-[calc(100%+10px)] z-[80] w-72 overflow-hidden rounded-2xl border border-[#e4ddd3] bg-white shadow-2xl shadow-black/15">
                                    <div className="border-b border-[#eee8e0] px-4 py-3.5">
                                        <p className="truncate text-sm font-bold">{user?.name}</p>
                                        <p className="mt-0.5 truncate text-xs text-[#8c847c]">{user?.email}</p>
                                    </div>
                                    <Link role="menuitem" href="/" className="flex items-center gap-3 px-4 py-3 text-sm text-[#59524c] hover:bg-[#f7f3ee]">
                                        <i className="fa-solid fa-house w-4 text-[#d4a843]" /> Beranda Utama
                                    </Link>
                                    <button role="menuitem" type="button" onClick={() => router.post('/logout')} className="flex w-full items-center gap-3 border-t border-[#eee8e0] px-4 py-3 text-left text-sm text-[#bc3026] hover:bg-red-50">
                                        <i className="fa-solid fa-right-from-bracket w-4" /> Keluar Sistem
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="px-4 py-5 md:px-7 md:py-7">
                    {(flash.status || flash.error) && (
                        <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${flash.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                            {flash.error || flash.status}
                        </div>
                    )}
                    {children}
                </main>

                <footer className="border-t border-[#e7e0d8] px-5 py-4 text-center text-[11px] text-[#aaa29a]">
                    © 2026 SMART-PERKEMI · Portal Kontingen Shorinji Kempo Indonesia
                </footer>
            </div>
        </div>
    );
}
