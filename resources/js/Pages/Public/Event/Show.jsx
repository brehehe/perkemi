import Button from "@/Components/UI/Elements/Button";
import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';

export default function EventShow({
    auth = {},
    event,
    ageCategories = [],
    courts = [],
    matchCategories = [],
    rundowns = [],
    paymentMethods = [],
    canAccessDashboard = false,
    isHomepage = false,
}) {
    const [copiedAccount, setCopiedAccount] = useState(null);

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedAccount(id);
        setTimeout(() => setCopiedAccount(null), 2500);
    };

    const statusBadge = () => {
        switch (event.status) {
            case 'open_registration':
                return {
                    label: 'Pendaftaran Dibuka',
                    bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                    dot: 'bg-emerald-500',
                };
            case 'ongoing':
                return {
                    label: 'Kejuaraan Berlangsung',
                    bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                    dot: 'bg-blue-500',
                };
            case 'completed':
                return {
                    label: 'Kejuaraan Selesai',
                    bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
                    dot: 'bg-slate-400',
                };
            default:
                return {
                    label: 'Tahap Persiapan / Draft',
                    bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                    dot: 'bg-amber-500',
                };
        }
    };

    const badge = statusBadge();
    const isAuthenticated = Boolean(auth?.user);
    const eventDashboardHref = `/event/${event.slug}/admin`;
    const dashboardHref = canAccessDashboard ? eventDashboardHref : '/admin/dashboard';

    return (
        <div className="min-h-screen bg-[#faf8f5] dark:bg-[#0c0b0a] text-[#1c1917] dark:text-[#f5f5f4] selection:bg-[#c0392b] selection:text-white transition-colors duration-300">
            <Head title={`${event.name} - Smart PERKEMI`} />

            {/* ══ TOPBAR ══ */}
            <header className="sticky top-0 z-40 border-b border-black/5 dark:border-white/10 bg-[#faf8f5]/80 dark:bg-[#0c0b0a]/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c0392b] to-[#8b1e13] flex items-center justify-center text-white shadow-md shadow-[#c0392b]/20 group-hover:scale-105 transition-transform">
                            <i className="fa-solid fa-yin-yang text-lg animate-spin-slow"></i>
                        </div>
                        <div>
                            <span className="font-extrabold text-base tracking-tight text-[#1c1917] dark:text-white block">
                                SMART <span className="text-[#c0392b]">PERKEMI</span>
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-[#78716c] dark:text-[#a8a29e] block font-semibold">
                                {isHomepage ? 'Landing Utama Event' : 'Portal Event Kejuaraan'}
                            </span>
                        </div>
                    </Link>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {canAccessDashboard || isAuthenticated ? (
                            <Link
                                href={dashboardHref}
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#d4a843]/15 text-[#9e7616] dark:text-[#f5c542] border border-[#d4a843]/30 hover:bg-[#d4a843]/25 transition-all"
                            >
                                <i className="fa-solid fa-gauge-high"></i>
                                <span className="hidden sm:inline">Masuk Dashboard</span>
                            </Link>
                        ) : (
                            <Link
                                href={`/event/${event.slug}/register`}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#c0392b] to-[#962d22] text-white shadow-md shadow-[#c0392b]/25 hover:from-[#d94436] hover:to-[#a93327] hover:shadow-lg hover:shadow-[#c0392b]/35 transition-all active:scale-[0.98]"
                            >
                                <i className="fa-solid fa-clipboard-user"></i>
                                <span>Daftar Kontingen</span>
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* ══ HERO BANNER ══ */}
            <section className="relative overflow-hidden pt-10 pb-16 lg:py-20 border-b border-black/5 dark:border-white/5 bg-gradient-to-b from-[#f2eee9] to-[#faf8f5] dark:from-[#141210] dark:to-[#0c0b0a]">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#c0392b]/10 dark:bg-[#c0392b]/15 rounded-full blur-3xl pointer-events-none -z-0"></div>
                <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#d4a843]/10 dark:bg-[#d4a843]/10 rounded-full blur-3xl pointer-events-none -z-0"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                        <div>
                        {/* Edition & Status Badges */}
                        <div className="flex flex-wrap items-center gap-2.5 mb-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}>
                                <span className={`w-2 h-2 rounded-full ${badge.dot} animate-pulse`}></span>
                                {badge.label}
                            </span>
                            {event.edition && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#d4a843]/15 text-[#9e7616] dark:text-[#f5c542] border border-[#d4a843]/30">
                                    <i className="fa-solid fa-award text-[10px]"></i>
                                    {event.edition}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-black/5 dark:bg-white/5 text-[#78716c] dark:text-[#a8a29e] border border-black/5 dark:border-white/10">
                                <i className="fa-solid fa-link text-[10px]"></i>
                                event/{event.slug}
                            </span>
                        </div>

                        {/* Event Title */}
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1c1917] dark:text-white tracking-tight leading-tight mb-4">
                            {event.name}
                        </h1>

                        {/* Description */}
                        {event.description && (
                            <p className="text-base sm:text-lg text-[#57534e] dark:text-[#d6d3d1] leading-relaxed mb-6">
                                {event.description}
                            </p>
                        )}

                        {/* Key Specs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-white/[0.04] border border-black/5 dark:border-white/5 backdrop-blur-sm">
                                <div className="w-10 h-10 rounded-lg bg-[#c0392b]/10 text-[#c0392b] flex items-center justify-center shrink-0">
                                    <i className="fa-solid fa-calendar-days text-base"></i>
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[11px] font-semibold text-[#78716c] dark:text-[#a8a29e] uppercase block">
                                        Waktu Pelaksanaan
                                    </span>
                                    <span className="text-sm font-bold text-[#1c1917] dark:text-white truncate block">
                                        {event.dates_formatted}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-white/[0.04] border border-black/5 dark:border-white/5 backdrop-blur-sm">
                                <div className="w-10 h-10 rounded-lg bg-[#d4a843]/10 text-[#d4a843] flex items-center justify-center shrink-0">
                                    <i className="fa-solid fa-location-dot text-base"></i>
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[11px] font-semibold text-[#78716c] dark:text-[#a8a29e] uppercase block">
                                        Tempat & Kota
                                    </span>
                                    <span className="text-sm font-bold text-[#1c1917] dark:text-white truncate block">
                                        {event.venue}, {event.city}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-white/[0.04] border border-black/5 dark:border-white/5 backdrop-blur-sm sm:col-span-2">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                    <i className="fa-solid fa-list-ol text-base"></i>
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[11px] font-semibold text-[#78716c] dark:text-[#a8a29e] uppercase block">
                                        Batas Nomor per Atlet
                                    </span>
                                    <span className="text-sm font-bold text-[#1c1917] dark:text-white block">
                                        Maksimal {event.max_match_categories_per_athlete || 1} nomor pertandingan berbeda
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-wrap items-center gap-3">
                            {canAccessDashboard || isAuthenticated ? (
                                <Link
                                    href={dashboardHref}
                                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold bg-[#c0392b] text-white shadow-lg shadow-[#c0392b]/30 hover:bg-[#d94436] hover:shadow-xl hover:shadow-[#c0392b]/40 transition-all active:scale-[0.98]"
                                >
                                    <i className="fa-solid fa-gauge-high"></i>
                                    <span>Masuk ke Dashboard</span>
                                </Link>
                            ) : (
                                <Link
                                    href={`/event/${event.slug}/register`}
                                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold bg-[#c0392b] text-white shadow-lg shadow-[#c0392b]/30 hover:bg-[#d94436] hover:shadow-xl hover:shadow-[#c0392b]/40 transition-all active:scale-[0.98]"
                                >
                                    <i className="fa-solid fa-user-plus"></i>
                                    <span>Daftarkan Kontingen Anda</span>
                                </Link>
                            )}

                            {event.rules_doc ? (
                                <a
                                    href={event.rules_doc}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-white dark:bg-white/[0.06] text-[#1c1917] dark:text-white border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                                >
                                    <i className="fa-solid fa-file-pdf text-[#c0392b]"></i>
                                    <span>Unduh Proposal & Juknis</span>
                                </a>
                            ) : null}

                        </div>
                        </div>

                        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
                            <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-[#c0392b]/20 to-[#d4a843]/20 blur-xl" aria-hidden="true"></div>
                            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] border border-white/70 bg-[#17120f] shadow-2xl shadow-[#3b2018]/20 dark:border-white/10">
                                {event.cover_image_url ? (
                                    <img src={event.cover_image_url} alt={`Gambar utama ${event.name}`} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full flex-col justify-between bg-[radial-gradient(circle_at_70%_20%,#5a291f_0%,#211510_42%,#100e0c_100%)] p-7 text-white">
                                        <div className="flex items-center justify-between border-b border-white/10 pb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#f0c060]">
                                            <span>Smart Perkemi</span>
                                            <span>2026</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="font-cinzel text-8xl font-black text-[#d4a843]/25" aria-hidden="true">拳</span>
                                            <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-[#f0c060]">No Image</p>
                                            <p className="mx-auto mt-2 max-w-[220px] text-xs leading-relaxed text-white/55">Gambar resmi event belum diunggah oleh panitia.</p>
                                        </div>
                                        <div className="border-t border-white/10 pt-4 text-xs leading-relaxed text-white/60">
                                            {event.venue}<br />{event.city}, {event.province}
                                        </div>
                                    </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-6 pt-20">
                                    {event.cover_image_url && <p className="text-sm font-bold leading-snug text-white">{event.name}</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ METRICS BAR ══ */}
            <section className="bg-white dark:bg-[#11100e] border-b border-black/5 dark:border-white/5 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        <div className="p-4 rounded-xl bg-[#faf8f5] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 text-center">
                            <span className="text-xs text-[#78716c] dark:text-[#a8a29e] uppercase font-semibold block mb-1">
                                Biaya Kontingen
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-[#c0392b]">
                                {event.is_paid ? event.fee_per_contingent_formatted : 'Gratis'}
                            </span>
                        </div>

                        <div className="p-4 rounded-xl bg-[#faf8f5] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 text-center">
                            <span className="text-xs text-[#78716c] dark:text-[#a8a29e] uppercase font-semibold block mb-1">
                                Biaya per Atlet
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-[#1c1917] dark:text-white">
                                {event.is_paid ? event.fee_per_athlete_formatted : 'Gratis'}
                            </span>
                        </div>

                        <div className="p-4 rounded-xl bg-[#faf8f5] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 text-center">
                            <span className="text-xs text-[#78716c] dark:text-[#a8a29e] uppercase font-semibold block mb-1">
                                Kelompok Umur
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-[#1c1917] dark:text-white">
                                {ageCategories.length} Kategori
                            </span>
                        </div>

                        <div className="p-4 rounded-xl bg-[#faf8f5] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 text-center">
                            <span className="text-xs text-[#78716c] dark:text-[#a8a29e] uppercase font-semibold block mb-1">
                                Batas Pendaftaran
                            </span>
                            <span className="text-sm sm:text-base font-bold text-[#d4a843] truncate block mt-1">
                                {event.registration_end_formatted || 'Ditutup Saat Kuota Penuh'}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ EVENT INFORMATION ══ */}
            <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
                <div className="mb-12">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c0392b]">Informasi Lengkap Event</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-[#1c1917] dark:text-white sm:text-3xl">
                        Semua informasi tersusun dalam satu halaman
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#57534e] dark:text-[#d6d3d1] sm:text-base">
                        Gulir ke bawah untuk melihat kategori pertandingan, gelanggang, rundown, dan informasi biaya secara berurutan.
                    </p>

                    <nav aria-label="Navigasi informasi event" className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
                        {[
                            { href: '#categories', icon: 'fa-list-check', label: `Kategori (${matchCategories.length})` },
                            { href: '#courts', icon: 'fa-square-full', label: `Gelanggang (${courts.length})` },
                            { href: '#schedule', icon: 'fa-clock', label: `Rundown (${rundowns.length})` },
                            { href: '#payment', icon: event.is_paid ? 'fa-credit-card' : 'fa-gift', label: event.is_paid ? 'Pembayaran' : 'Biaya Gratis' },
                        ].map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-2.5 text-center text-xs font-bold text-[#57534e] shadow-sm transition-colors hover:border-[#c0392b]/30 hover:bg-[#c0392b]/5 hover:text-[#c0392b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c0392b] dark:border-white/10 dark:bg-[#141210] dark:text-[#d6d3d1] dark:hover:border-[#c0392b]/50 dark:hover:bg-[#c0392b]/10 sm:text-sm"
                            >
                                <i className={`fa-solid ${item.icon}`} aria-hidden="true"></i>
                                <span>{item.label}</span>
                            </a>
                        ))}
                    </nav>
                </div>

                <div className="space-y-12 lg:space-y-16">
                    <section id="categories" className="scroll-mt-24 rounded-3xl border border-black/5 bg-white/60 p-5 shadow-sm dark:border-white/5 dark:bg-[#11100e]/70 sm:p-8 lg:p-10">
                        <div className="mb-8 flex items-start gap-4">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c0392b] text-sm font-black text-white shadow-md shadow-[#c0392b]/20">01</span>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c0392b]">Kategori Pertandingan</p>
                                <h2 className="mt-1 text-2xl font-black text-[#1c1917] dark:text-white">Kelompok Umur & Nomor Tanding</h2>
                                <p className="mt-2 text-sm leading-relaxed text-[#78716c] dark:text-[#a8a29e]">Rincian kategori yang dapat dipilih peserta pada event ini.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {ageCategories.length > 0 ? (
                                ageCategories.map((ac) => (
                                    <div key={ac.id} className="flex h-full flex-col rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#141210] sm:p-6">
                                        <span className="text-xs font-bold uppercase tracking-wider text-[#c0392b]">{ac.age_range}</span>
                                        <h3 className="mt-1 text-lg font-black text-[#1c1917] dark:text-white">{ac.name}</h3>
                                        <p className="mt-3 grow text-sm leading-relaxed text-[#78716c] dark:text-[#a8a29e]">
                                            {ac.description || 'Kenshi dalam rentang usia yang telah ditentukan panitia.'}
                                        </p>
                                        <div className="mt-5 flex items-center justify-between gap-4 border-t border-black/5 pt-4 dark:border-white/5">
                                            <span className="text-xs text-[#78716c] dark:text-[#a8a29e]">Tarif Kategori</span>
                                            <span className="text-sm font-bold text-[#1c1917] dark:text-white">{ac.fee_formatted}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full rounded-2xl border border-dashed border-black/10 py-10 text-center text-sm text-[#78716c] dark:border-white/10 dark:text-[#a8a29e]">
                                    Belum ada kelompok umur yang dikonfigurasi untuk event ini.
                                </div>
                            )}
                        </div>

                        <div className="mt-10">
                            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d4a843]">Daftar Resmi</p>
                                    <h3 className="mt-1 text-xl font-black text-[#1c1917] dark:text-white">Nomor Pertandingan</h3>
                                </div>
                                <span className="rounded-full bg-[#d4a843]/15 px-3 py-1 text-xs font-bold text-[#8a6818] dark:text-[#f5c542]">{matchCategories.length} nomor tersedia</span>
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/5 dark:bg-[#141210]">
                                <TableContainer ariaLabel="Daftar nomor pertandingan">
                                    <table className="responsive-data-table w-full whitespace-nowrap text-left text-sm">
                                        <thead className="border-b border-black/5 bg-[#faf8f5] text-[11px] font-bold uppercase tracking-wider text-[#78716c] dark:border-white/5 dark:bg-white/[0.03] dark:text-[#a8a29e]">
                                            <tr>
                                                <th className="px-5 py-3.5">Nomor Pertandingan</th>
                                                <th className="px-5 py-3.5">Tipe Tanding</th>
                                                <th className="px-5 py-3.5">Gender</th>
                                                <th className="px-5 py-3.5">Tingkatan Kyu/Dan</th>
                                                <th className="px-5 py-3.5">Rentang Berat</th>
                                                <th className="px-5 py-3.5 text-right">Kapasitas</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 text-[#1c1917] dark:divide-white/5 dark:text-[#e7e5e4]">
                                            {matchCategories.length > 0 ? (
                                                matchCategories.map((mc) => (
                                                    <tr key={mc.id} className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                                                        <td className="px-5 py-4 text-sm font-bold">{mc.name}</td>
                                                        <td className="px-5 py-4">
                                                            <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${mc.type === 'randori' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'}`}>
                                                                {mc.type.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4 capitalize">{mc.gender === 'male' ? 'Putra' : mc.gender === 'female' ? 'Putri' : 'Campuran'}</td>
                                                        <td className="px-5 py-4 font-mono text-xs">{mc.min_kyu && mc.max_kyu ? `${mc.min_kyu} s/d ${mc.max_kyu}` : '-'}</td>
                                                        <td className="px-5 py-4 font-mono text-xs">{mc.weight_range}</td>
                                                        <td className="px-5 py-4 text-right font-semibold">{mc.capacity ? `${mc.capacity} Peserta` : 'Tak Terbatas'}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={6} className="px-5 py-10 text-center text-[#78716c] dark:text-[#a8a29e]">Belum ada nomor pertandingan yang didaftarkan.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </TableContainer>
                            </div>
                        </div>
                    </section>

                    <section id="courts" className="scroll-mt-24 rounded-3xl border border-black/5 bg-white/60 p-5 shadow-sm dark:border-white/5 dark:bg-[#11100e]/70 sm:p-8 lg:p-10">
                        <div className="mb-8 flex items-start gap-4">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4a843] text-sm font-black text-[#1c1917] shadow-md shadow-[#d4a843]/20">02</span>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9e7616] dark:text-[#f5c542]">Lokasi Pertandingan</p>
                                <h2 className="mt-1 text-2xl font-black text-[#1c1917] dark:text-white">Gelanggang / Tatami</h2>
                                <p className="mt-2 text-sm leading-relaxed text-[#78716c] dark:text-[#a8a29e]">Area yang digunakan untuk pelaksanaan pertandingan.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            {courts.length > 0 ? (
                                courts.map((court) => (
                                    <div key={court.id} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#141210]">
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#d4a843]/15 text-xl text-[#d4a843]">
                                                <i className="fa-solid fa-shapes" aria-hidden="true"></i>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-[#1c1917] dark:text-white">{court.name}</h3>
                                                <div className="mt-2 flex items-start gap-2 text-xs font-semibold leading-relaxed text-[#c0392b]">
                                                    <i className="fa-solid fa-map-pin mt-0.5" aria-hidden="true"></i>
                                                    <span>{court.location || 'Area Gelanggang Utama'}</span>
                                                </div>
                                                <p className="mt-3 text-sm leading-relaxed text-[#78716c] dark:text-[#a8a29e]">{court.description || 'Gelanggang pertandingan resmi sesuai standar PERKEMI.'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full rounded-2xl border border-dashed border-black/10 py-10 text-center text-sm text-[#78716c] dark:border-white/10 dark:text-[#a8a29e]">Belum ada gelanggang / tatami yang dikonfigurasi untuk event ini.</div>
                            )}
                        </div>
                    </section>

                    <section id="schedule" className="scroll-mt-24 rounded-3xl border border-black/5 bg-white/60 p-5 shadow-sm dark:border-white/5 dark:bg-[#11100e]/70 sm:p-8 lg:p-10">
                        <div className="mb-8 flex items-start gap-4">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c0392b] text-sm font-black text-white shadow-md shadow-[#c0392b]/20">03</span>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c0392b]">Susunan Acara</p>
                                <h2 className="mt-1 text-2xl font-black text-[#1c1917] dark:text-white">Jadwal & Rundown</h2>
                                <p className="mt-2 text-sm leading-relaxed text-[#78716c] dark:text-[#a8a29e]">Urutan kegiatan ditampilkan lengkap dari awal sampai penutupan.</p>
                            </div>
                        </div>

                        <div className="mx-auto max-w-4xl space-y-3">
                            {rundowns.length > 0 ? (
                                rundowns.map((r, idx) => (
                                    <div key={r.id} className="flex items-start gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#141210] sm:p-5">
                                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-black/5 text-center dark:bg-white/5">
                                            <span className="font-mono text-xs font-bold text-[#c0392b]">#{idx + 1}</span>
                                            <span className="text-[10px] font-semibold uppercase text-[#78716c] dark:text-[#a8a29e]">Sesi</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between">
                                                <h3 className="text-base font-bold text-[#1c1917] dark:text-white">{r.name}</h3>
                                                <span className="shrink-0 rounded-md bg-[#d4a843]/15 px-2.5 py-1 font-mono text-xs font-semibold text-[#9e7616] dark:text-[#f5c542]">
                                                    {r.date_formatted}{r.end_time_only ? ` – ${r.end_time_only} WIB` : ' – selesai'}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-xs leading-relaxed text-[#78716c] dark:text-[#a8a29e]">{r.description || 'Sesi rangkaian acara resmi kejuaraan.'}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-2xl border border-dashed border-black/10 py-10 text-center text-sm text-[#78716c] dark:border-white/10 dark:text-[#a8a29e]">Rundown dan susunan acara resmi akan segera diumumkan panitia.</div>
                            )}
                        </div>
                    </section>

                    <section id="payment" className="scroll-mt-24 rounded-3xl border border-black/5 bg-white/60 p-5 shadow-sm dark:border-white/5 dark:bg-[#11100e]/70 sm:p-8 lg:p-10">
                        <div className="mb-8 flex items-start gap-4">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4a843] text-sm font-black text-[#1c1917] shadow-md shadow-[#d4a843]/20">04</span>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9e7616] dark:text-[#f5c542]">Administrasi Event</p>
                                <h2 className="mt-1 text-2xl font-black text-[#1c1917] dark:text-white">{event.is_paid ? 'Metode Pembayaran' : 'Informasi Biaya'}</h2>
                                <p className="mt-2 text-sm leading-relaxed text-[#78716c] dark:text-[#a8a29e]">Ketentuan biaya dan narahubung resmi panitia.</p>
                            </div>
                        </div>

                    <div className="mx-auto max-w-4xl space-y-6">
                        {!event.is_paid ? <div className="p-6 rounded-2xl border border-emerald-200 bg-emerald-50 flex items-start gap-4 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
                            <i className="fa-solid fa-gift text-xl text-emerald-700 mt-0.5" aria-hidden="true"></i>
                            <div className="text-sm"><h4 className="font-bold mb-1">Registrasi Event Gratis</h4><p className="leading-relaxed text-emerald-700 dark:text-emerald-300">Tidak ada biaya kontingen maupun biaya per atlet. Peserta tidak perlu memilih metode pembayaran atau mengunggah bukti transfer.</p></div>
                        </div> : <>
                        <div className="p-6 rounded-2xl bg-gradient-to-r from-[#c0392b]/10 to-[#d4a843]/10 border border-[#c0392b]/20 flex items-start gap-4">
                            <i className="fa-solid fa-circle-info text-xl text-[#c0392b] mt-0.5"></i>
                            <div className="text-sm">
                                <h4 className="font-bold text-[#1c1917] dark:text-white mb-1">
                                    Petunjuk Pembayaran Pendaftaran
                                </h4>
                                <p className="text-[#57534e] dark:text-[#d6d3d1] leading-relaxed">
                                    Biaya pendaftaran kontingen dan atlet hanya ditransfer melalui rekening resmi panitia di bawah ini. Harap simpan bukti transfer untuk diunggah saat verifikasi pendaftaran di portal kontingen.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {paymentMethods.length > 0 ? (
                                paymentMethods.map((pm) => (
                                    <div
                                        key={pm.id}
                                        className="p-6 rounded-2xl bg-white dark:bg-[#141210] border border-black/5 dark:border-white/5 shadow-sm"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-1 rounded-md bg-black/5 dark:bg-white/5 text-[#78716c] dark:text-[#a8a29e]">
                                                {pm.provider || pm.name}
                                            </span>
                                            <span className="text-xs font-semibold text-[#d4a843] capitalize">
                                                {pm.type}
                                            </span>
                                        </div>

                                        <div className="mb-4">
                                            <span className="text-xs text-[#78716c] dark:text-[#a8a29e] block mb-1">
                                                Nomor Rekening / Akun
                                            </span>
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-[#faf8f5] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 font-mono text-base font-bold text-[#1c1917] dark:text-white">
                                                <span>{pm.account_number}</span>
                                                <Button variant="unstyled" size="none"
                                                    type="button"
                                                    onClick={() => handleCopy(pm.account_number, pm.id)}
                                                    className="px-2.5 py-1 rounded-md text-xs font-sans font-bold bg-[#c0392b]/15 text-[#c0392b] hover:bg-[#c0392b]/25 transition-all cursor-pointer"
                                                >
                                                    {copiedAccount === pm.id ? 'Tersalin!' : 'Salin'}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="text-xs text-[#78716c] dark:text-[#a8a29e] mb-2">
                                            Atas Nama: <strong className="text-[#1c1917] dark:text-white">{pm.account_name}</strong>
                                        </div>

                                        {pm.instructions && (
                                            <p className="text-xs text-[#57534e] dark:text-[#a8a29e] border-t border-black/5 dark:border-white/5 pt-3 mt-3 leading-relaxed">
                                                {pm.instructions}
                                            </p>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-12 text-center text-sm text-[#78716c] dark:text-[#a8a29e]">
                                    Informasi rekening panitia akan ditampilkan di sini.
                                </div>
                            )}
                        </div>
                        </>}

                        {/* Contact Person Card */}
                        {(event.contact_person || event.contact_phone) && (
                            <div className="p-6 rounded-2xl bg-white dark:bg-[#141210] border border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <span className="text-xs text-[#78716c] dark:text-[#a8a29e] uppercase font-semibold block mb-0.5">
                                        Narahubung / Contact Person Panitia
                                    </span>
                                    <span className="text-base font-bold text-[#1c1917] dark:text-white">
                                        {event.contact_person || 'Sekretariat Panitia Kejuaraan'}
                                    </span>
                                </div>
                                {event.contact_phone && (
                                    <a
                                        href={`https://wa.me/${event.contact_phone.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all"
                                    >
                                        <i className="fa-brands fa-whatsapp text-sm"></i>
                                        <span>Hubungi WhatsApp ({event.contact_phone})</span>
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                    </section>

                    <section className="rounded-3xl bg-[linear-gradient(135deg,#2b1712_0%,#130f0d_58%,#24180f_100%)] px-5 py-8 text-center text-white shadow-xl shadow-[#3b2018]/15 sm:px-8 sm:py-10">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f0c060]">
                            {canAccessDashboard || isAuthenticated ? 'Akun Anda Sudah Aktif' : 'Siap Mengikuti Event?'}
                        </p>
                        <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                            {canAccessDashboard || isAuthenticated ? 'Lanjutkan ke dashboard Anda' : 'Daftarkan kontingen Anda sekarang'}
                        </h2>
                        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/65">
                            {canAccessDashboard || isAuthenticated
                                ? 'Buka menu administrasi untuk melanjutkan pengelolaan event dan data pendaftaran.'
                                : 'Lengkapi data kontingen dan peserta sebelum batas pendaftaran berakhir.'}
                        </p>
                        <Link href={canAccessDashboard || isAuthenticated ? dashboardHref : `/event/${event.slug}/register`} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#c0392b] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-black/20 transition-colors hover:bg-[#d94436] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                            <i className={`fa-solid ${canAccessDashboard || isAuthenticated ? 'fa-gauge-high' : 'fa-user-plus'}`} aria-hidden="true"></i>
                            <span>{canAccessDashboard || isAuthenticated ? 'Masuk Dashboard' : 'Mulai Pendaftaran'}</span>
                        </Link>
                    </section>
                </div>
            </main>

            {/* ══ FOOTER ══ */}
            <footer className="mt-20 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#11100e] py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#78716c] dark:text-[#a8a29e]">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#c0392b]"></span>
                        <span>{event.name} &copy; {new Date().getFullYear()} Persaudaraan Shorinji Kempo Indonesia</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/" className="hover:text-[#c0392b] transition-colors">
                            Portal Utama
                        </Link>
                        <span>&middot;</span>
                        <Link href={isAuthenticated ? dashboardHref : '/login'} className="hover:text-[#c0392b] transition-colors">
                            {isAuthenticated ? 'Masuk Dashboard' : 'Login Sistem'}
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
