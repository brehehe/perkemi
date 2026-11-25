import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Avatar, CommandPalette, Notification, ThemeToggle } from '@/Components/UI';
import ContingentLayout from '@/Layouts/ContingentLayout';
import RefereeLayout from '@/Layouts/RefereeLayout';
import PanelSidebar from '@/Components/UI/Navigation/PanelSidebar';
import EventSwitcherModal from '@/Components/Admin/EventSwitcherModal';

const reportMenuItems = [
    { key: 'champions', title: 'Hasil Juara', subtitle: 'Susunan juara resmi per nomor pertandingan', icon: 'fa-trophy' },
    { key: 'category-recap', title: 'Rekap Per Nomor', subtitle: 'Rekapitulasi peserta, bagan, dan pemenang per nomor', icon: 'fa-layer-group' },
    { key: 'all-scores', title: 'Skor Menyeluruh', subtitle: 'Gabungan seluruh hasil Embu dan Randori', icon: 'fa-chart-line' },
    { key: 'embu-recap', title: 'Rekap Embu', subtitle: 'Nilai akhir, durasi, dan denda Embu', icon: 'fa-ranking-star' },
    { key: 'randori-recap', title: 'Rekap Randori', subtitle: 'Skor AKA-SHIRO dan pengesahan', icon: 'fa-hand-fist' },
    { key: 'referee-scores', title: 'Penilaian Wasit', subtitle: 'Rincian nilai 10 aspek per Wasit', icon: 'fa-user-shield' },
    { key: 'referee-analysis', title: 'Analisis Per Wasit', subtitle: 'Statistik dan kelengkapan penilaian', icon: 'fa-chart-column' },
    { key: 'embu-summary', title: 'Rekapitulasi Embu', subtitle: 'Matriks lima Juri dan nilai akhir', icon: 'fa-table-list' },
    { key: 'scoring-summary', title: 'Rekap Penilaian', subtitle: 'Ringkasan status seluruh penilaian', icon: 'fa-clipboard-check' },
    { key: 'medal-standings', title: 'Klasemen Medali', subtitle: 'Perolehan medali dan peringkat Juara Umum', icon: 'fa-medal' },
];

export default function AdminLayout({ children, title = 'Admin Dashboard', auth = {} }) {
    const { url, props } = usePage();
    const flash = props.flash || {};
    const [flashToast, setFlashToast] = useState(null);

    useEffect(() => {
        if (flash.success || flash.status) {
            setFlashToast({
                variant: 'success',
                title: 'Berhasil',
                message: flash.success || flash.status,
            });
        } else if (flash.error) {
            setFlashToast({
                variant: 'danger',
                title: 'Perhatian',
                message: flash.error,
            });
        }
    }, [flash.success, flash.error, flash.status]);

    const [currentPath, currentQuery = ''] = url.split('?');
    const currentSearchParams = new URLSearchParams(currentQuery);
    const activeReport = currentSearchParams.get('report') || 'champions';
    const isDashboard = currentPath === '/admin/dashboard';
    const isRegistration = url.startsWith('/admin/pendaftaran/registrasi');
    const isMatchGroups = url.startsWith('/admin/pendaftaran/nomor-pertandingan') && !url.startsWith('/admin/pendaftaran/nomor-pertandingan/laporan');
    const isMatchCategoriesReport = url.startsWith('/admin/pendaftaran/laporan-nomor-pertandingan') || url.startsWith('/admin/pendaftaran/nomor-pertandingan/laporan');
    const isVerification = url.startsWith('/admin/pendaftaran/verifikasi');
    const isDrawing = url.startsWith('/admin/pertandingan/drawing');
    const isSchedule = url.startsWith('/admin/pertandingan/jadwal');
    const isEventReferees = url.startsWith('/admin/pertandingan/wasit');
    const isMerge = url.startsWith('/admin/pertandingan/merge');
    const isWeighIn = url.startsWith('/admin/pertandingan/timbang-badan');
    const isReferee = url.startsWith('/admin/arbitrase/wasit');
    const isScoring = url.startsWith('/admin/arbitrase/scoring');
    const isEvaluation = url.startsWith('/admin/arbitrase/evaluasi');
    const isPaniteraCourtCoordinator = currentPath === '/admin/panitera' || url.startsWith('/admin/panitera?') || (url.startsWith('/admin/panitera') && !url.includes('/scoring'));
    const isCourtCoordinator = url.startsWith('/admin/koordinator-court') || url.startsWith('/admin/arbitrase/court-coordinator') || isPaniteraCourtCoordinator;
    const isPaniteraDashboard = url.startsWith('/admin/panitera/scoring') && !url.includes('/embu-result') && !url.includes('/randori-result') && !url.includes('/champions');
    const isPaniteraEmbu = url.startsWith('/admin/panitera/scoring/embu-result');
    const isPaniteraRandori = url.startsWith('/admin/panitera/scoring/randori-result');
    const isPaniteraChampions = url.startsWith('/admin/panitera/scoring/champions');
    const isReportHub = currentPath === '/admin/laporan';
    const isMedals = currentPath === '/admin/laporan/hasil';
    const isRecap = currentPath === '/admin/laporan/rekap-embu';
    const isEventMaster = url.startsWith('/admin/master/event');
    const isEventCatalog = currentPath === '/admin/master/event';
    const isEventDetail = currentPath.startsWith('/admin/master/event') && currentPath.includes('/detail');
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

    const user = auth.user || props.auth?.user || {
        name: 'Administrator Perkemi',
        email: 'admin@smart-perkemi.id',
        roles: ['Super Admin'],
    };
    const tenant = props.tenant?.event || null;
    const availableEvents = props.tenant?.available_events || [];
    const isFullAdmin = user.roles?.some((role) => ['Super Admin', 'Admin'].includes(role));
    const isPaniteraAccount = user.roles?.includes('Panitera') && !isFullAdmin;
    const isPertandinganCoordinator = user.roles?.includes('Pertandingan');
    const isCourtCoordinatorAccount = (user.roles?.includes('Koordinator Lapangan') || user.roles?.includes('Court'))
        && !isPertandinganCoordinator
        && !isFullAdmin;
    const isRestrictedTenant = Boolean(tenant) && !isFullAdmin;
    const isResponsibleTenant = tenant?.access_role === 'responsible';
    const requestedEventId = currentSearchParams.get('event_id');
    const currentEventId = tenant?.id
        || props.activeEvent?.id
        || props.registration?.event?.id
        || props.event?.id
        || (requestedEventId && requestedEventId !== 'all' ? requestedEventId : null);

    const isGlobalSection = Boolean(
        isEventCatalog ||
        isContingentMaster ||
        isAthleteMaster ||
        isOfficialMaster ||
        isKyuMaster ||
        isTechniqueMaster ||
        isWeightClassMaster ||
        isPaymentMethodMaster ||
        isRefereeMaster ||
        isClerkMaster ||
        isFieldCoordinatorMaster ||
        isUserMaster
    );

    const isEventMode = Boolean((tenant || currentEventId) && !isGlobalSection);
    const activeEventObj = tenant || props.activeEvent || props.event || null;
    const isViewerTenant = !isFullAdmin && Boolean(
        tenant?.access_role === 'viewer'
        || props.auth?.tenantAccessRole === 'viewer'
        || activeEventObj?.access_role === 'viewer'
        || user?.roles?.includes('Viewer')
        || user?.roles?.includes('viewer')
        || user?.role === 'Viewer'
    );

    const currentTab = currentSearchParams.get('tab') || '';
    const isDetailInfo = isEventDetail && (currentTab === 'info' || currentTab === '');
    const isDetailDates = isEventDetail && currentTab === 'dates';
    const isDetailFees = isEventDetail && currentTab === 'fees';
    const isDetailRules = isEventDetail && currentTab === 'participant_rules';
    const isDetailSync = isEventDetail && currentTab === 'sync';
    const isDetailAgeCat = isEventDetail && currentTab === 'age_categories';
    const isDetailMatches = isEventDetail && currentTab === 'matches';
    const isDetailCourts = isEventDetail && currentTab === 'courts';
    const isDetailRundown = isEventDetail && currentTab === 'rundown';
    const isDetailReferees = isEventDetail && currentTab === 'referees';
    const isDetailArbitration = isEventDetail && currentTab === 'arbitration';
    const isDetailRoster = isEventDetail && currentTab === 'officials_roster';
    const isDetailClerks = isEventDetail && currentTab === 'clerks';
    const isDetailCoordinators = isEventDetail && currentTab === 'field_coordinators';

    const isTrainingMode = Boolean(
        tenant?.is_training_mode
        || props.activeEvent?.is_training_mode
        || props.event?.is_training_mode
    );

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [isEventSwitcherOpen, setIsEventSwitcherOpen] = useState(false);

    // Mode Event section active flags
    const isPendaftaranActive = Boolean(isRegistration || isVerification || isWeighIn || isMatchGroups || isMatchCategoriesReport);
    const isPertandinganActive = Boolean(isDrawing || isSchedule || isMerge);
    const isWasitActive = Boolean(isReferee || isEventReferees || (url.startsWith('/admin/arbitrase') && !isPaniteraCourtCoordinator && !isCourtCoordinator));
    const isScoringActive = Boolean(isPaniteraCourtCoordinator || isPaniteraDashboard || isPaniteraEmbu || isPaniteraRandori || isCourtCoordinator);
    const isLaporanEventActive = Boolean(isPaniteraChampions || isReportHub || isMedals || isRecap);
    const isReportPage = Boolean(
        url.startsWith('/admin/laporan')
        || url.includes('/scoring/champions')
        || url.includes('/report')
        || isLaporanEventActive
    );
    const isViewerRestricted = Boolean(isViewerTenant && !isReportPage);
    const isInformasiEventActive = Boolean(isEventDetail);

    // Mode Global section active flags
    const isMasterGlobalActive = Boolean((isContingentMaster || isAthleteMaster || isOfficialMaster || isKyuMaster || isTechniqueMaster || isWeightClassMaster || isPaymentMethodMaster || isRefereeMaster || isClerkMaster || isFieldCoordinatorMaster || isUserMaster) && !isEventMode);

    const [openSections, setOpenSections] = useState({
        // Mode Event
        pendaftaran: isPendaftaranActive,
        pertandingan: isPertandinganActive,
        wasit: isWasitActive,
        scoring: isScoringActive,
        laporanEvent: isLaporanEventActive,
        informasiEvent: isInformasiEventActive,

        // Mode Global
        masterGlobal: isMasterGlobalActive,
    });

    // Auto-expand the active section whenever route/URL changes
    useEffect(() => {
        setOpenSections((prev) => {
            const next = { ...prev };
            if (isPendaftaranActive) next.pendaftaran = true;
            if (isPertandinganActive) next.pertandingan = true;
            if (isWasitActive) next.wasit = true;
            if (isScoringActive) next.scoring = true;
            if (isLaporanEventActive) next.laporanEvent = true;
            if (isInformasiEventActive) next.informasiEvent = true;
            if (isMasterGlobalActive) next.masterGlobal = true;
            return next;
        });
    }, [
        url,
        isPendaftaranActive,
        isPertandinganActive,
        isWasitActive,
        isScoringActive,
        isLaporanEventActive,
        isInformasiEventActive,
        isMasterGlobalActive,
        isViewerTenant,
    ]);

    const toggleSection = (section) => {
        setOpenSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };
    const withEventContext = (path) => {
        const [pathname, query = ''] = path.split('?');
        const searchParams = new URLSearchParams(query);

        if (currentEventId) {
            searchParams.set('event_id', currentEventId);
        }

        const queryString = searchParams.toString();

        return queryString ? `${pathname}?${queryString}` : pathname;
    };
    const reportHref = (report) => withEventContext(`/admin/laporan?report=${encodeURIComponent(report)}`);

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
        'schedule',
        'court-coordinator',
        'event-wasit',
        'merge',
        'wasit',
        'scoring',
        'panitera-court-coordinator',
        'panitera-dashboard',
        'panitera-embu',
        'panitera-randori',
        'panitera-champions',
        ...reportMenuItems.map((report) => `report-${report.key}`),
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
            id: 'laporan-nomor-pertandingan',
            title: 'Laporan Nomor Pertandingan & Teknik',
            subtitle: 'Rekap menyeluruh nomor tanding, susunan tim Embu, teknik, dan atlet',
            category: 'Pendaftaran',
            icon: <i className="fa-solid fa-clipboard-list text-[#d4a843]"></i>,
            onSelect: () => router.visit(withEventContext('/admin/pendaftaran/laporan-nomor-pertandingan')),
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
            id: 'schedule',
            title: 'Jadwal Pertandingan',
            subtitle: 'Atur waktu dan court pertandingan per event',
            category: 'Pertandingan',
            icon: <i className="fa-solid fa-calendar-days text-[#d4a843]"></i>,
            onSelect: () => router.visit(withEventContext('/admin/pertandingan/jadwal')),
        },
        {
            id: 'court-coordinator',
            title: 'Panel Koordinator Court',
            subtitle: 'Generate susunan 5 wasit dan rotasi arena per court',
            category: 'Koordinator Court',
            icon: <i className="fa-solid fa-chalkboard-user text-[#d4a843]"></i>,
            onSelect: () => router.visit(withEventContext('/admin/koordinator-court')),
        },
        {
            id: 'weigh-in',
            title: 'Penimbangan Badan Hari-H',
            subtitle: 'Input berat badan, status lolos/overweight, kunci sesi, dan berita acara',
            category: 'Pertandingan',
            icon: <i className="fa-solid fa-weight-scale text-[#d4a843]"></i>,
            onSelect: () => router.visit(withEventContext('/admin/pertandingan/timbang-badan')),
        },
        {
            id: 'event-wasit',
            title: 'Wasit Event & Absensi QR',
            subtitle: 'Akun, kehadiran, dan panel lima wasit per court',
            category: 'Pertandingan',
            icon: <i className="fa-solid fa-user-shield text-[#d4a843]"></i>,
            onSelect: () => router.visit(withEventContext('/admin/pertandingan/wasit')),
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
            onSelect: () => router.visit(withEventContext('/admin/arbitrase/wasit')),
        },
        {
            id: 'scoring',
            title: 'Laporan Hasil Penilaian',
            subtitle: 'Rekap draft dan nilai yang dikirim Wasit',
            category: 'Arbitrase',
            icon: <i className="fa-solid fa-chart-column text-[#d4a843]"></i>,
            onSelect: () => router.visit(withEventContext('/admin/arbitrase/scoring')),
        },
        {
            id: 'evaluasi-wasit',
            title: 'Evaluasi Wasit & Anti-Bias',
            subtitle: 'Analisis standar deviasi, trimmed rate, dan bias kedaerahan',
            category: 'Arbitrase',
            icon: <i className="fa-solid fa-scale-unbalanced text-[#d4a843]"></i>,
            onSelect: () => router.visit(withEventContext('/admin/arbitrase/evaluasi')),
        },
        {
            id: 'panitera-court-coordinator',
            title: 'Koordinator Court Panitera',
            subtitle: 'Rotasi wasit, kontrol partai, dan manajemen court panitera',
            category: 'Panitera',
            icon: <i className="fa-solid fa-chalkboard-user text-[#d4a843]"></i>,
            onSelect: () => router.visit(withEventContext('/admin/panitera')),
        },
        {
            id: 'panitera-dashboard',
            title: 'Pusat Kendali Panitera',
            subtitle: 'Antrean partai dan penugasan meja per event',
            category: 'Panitera',
            icon: <i className="fa-solid fa-clipboard-check text-[#d4a843]"></i>,
            onSelect: () => router.visit(withEventContext('/admin/panitera/scoring')),
        },
        {
            id: 'panitera-embu',
            title: 'Rekap Hasil Embu',
            subtitle: 'Verifikasi nilai, finalis, dan juara Embu',
            category: 'Panitera',
            icon: <i className="fa-solid fa-ranking-star text-[#d4a843]"></i>,
            onSelect: () => router.visit(withEventContext('/admin/panitera/scoring/embu-result')),
        },
        {
            id: 'panitera-randori',
            title: 'Hasil Randori',
            subtitle: 'Pengesahan skor dan pembaruan bagan Randori',
            category: 'Panitera',
            icon: <i className="fa-solid fa-hand-fist text-[#d4a843]"></i>,
            onSelect: () => router.visit(withEventContext('/admin/panitera/scoring/randori-result')),
        },
        {
            id: 'panitera-champions',
            title: 'Hasil Juara',
            subtitle: 'Generate dan sesuaikan juara per nomor pertandingan',
            category: 'Panitera',
            icon: <i className="fa-solid fa-trophy text-[#d4a843]"></i>,
            onSelect: () => router.visit(withEventContext('/admin/panitera/scoring/champions')),
        },
        ...reportMenuItems.map((report) => ({
            id: `report-${report.key}`,
            title: report.title,
            subtitle: report.subtitle,
            category: 'Laporan',
            icon: <i className={`fa-solid ${report.icon} text-[#d4a843]`}></i>,
            onSelect: () => router.visit(reportHref(report.key)),
        })),
        ...availableEvents.map((ev) => ({
            id: `switch-event-${ev.id}`,
            title: `Pindah Event: ${ev.name}`,
            subtitle: `${ev.city || 'Event'} · ${ev.assignment_label || ev.status_label || 'Tersedia'}`,
            category: 'Pindah Event',
            icon: <i className="fa-solid fa-arrows-rotate text-[#d4a843]"></i>,
            onSelect: () => {
                const currentTarget = window.location.pathname + window.location.search;
                router.visit(`/admin/event/${ev.id}/enter?target=${encodeURIComponent(currentTarget)}`);
            },
        })),
        ...(isFullAdmin ? [{
            id: 'switch-event-global',
            title: 'Kembali ke Mode Admin Global (Semua Event)',
            subtitle: 'Keluar dari konteks event spesifik',
            category: 'Pindah Event',
            icon: <i className="fa-solid fa-layer-group text-[#d4a843]"></i>,
            onSelect: () => router.post('/admin/tenant/exit'),
        }] : []),
        {
            id: 'website',
            title: 'Kembali ke Website Utama',
            subtitle: 'Lihat beranda publik',
            category: 'Sistem',
            icon: <i className="fa-solid fa-globe"></i>,
            onSelect: () => router.visit('/'),
        },
    ].filter((command) => (
        (!isRestrictedTenant || tenantCommandIds.has(command.id) || command.id.startsWith('switch-event-'))
        && (!isResponsibleTenant || !responsibleTenantHiddenCommandIds.has(command.id))
        && (!isPaniteraAccount || ['panitera-dashboard', 'panitera-court-coordinator', 'panitera-embu', 'panitera-randori', 'panitera-champions', 'website'].includes(command.id))
        && (!isCourtCoordinatorAccount || ['court-coordinator', 'panitera-court-coordinator', 'panitera-dashboard', 'panitera-embu', 'panitera-randori', 'panitera-champions', 'website'].includes(command.id))
        && (!isViewerTenant || !command.id.startsWith('master-') || command.id.startsWith('switch-event-'))
    ));

    // Intercept mutating actions when in viewer restricted mode
    useEffect(() => {
        if (!isViewerRestricted) return;

        const handleActionClick = (e) => {
            const target = e.target.closest('button, input[type="submit"], a, [role="button"]');
            if (!target) return;

            // Allow navigation links, search, tabs, modal close
            if (
                target.closest('[data-viewer-allowed]') ||
                target.closest('.viewer-allowed') ||
                target.matches('[data-viewer-allowed]') ||
                target.type === 'search' ||
                target.getAttribute('aria-label') === 'Close' ||
                target.classList.contains('close')
            ) {
                return;
            }

            const isSubmit = target.type === 'submit';
            const hasMutateIcon = Boolean(
                target.querySelector('.fa-plus, .fa-trash, .fa-trash-can, .fa-pen, .fa-pen-to-square, .fa-floppy-disk, .fa-save, .fa-arrows-rotate, .fa-right-left, .fa-repeat, .fa-upload, .fa-shuffle, .fa-user-plus')
            );
            const hasMutateText = /^(Simpan|Tambah|Hapus|Delete|Edit|Ubah|Simpan Perubahan|Quick Create|Generate|Import|Sync|Kirim|Batalkan|Tugaskan)/i.test(target.textContent?.trim() || '');

            if (isSubmit || hasMutateIcon || hasMutateText) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        const mainEl = document.querySelector('.viewer-mode');
        if (mainEl) {
            mainEl.addEventListener('click', handleActionClick, true);
            return () => mainEl.removeEventListener('click', handleActionClick, true);
        }
    }, [isViewerRestricted, url]);

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
    const isRefereeAccount = user.roles?.includes('Wasit') && !isFullAdmin;

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

    if (isRefereeAccount) {
        return (
            <RefereeLayout
                title={title}
                portal={{
                    event: props.activeEvent || tenant,
                    referee: props.referee,
                    events: props.events || [],
                }}
            >
                {children}
            </RefereeLayout>
        );
    }

    const brandSubtitle = (isCourtCoordinatorAccount || isCourtCoordinator)
        ? 'Koordinator Panitera & Court · 2026'
        : (isPaniteraAccount || isPaniteraDashboard || isPaniteraEmbu || isPaniteraRandori || isPaniteraChampions)
            ? 'Koordinator Panitera · 2026'
            : (user.roles?.includes('Koordinator Lapangan') || user.roles?.includes('Court'))
                ? 'Koordinator Panitera & Court · 2026'
                : isViewerTenant
                    ? 'Viewer Event · Mode Pengamat'
                    : tenant
                        ? `Mode Event · ${tenant.city || '2026'}`
                        : 'Admin Panel · 2026';

    return (
        <>
            <Head title={`${title} | Smart Perkemi`} />

            <div className="theme-shell min-h-screen bg-[#f7f4ef] text-[#0f0d0b] font-dm flex flex-col antialiased dark:bg-[#0f1115] dark:text-slate-100">
                <PanelSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} subtitle={brandSubtitle}>
                    {/* Event Active Header Card (when in Mode Event) */}
                    {isEventMode && activeEventObj && (
                        <div className="mx-3 mt-3 rounded-xl border border-[#d4a843]/40 bg-gradient-to-b from-[#d4a843]/15 to-[#d4a843]/5 p-3 shadow-sm">
                            <div
                                onClick={() => setIsEventSwitcherOpen(true)}
                                className="flex items-start gap-2.5 cursor-pointer group"
                                title="Klik untuk beralih event"
                            >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#d4a843]/25 text-[#f0c060] shadow-xs group-hover:scale-105 transition-transform">
                                    <i className="fa-solid fa-trophy text-xs" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#d4a843]">{isViewerTenant ? 'Mode Pengamat (Viewer)' : 'Mode Event Aktif'}</span>
                                        </div>
                                        <span className="text-[9px] text-[#f0c060]/70 group-hover:text-white flex items-center gap-0.5 transition-colors">
                                            <i className="fa-solid fa-arrows-rotate text-[8px]" />
                                            <span>Pindah</span>
                                        </span>
                                    </div>
                                    <h4 className="truncate text-xs font-bold text-white mt-0.5 group-hover:text-[#f0c060] transition-colors" title={activeEventObj.name}>
                                        {activeEventObj.name}
                                    </h4>
                                    <p className="truncate text-[10px] text-white/60">
                                        {activeEventObj.city || 'Kempo Tournament'}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-[#d4a843]/20 flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
                                <div className="flex items-center gap-2.5">
                                    {activeEventObj.slug && (
                                        <a
                                            href={`/event/${activeEventObj.slug}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[#f0c060] hover:text-white flex items-center gap-1 transition-colors font-medium"
                                            title="Buka Halaman Publik Event"
                                        >
                                            <i className="fa-solid fa-globe text-[10px]"></i>
                                            <span>Publik</span>
                                        </a>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsEventSwitcherOpen(true)}
                                        className="text-[#f0c060] hover:text-white flex items-center gap-1 transition-colors font-medium cursor-pointer"
                                        title="Beralih ke event lainnya"
                                    >
                                        <i className="fa-solid fa-arrows-rotate text-[10px]"></i>
                                        <span>Ganti Event{availableEvents.length > 1 ? ` (${availableEvents.length})` : ''}</span>
                                    </button>
                                </div>

                                {isFullAdmin && (
                                    <button
                                        type="button"
                                        onClick={() => router.post('/admin/tenant/exit')}
                                        className="text-white/70 hover:text-rose-300 flex items-center gap-1 transition-colors font-medium cursor-pointer"
                                        title="Keluar dari event ini dan kembali ke menu Admin Global"
                                    >
                                        <i className="fa-solid fa-arrow-right-from-bracket text-[10px]"></i>
                                        <span>Keluar</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Navigation Items (Scrollable) */}
                    <nav className="flex-1 px-0 py-3 overflow-y-auto [scrollbar-gutter:stable] space-y-0.5 text-[13px] custom-scrollbar">
                        {/* ======================================================== */}
                        {/* TIER 2: MODE EVENT NAVIGATION (When an Event is active) */}
                        {/* ======================================================== */}
                        {isEventMode ? (
                            <>
                                {/* Dashboard Event */}
                                <Link
                                    href={isCourtCoordinatorAccount ? withEventContext('/admin/koordinator-court') : isPaniteraAccount ? withEventContext('/admin/panitera/scoring') : withEventContext('/admin/dashboard')}
                                    className={`flex items-center gap-3 px-6 py-2.5 text-[13px] transition-colors ${(isDashboard || (isPaniteraAccount && isPaniteraDashboard) || (isCourtCoordinatorAccount && isCourtCoordinator))
                                        ? 'border-l-3 border-[#e74c3c] bg-[#c0392b]/20 text-[#f0c060] font-medium'
                                        : 'text-white/80 font-medium hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <i className={`fa-solid fa-gauge-high w-4 text-[13px] ${(isDashboard || (isPaniteraAccount && isPaniteraDashboard) || (isCourtCoordinatorAccount && isCourtCoordinator)) ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                    <span>{isCourtCoordinatorAccount ? 'Panel Koordinator Court' : isPaniteraAccount ? 'Dashboard Panitera' : 'Dashboard Event'}</span>
                                </Link>

                                {/* 1. Pendaftaran & Kepesertaan */}
                                {!isPaniteraAccount && !isCourtCoordinatorAccount && (
                                    <div className="border-t border-white/5 mt-1 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => toggleSection('pendaftaran')}
                                            className={`w-full flex items-center justify-between px-6 py-2 text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer ${isPendaftaranActive
                                                ? 'text-[#f0c060] bg-white/[0.04]'
                                                : 'text-[#b5afa6]/70 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <i className={`fa-solid fa-id-card-clip text-[9px] ${isPendaftaranActive ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                <span>Pendaftaran & Kepesertaan</span>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                {isPendaftaranActive && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#e74c3c]" title="Menu aktif" />
                                                )}
                                                <i className={`fa-solid fa-chevron-right text-[8px] transition-transform ${openSections.pendaftaran ? 'rotate-90 text-[#d4a843]' : isPendaftaranActive ? 'text-[#f0c060]' : 'text-white/40'
                                                    }`}></i>
                                            </span>
                                        </button>
                                        {openSections.pendaftaran && (
                                            <div className="space-y-0.5 pl-2">
                                                <Link
                                                    href={withEventContext('/admin/pendaftaran/registrasi')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isRegistration
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-file-signature w-4 text-[11px] ${isRegistration ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Registrasi Kontingen</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/pendaftaran/verifikasi')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isVerification
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-user-check w-4 text-[11px] ${isVerification ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Verifikasi Atlet</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/pertandingan/timbang-badan')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isWeighIn
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-weight-scale w-4 text-[11px] ${isWeighIn ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Penimbangan Hari-H</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/pendaftaran/nomor-pertandingan')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] leading-snug transition-colors ${isMatchGroups
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-people-group w-4 shrink-0 text-[11px] ${isMatchGroups ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Pengaturan Kelompok Tanding</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/pendaftaran/laporan-nomor-pertandingan')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] leading-snug transition-colors ${isMatchCategoriesReport
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-clipboard-list w-4 shrink-0 text-[11px] ${isMatchCategoriesReport ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Laporan Nomor Pertandingan</span>
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 2. Bagan & Pertandingan */}
                                {!isPaniteraAccount && !isCourtCoordinatorAccount && (
                                    <div className="border-t border-white/5 mt-1 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => toggleSection('pertandingan')}
                                            className={`w-full flex items-center justify-between px-6 py-2 text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer ${isPertandinganActive
                                                ? 'text-[#f0c060] bg-white/[0.04]'
                                                : 'text-[#b5afa6]/70 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <i className={`fa-solid fa-sitemap text-[9px] ${isPertandinganActive ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                <span>Bagan & Pertandingan</span>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                {isPertandinganActive && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#e74c3c]" title="Menu aktif" />
                                                )}
                                                <i className={`fa-solid fa-chevron-right text-[8px] transition-transform ${openSections.pertandingan ? 'rotate-90 text-[#d4a843]' : isPertandinganActive ? 'text-[#f0c060]' : 'text-white/40'
                                                    }`}></i>
                                            </span>
                                        </button>
                                        {openSections.pertandingan && (
                                            <div className="space-y-0.5 pl-2">
                                                <Link
                                                    href={withEventContext('/admin/pertandingan/drawing')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isDrawing
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-dice w-4 text-[11px] ${isDrawing ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Drawing & Bagan TM</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/pertandingan/jadwal')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isSchedule
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-calendar-days w-4 text-[11px] ${isSchedule ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Jadwal Pertandingan</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/pertandingan/merge')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isMerge
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
                                )}

                                {/* 3. Wasit & Penilaian */}
                                {!isPaniteraAccount && !isCourtCoordinatorAccount && (
                                    <div className="border-t border-white/5 mt-1 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => toggleSection('wasit')}
                                            className={`w-full flex items-center justify-between px-6 py-2 text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer ${isWasitActive
                                                ? 'text-[#f0c060] bg-white/[0.04]'
                                                : 'text-[#b5afa6]/70 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <i className={`fa-solid fa-scale-balanced text-[9px] ${isWasitActive ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                <span>Wasit & Penilaian</span>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                {isWasitActive && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#e74c3c]" title="Menu aktif" />
                                                )}
                                                <i className={`fa-solid fa-chevron-right text-[8px] transition-transform ${openSections.wasit ? 'rotate-90 text-[#d4a843]' : isWasitActive ? 'text-[#f0c060]' : 'text-white/40'
                                                    }`}></i>
                                            </span>
                                        </button>
                                        {openSections.wasit && (
                                            <div className="space-y-0.5 pl-2">
                                                <Link
                                                    href={withEventContext('/admin/arbitrase/wasit')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isReferee
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-id-card-clip w-4 text-[11px] ${isReferee ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Data Wasit Event</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/pertandingan/wasit')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isEventReferees
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-qrcode w-4 text-[11px] ${isEventReferees ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Presensi Wasit & QR Code</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/arbitrase/scoring')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isScoring
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-chart-column w-4 text-[11px] ${isScoring ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Laporan Nilai & Skor</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/arbitrase/evaluasi')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isEvaluation
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-scale-unbalanced w-4 text-[11px] ${isEvaluation ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Evaluasi Wasit & Anti-Bias</span>
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 4. Panitera & Kendali Meja */}
                                <div className="border-t border-white/5 mt-1 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => toggleSection('scoring')}
                                            className={`w-full flex items-center justify-between px-6 py-2 text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer ${isScoringActive
                                                ? 'text-[#f0c060] bg-white/[0.04]'
                                                : 'text-[#b5afa6]/70 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <i className={`fa-solid fa-stopwatch-20 text-[9px] ${isScoringActive ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                <span>Panitera & Kendali Meja</span>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                {isScoringActive && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#e74c3c]" title="Menu aktif" />
                                                )}
                                                <i className={`fa-solid fa-chevron-right text-[8px] transition-transform ${openSections.scoring ? 'rotate-90 text-[#d4a843]' : isScoringActive ? 'text-[#f0c060]' : 'text-white/40'
                                                    }`}></i>
                                            </span>
                                        </button>
                                        {openSections.scoring && (
                                            <div className="space-y-0.5 pl-2">
                                                <Link
                                                    href={withEventContext('/admin/panitera')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isPaniteraCourtCoordinator ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                                >
                                                    <i className={`fa-solid fa-chalkboard-user w-4 text-[11px] ${isPaniteraCourtCoordinator ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Koordinator Court</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/panitera/scoring')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isPaniteraDashboard ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                                >
                                                    <i className={`fa-solid fa-clipboard-check w-4 text-[11px] ${isPaniteraDashboard ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Pusat Kendali Panitera</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/panitera/scoring/embu-result')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isPaniteraEmbu ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                                >
                                                    <i className={`fa-solid fa-ranking-star w-4 text-[11px] ${isPaniteraEmbu ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Rekap Hasil Embu</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/panitera/scoring/randori-result')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isPaniteraRandori ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                                >
                                                    <i className={`fa-solid fa-hand-fist w-4 text-[11px] ${isPaniteraRandori ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Hasil Randori</span>
                                                </Link>
                                                {!isPaniteraAccount && (
                                                    <Link
                                                        href={withEventContext('/admin/koordinator-court')}
                                                        className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isCourtCoordinator ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                                    >
                                                        <i className={`fa-solid fa-desktop w-4 text-[11px] ${isCourtCoordinator ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                        <span>Panel Koordinator Court</span>
                                                    </Link>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                {/* 5. Hasil & Laporan Event */}
                                {!isPaniteraAccount && !isCourtCoordinatorAccount && (
                                    <div className="border-t border-white/5 mt-1 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => toggleSection('laporanEvent')}
                                            className={`w-full flex items-center justify-between px-6 py-2 text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer ${isLaporanEventActive
                                                ? 'text-[#f0c060] bg-white/[0.04]'
                                                : 'text-[#b5afa6]/70 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <i className={`fa-solid fa-trophy text-[9px] ${isLaporanEventActive ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                <span>Hasil & Laporan Event</span>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                {isLaporanEventActive && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#e74c3c]" title="Menu aktif" />
                                                )}
                                                <i className={`fa-solid fa-chevron-right text-[8px] transition-transform ${openSections.laporanEvent ? 'rotate-90 text-[#d4a843]' : isLaporanEventActive ? 'text-[#f0c060]' : 'text-white/40'
                                                    }`}></i>
                                            </span>
                                        </button>
                                        {openSections.laporanEvent && (
                                            <div className="mx-4 my-1.5 pl-2.5 border-l border-white/10 space-y-0.5">
                                                {reportMenuItems.map((report) => {
                                                    const isActive = isReportHub && activeReport === report.key;
                                                    return (
                                                        <Link
                                                            key={report.key}
                                                            href={reportHref(report.key)}
                                                            aria-current={isActive ? 'page' : undefined}
                                                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] truncate transition-all ${isActive
                                                                ? 'bg-[#c0392b]/20 text-[#f0c060] font-semibold border border-[#c0392b]/30 shadow-2xs'
                                                                : 'text-white/65 hover:bg-white/5 hover:text-white'
                                                                }`}
                                                        >
                                                            <i className={`fa-solid ${report.icon} w-3.5 shrink-0 text-[10.5px] ${isActive ? 'text-[#f0c060]' : 'text-[#d4a843]'}`} aria-hidden="true"></i>
                                                            <span className="truncate">{report.title}</span>
                                                        </Link>
                                                    );
                                                })}
                                                <Link
                                                    href={withEventContext('/admin/laporan/rekap-embu')}
                                                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] truncate transition-all ${isRecap
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-semibold border border-[#c0392b]/30 shadow-2xs'
                                                        : 'text-white/65 hover:bg-white/5 hover:text-white'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-file-signature w-3.5 shrink-0 text-[10.5px] ${isRecap ? 'text-[#f0c060]' : 'text-[#d4a843]'}`} aria-hidden="true"></i>
                                                    <span className="truncate">Rekap Berita Acara</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/panitera/scoring/champions')}
                                                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] truncate transition-all ${isPaniteraChampions
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-semibold border border-[#c0392b]/30 shadow-2xs'
                                                        : 'text-white/65 hover:bg-white/5 hover:text-white'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-award w-3.5 shrink-0 text-[10.5px] ${isPaniteraChampions ? 'text-[#f0c060]' : 'text-[#d4a843]'}`} aria-hidden="true"></i>
                                                    <span className="truncate">Podium Panitera</span>
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 6. Informasi Event (Detail Pengaturan & Data Event) */}
                                {!isPaniteraAccount && !isCourtCoordinatorAccount && (
                                    <div className="border-t border-white/5 mt-1 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => toggleSection('informasiEvent')}
                                            className={`w-full flex items-center justify-between px-6 py-2 text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer ${isInformasiEventActive
                                                ? 'text-[#f0c060] bg-white/[0.04]'
                                                : 'text-[#b5afa6]/70 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <i className={`fa-solid fa-circle-info text-[9px] ${isInformasiEventActive ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                <span>Informasi Event</span>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                {isInformasiEventActive && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#e74c3c]" title="Menu aktif" />
                                                )}
                                                <i className={`fa-solid fa-chevron-right text-[8px] transition-transform ${openSections.informasiEvent ? 'rotate-90 text-[#d4a843]' : isInformasiEventActive ? 'text-[#f0c060]' : 'text-white/40'
                                                    }`}></i>
                                            </span>
                                        </button>
                                        {openSections.informasiEvent && (
                                            <div className="space-y-0.5 pl-2">
                                                <Link
                                                    href={withEventContext('/admin/master/event/detail?tab=info')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isDetailInfo
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-circle-info w-4 text-[11px] ${isDetailInfo ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Informasi & Lokasi</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/master/event/detail?tab=dates')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isDetailDates
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-calendar-days w-4 text-[11px] ${isDetailDates ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Tanggal & Batas Waktu</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/master/event/detail?tab=fees')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isDetailFees
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-money-bill-wave w-4 text-[11px] ${isDetailFees ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Biaya & Rekening Event</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/master/event/detail?tab=participant_rules')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isDetailRules
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-user-shield w-4 text-[11px] ${isDetailRules ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Persyaratan Peserta</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/master/event/detail?tab=age_categories')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isDetailAgeCat
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-users-line w-4 text-[11px] ${isDetailAgeCat ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Kelompok Umur</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/master/event/detail?tab=matches')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isDetailMatches
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-award w-4 text-[11px] ${isDetailMatches ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Nomor Pertandingan & Kuota</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/master/event/detail?tab=courts')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isDetailCourts
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-vector-square w-4 text-[11px] ${isDetailCourts ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Lapangan (Court) & VAR</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/master/event/detail?tab=rundown')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isDetailRundown
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-clock-rotate-left w-4 text-[11px] ${isDetailRundown ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Sesi Acara & Rundown</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/master/event/detail?tab=clerks')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isDetailClerks
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-clipboard-list w-4 text-[11px] ${isDetailClerks ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Panitera Meja</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/master/event/detail?tab=arbitration')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isDetailArbitration
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-gavel w-4 text-[11px] ${isDetailArbitration ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Dewan Arbitrase</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/master/event/detail?tab=officials_roster')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isDetailRoster
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-clipboard-user w-4 text-[11px] ${isDetailRoster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Roster & Presensi Petugas</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/master/event/detail?tab=field_coordinators')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isDetailCoordinators
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-people-group w-4 text-[11px] ${isDetailCoordinators ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Koordinator Lapangan</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/master/event/detail?tab=referees')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isDetailReferees
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-scale-balanced w-4 text-[11px] ${isDetailReferees ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Wasit & Juri Ditugaskan</span>
                                                </Link>
                                                <Link
                                                    href={withEventContext('/admin/master/event/detail?tab=sync')}
                                                    className={`flex items-center gap-3 px-6 py-2 text-[12.5px] transition-colors ${isDetailSync
                                                        ? 'bg-[#c0392b]/20 text-[#f0c060] font-medium border-l-3 border-[#e74c3c]'
                                                        : 'text-white/65 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <i className={`fa-solid fa-cloud-arrow-up w-4 text-[11px] ${isDetailSync ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                    <span>Ekspor & Impor (Sync)</span>
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            /* ======================================================== */
                            /* TIER 1: GLOBAL ADMIN NAVIGATION (Root Admin - 3 Menus)  */
                            /* ======================================================== */
                            <>
                                {/* 1. Dashboard Global */}
                                <Link
                                    href="/admin/dashboard?event_id=all"
                                    className={`flex items-center gap-3 px-6 py-2.5 text-[13px] transition-colors ${isDashboard && !isEventMode
                                        ? 'border-l-3 border-[#e74c3c] bg-[#c0392b]/20 text-[#f0c060] font-medium'
                                        : 'text-white/80 font-medium hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <i className="fa-solid fa-gauge-high w-4 text-[13px] text-[#d4a843]"></i>
                                    <span>Dashboard Global</span>
                                </Link>

                                {/* 2. Event / Acara Kejuaraan */}
                                <Link
                                    href="/admin/master/event"
                                    className={`flex items-center justify-between gap-2 px-6 py-2.5 text-[13px] whitespace-nowrap transition-colors ${isEventMaster && !isEventDetail
                                        ? 'border-l-3 border-[#e74c3c] bg-[#c0392b]/20 text-[#f0c060] font-medium'
                                        : 'text-white/80 font-medium hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1 truncate">
                                        <i className="fa-solid fa-calendar-check w-4 shrink-0 text-[13px] text-[#d4a843]"></i>
                                        <span className="truncate">Event / Turnamen</span>
                                    </div>
                                    <span className="shrink-0 text-[9.5px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-semibold uppercase tracking-wider">
                                        Pilih Event
                                    </span>
                                </Link>

                                {/* 3. Master Data (Global) */}
                                {!isViewerTenant && (
                                    <div className="border-t border-white/5 mt-1 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => toggleSection('masterGlobal')}
                                        className={`w-full flex items-center justify-between px-6 py-2 text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer ${isMasterGlobalActive
                                            ? 'text-[#f0c060] bg-white/[0.04]'
                                            : 'text-[#b5afa6]/70 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <i className={`fa-solid fa-database text-[9px] ${isMasterGlobalActive ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                            <span>Master Data Global</span>
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            {isMasterGlobalActive && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#e74c3c]" title="Menu aktif" />
                                            )}
                                            <i className={`fa-solid fa-chevron-right text-[8px] transition-transform ${openSections.masterGlobal ? 'rotate-90 text-[#d4a843]' : isMasterGlobalActive ? 'text-[#f0c060]' : 'text-white/40'
                                                }`}></i>
                                        </span>
                                    </button>
                                    {openSections.masterGlobal && (
                                        <div className="mx-4 my-1.5 pl-2.5 border-l border-white/10 space-y-0.5">
                                            <Link
                                                href="/admin/master/kyu"
                                                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] truncate transition-all ${isKyuMaster ? 'bg-[#c0392b]/20 text-[#f0c060] font-semibold border border-[#c0392b]/30 shadow-2xs' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <i className={`fa-solid fa-ranking-star w-3.5 shrink-0 text-[10.5px] ${isKyuMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                <span className="truncate">Master Kyu & Dan</span>
                                            </Link>
                                            <Link
                                                href="/admin/master/technique"
                                                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] truncate transition-all ${isTechniqueMaster ? 'bg-[#c0392b]/20 text-[#f0c060] font-semibold border border-[#c0392b]/30 shadow-2xs' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <i className={`fa-solid fa-hand-fist w-3.5 shrink-0 text-[10.5px] ${isTechniqueMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                <span className="truncate">Master Teknik Embu</span>
                                            </Link>
                                            <Link
                                                href="/admin/master/weight-class"
                                                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] truncate transition-all ${isWeightClassMaster ? 'bg-[#c0392b]/20 text-[#f0c060] font-semibold border border-[#c0392b]/30 shadow-2xs' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <i className={`fa-solid fa-weight-scale w-3.5 shrink-0 text-[10.5px] ${isWeightClassMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                <span className="truncate">Master Berat Badan</span>
                                            </Link>
                                            <Link
                                                href="/admin/master/payment-method"
                                                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] truncate transition-all ${isPaymentMethodMaster ? 'bg-[#c0392b]/20 text-[#f0c060] font-semibold border border-[#c0392b]/30 shadow-2xs' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <i className={`fa-solid fa-money-check-dollar w-3.5 shrink-0 text-[10.5px] ${isPaymentMethodMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                <span className="truncate">Metode Pembayaran</span>
                                            </Link>
                                            <Link
                                                href="/admin/master/referee"
                                                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] truncate transition-all ${isRefereeMaster ? 'bg-[#c0392b]/20 text-[#f0c060] font-semibold border border-[#c0392b]/30 shadow-2xs' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <i className={`fa-solid fa-scale-balanced w-3.5 shrink-0 text-[10.5px] ${isRefereeMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                <span className="truncate">Direktori Wasit Nasional</span>
                                            </Link>
                                            <Link
                                                href="/admin/master/clerk"
                                                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] truncate transition-all ${isClerkMaster ? 'bg-[#c0392b]/20 text-[#f0c060] font-semibold border border-[#c0392b]/30 shadow-2xs' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <i className={`fa-solid fa-clipboard-list w-3.5 shrink-0 text-[10.5px] ${isClerkMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                <span className="truncate">Direktori Panitera</span>
                                            </Link>
                                            <Link
                                                href="/admin/master/field-coordinator"
                                                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] truncate transition-all ${isFieldCoordinatorMaster ? 'bg-[#c0392b]/20 text-[#f0c060] font-semibold border border-[#c0392b]/30 shadow-2xs' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <i className={`fa-solid fa-people-group w-3.5 shrink-0 text-[10.5px] ${isFieldCoordinatorMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                <span className="truncate">Koordinator Lapangan</span>
                                            </Link>
                                            <Link
                                                href="/admin/master/user"
                                                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] truncate transition-all ${isUserMaster ? 'bg-[#c0392b]/20 text-[#f0c060] font-semibold border border-[#c0392b]/30 shadow-2xs' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <i className={`fa-solid fa-user-gear w-3.5 shrink-0 text-[10.5px] ${isUserMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                <span className="truncate">Pengguna & Role Akun</span>
                                            </Link>
                                            <Link
                                                href="/admin/master/contingent"
                                                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] truncate transition-all ${isContingentMaster ? 'bg-[#c0392b]/20 text-[#f0c060] font-semibold border border-[#c0392b]/30 shadow-2xs' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <i className={`fa-solid fa-flag w-3.5 shrink-0 text-[10.5px] ${isContingentMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                <span className="truncate">Data Kontingen Global</span>
                                            </Link>
                                            <Link
                                                href="/admin/master/athlete"
                                                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] truncate transition-all ${isAthleteMaster ? 'bg-[#c0392b]/20 text-[#f0c060] font-semibold border border-[#c0392b]/30 shadow-2xs' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <i className={`fa-solid fa-users w-3.5 shrink-0 text-[10.5px] ${isAthleteMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                <span className="truncate">Data Atlet & Kenshi Global</span>
                                            </Link>
                                            <Link
                                                href="/admin/master/official"
                                                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] truncate transition-all ${isOfficialMaster ? 'bg-[#c0392b]/20 text-[#f0c060] font-semibold border border-[#c0392b]/30 shadow-2xs' : 'text-white/65 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <i className={`fa-solid fa-id-badge w-3.5 shrink-0 text-[10.5px] ${isOfficialMaster ? 'text-[#f0c060]' : 'text-[#d4a843]'}`}></i>
                                                <span className="truncate">Data Official Global</span>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                                )}
                            </>
                        )}

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
                    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-2 border-b border-[#ede9e1] bg-[#f7f4ef]/95 px-3 backdrop-blur-md dark:border-slate-800 dark:bg-[#11151b]/95 sm:gap-4 sm:px-4 md:px-7">
                        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                            {/* Mobile Hamburger Toggle */}
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(true)}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#0f0d0b] transition-colors hover:bg-[#ede9e1] lg:hidden"
                                aria-label="Buka navigasi"
                            >
                                <i className="fa-solid fa-bars text-base"></i>
                            </button>

                            {/* Page Title & Event Switcher Pill */}
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <h2 className="flex min-w-0 items-center gap-1.5 font-sans text-sm font-semibold tracking-tight text-[#0f0d0b] dark:text-white md:text-base">
                                    <span className="truncate">{title}</span>
                                    <span className="hidden shrink-0 text-xs font-medium text-[#c0392b] sm:inline md:text-sm">/ Overview</span>
                                </h2>

                                {/* Topbar Event Switcher Badge */}
                                {activeEventObj && (
                                    <button
                                        type="button"
                                        onClick={() => setIsEventSwitcherOpen(true)}
                                        className="group inline-flex items-center gap-1.5 max-w-[170px] sm:max-w-[240px] md:max-w-[320px] px-2.5 py-1 rounded-lg border border-[#ede9e1] bg-white hover:bg-[#ede9e1]/70 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-[#0f0d0b] dark:text-slate-200 text-xs shadow-2xs transition-all cursor-pointer"
                                        title="Klik untuk beralih event kejuaraan"
                                    >
                                        <span className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                        <i className="fa-solid fa-trophy text-[10px] text-[#d4a843] shrink-0" />
                                        <span className="truncate font-semibold text-[11px] sm:text-xs">
                                            {activeEventObj.name}
                                        </span>
                                        <i className="fa-solid fa-chevron-down text-[8.5px] text-[#8c827a] group-hover:text-[#0f0d0b] dark:group-hover:text-white shrink-0 transition-transform" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Topbar Right Actions */}
                        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
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

                            <ThemeToggle />

                            {/* Notification Bell */}
                            {/* <button
                                type="button"
                                className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-black/5 bg-white text-[#555] transition-colors hover:bg-[#ede9e1]"
                                title="Notifikasi"
                            >
                                <i className="fa-solid fa-bell text-xs"></i>
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#c0392b]"></span>
                            </button> */}

                            {/* Profile Dropdown */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setProfileOpen(!profileOpen)}
                                    className="flex min-h-11 items-center gap-2 rounded-xl px-1 transition-colors hover:bg-[#ede9e1]"
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
                                        <div className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[#ede9e1] bg-white py-1 text-xs shadow-xl sm:w-52">
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
                                            {/* <a
                                                href="/preview-email"
                                                target="_blank"
                                                className="flex items-center gap-2.5 px-4 py-2 text-[#555] hover:bg-[#f7f4ef] hover:text-[#0f0d0b] transition-colors"
                                            >
                                                <i className="fa-solid fa-envelope-open-text text-xs text-[#d4a843]"></i>
                                                <span>Preview Email Kontingen</span>
                                            </a> */}
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

                    {/* Simulation Sandbox Mode Banner */}
                    {isTrainingMode && (
                        <aside aria-label="Mode Simulasi Aktif" className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 px-4 py-2.5 text-white shadow-md border-b border-amber-900/20">
                            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                                <div className="flex items-center gap-2.5 text-xs font-bold">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-white animate-pulse">
                                        <i className="fa-solid fa-flask" aria-hidden="true" />
                                    </span>
                                    <span>
                                        <strong>MODE SIMULASI & GLADI BERSIH AKTIF:</strong> Data partai, skor, dan log waktu diisolasi dari rekap turnamen resmi.
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => router.post('/admin/simulation/seed', { event_id: currentEventId })}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-black/20 px-2.5 py-1 font-semibold text-white hover:bg-black/30 transition"
                                    >
                                        <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
                                        Buat Partai Latihan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (window.confirm('Bersihkan seluruh partai, bagan, dan skor simulasi? Master data atlet/kontingen tetap aman.')) {
                                                router.post('/admin/simulation/reset', { event_id: currentEventId });
                                            }
                                        }}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-black/20 px-2.5 py-1 font-semibold text-white hover:bg-black/30 transition"
                                    >
                                        <i className="fa-solid fa-trash-can" aria-hidden="true" />
                                        Reset Data Simulasi
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => router.post('/admin/simulation/toggle', { event_id: currentEventId })}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 font-bold text-amber-900 shadow hover:bg-amber-50 transition"
                                    >
                                        <i className="fa-solid fa-power-off" aria-hidden="true" />
                                        Nonaktifkan Simulasi
                                    </button>
                                </div>
                            </div>
                        </aside>
                    )}

                    {/* Main Content Body */}
                    <main className={`admin-main min-w-0 p-3 sm:p-4 md:px-7 md:pb-5 md:pt-7 ${isViewerRestricted ? 'viewer-mode' : ''}`}>
                        {isViewerRestricted && (
                            <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-amber-900 shadow-xs dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-200/80 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                                        <i className="fa-solid fa-eye text-sm" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                                            Mode Pengamat (Viewer / View-Only)
                                        </p>
                                        <p className="text-xs text-amber-700/90 dark:text-amber-300/80">
                                            Anda memiliki hak akses hanya-lihat (view-only). Seluruh formulir, tombol tambah, ubah, dan hapus data dinonaktifkan.
                                        </p>
                                    </div>
                                </div>
                                <span className="shrink-0 rounded-md bg-amber-200/60 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                                    Hanya Lihat
                                </span>
                            </div>
                        )}
                        {children}
                    </main>

                    {/* Footer */}
                    <footer className="border-t border-[#ede9e1] px-4 py-3 text-center text-[11px] text-[#b5afa6] dark:border-slate-800 dark:text-slate-500 md:px-7">
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

            {/* Event Switcher Modal */}
            <EventSwitcherModal
                isOpen={isEventSwitcherOpen}
                onClose={() => setIsEventSwitcherOpen(false)}
                events={availableEvents}
                currentEventId={currentEventId}
                isFullAdmin={isFullAdmin}
            />

            {/* Global Flash Notification Toast */}
            {flashToast && (
                <div className="fixed top-5 right-5 z-[9999] max-w-sm w-full px-4 sm:px-0 pointer-events-none">
                    <Notification
                        show={Boolean(flashToast)}
                        variant={flashToast.variant}
                        title={flashToast.title}
                        message={flashToast.message}
                        duration={5000}
                        onClose={() => setFlashToast(null)}
                    />
                </div>
            )}
        </>
    );
}
