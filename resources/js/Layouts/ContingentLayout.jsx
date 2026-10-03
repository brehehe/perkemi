import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const navigation = [
    { label: 'Registrasi', href: '/kontingen/registrasi', icon: 'fa-file-signature' },
    { label: 'Jadwal', href: '/kontingen/jadwal', icon: 'fa-calendar-days' },
    { label: 'Hasil', href: '/kontingen/hasil', icon: 'fa-medal' },
    { label: 'Atlet', href: '/kontingen/atlet', icon: 'fa-user-group' },
    { label: 'Official', href: '/kontingen/official', icon: 'fa-id-badge' },
    { label: 'Riwayat Pendaftaran', href: '/kontingen/riwayat-pendaftaran', icon: 'fa-clock-rotate-left' },
];

export default function ContingentLayout({ children, title = 'Portal Kontingen', portal = {} }) {
    const { url, props } = usePage();
    const user = props.auth?.user;
    const flash = props.flash || {};
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);

    useEffect(() => {
        setSidebarOpen(false);
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

    const isActive = (href) => url.split('?')[0] === href;
    const initials = user?.name
        ? user.name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
        : 'KT';

    const switchEvent = (eventId) => {
        const selected = portal.event_options?.find((event) => event.id === eventId);
        if (selected?.slug) {
            router.visit(`/event/${selected.slug}/admin`);
        }
    };

    return (
        <div className="min-h-screen bg-[#f6f3ee] text-[#1b1714]">
            <Head title={`${title} | Portal Kontingen`} />

            {sidebarOpen && (
                <button
                    type="button"
                    aria-label="Tutup navigasi"
                    className="fixed inset-0 z-40 bg-black/45 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 flex w-[276px] flex-col border-r border-white/10 bg-[#100e0c] text-white transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#c93629] text-lg font-black text-[#f0c557] shadow-lg shadow-red-950/40">
                        拳
                    </div>
                    <div className="min-w-0">
                        <p className="truncate font-cinzel text-sm font-bold tracking-[0.14em]">SMART PERKEMI</p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a9a198]">Portal Kontingen</p>
                    </div>
                    <button type="button" className="ml-auto text-white/60 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Tutup menu">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="border-b border-white/10 px-5 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#857d75]">Kontingen aktif</p>
                    <p className="mt-1.5 truncate text-sm font-semibold text-[#f0c557]">{portal.contingent?.name || 'Kontingen'}</p>
                    <p className="mt-0.5 truncate text-xs text-[#aaa29a]">{portal.event?.name || 'Event belum dipilih'}</p>
                </div>

                <nav aria-label="Navigasi portal kontingen" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
                    <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#716a63]">Menu kontingen</p>
                    {navigation.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive(item.href) ? 'page' : undefined}
                            className={`flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${isActive(item.href)
                                ? 'bg-[#392019] text-[#f3c659] shadow-[inset_3px_0_0_#e24535]'
                                : 'text-[#b8b1aa] hover:bg-white/6 hover:text-white'}`}
                        >
                            <span className="flex w-6 justify-center text-[#d4a843]"><i className={`fa-solid ${item.icon}`} /></span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="space-y-1 border-t border-white/10 p-3">
                    <Link href={`/event/${portal.event?.slug || ''}`} className="flex min-h-10 items-center gap-3 rounded-xl px-3.5 py-2 text-sm text-[#aaa29a] hover:bg-white/6 hover:text-white">
                        <span className="flex w-6 justify-center text-[#d4a843]"><i className="fa-solid fa-globe" /></span>
                        Lihat Landing Event
                    </Link>
                    <button type="button" onClick={() => router.post('/logout')} className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3.5 py-2 text-left text-sm text-[#e36a5f] hover:bg-red-500/10">
                        <span className="flex w-6 justify-center"><i className="fa-solid fa-right-from-bracket" /></span>
                        Keluar Sistem
                    </button>
                </div>
            </aside>

            <div className="min-h-screen lg:pl-[276px]">
                <header className="sticky top-0 z-30 flex h-[76px] items-center border-b border-[#e8e2d9] bg-[#fbf9f6]/95 px-4 backdrop-blur md:px-7">
                    <button type="button" className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[#e4ddd3] bg-white text-[#514a43] lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Buka navigasi">
                        <i className="fa-solid fa-bars" />
                    </button>

                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#1b1714] md:text-base">{title}</p>
                        <p className="hidden truncate text-xs text-[#888078] sm:block">{portal.event?.name}</p>
                    </div>

                    <div className="ml-auto flex items-center gap-2.5">
                        {portal.event_options?.length > 1 && (
                            <label className="hidden items-center gap-2 lg:flex">
                                <span className="sr-only">Pilih event</span>
                                <select
                                    value={portal.event?.id || ''}
                                    onChange={(event) => switchEvent(event.target.value)}
                                    className="h-10 max-w-64 rounded-xl border border-[#ded7ce] bg-white px-3 text-xs font-medium text-[#413b35] outline-none focus:border-[#c93629] focus:ring-2 focus:ring-[#c93629]/15"
                                >
                                    {portal.event_options.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
                                </select>
                            </label>
                        )}

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
