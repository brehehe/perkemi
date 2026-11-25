import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState, useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import MedalBarChart from '@/Components/Charts/MedalBarChart';
import StatusDoughnutChart from '@/Components/Charts/StatusDoughnutChart';

// UI Design System Components
import {
    Card,
    CardHeading,
    Badge,
    Avatar,
    Button,
    Input,
    ProgressBar,
    Pagination,
    Feed,
    Modal,
    DescriptionList,
} from '@/Components/UI';

const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(val || 0);
};

const formatEventDates = (startDate, endDate) => {
    if (!startDate && !endDate) return 'Jadwal belum ditentukan';
    if (!endDate || startDate === endDate) {
        return new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return `${start.getDate()} – ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

export default function Dashboard({
    stats = {},
    monthlyAthletes = {},
    statusBreakdown = {},
    latestContingents = [],
    latestRegistrations = { data: [], links: [], from: 1, to: 1, total: 0, current_page: 1, last_page: 1 },
    medalStats = { gold: 0, silver: 0, bronze: 0 },
    medalDistribution = { labels: [], gold: [], silver: [], bronze: [], contingents: [] },
    todaySchedules = [],
    latestActivities = [],
    filters = {},
    activeEvent = null,
    eventOptions = [],
    canViewAllEvents = false,
    realtime = null,
    auth = {},
}) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [liveStatus, setLiveStatus] = useState(realtime ? 'Terhubung real-time' : 'Data operasional aktif');
    const refreshTimerRef = useRef(null);

    const { tenant } = usePage().props;
    const isEventMode = Boolean(
        tenant?.event ||
        (activeEvent && activeEvent.id && activeEvent.id !== 'all') ||
        (typeof window !== 'undefined' &&
            new URLSearchParams(window.location.search).get('event_id') &&
            new URLSearchParams(window.location.search).get('event_id') !== 'all')
    );

    const eventId = activeEvent?.id || (canViewAllEvents ? 'all' : '');
    const dashboardParams = (overrides = {}) => ({
        search: searchTerm || undefined,
        event_id: eventId || undefined,
        ...overrides,
    });

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(
            '/admin/dashboard',
            dashboardParams(),
            { preserveState: true, replace: true }
        );
    };

    const handleSearchReset = () => {
        setSearchTerm('');
        router.get('/admin/dashboard', dashboardParams({ search: undefined }), { preserveState: true, replace: true });
    };

    const handlePageChange = (page) => {
        router.get(
            '/admin/dashboard',
            dashboardParams({ page }),
            { preserveState: true, replace: true }
        );
    };

    const handleEventChange = (nextEventId) => {
        if (!nextEventId || nextEventId === 'all') {
            router.get('/admin/dashboard', { event_id: 'all' }, { preserveScroll: true, replace: true });
        } else {
            router.get('/admin/dashboard', { event_id: nextEventId }, { preserveScroll: true, replace: true });
        }
    };

    useEffect(() => {
        if (!window.Echo || !realtime?.channel || !realtime?.event) {
            setLiveStatus(realtime ? 'Reverb siap' : 'Ringkasan sistem');
            return undefined;
        }

        const channel = window.Echo.channel(realtime.channel);
        const refreshDashboard = () => {
            window.clearTimeout(refreshTimerRef.current);
            setLiveStatus('Menyinkronkan…');
            refreshTimerRef.current = window.setTimeout(() => {
                router.reload({
                    only: [
                        'stats', 'monthlyAthletes', 'statusBreakdown', 'latestContingents',
                        'latestRegistrations', 'medalStats', 'medalDistribution',
                        'todaySchedules', 'latestActivities',
                    ],
                    preserveScroll: true,
                    preserveState: true,
                    onFinish: () => setLiveStatus('Sinkron'),
                });
            }, 180);
        };

        channel.listen(realtime.event, refreshDashboard);
        setLiveStatus('Terhubung real-time');

        return () => {
            window.clearTimeout(refreshTimerRef.current);
            channel.stopListening(realtime.event);
            window.Echo.leave(realtime.channel);
        };
    }, [realtime?.channel, realtime?.event]);

    const totalMedals = (medalStats.gold || 0) + (medalStats.silver || 0) + (medalStats.bronze || 0);

    const getStatusBadgeVariant = (status) => {
        switch (status) {
            case 'verified':
                return 'green';
            case 'pending':
                return 'yellow';
            case 'rejected':
                return 'red';
            default:
                return 'gray';
        }
    };

    // Calculate max athletes for relative contingent progress without hardcoded magic numbers
    const maxAthletesInContingent = useMemo(() => {
        if (!latestContingents?.length) return 1;
        const maxVal = Math.max(...latestContingents.map((c) => c.athletes_count || 0));
        return maxVal > 0 ? maxVal : 1;
    }, [latestContingents]);

    // Format feed items with domain-aware martial arts iconography
    const feedItems = useMemo(() => {
        return (latestActivities || []).map((act, idx) => {
            const isRegistration = act.icon?.includes('user') || act.title?.toLowerCase().includes('registrasi');
            return {
                id: idx,
                title: act.title,
                description: act.desc,
                timestamp: act.time || 'Baru saja',
                icon: isRegistration ? (
                    <i className="fa-solid fa-user-check text-xs text-white" aria-hidden="true" />
                ) : (
                    <i className="fa-solid fa-medal text-xs text-white" aria-hidden="true" />
                ),
                iconBg: isRegistration ? 'bg-[#c0392b]' : 'bg-[#d4a843]',
            };
        });
    }, [latestActivities]);

    const pageTitle = isEventMode
        ? `Dashboard Event — ${activeEvent?.name}`
        : 'Dashboard Eksekutif Perkemi — Smart Perkemi';

    return (
        <AdminLayout auth={auth} title={isEventMode ? `Dashboard Event — ${activeEvent?.name}` : 'Dashboard Admin — Smart Perkemi'}>
            <Head title={pageTitle} />

            {/* ══════════════════════════════════════════════════════
                1. EXECUTIVE OPERATIONAL HERO HEADER
               ══════════════════════════════════════════════════════ */}
            <section className="mb-6 rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs p-5 md:p-6 transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                    {/* Left: Event Identity & Meta */}
                    <div className="min-w-0 flex-1">
                        {/* <div className="flex items-center gap-2.5 flex-wrap">
                            {isEventMode ? (
                                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                                    <span>{activeEvent?.status_label || 'Mode Event Operasional'}</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                    <i className="fa-solid fa-globe text-[#d4a843]" aria-hidden="true" />
                                    <span>Mode Global Perkemi</span>
                                </span>
                            )}

                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                <i className="fa-solid fa-wifi text-[10px] text-emerald-500" aria-hidden="true" />
                                <span>{liveStatus}</span>
                            </span>
                        </div> */}

                        <h1 className="mt-3 font-sans text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug text-balance">
                            {isEventMode ? activeEvent?.name : 'Konsol Eksekutif Seluruh Kejuaraan'}
                        </h1>

                        <div className="mt-2.5 flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-600 dark:text-slate-400">
                            {isEventMode ? (
                                <>
                                    <span className="inline-flex items-center gap-1.5">
                                        <i className="fa-solid fa-location-dot text-[#d4a843]" aria-hidden="true" />
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{activeEvent?.city || 'Lokasi Belum Diisi'}</span>
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <i className="fa-solid fa-calendar-days text-[#d4a843]" aria-hidden="true" />
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{formatEventDates(activeEvent?.start_date, activeEvent?.end_date)}</span>
                                    </span>
                                    {activeEvent?.slug && (
                                        <>
                                            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                                            <a
                                                href={`/event/${activeEvent.slug}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-[#b92f24] hover:underline font-semibold"
                                            >
                                                <span>Halaman Publik</span>
                                                <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" aria-hidden="true" />
                                            </a>
                                        </>
                                    )}
                                </>
                            ) : (
                                <p className="max-w-2xl text-xs leading-relaxed text-slate-600 dark:text-slate-400 text-pretty">
                                    Statistik agregat seluruh kejuaraan nasional, data atlet kenshi terdaftar, dan pemantauan verifikasi pendaftaran se-Indonesia.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right: Operational Quick Action Shortcuts */}
                    <div className="shrink-0 flex flex-wrap items-center gap-2.5">
                        {isEventMode ? (
                            <>
                                <Link
                                    href={`/admin/pendaftaran/verifikasi?event_id=${activeEvent?.id}`}
                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#c0392b] hover:bg-[#a93226] px-4 py-2 text-xs font-bold text-white shadow-2xs transition-all cursor-pointer"
                                >
                                    <i className="fa-solid fa-clipboard-check text-xs" aria-hidden="true" />
                                    <span>Verifikasi Berkas ({stats.pending_count || 0})</span>
                                </Link>

                                <Link
                                    href={`/admin/pertandingan/schedule?event_id=${activeEvent?.id}`}
                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-2xs cursor-pointer"
                                >
                                    <i className="fa-solid fa-calendar-alt text-[#d4a843] text-xs" aria-hidden="true" />
                                    <span>Jadwal & Bagan</span>
                                </Link>

                                <Link
                                    href={`/admin/laporan?report=champions&event_id=${activeEvent?.id}`}
                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-2xs cursor-pointer"
                                >
                                    <i className="fa-solid fa-trophy text-[#d4a843] text-xs" aria-hidden="true" />
                                    <span>Laporan Hasil</span>
                                </Link>
                            </>
                        ) : (
                            <div className="w-full sm:w-80">
                                <label htmlFor="global-event-picker" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                    Pilih Event Operasional:
                                </label>
                                <select
                                    id="global-event-picker"
                                    aria-label="Pilih event untuk masuk mode event"
                                    value={eventId === 'all' ? '' : eventId}
                                    onChange={(e) => handleEventChange(e.target.value)}
                                    className="w-full min-h-10 rounded-xl border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-[#d4a843] focus:outline-none focus:ring-2 focus:ring-[#d4a843]/20 cursor-pointer"
                                >
                                    <option value="" className="text-slate-900 bg-white dark:bg-slate-800">
                                        Pilih kejuaraan untuk dikelola…
                                    </option>
                                    {eventOptions.map((ev) => (
                                        <option key={ev.id} value={ev.id} className="text-slate-900 bg-white dark:bg-slate-800">
                                            {ev.name} {ev.city ? `(${ev.city})` : ''} {ev.is_active ? '· Aktif' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════
                2. PRIMARY KPI STATS GRID (4 COLUMNS)
               ══════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {/* 1. Total Atlet */}
                <div className="p-5 rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between transition-all hover:border-[#d4a843]/40">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {isEventMode ? 'Atlet Kenshi Terdaftar' : 'Total Atlet Nasional'}
                        </p>
                        <div className="w-9 h-9 rounded-xl bg-[#c0392b]/10 text-[#c0392b] flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-users text-sm" aria-hidden="true" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                            {new Intl.NumberFormat('id-ID').format(stats.total_athletes || 0)}
                        </h3>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {isEventMode ? `${stats.total_contingents || 0} Kontingen` : 'Lintas Event'}
                            </span>
                            <span>{isEventMode ? 'partisipasi aktif' : 'atlet terdata'}</span>
                        </div>
                    </div>
                </div>

                {/* 2. Total Kontingen */}
                <div className="p-5 rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between transition-all hover:border-[#d4a843]/40">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {isEventMode ? 'Kontingen Daerah' : 'Total Kejuaraan'}
                        </p>
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-[#f0c060] flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-flag text-sm" aria-hidden="true" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                            {isEventMode
                                ? new Intl.NumberFormat('id-ID').format(stats.total_contingents || 0)
                                : new Intl.NumberFormat('id-ID').format(eventOptions.length || 0)}
                        </h3>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {isEventMode ? `${stats.total_registrations || 0} Berkas` : `${eventOptions.filter((e) => e.is_active).length} Aktif`}
                            </span>
                            <span>{isEventMode ? 'terdaftar di sistem' : 'agenda turnamen'}</span>
                        </div>
                    </div>
                </div>

                {/* 3. Verifikasi Berkas */}
                <div className="p-5 rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between transition-all hover:border-[#d4a843]/40">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Verifikasi Berkas
                        </p>
                        <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-clipboard-check text-sm" aria-hidden="true" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                            {new Intl.NumberFormat('id-ID').format(stats.pending_count || 0)}
                        </h3>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span
                                className={`inline-flex items-center font-bold px-1.5 py-0.5 rounded-md ${stats.pending_count > 0
                                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                    }`}
                            >
                                {stats.pending_count > 0 ? `${stats.pending_count} Antrean` : 'Tuntas'}
                            </span>
                            <span className="truncate">{`${stats.verified_count || 0}/${stats.total_registrations || 0} (${stats.verification_rate || 0}%)`}</span>
                        </div>
                    </div>
                </div>

                {/* 4. Medali Diberikan */}
                <div className="p-5 rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between transition-all hover:border-[#d4a843]/40">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Medali Diberikan
                        </p>
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-medal text-sm" aria-hidden="true" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                            {new Intl.NumberFormat('id-ID').format(totalMedals)}
                        </h3>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                            <span className="text-amber-600 dark:text-amber-400 font-bold">{medalStats.gold || 0} E</span>
                            <span>·</span>
                            <span className="text-slate-500 dark:text-slate-300 font-bold">{medalStats.silver || 0} P</span>
                            <span>·</span>
                            <span className="text-amber-800 dark:text-amber-600 font-bold">{medalStats.bronze || 0} B</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════
                3. MODE GLOBAL EXCLUSIVE: EVENT CATALOG SELECTION GRID
               ══════════════════════════════════════════════════════ */}
            {!isEventMode && eventOptions.length > 0 && (
                <Card className="mb-6 border-[#ede9e1] dark:border-slate-800">
                    <CardHeading
                        title="Daftar Kejuaraan PERKEMI"
                        subtitle="Pilih kejuaraan di bawah untuk langsung mengelola pendaftaran, bagan, dan hasil pertandingan"
                        icon={<i className="fa-solid fa-trophy" aria-hidden="true" />}
                        action={
                            <Link
                                href="/admin/master/event"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8a631c] dark:text-[#f0c060] hover:underline"
                            >
                                <span>Katalog Lengkap Event</span>
                                <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true" />
                            </Link>
                        }
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {eventOptions.map((ev) => (
                            <div
                                key={ev.id}
                                className="rounded-xl border border-[#ede9e1] dark:border-slate-800 bg-[#fbfaf8] dark:bg-slate-800/40 p-4 flex flex-col justify-between hover:border-[#d4a843] dark:hover:border-[#d4a843]/60 transition-all group"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${ev.is_active
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${ev.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            {ev.is_active ? 'Event Aktif' : 'Persiapan / Selesai'}
                                        </span>
                                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                            {ev.city || 'Nasional'}
                                        </span>
                                    </div>

                                    <h4 className="font-sans text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#c0392b] dark:group-hover:text-[#f0c060] transition-colors line-clamp-2">
                                        {ev.name}
                                    </h4>

                                    <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <i className="fa-solid fa-calendar-alt text-[#b8860b] text-[10px]" aria-hidden="true" />
                                        <span>{formatEventDates(ev.start_date, ev.end_date)}</span>
                                    </p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-[#ede9e1] dark:border-slate-800/80 flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-slate-400">
                                        Kelola Operasional
                                    </span>
                                    <Link
                                        href={`/admin/dashboard?event_id=${ev.id}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#c0392b] hover:bg-[#a93226] transition-colors shadow-2xs"
                                    >
                                        <span>Buka Panel Event</span>
                                        <i className="fa-solid fa-chevron-right text-[9px]" aria-hidden="true" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* ══════════════════════════════════════════════════════
                4. CHARTS ROW (MEDAL DISTRIBUTION + REGISTRATION BREAKDOWN)
               ══════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                {/* Bar Chart: Medal Distribution (2 cols) */}
                <Card className="lg:col-span-2 flex flex-col justify-between border-[#ede9e1] dark:border-slate-800">
                    <CardHeading
                        title="Distribusi Medali Kontingen"
                        subtitle={isEventMode ? 'Perolehan medali emas, perak, dan perunggu kontingen teratas' : 'Akumulasi medali lintas kontingen'}
                        icon={<i className="fa-solid fa-chart-column" aria-hidden="true" />}
                    />

                    {medalDistribution.labels?.length > 0 ? (
                        <div className="w-full min-h-[290px] flex-1">
                            <MedalBarChart
                                labels={medalDistribution.labels}
                                gold={medalDistribution.gold}
                                silver={medalDistribution.silver}
                                bronze={medalDistribution.bronze}
                            />
                        </div>
                    ) : (
                        <div className="py-14 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
                                <i className="fa-solid fa-medal text-xl" aria-hidden="true" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-white">Belum Ada Catatan Medali</h4>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto text-pretty">
                                Medali akan otomatis terdistribusi setelah pertandingan babak final selesai dan diverifikasi panitera.
                            </p>
                        </div>
                    )}
                </Card>

                {/* Donut Chart: Registration Status (1 col) */}
                <Card className="flex flex-col justify-between border-[#ede9e1] dark:border-slate-800">
                    <CardHeading
                        title="Status Berkas Registrasi"
                        subtitle="Pemeriksaan berkas atlet & official"
                        icon={<i className="fa-solid fa-chart-pie" aria-hidden="true" />}
                    />

                    <div className="h-44 flex items-center justify-center my-2">
                        <StatusDoughnutChart
                            verified={statusBreakdown.verified || 0}
                            pending={statusBreakdown.pending || 0}
                            rejected={statusBreakdown.rejected || 0}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#27ae60] shrink-0" aria-hidden="true" />
                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                                Disetujui ({stats.verification_rate || 0}%)
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shrink-0" aria-hidden="true" />
                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                                Pending ({statusBreakdown.pending || 0})
                            </span>
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#e74c3c] shrink-0" aria-hidden="true" />
                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                                Ditolak / Revisi ({statusBreakdown.rejected || 0})
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* ══════════════════════════════════════════════════════
                5. REGISTRASI KONTINGEN TERBARU (TABLE SECTION)
               ══════════════════════════════════════════════════════ */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#ede9e1] dark:border-slate-800 shadow-2xs overflow-hidden mb-6">
                {/* Table Header / Toolbar */}
                <div className="p-5 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#ede9e1] dark:border-slate-800">
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="font-sans text-base md:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                                Registrasi Kontingen Terbaru
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#c0392b]/10 text-[#c0392b] dark:bg-[#c0392b]/20 dark:text-[#f0c060] border border-[#c0392b]/20 tabular-nums">
                                {latestRegistrations.total || 0} Berkas
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {isEventMode
                                ? `Daftar berkas pendaftaran kontingen yang masuk pada ${activeEvent?.name}`
                                : 'Daftar berkas kontingen terbaru lintas kejuaraan di sistem'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Search Input Bar */}
                        <form onSubmit={handleSearch} className="flex items-center gap-2">
                            <div className="w-56 sm:w-72">
                                <Input
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Cari kontingen, nomor..."
                                    iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                                    clearable
                                    onClear={handleSearchReset}
                                    size="sm"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => router.get('/admin/dashboard', dashboardParams(), { preserveState: true })}
                                className="inline-flex min-h-9 items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                                title="Segarkan data registrasi"
                                aria-label="Segarkan data registrasi"
                            >
                                <i className="fa-solid fa-rotate-right text-[11px]" aria-hidden="true" />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>
                        </form>
                    </div>
                </div>

                {/* Table Content */}
                <TableContainer ariaLabel="Tabel pendaftaran kontingen terbaru">
                    <table className="responsive-data-table whitespace-nowrap w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#fbfaf8] dark:bg-slate-800/70 border-b border-[#ede9e1] dark:border-slate-800 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider whitespace-nowrap">
                                <th scope="col" className="py-3 px-4 text-center w-12">#</th>
                                <th scope="col" className="py-3 px-4 min-w-[240px]">Kontingen</th>
                                <th scope="col" className="py-3 px-4 min-w-[140px]">Wilayah / Kota</th>
                                <th scope="col" className="py-3 px-4 min-w-[120px]">Tanggal Masuk</th>
                                <th scope="col" className="py-3 px-4 min-w-[130px]">Total Biaya</th>
                                <th scope="col" className="py-3 px-4 text-center w-32">Status</th>
                                <th scope="col" className="py-3 px-4 text-center w-20">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ede9e1]/80 dark:divide-slate-800/80 text-xs">
                            {latestRegistrations.data?.length > 0 ? (
                                latestRegistrations.data.map((reg, idx) => (
                                    <tr
                                        key={reg.id}
                                        className="hover:bg-[#fbfaf8] dark:hover:bg-slate-800/40 transition-colors group"
                                    >
                                        {/* Row Index */}
                                        <td className="py-3.5 px-4 text-center text-slate-400 dark:text-slate-500 font-mono text-[11px] whitespace-nowrap tabular-nums">
                                            {(latestRegistrations.from || 1) + idx}
                                        </td>

                                        {/* Kontingen */}
                                        <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-lg bg-[#c0392b]/10 text-[#c0392b] dark:bg-[#c0392b]/20 dark:text-[#f0c060] font-bold text-xs flex items-center justify-center shrink-0 border border-[#c0392b]/20"
                                                >
                                                    {(reg.contingent?.name || 'K').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedRegistration(reg)}
                                                        className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-[#c0392b] dark:group-hover:text-[#f0c060] transition-colors cursor-pointer truncate text-left"
                                                    >
                                                        {reg.contingent?.name || 'Kontingen'}
                                                    </button>
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 flex items-center gap-1 tabular-nums">
                                                        <i className="fa-solid fa-hashtag text-[8px] opacity-70" aria-hidden="true" />
                                                        <span>{reg.registration_number}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Wilayah / Kota */}
                                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <i className="fa-solid fa-location-dot text-[11px] text-[#c0392b]/80 shrink-0" aria-hidden="true" />
                                                <span className="truncate">{reg.contingent?.city || '-'}</span>
                                            </div>
                                        </td>

                                        {/* Tanggal */}
                                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap font-medium tabular-nums">
                                            <span>{reg.created_at}</span>
                                        </td>

                                        {/* Total Tagihan */}
                                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap tabular-nums">
                                            {reg.is_paid === false ? (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Gratis</span>
                                            ) : (
                                                formatRupiah(reg.final_amount)
                                            )}
                                        </td>

                                        {/* Status Badge */}
                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            {reg.status === 'verified' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                                                    Disetujui
                                                </span>
                                            ) : reg.status === 'pending' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                                                    Pending
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
                                                    {reg.status || 'Ditolak'}
                                                </span>
                                            )}
                                        </td>

                                        {/* Action Button */}
                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedRegistration(reg)}
                                                className="w-8 h-8 rounded-lg border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#c0392b] hover:text-white hover:border-[#c0392b] dark:hover:bg-[#c0392b] transition-all inline-flex items-center justify-center cursor-pointer shadow-2xs"
                                                title="Lihat Rincian Registrasi"
                                                aria-label="Lihat Rincian Registrasi"
                                            >
                                                <i className="fa-solid fa-eye text-xs" aria-hidden="true" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                                        <i className="fa-solid fa-inbox text-2xl mb-2 block opacity-40" aria-hidden="true" />
                                        Tidak ada berkas registrasi yang sesuai pencarian.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </TableContainer>

                {/* Pagination Controls */}
                {latestRegistrations.total > 0 && (
                    <Pagination
                        pagination={latestRegistrations}
                        label="registrasi"
                        onPageChange={handlePageChange}
                    />
                )}
            </div>

            {/* ══════════════════════════════════════════════════════
                6. LEADERBOARD & JADWAL / AGENDA OPERASIONAL
               ══════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                {/* Top Kontingen (Leaderboard) */}
                <Card className="border-[#ede9e1] dark:border-slate-800 flex flex-col justify-between">
                    <div>
                        <CardHeading
                            title="Klasemen Medali Kontingen"
                            subtitle={medalDistribution.ranking_label ? `Standar: ${medalDistribution.ranking_label}` : 'Peringkat perolehan medali (Emas > Perak > Perunggu)'}
                            icon={<i className="fa-solid fa-trophy" aria-hidden="true" />}
                        />

                        {/* Medal summary 3 cards */}
                        <div className="grid grid-cols-3 gap-2.5 mb-4">
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-white font-bold text-xs mb-1">
                                    <i className="fa-solid fa-medal" aria-hidden="true" />
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Emas</p>
                                <p className="font-sans font-black text-xl text-amber-700 dark:text-[#f0c060] mt-0.5 tabular-nums">
                                    {medalStats.gold || 0}
                                </p>
                            </div>
                            <div className="bg-slate-500/10 border border-slate-400/20 rounded-xl p-3 text-center">
                                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400 text-white font-bold text-xs mb-1">
                                    <i className="fa-solid fa-medal" aria-hidden="true" />
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Perak</p>
                                <p className="font-sans font-black text-xl text-slate-700 dark:text-slate-300 mt-0.5 tabular-nums">
                                    {medalStats.silver || 0}
                                </p>
                            </div>
                            <div className="bg-amber-800/10 border border-amber-800/20 rounded-xl p-3 text-center">
                                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-white font-bold text-xs mb-1">
                                    <i className="fa-solid fa-medal" aria-hidden="true" />
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Perunggu</p>
                                <p className="font-sans font-black text-xl text-amber-900 dark:text-amber-400 mt-0.5 tabular-nums">
                                    {medalStats.bronze || 0}
                                </p>
                            </div>
                        </div>

                        {/* Leaderboard list */}
                        <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/80">
                            {medalDistribution.contingents?.length > 0 ? (
                                medalDistribution.contingents.slice(0, 7).map((con, idx) => {
                                    const rank = con.rank || idx + 1;
                                    const isFirst = rank === 1;
                                    const isSecond = rank === 2;
                                    const isThird = rank === 3;

                                    return (
                                        <div key={con.id || idx} className="pt-2.5 pb-1 flex items-center gap-3">
                                            {/* Rank Badge */}
                                            <div className="w-7 text-center shrink-0">
                                                {isFirst ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs shadow-2xs tabular-nums">
                                                        1
                                                    </span>
                                                ) : isSecond ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400 text-white font-bold text-xs shadow-2xs tabular-nums">
                                                        2
                                                    </span>
                                                ) : isThird ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-bold text-xs shadow-2xs tabular-nums">
                                                        3
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-400 tabular-nums">
                                                        {rank}
                                                    </span>
                                                )}
                                            </div>

                                            <Avatar
                                                name={con.name}
                                                size="sm"
                                            />

                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                    {con.name}
                                                </h4>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                                                    <span className="text-amber-600 dark:text-amber-400 font-semibold">{con.gold_count} E</span> ·{' '}
                                                    <span className="text-slate-500 dark:text-slate-300 font-semibold">{con.silver_count} P</span> ·{' '}
                                                    <span className="text-amber-800 dark:text-amber-500 font-semibold">{con.bronze_count} B</span>
                                                </p>
                                            </div>

                                            <div className="font-sans font-bold text-xs sm:text-sm text-slate-900 dark:text-white shrink-0 tabular-nums">
                                                {con.total_points ?? con.total_score} <span className="text-[10px] text-slate-400 font-normal">Poin</span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-xs text-slate-400 italic text-center py-6">
                                    Belum ada data perolehan medali untuk ditampilkan.
                                </p>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Jadwal & Rundown Hari Ini */}
                <Card className="border-[#ede9e1] dark:border-slate-800 flex flex-col justify-between">
                    <div>
                        <CardHeading
                            title="Jadwal & Agenda Hari Ini"
                            subtitle="Rundown pertandingan dan sesi tatami aktif"
                            icon={<i className="fa-solid fa-calendar-day" aria-hidden="true" />}
                            action={
                                <Badge variant="gray">
                                    {new Date().toLocaleDateString('id-ID', {
                                        weekday: 'short',
                                        day: 'numeric',
                                        month: 'short',
                                    })}
                                </Badge>
                            }
                        />

                        <div className="space-y-3">
                            {todaySchedules?.length > 0 ? (
                                <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
                                    {todaySchedules.map((item, idx) => (
                                        <div key={item.id || idx} className="pt-3 first:pt-0 flex items-start gap-3">
                                            <div className="font-mono text-xs font-bold text-[#c0392b] dark:text-[#f0c060] min-w-14 pt-0.5 tabular-nums">
                                                {item.time}
                                            </div>
                                            <div className="w-2 h-2 rounded-full bg-[#c0392b] mt-1.5 shrink-0" aria-hidden="true" />
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                    {item.name}
                                                </h4>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{item.type}</span>
                                                    {item.description ? ` — ${item.description}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 px-4 text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                                        <i className="fa-solid fa-calendar-check text-xl" aria-hidden="true" />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">Tidak Ada Agenda Hari Ini</h4>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-pretty">
                                        Agenda pertandingan berlangsung sesuai jadwal resmi event. Buka menu jadwal untuk melihat rundown sesi dan bagan pertandingan lengkap.
                                    </p>
                                    {isEventMode && (
                                        <div className="mt-4">
                                            <Link
                                                href={`/admin/pertandingan/schedule?event_id=${activeEvent?.id}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#8a631c] dark:text-[#f0c060] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors shadow-2xs"
                                            >
                                                <span>Buka Jadwal & Bagan</span>
                                                <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true" />
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* ══════════════════════════════════════════════════════
                7. PARTISIPASI ATLET KONTINGEN & LOG AKTIVITAS
               ══════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Partisipasi Kontingen */}
                <Card className="border-[#ede9e1] dark:border-slate-800">
                    <CardHeading
                        title="Partisipasi Atlet per Kontingen"
                        subtitle="Distribusi jumlah kenshi/atlet terbanyak per kontingen daerah"
                        icon={<i className="fa-solid fa-bars-progress" aria-hidden="true" />}
                    />

                    <div className="space-y-3.5">
                        {latestContingents?.length > 0 ? (
                            latestContingents.map((con) => {
                                const count = con.athletes_count || 0;
                                const pct = Math.min(100, Math.round((count / maxAthletesInContingent) * 100));

                                return (
                                    <div key={con.id} className="space-y-1">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-xs">
                                                {con.name}
                                            </span>
                                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                                                <strong className="text-slate-800 dark:text-white font-bold">{count}</strong> atlet ({pct}%)
                                            </span>
                                        </div>
                                        <ProgressBar
                                            value={count}
                                            max={maxAthletesInContingent}
                                            variant="primary"
                                            size="sm"
                                        />
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-xs text-slate-400 italic text-center py-6">
                                Belum ada kontingen terdaftar.
                            </p>
                        )}
                    </div>
                </Card>

                {/* Aktivitas Terbaru with UI Feed */}
                <Card className="border-[#ede9e1] dark:border-slate-800">
                    <CardHeading
                        title="Log Aktivitas Terkini"
                        subtitle="Pembaruan pendaftaran kontingen dan hasil pertandingan"
                        icon={<i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />}
                    />

                    {feedItems.length > 0 ? (
                        <Feed items={feedItems} />
                    ) : (
                        <p className="text-xs text-slate-400 italic text-center py-6">
                            Belum ada aktivitas tercatat di log sistem.
                        </p>
                    )}
                </Card>
            </div>

            {/* ══════════════════════════════════════════════════════
                8. MODAL DETAIL REGISTRASI KONTINGEN
               ══════════════════════════════════════════════════════ */}
            <Modal
                isOpen={!!selectedRegistration}
                onClose={() => setSelectedRegistration(null)}
                title="Rincian Berkas Kontingen"
                subtitle={`Nomor: ${selectedRegistration?.registration_number || '-'}`}
                size="lg"
                footer={
                    <div className="flex items-center justify-end gap-2.5 w-full">
                        <Button
                            variant="secondary"
                            onClick={() => setSelectedRegistration(null)}
                        >
                            Tutup
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => router.visit(`/admin/pendaftaran/registrasi/${selectedRegistration.id}/detail`)}
                        >
                            <i className="fa-solid fa-arrow-up-right-from-square mr-1.5" aria-hidden="true" />
                            Buka Detail Pendaftaran
                        </Button>
                    </div>
                }
            >
                {selectedRegistration && (
                    <div className="space-y-4">
                        <DescriptionList
                            columns={2}
                            striped
                            items={[
                                { label: 'Nomor Registrasi', value: selectedRegistration.registration_number },
                                {
                                    label: 'Status Berkas',
                                    value: (
                                        <Badge variant={getStatusBadgeVariant(selectedRegistration.status)} dot>
                                            {selectedRegistration.status?.toUpperCase()}
                                        </Badge>
                                    ),
                                },
                                { label: 'Nama Kontingen', value: selectedRegistration.contingent?.name || '-' },
                                { label: 'Kota / Wilayah', value: selectedRegistration.contingent?.city || '-' },
                                { label: 'Manajer Kontingen', value: selectedRegistration.contingent?.manager_name || '-' },
                                { label: 'Nomor WhatsApp', value: selectedRegistration.contingent?.phone || '-' },
                                { label: 'Tanggal Masuk', value: selectedRegistration.created_at || '-' },
                                {
                                    label: 'Total Tagihan',
                                    value: selectedRegistration.is_paid === false
                                        ? 'Gratis'
                                        : formatRupiah(selectedRegistration.final_amount),
                                },
                            ]}
                        />

                        {selectedRegistration.contingent?.address && (
                            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                                <span className="font-bold block text-slate-900 dark:text-white mb-1">
                                    Alamat Dojo / Kontingen:
                                </span>
                                {selectedRegistration.contingent.address}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
}
