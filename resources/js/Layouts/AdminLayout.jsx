import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Avatar, CommandPalette } from '@/Components/UI';
import ContingentLayout from '@/Layouts/ContingentLayout';
import PanelSidebar from '@/Components/UI/Navigation/PanelSidebar';

export default function AdminLayout({ children, title = 'Admin Dashboard', auth = {} }) {
    const { url, props } = usePage();
    const isDashboard = url === '/admin/dashboard';
    const isRegistration = url.startsWith('/admin/pendaftaran/registrasi');
    const isMatchGroups = url.startsWith('/admin/pendaftaran/nomor-pertandingan');
    const isVerification = url.startsWith('/admin/pendaftaran/verifikasi');
    const isDrawing = url.startsWith('/admin/pertandingan/drawing');
    const isMerge = url.startsWith('/admin/pertandingan/merge');
    const isReferee = url.startsWith('/admin/arbitrase/wasit');
    const isAssignment = url.startsWith('/admin/arbitrase/penugasan');
    const isScoring = url.startsWith('/admin/arbitrase/scoring');
    const isMedals = url.startsWith('/admin/laporan/hasil');
    const isRecap = url.startsWith('/admin/laporan/rekap-embu');
    const isEventMaster = url.startsWith('/admin/master/event');
    const isContingentMaster = url.startsWith('/admin/master/contingent');
    const isAthleteMaster = url.startsWith('/admin/master/athlete');
    const isOfficialMaster = url.startsWith('/admin/master/official');
    const isKyuMaster = url.startsWith('/admin/master/kyu');
    const isTechniqueMaster = url.startsWith('/admin/master/technique');
    const isWeightClassMaster = url.startsWith('/admin/master/weight-class');
    const isPaymentMethodMaster = url.startsWith('/admin/master/payment-method');
    const isRefereeMaster = url.startsWith('/admin/master/referee');
    const isClerkMaster = url.startsWith('/admin/master/clerk');
    const isFieldCoordinatorMaster = url.startsWith('/admin/master/field-coordinator');
    const isUserMaster = url.startsWith('/admin/master/user');

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [openSections, setOpenSections] = useState({
        pendaftaran: true,
        master: isEventMaster || isContingentMaster || isAthleteMaster || isOfficialMaster || isKyuMaster || isTechniqueMaster || isWeightClassMaster || isPaymentMethodMaster || isRefereeMaster || isClerkMaster || isFieldCoordinatorMaster || isUserMaster,
        pertandingan: isDrawing || isMerge,
        arbitrase: isReferee || isAssignment || isScoring,
        laporan: isMedals || isRecap,
    });

    const toggleSection = (section) => {
        setOpenSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const user = auth.user || props.auth?.user || {
        name: 'Administrator Perkemi',
        email: 'admin@smart-perkemi.id',
        roles: ['Super Admin'],
    };
    const tenant = props.tenant?.event || null;
    const isFullAdmin = user.roles?.some((role) => ['Super Admin', 'Admin'].includes(role));
    const isRestrictedTenant = Boolean(tenant) && !isFullAdmin;
    const isResponsibleTenant = tenant?.access_role === 'responsible';
    const requestedEventId = new URLSearchParams(url.split('?')[1] || '').get('event_id');
    const currentEventId = tenant?.id
        || props.activeEvent?.id
        || props.registration?.event?.id
        || props.event?.id
        || requestedEventId;
    const withEventContext = (path) => currentEventId
        ? `${path}?event_id=${encodeURIComponent(currentEventId)}`
        : path;

    const initials = user.name ? user.name.substring(0, 2).toUpperCase() : 'AD';
    const tenantCommandIds = new Set([
        'dashboard',
        'master-event',
        'master-contingent',
        'master-athlete',
        'master-official',
        'registrasi',
        'nomor-pertandingan',
        'verifikasi',
        'drawing',
        'merge',
        'wasit',
        'penugasan',
        'scoring',
        'medali',
        'rekap',
        'website',
    ]);
    const responsibleTenantHiddenCommandIds = new Set([
        'master-contingent',
        'master-athlete',
        'master-official',
    ]);

    // Commands for CommandPalette
    const adminCommands = [
        {
            id: 'dashboard',
            title: 'Dashboard Overview',
            subtitle: 'Ringkasan statistik kejuaraan & grafik',
            category: 'Utama',
            icon: <i className="fa-solid fa-gauge-high"></i>,
            onSelect: () => router.visit('/admin/dashboard'),
        },
        {
            id: 'master-event',
            title: 'Master Event / Acara Kejuaraan',
            subtitle: 'Kelola data event, status & kejuaraan aktif',
            category: 'Master Data',
            icon: <i className="fa-solid fa-calendar-check text-[#d4a843]"></i>,
            onSelect: () => router.visit(tenant ? '/admin/master/event/detail' : '/admin/master/event'),
        },
        {
            id: 'master-contingent',
            title: 'Master Data Kontingen',
            subtitle: 'Daftar kontingen cabang/dojo & manajer',
            category: 'Master Data',
            icon: <i className="fa-solid fa-flag text-[#d4a843]"></i>,
            onSelect: () => router.visit('/admin/master/contingent'),
        },
        {
            id: 'master-athlete',
            title: 'Master Data Atlet & Kenshi',
            subtitle: 'Daftar kenshi, kyu/dan, dan data fisik BB/TB',
            category: 'Master Data',
            icon: <i className="fa-solid fa-users text-[#d4a843]"></i>,
            onSelect: () => router.visit('/admin/master/athlete'),
        },
        {
            id: 'master-kyu',
            title: 'Master Tingkatan Kyu & Dan',
            subtitle: 'Referensi tingkatan sabuk untuk kenshi dan nomor pertandingan',
            category: 'Master Data',
            icon: <i className="fa-solid fa-ranking-star text-[#d4a843]"></i>,
            onSelect: () => router.visit('/admin/master/kyu'),
        },
        { id: 'master-technique', title: 'Master Teknik', subtitle: 'Katalog teknik berdasarkan tingkatan Kyu', category: 'Master Data', icon: <i className="fa-solid fa-hand-fist text-[#d4a843]"></i>, onSelect: () => router.visit('/admin/master/technique') },
        { id: 'master-weight-class', title: 'Master Berat Badan', subtitle: 'Kelas berat Randori untuk nomor pertandingan', category: 'Master Data', icon: <i className="fa-solid fa-weight-scale text-[#d4a843]"></i>, onSelect: () => router.visit('/admin/master/weight-class') },
        { id: 'master-payment-method', title: 'Master Metode Pembayaran', subtitle: 'Rekening dan kanal pembayaran biaya pendaftaran', category: 'Master Data', icon: <i className="fa-solid fa-money-check-dollar text-[#d4a843]"></i>, onSelect: () => router.visit('/admin/master/payment-method') },
        { id: 'master-referee', title: 'Master Data Wasit', subtitle: 'Direktori wasit dan juri untuk penugasan event', category: 'Master Data', icon: <i className="fa-solid fa-scale-balanced text-[#d4a843]"></i>, onSelect: () => router.visit('/admin/master/referee') },
        { id: 'master-clerk', title: 'Master Data Panitera', subtitle: 'Direktori panitera meja untuk penugasan event', category: 'Master Data', icon: <i className="fa-solid fa-clipboard-list text-[#d4a843]"></i>, onSelect: () => router.visit('/admin/master/clerk') },
        { id: 'master-field-coordinator', title: 'Master Koordinator Lapangan', subtitle: 'Direktori koordinator lapangan untuk event', category: 'Master Data', icon: <i className="fa-solid fa-people-group text-[#d4a843]"></i>, onSelect: () => router.visit('/admin/master/field-coordinator') },
        {
            id: 'master-official',
            title: 'Master Data Official',
            subtitle: 'Daftar manajer, pelatih, asisten, dan medis kontingen',
            category: 'Master Data',
            icon: <i className="fa-solid fa-id-badge text-[#d4a843]"></i>,
            onSelect: () => router.visit('/admin/master/official'),
        },
        {
            id: 'master-user',
            title: 'Master Pengguna & Hak Akses Role',
            subtitle: 'Kelola akun panitia, wasit, dan kontingen',
            category: 'Master Data',
            icon: <i className="fa-solid fa-user-gear text-[#d4a843]"></i>,
            onSelect: () => router.visit('/admin/master/user'),
        },
        {
            id: 'registrasi',
            title: 'Registrasi Kontingen',
            subtitle: 'Daftar & status pendaftaran seluruh kontingen',
            category: 'Pendaftaran',
            icon: <i className="fa-solid fa-file-signature text-[#d4a843]"></i>,
            onSelect: () => router.visit(withEventContext('/admin/pendaftaran/registrasi')),
        },
        {
            id: 'nomor-pertandingan',
            title: 'Nomor dan Kelompok Pertandingan',
            subtitle: 'Kelola tim Embu dan teknik setiap kontingen',
            category: 'Pendaftaran',
            icon: <i className="fa-solid fa-people-group text-[#d4a843]"></i>,
            onSelect: () => router.visit(withEventContext('/admin/pendaftaran/nomor-pertandingan')),
        },
        {
            id: 'verifikasi',
            title: 'Verifikasi Atlet & Dokumen',
            subtitle: 'Periksa keabsahan KTA, akta, dan foto atlet',
            category: 'Pendaftaran',
            icon: <i className="fa-solid fa-user-check text-[#d4a843]"></i>,
            onSelect: () => router.visit(withEventContext('/admin/pendaftaran/verifikasi')),
        },
        {
            id: 'drawing',
            title: 'Drawing & Bagan Pertandingan',
            subtitle: 'Pengundian nomor bagan tanding Embu & Randori',
            category: 'Pertandingan',
            icon: <i className="fa-solid fa-dice text-[#d4a843]"></i>,
            onSelect: () => router.visit(withEventContext('/admin/pertandingan/drawing')),
        },
        {
            id: 'merge',
            title: 'Merge Nomer Pertandingan',
            subtitle: 'Penggabungan kelas tanding kurang kuota',
            category: 'Pertandingan',
            icon: <i className="fa-solid fa-object-group text-[#d4a843]"></i>,
            onSelect: () => router.visit(withEventContext('/admin/pertandingan/merge')),
        },
        {
            id: 'wasit',
            title: 'Data Wasit & Juri',
            subtitle: 'Daftar wasit terverifikasi & sertifikasi Dan',
            category: 'Arbitrase',
            icon: <i className="fa-solid fa-gavel text-[#d4a843]"></i>,
            onSelect: () => router.visit('/admin/arbitrase/wasit'),
        },
        {
            id: 'penugasan',
            title: 'Penugasan Wasit Tatami',
            subtitle: 'Penempatan wasit utama & dewan juri court',
            category: 'Arbitrase',
            icon: <i className="fa-solid fa-users-gear text-[#d4a843]"></i>,
            onSelect: () => router.visit('/admin/arbitrase/penugasan'),
        },
        {
            id: 'scoring',
            title: 'Penilaian (Scoring Digital)',
            subtitle: 'Sistem input poin wasit juri pertandingan',
            category: 'Arbitrase',
            icon: <i className="fa-solid fa-star text-[#d4a843]"></i>,
            onSelect: () => router.visit('/admin/arbitrase/scoring'),
        },
        {
            id: 'medali',
            title: 'Perolehan Medali & Juara',
            subtitle: 'Klasemen perolehan emas, perak, dan perunggu',
            category: 'Laporan',
            icon: <i className="fa-solid fa-medal text-[#d4a843]"></i>,
            onSelect: () => router.visit('/admin/laporan/hasil'),
        },
        {
            id: 'rekap',
            title: 'Rekapitulasi Embu & Randori',
            subtitle: 'Arsip seluruh hasil laga kejuaraan',
            category: 'Laporan',
            icon: <i className="fa-solid fa-chart-bar text-[#d4a843]"></i>,
            onSelect: () => router.visit('/admin/laporan/rekap-embu'),
        },
        {
            id: 'website',
            title: 'Kembali ke Website Utama',
            subtitle: 'Lihat beranda publik',
            category: 'Sistem',
            icon: <i className="fa-solid fa-globe"></i>,
            onSelect: () => router.visit('/'),
        },
    ].filter((command) => (
        (!isRestrictedTenant || tenantCommandIds.has(command.id))
        && (!isResponsibleTenant || !responsibleTenantHiddenCommandIds.has(command.id))
    ));

    // Close mobile sidebar on resize to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 1024) {
                setSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = (e) => {
        e.preventDefault();
        router.post('/logout');
    };

    const isContingentAccount = user.roles?.some((role) => ['kontingen', 'Contingent'].includes(role)) && !isFullAdmin;

    if (isContingentAccount) {
        const pageEvent = tenant || props.registration?.event || props.activeEvent || null;
        const pageContingent = props.registration?.contingent || props.contingent || { name: 'Kontingen' };

        return (
            <ContingentLayout
                title={title}
                portal={{
                    event: pageEvent,
                    contingent: pageContingent,
                    event_options: pageEvent ? [pageEvent] : [],
                }}
            >
                {children}
            </ContingentLayout>
        );
    }

    return (
        <>
            <Head title={`${title} | Smart Perkemi`} />

            <div className="min-h-screen bg-[#f7f4ef] text-[#0f0d0b] font-dm flex flex-col antialiased">
                <PanelSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
                    {tenant && (
                        <div className="mx-3 mt-3 rounded-xl border border-[#d4a843]/30 bg-[#d4a843]/10 p-2.5">
                            <Link
                                href="/admin/master/event/detail"
                                className="flex items-center gap-3 text-left transition-colors hover:opacity-90"
                            >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#d4a843]/20 text-[#f0c060]">
                                    <i className="fa-solid fa-trophy text-xs" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[11px] font-semibold text-white">{tenant.name}</span>
                                    <span className="mt-0.5 block truncate text-[9.5px] uppercase tracking-wide text-[#d4a843]">Mode Event · {tenant.city}</span>
                                </span>
                            </Link>

                            <div className="mt-2 pt-2 border-t border-[#d4a843]/20 flex items-center justify-between text-[10px]">
                                {tenant.slug && (
                                    <a
                                        href={`/event/${tenant.slug}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[#f0c060] hover:underline flex items-center gap-1"
                                    >
                                        <i className="fa-solid fa-globe text-[9px]"></i>
                                        <span>Lihat Publik</span>
                                    </a>
                                )}
                                {isFullAdmin && (
                                    <button
                                        type="button"
                                        onClick={() => router.post('/admin/tenant/exit')}
                                        className="text-white/60 hover:text-white flex items-center gap-1 cursor-pointer"
                                        title="Kembali ke Mode Admin Global"
                                    >
                                        <i className="fa-solid fa-arrow-right-from-bracket text-[9px]"></i>
                                        <span>Keluar Event</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Navigation Items (Scrollable) */}
                    <nav className="flex-1 px-0 py-3 overflow-y-auto space-y-0.5 text-[13px] custom-scrollbar">
                        {/* Dashboard Link */}
                        <Link
                            href="/admin/dashboard"
                            className={`flex items-center gap-3 px-6 py-2.5 text-[13px] transition-colors ${
                                isDashboard
                                    ? 'border-l-3 border-[#e74c3c] bg-[#c0392b]/20 text-[#f0c060] font-medium'
                                    : 'text-white/80 font-medium hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <i className="fa-solid fa-gauge-high w-4 text-[13px]"></i>
                            <span>{tenant ? 'Dashboard Event' : 'Dashboard'}</span>
                        </Link>

                        {/* Pendaftaran Section */}
                        <div className="border-t border-white/5 mt-1 pt-1">
                            <button
                                type="button"
                                onClick={() => toggleSection('pendaftaran')}
                                className="w-full flex items-center justify-between px-6 py-2 text-[10px] uppercase font-bold tracking-wider text-[#b5afa6]/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <span>Pendaftaran</span>
                                <i className={`fa-solid fa-chevron-right text-[8px] transition-transform ${openSections.pendaftaran ? 'rotate-90 text-[#d4a843]' : ''}`}></i>
                            </button>
                            {openSections.pendaftaran && (
                                <div className="space-y-0.5 pl-2">
                                    <Link
                                        href={withEventContext('/admin/pendaftaran/registrasi')}
                                        className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${
                                            isRegistration
                                                ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                : 'text-white/65 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <i className={`fa-solid fa-file-signature w-4 text-[11px] ${isRegistration ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                        <span>Registrasi Kontingen</span>
                                    </Link>
                                    <Link
                                        href={withEventContext('/admin/pendaftaran/nomor-pertandingan')}
                                        className={`flex items-center gap-3 px-6 py-2 text-[12.5px] leading-snug transition-colors ${
                                            isMatchGroups
                                                ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                : 'text-white/65 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <i className={`fa-solid fa-people-group w-4 shrink-0 text-[11px] ${isMatchGroups ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                        <span>Nomor dan Kelompok Pertandingan</span>
                                    </Link>
                                    <Link
                                        href={withEventContext('/admin/pendaftaran/verifikasi')}
                                        className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${
                                            isVerification
                                                ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                : 'text-white/65 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <i className={`fa-solid fa-user-check w-4 text-[11px] ${isVerification ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                        <span>Verifikasi Atlet</span>
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Pertandingan Section */}
                        <div className="border-t border-white/5 mt-1 pt-1">
                            <button
                                type="button"
                                onClick={() => toggleSection('pertandingan')}
                                className="w-full flex items-center justify-between px-6 py-2 text-[10px] uppercase font-bold tracking-wider text-[#b5afa6]/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <span>Pertandingan</span>
                                <i className={`fa-solid fa-chevron-right text-[8px] transition-transform ${openSections.pertandingan ? 'rotate-90 text-[#d4a843]' : ''}`}></i>
                            </button>
                            {openSections.pertandingan && (
                                <div className="space-y-0.5 pl-2">
                                    <Link
                                        href={withEventContext('/admin/pertandingan/drawing')}
                                        className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${
                                            isDrawing
                                                ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                : 'text-white/65 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <i className={`fa-solid fa-dice w-4 text-[11px] ${isDrawing ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                        <span>Drawing & Bagan TM</span>
                                    </Link>
                                    <Link
                                        href={withEventContext('/admin/pertandingan/merge')}
                                        className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${
                                            isMerge
                                                ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                : 'text-white/65 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <i className={`fa-solid fa-object-group w-4 text-[11px] ${isMerge ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                        <span>Merge Nomer Pertandingan</span>
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Sistem Arbitrase & Panitera Section */}
                        <div className="border-t border-white/5 mt-1 pt-1">
                            <button
                                type="button"
                                onClick={() => toggleSection('arbitrase')}
                                className="w-full flex items-center justify-between px-6 py-2 text-[10px] uppercase font-bold tracking-wider text-[#b5afa6]/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <span>Arbitrase & Wasit</span>
                                <i className={`fa-solid fa-chevron-right text-[8px] transition-transform ${openSections.arbitrase ? 'rotate-90 text-[#d4a843]' : ''}`}></i>
                            </button>
                            {openSections.arbitrase && (
                                <div className="space-y-0.5 pl-2">
                                    <Link
                                        href="/admin/arbitrase/wasit"
                                        className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${
                                            isReferee
                                                ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                : 'text-white/65 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <i className={`fa-solid fa-gavel w-4 text-[11px] ${isReferee ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                        <span>Data Wasit & Juri</span>
                                    </Link>
                                    <Link
                                        href="/admin/arbitrase/penugasan"
                                        className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${
                                            isAssignment
                                                ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                : 'text-white/65 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <i className={`fa-solid fa-users-gear w-4 text-[11px] ${isAssignment ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                        <span>Penugasan Wasit</span>
                                    </Link>
                                    <Link
                                        href="/admin/arbitrase/scoring"
                                        className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${
                                            isScoring
                                                ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                : 'text-white/65 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <i className={`fa-solid fa-star w-4 text-[11px] ${isScoring ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                        <span>Penilaian (Scoring)</span>
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Laporan Section */}
                        <div className="border-t border-white/5 mt-1 pt-1">
                            <button
                                type="button"
                                onClick={() => toggleSection('laporan')}
                                className="w-full flex items-center justify-between px-6 py-2 text-[10px] uppercase font-bold tracking-wider text-[#b5afa6]/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <span>Laporan & Hasil</span>
                                <i className={`fa-solid fa-chevron-right text-[8px] transition-transform ${openSections.laporan ? 'rotate-90 text-[#d4a843]' : ''}`}></i>
                            </button>
                            {openSections.laporan && (
                                <div className="space-y-0.5 pl-2">
                                    <Link
                                        href="/admin/laporan/hasil"
                                        className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${
                                            isMedals
                                                ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                : 'text-white/65 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <i className={`fa-solid fa-medal w-4 text-[11px] ${isMedals ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                        <span>Hasil Juara & Medali</span>
                                    </Link>
                                    <Link
                                        href="/admin/laporan/rekap-embu"
                                        className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${
                                            isRecap
                                                ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                : 'text-white/65 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <i className={`fa-solid fa-chart-bar w-4 text-[11px] ${isRecap ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                        <span>Rekapitulasi Embu & Randori</span>
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Master Data Section */}
                        <div className="border-t border-white/5 mt-1 pt-1">
                            <button
                                type="button"
                                onClick={() => toggleSection('master')}
                                className="w-full flex items-center justify-between px-6 py-2 text-[10px] uppercase font-bold tracking-wider text-[#b5afa6]/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <span>Master Data</span>
                                <i className={`fa-solid fa-chevron-right text-[8px] transition-transform ${openSections.master ? 'rotate-90 text-[#d4a843]' : ''}`}></i>
                            </button>
                            {openSections.master && (
                                <div className="space-y-0.5 pl-2">
                                    <Link
                                        href={tenant ? '/admin/master/event/detail' : '/admin/master/event'}
                                        className={`flex items-center justify-between px-6 py-2 text-[12.5px] transition-colors ${
                                            isEventMaster
                                                ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                : 'text-white/65 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <i className={`fa-solid fa-calendar-check w-4 text-[11px] ${isEventMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                            <span>Data Event / Acara</span>
                                        </div>
                                        {isEventMaster && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#d4a843]/20 text-[#f0c060] font-semibold">
                                                Aktif
                                            </span>
                                        )}
                                    </Link>
                                    {!isResponsibleTenant && (
                                        <>
                                            <Link
                                                href="/admin/master/contingent"
                                                className={`flex items-center justify-between px-6 py-2 text-[12.5px] transition-colors ${
                                                    isContingentMaster
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <i className={`fa-solid fa-flag w-4 text-[11px] ${isContingentMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Data Kontingen</span>
                                                </div>
                                                {isContingentMaster && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#d4a843]/20 text-[#f0c060] font-semibold">
                                                        Aktif
                                                    </span>
                                                )}
                                            </Link>
                                            <Link
                                                href="/admin/master/athlete"
                                                className={`flex items-center justify-between px-6 py-2 text-[12.5px] transition-colors ${
                                                    isAthleteMaster
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <i className={`fa-solid fa-users w-4 text-[11px] ${isAthleteMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Data Atlet & Kenshi</span>
                                                </div>
                                                {isAthleteMaster && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#d4a843]/20 text-[#f0c060] font-semibold">
                                                        Aktif
                                                    </span>
                                                )}
                                            </Link>
                                            <Link
                                                href="/admin/master/official"
                                                className={`flex items-center justify-between px-6 py-2 text-[12.5px] transition-colors ${
                                                    isOfficialMaster
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <i className={`fa-solid fa-id-badge w-4 text-[11px] ${isOfficialMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Data Official</span>
                                                </div>
                                                {isOfficialMaster && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#d4a843]/20 text-[#f0c060] font-semibold">
                                                        Aktif
                                                    </span>
                                                )}
                                            </Link>
                                        </>
                                    )}
                                    {!isRestrictedTenant && <>
                                    <Link
                                        href="/admin/master/kyu"
                                        className={`flex items-center justify-between px-6 py-2 text-[12.5px] transition-colors ${
                                            isKyuMaster
                                                ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                : 'text-white/65 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <i className={`fa-solid fa-ranking-star w-4 text-[11px] ${isKyuMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                            <span>Master Kyu & Dan</span>
                                        </div>
                                        {isKyuMaster && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#d4a843]/20 text-[#f0c060] font-semibold">Aktif</span>
                                        )}
                                    </Link>
                                    <Link
                                        href="/admin/master/technique"
                                        className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isTechniqueMaster ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <i className={`fa-solid fa-hand-fist w-4 text-[11px] ${isTechniqueMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                        <span>Master Teknik</span>
                                    </Link>
                                    <Link
                                        href="/admin/master/weight-class"
                                        className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isWeightClassMaster ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <i className={`fa-solid fa-weight-scale w-4 text-[11px] ${isWeightClassMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                        <span>Master Berat Badan</span>
                                    </Link>
                                    <Link
                                        href="/admin/master/payment-method"
                                        className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isPaymentMethodMaster ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <i className={`fa-solid fa-money-check-dollar w-4 text-[11px] ${isPaymentMethodMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                        <span>Metode Pembayaran</span>
                                    </Link>
                                    <Link
                                        href="/admin/master/referee"
                                        className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isRefereeMaster ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <i className={`fa-solid fa-scale-balanced w-4 text-[11px] ${isRefereeMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                        <span>Master Data Wasit</span>
                                    </Link>
                                    <Link
                                        href="/admin/master/clerk"
                                        className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isClerkMaster ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <i className={`fa-solid fa-clipboard-list w-4 text-[11px] ${isClerkMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                        <span>Master Data Panitera</span>
                                    </Link>
                                    <Link href="/admin/master/field-coordinator" className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isFieldCoordinatorMaster ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]' : 'text-white/65 hover:text-white hover:bg-white/5'}`}><i className={`fa-solid fa-people-group w-4 text-[11px] ${isFieldCoordinatorMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i><span>Koordinator Lapangan</span></Link>
                                    <Link
                                        href="/admin/master/user"
                                        className={`flex items-center justify-between px-6 py-2 text-[12.5px] transition-colors ${
                                            isUserMaster
                                                ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                : 'text-white/65 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <i className={`fa-solid fa-user-gear w-4 text-[11px] ${isUserMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                            <span>Pengguna & Role</span>
                                        </div>
                                        {isUserMaster && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#d4a843]/20 text-[#f0c060] font-semibold">
                                                Aktif
                                            </span>
                                        )}
                                    </Link>
                                    </>}
                                </div>
                            )}
                        </div>

                        {/* Profile & Logout */}
                        <div className="border-t border-white/10 pt-2 mt-2">
                            <Link
                                href="/"
                                className="flex items-center gap-3 px-6 py-2 text-white/60 hover:text-white hover:bg-white/5 text-[12.5px] transition-colors"
                            >
                                <i className="fa-solid fa-globe w-4 text-[12px] text-[#d4a843]"></i>
                                <span>Lihat Website Utama</span>
                            </Link>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-6 py-2 text-[#e74c3c]/80 hover:text-[#e74c3c] hover:bg-white/5 text-[12.5px] transition-colors cursor-pointer text-left"
                            >
                                <i className="fa-solid fa-right-from-bracket w-4 text-[12px]"></i>
                                <span>Keluar Sistem</span>
                            </button>
                        </div>
                    </nav>
                </PanelSidebar>

                {/* ════ MAIN CONTENT CONTAINER ════ */}
                <div className="min-w-0 flex-1 flex flex-col overflow-x-hidden lg:ml-[260px]">
                    {/* Header Sticky Topbar */}
                    <header className="sticky top-0 z-40 h-16 bg-[#f7f4ef]/95 backdrop-blur-md border-b border-[#ede9e1] px-4 md:px-7 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            {/* Mobile Hamburger Toggle */}
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 rounded-lg text-[#0f0d0b] hover:bg-[#ede9e1] transition-colors cursor-pointer"
                                aria-label="Open Sidebar"
                            >
                                <i className="fa-solid fa-bars text-base"></i>
                            </button>

                            {/* Page Title */}
                            <h2 className="font-sans text-sm md:text-base font-semibold text-[#0f0d0b] flex items-center gap-1.5 tracking-tight">
                                <span>{title}</span>
                                <span className="text-[#c0392b] font-medium text-xs md:text-sm">/ Overview</span>
                            </h2>
                        </div>

                        {/* Topbar Right Actions */}
                        <div className="flex items-center gap-3">
                            {/* Search bar (Desktop) - opens CommandPalette */}
                            <button
                                type="button"
                                onClick={() => setCommandPaletteOpen(true)}
                                className="hidden sm:flex items-center bg-[#ede9e1] hover:bg-[#e4dfd5] border border-black/5 rounded-xl px-3 py-1.5 gap-2 text-xs transition-colors cursor-pointer"
                            >
                                <i className="fa-solid fa-magnifying-glass text-[#b5afa6]"></i>
                                <span className="w-36 md:w-48 text-left text-[#b5afa6]">
                                    Cari perintah, menu...
                                </span>
                                <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[#888] bg-white rounded border border-black/10">
                                    ⌘K
                                </kbd>
                            </button>

                            {/* Notification Bell */}
                            <button
                                type="button"
                                className="w-9 h-9 rounded-xl border border-black/5 bg-white flex items-center justify-center text-[#555] hover:bg-[#ede9e1] transition-colors relative cursor-pointer"
                                title="Notifikasi"
                            >
                                <i className="fa-solid fa-bell text-xs"></i>
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#c0392b]"></span>
                            </button>

                            {/* Profile Dropdown */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setProfileOpen(!profileOpen)}
                                    className="flex items-center gap-2 p-1 rounded-xl hover:bg-[#ede9e1] transition-colors cursor-pointer"
                                >
                                    <Avatar
                                        name={user.name}
                                        size="sm"
                                        shape="rounded"
                                    />
                                    <div className="hidden md:flex flex-col text-left text-xs">
                                        <span className="font-semibold text-[#0f0d0b] leading-tight">
                                            {user.name}
                                        </span>
                                        <span className="text-[10px] text-[#b5afa6]">
                                            {user.roles?.[0] || 'Administrator'}
                                        </span>
                                    </div>
                                    <i className={`fa-solid fa-chevron-down text-[10px] text-[#b5afa6] transition-transform ${profileOpen ? 'rotate-180' : ''}`}></i>
                                </button>

                                {/* Dropdown Menu */}
                                {profileOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setProfileOpen(false)}
                                        />
                                        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-[#ede9e1] shadow-xl overflow-hidden z-50 text-xs py-1">
                                            <div className="px-4 py-2.5 border-b border-[#ede9e1] bg-[#f7f4ef]">
                                                <p className="font-semibold text-[#0f0d0b] truncate">{user.name}</p>
                                                <p className="text-[10.5px] text-[#b5afa6] truncate">{user.email}</p>
                                            </div>
                                            <Link
                                                href="/"
                                                className="flex items-center gap-2.5 px-4 py-2 text-[#555] hover:bg-[#f7f4ef] hover:text-[#0f0d0b] transition-colors"
                                            >
                                                <i className="fa-solid fa-house text-xs text-[#b5afa6]"></i>
                                                <span>Beranda Utama</span>
                                            </Link>
                                            <a
                                                href="/preview-email"
                                                target="_blank"
                                                className="flex items-center gap-2.5 px-4 py-2 text-[#555] hover:bg-[#f7f4ef] hover:text-[#0f0d0b] transition-colors"
                                            >
                                                <i className="fa-solid fa-envelope-open-text text-xs text-[#d4a843]"></i>
                                                <span>Preview Email Kontingen</span>
                                            </a>
                                            <div className="border-t border-[#ede9e1] my-1" />
                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-2.5 px-4 py-2 text-[#c0392b] hover:bg-[#c0392b]/10 transition-colors text-left cursor-pointer"
                                            >
                                                <i className="fa-solid fa-right-from-bracket text-xs"></i>
                                                <span>Keluar</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Main Content Body */}
                    <main className="admin-main min-w-0 p-4 md:px-7 md:pt-7 md:pb-5">
                        {children}
                    </main>

                    {/* Footer */}
                    <footer className="px-7 py-3 text-center border-t border-[#ede9e1] text-[11px] text-[#b5afa6]">
                        © 2026 SMART-PERKEMI · Sistem Manajemen Kejuaraan Shorinji Kempo Indonesia. Seluruh hak cipta dilindungi.
                    </footer>
                </div>
            </div>

            {/* Global Admin Command Palette (Cmd+K) */}
            <CommandPalette
                isOpen={commandPaletteOpen}
                onClose={() => setCommandPaletteOpen(false)}
                items={adminCommands}
                placeholder="Ketik perintah atau navigasi menu admin..."
            />
        </>
    );
}
