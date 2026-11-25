import React, { useState, useRef, useEffect } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Button, Input, Combobox, Modal } from '@/Components/UI';
import ActionMenuDropdown from '@/Components/UI/Elements/ActionMenuDropdown';

// Extracted Tab Components
import AgeCategoriesTab from './Tabs/AgeCategoriesTab';
import ParticipantRulesForm from './ParticipantRulesForm';
import CourtsTab from './Tabs/CourtsTab';
import MatchesTab from './Tabs/MatchesTab';
import TournamentTab from './Tabs/TournamentTab';
import RundownTab from './Tabs/RundownTab';
import RefereesTab from './Tabs/RefereesTab';
import ArbitrationTab from './ArbitrationTab';
import ClerksTab from './Tabs/ClerksTab';
import FieldCoordinatorsTab from './Tabs/FieldCoordinatorsTab';
import InfoTab from './Tabs/InfoTab';
import DatesTab from './Tabs/DatesTab';
import FeesTab from './Tabs/FeesTab';
import EventDataSyncForm from './EventDataSyncForm';
import TransferAssignmentModal from './Tabs/TransferAssignmentModal';
import OfficialsRosterTab from './Tabs/OfficialsRosterTab';

export default function EventDetail({
    event = {},
    counts = {
        age_categories: 0,
        courts: 0,
        match_categories: 0,
        rundowns: 0,
        referees: 0,
        clerks: 0,
        field_coordinators: 0,
    },
    tournamentSummary = {
        status: 'draft',
        generated_categories: 0,
        skipped_categories: 0,
        total_matches: 0,
        match_sessions: 0,
    },
    ageCategories = [],
    courts = [],
    matchCategories = [],
    rundowns = [],
    allEvents = [],
    kyus = [],
    weightClasses = [],
    paymentMethods = [],
    referees = [],
    eventReferees = [],
    clerks = [],
    eventClerks = [],
    fieldCoordinators = [],
    eventFieldCoordinators = [],
    arbitrators = [],
    eventArbitrators = [],
    users = [],
    eventUsers = [],
    arbitrationSummary = {},
    arbitrationPersonnel = [],
    arbitrationRoleUsers = [],
    arbitrationAttendances = [],
    arbitrationScores = [],
}) {
    const getInitialTab = () => {
        if (typeof window !== 'undefined') {
            const paramTab = new URLSearchParams(window.location.search).get('tab');
            if (paramTab) return paramTab;
            const hashTab = window.location.hash.replace('#', '');
            if (hashTab) return hashTab;
        }
        return 'info';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tabId);
            window.history.replaceState({}, '', url.toString());
        }
        router.get(
            '/admin/master/event/detail',
            { event_id: event.id, tab: tabId },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    // Tab horizontal scroll control
    const tabScrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkTabScroll = () => {
        if (tabScrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabScrollRef.current;
            setCanScrollLeft(scrollLeft > 5);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };

    useEffect(() => {
        checkTabScroll();
        window.addEventListener('resize', checkTabScroll);
        return () => window.removeEventListener('resize', checkTabScroll);
    }, []);

    const { url } = usePage();
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const paramTab = new URLSearchParams(window.location.search).get('tab');
            if (paramTab && paramTab !== activeTab) {
                setActiveTab(paramTab);
            }
        }
    }, [url]);

    const scrollTabs = (direction) => {
        if (tabScrollRef.current) {
            tabScrollRef.current.scrollBy({
                left: direction === 'left' ? -220 : 220,
                behavior: 'smooth',
            });
        }
    };

    const handleTabWheel = (e) => {
        if (tabScrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabScrollRef.current;
            const maxScroll = scrollWidth - clientWidth;
            if (maxScroll > 0) {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    if ((e.deltaY > 0 && scrollLeft < maxScroll) || (e.deltaY < 0 && scrollLeft > 0)) {
                        tabScrollRef.current.scrollLeft += e.deltaY;
                    }
                }
            }
        }
    };

    // ══════════════════════════════════════════════════════════════
    // ARBITRATOR STATE & HANDLERS (for ArbitrationTab)
    // ══════════════════════════════════════════════════════════════
    const [isArbitratorModalOpen, setIsArbitratorModalOpen] = useState(false);
    const [editingArbitrator, setEditingArbitrator] = useState(null);
    const [arbitratorSearch, setArbitratorSearch] = useState('');

    const arbitratorRoleOptions = [
        { value: 'Arbitrase Pertandingan', label: 'Arbitrase Pertandingan' },
        { value: 'Ketua Dewan Wasit', label: 'Ketua Dewan Wasit' },
        { value: 'Dewan Wasit', label: 'Dewan Wasit' },
        { value: 'Wasit Utama', label: 'Wasit Utama' },
        { value: 'Juri', label: 'Juri' },
        { value: 'Panitera', label: 'Panitera' },
        { value: 'Pengawas Pertandingan', label: 'Pengawas Pertandingan' },
    ];

    const refereeRoleOptions = [
        { value: 'referee', label: 'Wasit & Juri Pertandingan' },
        { value: 'head_referee', label: 'Ketua / Dewan Wasit' },
        { value: 'tatami_manager', label: 'Manager Tatami' },
        { value: 'line_judge', label: 'Juri Garis' },
        { value: 'arbitrator', label: 'Komisi Arbitrase' },
    ];

    const fieldCoordinatorAreaOptions = [
        { value: 'koordinator_pertandingan', label: 'Koordinator Pertandingan' },
        { value: 'wakil_koordinator_pertandingan', label: 'Wakil Koordinator Pertandingan' },
        { value: 'koordinator_court', label: 'Koordinator Court' },
        { value: 'court', label: 'Koordinator Lapangan / Court' },
        { value: 'chief', label: 'Koordinator Utama' },
        { value: 'logistics', label: 'Koordinator Logistik' },
        { value: 'liaison', label: 'Liaison / Penghubung' },
        { value: 'general', label: 'Koordinator Umum' },
    ];

    const arbitratorOptions = arbitrators.map((arb) => ({
        value: arb.id,
        label: arb.name,
        sublabel: [arb.certification_level, arb.dan_grade, arb.region].filter(Boolean).join(' · '),
    }));

    const arbitratorAssignmentForm = useForm({ arbitrator_id: '', role: 'Arbitrase Pertandingan' });
    const arbitratorForm = useForm({
        name: '',
        gender: 'male',
        dan_grade: '',
        certification_level: '',
        license_number: '',
        region: '',
        phone: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'Arbitrase Pertandingan',
    });

    const submitArbitratorAssignment = (e) => {
        e.preventDefault();
        arbitratorAssignmentForm.post(`/admin/master/event/${event.id}/arbitrator`, {
            preserveScroll: true,
            onSuccess: () => arbitratorAssignmentForm.setData({ arbitrator_id: '', role: 'Arbitrase Pertandingan' }),
        });
    };

    const openCreateArbitratorModal = () => {
        setEditingArbitrator(null);
        arbitratorForm.reset();
        arbitratorForm.clearErrors();
        arbitratorForm.setData({
            name: '',
            gender: 'male',
            dan_grade: '',
            certification_level: '',
            license_number: '',
            region: '',
            phone: '',
            email: '',
            password: '',
            password_confirmation: '',
            role: 'Arbitrase Pertandingan',
        });
        setIsArbitratorModalOpen(true);
    };

    const openEditArbitratorModal = (arb) => {
        setEditingArbitrator(arb);
        arbitratorForm.clearErrors();
        arbitratorForm.setData({
            name: arb.name || '',
            gender: arb.gender || 'male',
            dan_grade: arb.dan_grade || '',
            certification_level: arb.certification_level || '',
            license_number: arb.license_number || '',
            region: arb.region || '',
            phone: arb.phone || '',
            email: arb.email || '',
            password: '',
            password_confirmation: '',
            role: arb.role || 'Arbitrase Pertandingan',
        });
        setIsArbitratorModalOpen(true);
    };

    const submitArbitrator = (e) => {
        e.preventDefault();
        if (editingArbitrator) {
            arbitratorForm.put(`/admin/master/event/${event.id}/arbitrator/${editingArbitrator.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsArbitratorModalOpen(false);
                    setEditingArbitrator(null);
                    arbitratorForm.reset();
                },
            });
        } else {
            arbitratorForm.transform((data) => ({ ...data, create_new: true }));
            arbitratorForm.post(`/admin/master/event/${event.id}/arbitrator`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsArbitratorModalOpen(false);
                    arbitratorForm.reset();
                },
            });
        }
    };

    const removeEventArbitrator = (arbitrator) => {
        router.delete(`/admin/master/event/${event.id}/arbitrator/${arbitrator.id}`, { preserveScroll: true });
    };

    // ══════════════════════════════════════════════════════════════
    // UNIVERSAL TRANSFER STATE & HANDLERS (Arbitrase ⇄ Wasit ⇄ Koordinator)
    // ══════════════════════════════════════════════════════════════
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferTarget, setTransferTarget] = useState(null);

    const transferForm = useForm({
        source_category: 'referee',
        source_id: '',
        target_category: 'arbitrator',
        target_role: 'Arbitrase Pertandingan',
        gender: 'male',
        dan_grade: '',
        certification_level: '',
        license_number: '',
        detach_source: true,
    });

    const openTransferModal = (sourceCategory, sourcePerson) => {
        let defaultTargetCat = 'arbitrator';
        let defaultTargetRole = 'Arbitrase Pertandingan';

        if (sourceCategory === 'arbitrator') {
            defaultTargetCat = 'referee';
            defaultTargetRole = 'referee';
        } else if (sourceCategory === 'referee') {
            defaultTargetCat = 'arbitrator';
            defaultTargetRole = 'Arbitrase Pertandingan';
        } else if (sourceCategory === 'coordinator') {
            defaultTargetCat = 'arbitrator';
            defaultTargetRole = 'Arbitrase Pertandingan';
        }

        setTransferTarget({ sourceCategory, source: sourcePerson });
        transferForm.clearErrors();
        transferForm.setData({
            source_category: sourceCategory,
            source_id: sourcePerson.id,
            target_category: defaultTargetCat,
            target_role: defaultTargetRole,
            gender: sourcePerson.gender || 'male',
            dan_grade: sourcePerson.dan_grade || '',
            certification_level: sourcePerson.certification_level || '',
            license_number: sourcePerson.license_number || sourcePerson.coordinator_number || '',
            detach_source: true,
        });
        setIsTransferModalOpen(true);
    };

    const submitTransfer = (e) => {
        e.preventDefault();
        if (!transferTarget) return;

        transferForm.post(`/admin/master/event/${event.id}/transfer-official`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsTransferModalOpen(false);
                setTransferTarget(null);
                transferForm.reset();
            },
        });
    };

    // ══════════════════════════════════════════════════════════════
    // EVENT PACKAGE IMPORT MODAL (from Header Sync Dropdown)
    // ══════════════════════════════════════════════════════════════
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const importFileInputRef = useRef(null);
    const importPackageForm = useForm({ package_file: null });

    const handleImportPackageSubmit = (e) => {
        e.preventDefault();
        if (!importPackageForm.data.package_file) return;

        importPackageForm.post('/admin/master/event/import-package', {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setIsImportModalOpen(false);
                importPackageForm.reset();
                if (importFileInputRef.current) {
                    importFileInputRef.current.value = '';
                }
            },
        });
    };

    const syncMenuItems = [
        {
            label: 'Buka di Mode Event',
            description: `Beralih ke panel kerja fokus untuk ${event.name || 'event ini'}`,
            icon: <i className="fa-solid fa-right-to-bracket text-[#d4a843]" />,
            href: `/admin/event/${event.id}/enter`,
        },
        { divider: true },
        {
            label: 'Ekspor Paket Data (.json)',
            description: 'Unduh seluruh data pertandingan, nilai wasit, dan hasil juara event (.json)',
            icon: <i className="fa-solid fa-file-arrow-down text-amber-500" />,
            href: `/admin/master/event/${event.id}/export-package`,
            download: true,
            badge: 'JSON',
        },
        {
            label: 'Impor Data Offline (.json)',
            description: 'Unggah file paket JSON data event dari laptop lokal / offline',
            icon: <i className="fa-solid fa-cloud-arrow-up text-emerald-500" />,
            onClick: () => setIsImportModalOpen(true),
        },
        { divider: true },
        {
            label: 'Panel Sinkronisasi (Sync)',
            description: 'Buka pengaturan dan status sinkronisasi offline-online',
            icon: <i className="fa-solid fa-network-wired text-blue-500" />,
            onClick: () => handleTabChange('sync'),
        },
    ];

    return (
        <AdminLayout
            title={`Detail Event: ${event.name}`}
            breadcrumb={[
                { label: 'Master Data' },
                { label: 'Event & Kejuaraan', href: '/admin/master/event' },
                { label: event.name || 'Detail' },
            ]}
        >
            <Head title={`Detail Event: ${event.name}`} />

            <div className="space-y-6">
                {/* ════ EXECUTIVE OPERATIONAL HERO HEADER ════ */}
                <div className="rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-5 md:p-6 transition-all">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2.5 max-w-3xl min-w-0 flex-1">
                            {/* Pre-title bar: Badges & status row */}
                            <div className="flex flex-wrap items-center gap-2">
                                {event.edition && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
                                        {event.edition}
                                    </span>
                                )}
                                <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${event.is_active
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                                            : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                        }`}
                                >
                                    <span
                                        className={`size-1.5 rounded-full ${event.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                            }`}
                                    />
                                    {event.is_active ? 'Aktif untuk Operasional' : 'Nonaktif'}
                                </span>
                                {event.status && (
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                                            event.status === 'completed'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                                                : event.status === 'open_registration'
                                                ? 'bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60'
                                                : event.status === 'ongoing'
                                                ? 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                                                : event.status === 'closed'
                                                ? 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
                                                : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                        }`}
                                    >
                                        {event.status === 'completed' && <i className="fa-solid fa-circle-check text-[9px]" />}
                                        {event.status === 'open_registration' && <span className="size-1.5 rounded-full bg-blue-500" />}
                                        {event.status === 'ongoing' && <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />}
                                        {event.status === 'closed' && <i className="fa-solid fa-lock text-[8.5px]" />}
                                        {event.status === 'draft' && <i className="fa-solid fa-clock text-[8.5px]" />}
                                        <span>{event.status_label || event.status}</span>
                                    </span>
                                )}
                            </div>

                            <h1 className="font-sans text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                                {event.name}
                            </h1>

                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                                {event.venue && (
                                    <span className="flex items-center gap-2">
                                        <i className="fa-solid fa-location-dot text-[#d4a843] text-xs" aria-hidden="true" />
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {event.venue}
                                            {event.city ? `, ${event.city}` : ''}
                                        </span>
                                    </span>
                                )}
                                {(event.start_date || event.end_date) && (
                                    <span className="flex items-center gap-2">
                                        <i className="fa-regular fa-calendar text-[#d4a843] text-xs" aria-hidden="true" />
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {event.start_date_formatted || event.start_date}
                                            {event.end_date ? ` – ${event.end_date_formatted || event.end_date}` : ''}
                                        </span>
                                    </span>
                                )}
                                {event.organizer && (
                                    <span className="flex items-center gap-2">
                                        <i className="fa-solid fa-shield-halved text-[#d4a843] text-xs" aria-hidden="true" />
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{event.organizer}</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
                            <Link href="/admin/master/event">
                                <button
                                    type="button"
                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-2xs cursor-pointer active:scale-95"
                                    title="Kembali ke Manajemen Event & Kejuaraan"
                                >
                                    <i className="fa-solid fa-arrow-left text-xs text-slate-500 dark:text-slate-400" aria-hidden="true" />
                                    <span>Daftar Event</span>
                                </button>
                            </Link>

                            <a
                                href={`/admin/master/event/${event.id}/arbitration/export`}
                                download
                                title="Export Excel lengkap seluruh tab menu event & arbitrase (11 Sheet Otomatis .xlsx)"
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3.5 py-2 text-xs font-bold text-white transition-all shadow-2xs cursor-pointer active:scale-95"
                            >
                                <i className="fa-solid fa-file-excel text-xs" aria-hidden="true" />
                                <span>Export Excel (.xlsx)</span>
                            </a>

                            <ActionMenuDropdown
                                label="Sinkron & Data"
                                theme="light"
                                menuHeader="Transfer Data & Sinkronisasi"
                                icon={<i className="fa-solid fa-arrows-rotate text-xs text-[#d4a843]" aria-hidden="true" />}
                                items={syncMenuItems}
                                className="shrink-0"
                            />
                        </div>
                    </div>
                </div>

                {/* ════ KPI STATS ROW (5 COLUMNS) ════ */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                    <div className="p-4 rounded-xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between transition-all hover:border-[#d4a843]/40">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Kelompok Umur
                            </p>
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-users-line text-xs" aria-hidden="true" />
                            </div>
                        </div>
                        <div className="mt-2.5">
                            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                                {counts.age_categories || 0}
                            </h3>
                            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Kategori Usia</p>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between transition-all hover:border-[#d4a843]/40">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Lapangan / Tatami
                            </p>
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-vector-square text-xs" aria-hidden="true" />
                            </div>
                        </div>
                        <div className="mt-2.5">
                            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                                {counts.courts || 0}
                            </h3>
                            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Tatami Pertandingan</p>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between transition-all hover:border-[#d4a843]/40">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Nomor Tanding
                            </p>
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-award text-xs" aria-hidden="true" />
                            </div>
                        </div>
                        <div className="mt-2.5">
                            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                                {counts.match_categories || 0}
                            </h3>
                            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Nomor Kelas Dibuka</p>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between transition-all hover:border-[#d4a843]/40">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Sesi Rundown
                            </p>
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-clock-rotate-left text-xs" aria-hidden="true" />
                            </div>
                        </div>
                        <div className="mt-2.5">
                            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                                {counts.rundowns || 0}
                            </h3>
                            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Sesi Terjadwal</p>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between transition-all hover:border-[#d4a843]/40">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Korps Arbitrase
                            </p>
                            <div className="w-8 h-8 rounded-lg bg-[#c0392b]/10 text-[#c0392b] flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-scale-balanced text-xs" aria-hidden="true" />
                            </div>
                        </div>
                        <div className="mt-2.5">
                            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                                {counts.referees || eventReferees.length || 0}
                            </h3>
                            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Wasit & Juri Ditugaskan</p>
                        </div>
                    </div>
                </div>

                {/* ════ TAB NAVIGATION BAR ════ */}
                {/* <div className="relative bg-white dark:bg-slate-900 border border-[#ede9e1] dark:border-slate-800 rounded-xl shadow-2xs p-1.5 sticky top-2 z-20">
                    <div
                        ref={tabScrollRef}
                        onScroll={checkTabScroll}
                        onWheel={handleTabWheel}
                        className="flex gap-1.5 overflow-x-auto scroll-smooth no-scrollbar"
                    >
                        {[
                            {
                                id: 'info',
                                label: 'Informasi Event',
                                icon: 'fa-circle-info',
                            },
                            {
                                id: 'dates',
                                label: 'Tanggal Acara',
                                icon: 'fa-calendar-days',
                            },
                            {
                                id: 'fees',
                                label: 'Biaya Kontingen',
                                icon: 'fa-money-bill-wave',
                            },
                            { id: 'participant_rules', label: 'Persyaratan Peserta', icon: 'fa-user-shield' },
                            {
                                id: 'age_categories',
                                label: 'Kelompok Umur',
                                icon: 'fa-users-line',
                                count: counts.age_categories,
                            },
                            {
                                id: 'matches',
                                label: 'Nomer Pertandingan',
                                icon: 'fa-award',
                                count: counts.match_categories,
                            },
                            {
                                id: 'courts',
                                label: 'Lapangan (Court)',
                                icon: 'fa-vector-square',
                                count: counts.courts,
                            },
                            {
                                id: 'rundown',
                                label: 'Sesi Acara & Rundown',
                                icon: 'fa-clock-rotate-left',
                                count: counts.rundowns,
                            },
                            {
                                id: 'tournament',
                                label: 'Pertandingan & Drawing',
                                icon: 'fa-diagram-project',
                                count: tournamentSummary.total_matches,
                            },
                            {
                                id: 'referees',
                                label: 'Wasit & Juri',
                                icon: 'fa-scale-balanced',
                                count: counts.referees || eventReferees.length,
                            },
                            {
                                id: 'arbitration',
                                label: 'Dewan Arbitrase',
                                icon: 'fa-gavel',
                                count: eventArbitrators.length || counts.arbitrators || counts.arbitration || 0,
                            },
                            {
                                id: 'officials_roster',
                                label: 'Roster & Presensi Petugas',
                                icon: 'fa-clipboard-user',
                                count: (counts.referees || 0) + (counts.arbitrators || 0) + (counts.clerks || 0) + (counts.field_coordinators || 0),
                            },
                            {
                                id: 'clerks',
                                label: 'Panitera',
                                icon: 'fa-clipboard-list',
                                count: counts.clerks || eventClerks.length,
                            },
                            {
                                id: 'field_coordinators',
                                label: 'Koordinator Lapangan',
                                icon: 'fa-people-group',
                                count: counts.field_coordinators || eventFieldCoordinators.length,
                            },
                            {
                                id: 'sync',
                                label: 'Ekspor & Impor (Sync Offline)',
                                icon: 'fa-cloud-arrow-up',
                            },
                        ].map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`flex shrink-0 items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                        isActive
                                            ? 'bg-[#c0392b] text-white shadow-2xs'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-semibold'
                                    }`}
                                >
                                    <i className={`fa-solid ${tab.icon} text-xs ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && (
                                        <span
                                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                isActive
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                            }`}
                                        >
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {canScrollLeft && (
                        <button
                            type="button"
                            onClick={() => scrollTabs('left')}
                            className="absolute left-2 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-full border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                            aria-label="Geser tab ke kiri"
                        >
                            <i className="fa-solid fa-chevron-left text-xs" aria-hidden="true" />
                        </button>
                    )}

                    {canScrollRight && (
                        <button
                            type="button"
                            onClick={() => scrollTabs('right')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-full border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                            aria-label="Geser tab ke kanan"
                        >
                            <i className="fa-solid fa-chevron-right text-xs" aria-hidden="true" />
                        </button>
                    )}
                </div> */}

                {/* ════ TAB CONTENT ROUTER ════ */}
                {activeTab === 'age_categories' && (
                    <AgeCategoriesTab event={event} ageCategories={ageCategories} />
                )}

                {activeTab === 'participant_rules' && (
                    <ParticipantRulesForm key={event.id} event={event} />
                )}

                {activeTab === 'courts' && (
                    <CourtsTab event={event} courts={courts} />
                )}

                {activeTab === 'matches' && (
                    <MatchesTab
                        event={event}
                        matchCategories={matchCategories}
                        ageCategories={ageCategories}
                        kyus={kyus}
                        weightClasses={weightClasses}
                    />
                )}

                {activeTab === 'tournament' && (
                    <TournamentTab event={event} tournamentSummary={tournamentSummary} />
                )}

                {activeTab === 'rundown' && (
                    <RundownTab event={event} rundowns={rundowns} courts={courts} />
                )}

                {activeTab === 'referees' && (
                    <RefereesTab
                        event={event}
                        referees={referees}
                        eventReferees={eventReferees}
                        openTransferModal={openTransferModal}
                    />
                )}

                {activeTab === 'arbitration' && (
                    <ArbitrationTab
                        event={event}
                        arbitrators={arbitrators}
                        eventArbitrators={eventArbitrators}
                        arbitratorOptions={arbitratorOptions}
                        arbitratorRoleOptions={arbitratorRoleOptions}
                        arbitratorAssignmentForm={arbitratorAssignmentForm}
                        submitArbitratorAssignment={submitArbitratorAssignment}
                        openCreateArbitratorModal={openCreateArbitratorModal}
                        openEditArbitratorModal={openEditArbitratorModal}
                        removeEventArbitrator={removeEventArbitrator}
                        openTransferModal={openTransferModal}
                        arbitratorSearch={arbitratorSearch}
                        setArbitratorSearch={setArbitratorSearch}
                    />
                )}

                {activeTab === 'officials_roster' && (
                    <OfficialsRosterTab
                        event={event}
                        arbitrationSummary={arbitrationSummary}
                        arbitrationPersonnel={arbitrationPersonnel}
                        arbitrationRoleUsers={arbitrationRoleUsers}
                        eventReferees={eventReferees}
                        eventArbitrators={eventArbitrators}
                    />
                )}

                {activeTab === 'clerks' && (
                    <ClerksTab
                        event={event}
                        clerks={clerks}
                        eventClerks={eventClerks}
                    />
                )}

                {activeTab === 'field_coordinators' && (
                    <FieldCoordinatorsTab
                        event={event}
                        fieldCoordinators={fieldCoordinators}
                        eventFieldCoordinators={eventFieldCoordinators}
                        courts={courts}
                        openTransferModal={openTransferModal}
                    />
                )}

                {activeTab === 'info' && (
                    <InfoTab
                        event={event}
                        allEvents={allEvents}
                        users={users}
                        eventUsers={eventUsers}
                    />
                )}

                {activeTab === 'dates' && (
                    <DatesTab event={event} />
                )}

                {activeTab === 'fees' && (
                    <FeesTab
                        event={event}
                        paymentMethods={paymentMethods}
                    />
                )}

                {activeTab === 'sync' && (
                    <EventDataSyncForm
                        event={event}
                        counts={counts}
                        tournamentSummary={tournamentSummary}
                    />
                )}
            </div>

            {/* ════ MODALS ════ */}
            {/* Modal Impor Paket JSON Event (Header Dropdown Action) */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => {
                    if (!importPackageForm.processing) {
                        setIsImportModalOpen(false);
                    }
                }}
                title="Impor Paket Data Event (.json)"
                description="Unggah file paket JSON data event yang diekspor dari sistem offline / laptop lokal ke server ini."
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsImportModalOpen(false)}
                            disabled={importPackageForm.processing}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleImportPackageSubmit}
                            loading={importPackageForm.processing}
                            disabled={!importPackageForm.data.package_file || importPackageForm.processing}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                            <i className="fa-solid fa-cloud-arrow-up mr-1.5" />
                            Mulai Impor Data Event
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleImportPackageSubmit} className="space-y-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                        <div className="flex items-start gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-black font-black">
                                <i className="fa-solid fa-triangle-exclamation" />
                            </span>
                            <div className="space-y-1">
                                <p className="font-bold text-sm text-amber-950 dark:text-amber-100">
                                    Perhatian Sinkronisasi Data Offline ⇄ Online:
                                </p>
                                <p className="leading-relaxed">
                                    Seluruh data pertandingan, atlet, kontingen, nilai wasit (5 juri), skor Randori, dan hasil juara dari file paket <code>.json</code> akan disinkronkan ke event <strong>{event.name}</strong> ini.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                            Pilih File Paket JSON (.json) <span className="text-red-500">*</span>
                        </label>
                        <input
                            ref={importFileInputRef}
                            type="file"
                            accept=".json,application/json"
                            disabled={importPackageForm.processing}
                            onChange={(e) => importPackageForm.setData('package_file', e.target.files?.[0] || null)}
                            className="block w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer border border-slate-300 dark:border-slate-700 rounded-xl p-2 bg-slate-50 dark:bg-slate-900"
                        />
                        {importPackageForm.errors.package_file && (
                            <p className="mt-1.5 text-xs font-semibold text-red-600">{importPackageForm.errors.package_file}</p>
                        )}
                        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                            Ukuran maksimal 50 MB. Pastikan file merupakan hasil unduhan dari tombol <strong>Ekspor (.json)</strong>.
                        </p>
                    </div>
                </form>
            </Modal>

            {/* Modal Tambah / Edit Arbitrase (for ArbitrationTab) */}
            <Modal
                isOpen={isArbitratorModalOpen}
                onClose={() => {
                    setIsArbitratorModalOpen(false);
                    setEditingArbitrator(null);
                }}
                title={editingArbitrator ? 'Edit Data Arbitrase & Penugasan' : 'Tambah Personil Arbitrase Baru ke Event'}
                footer={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsArbitratorModalOpen(false);
                                setEditingArbitrator(null);
                            }}
                        >
                            Batal
                        </Button>
                        <Button onClick={submitArbitrator} loading={arbitratorForm.processing}>
                            {editingArbitrator ? 'Simpan Perubahan' : 'Simpan & Tugaskan'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submitArbitrator} className="space-y-4">
                    <Input
                        label="Nama Personil Arbitrase"
                        required
                        value={arbitratorForm.data.name}
                        onChange={(e) => arbitratorForm.setData('name', e.target.value)}
                        error={arbitratorForm.errors.name}
                        placeholder="Contoh: Sensei M. Djamhuri Djauhari"
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Combobox
                            label="Jenis Kelamin"
                            value={arbitratorForm.data.gender}
                            onChange={(val) => arbitratorForm.setData('gender', val)}
                            options={[
                                { value: 'male', label: 'Laki-laki' },
                                { value: 'female', label: 'Perempuan' },
                            ]}
                            clearable={false}
                            error={arbitratorForm.errors.gender}
                        />
                        <Combobox
                            label="Peran / Jabatan di Event"
                            value={arbitratorForm.data.role}
                            onChange={(value) => arbitratorForm.setData('role', value)}
                            options={arbitratorRoleOptions}
                            clearable={false}
                            error={arbitratorForm.errors.role}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Tingkatan Dan"
                            value={arbitratorForm.data.dan_grade}
                            onChange={(e) => arbitratorForm.setData('dan_grade', e.target.value)}
                            error={arbitratorForm.errors.dan_grade}
                            placeholder="Contoh: V DAN"
                        />
                        <Input
                            label="Tingkat Sertifikasi"
                            value={arbitratorForm.data.certification_level}
                            onChange={(e) => arbitratorForm.setData('certification_level', e.target.value)}
                            error={arbitratorForm.errors.certification_level}
                            placeholder="Contoh: Wasit Nasional / Dewan Arbitrase"
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Nomor Lisensi / NIK PERKEMI"
                            value={arbitratorForm.data.license_number}
                            onChange={(e) => arbitratorForm.setData('license_number', e.target.value)}
                            error={arbitratorForm.errors.license_number}
                            placeholder="Contoh: 69.1.13.03.99.001"
                        />
                        <Input
                            label="Wilayah / Pengda / Kota"
                            value={arbitratorForm.data.region}
                            onChange={(e) => arbitratorForm.setData('region', e.target.value)}
                            error={arbitratorForm.errors.region}
                            placeholder="Contoh: Kabupaten Malang"
                        />
                    </div>

                    <Input
                        label="Nomor Telepon"
                        value={arbitratorForm.data.phone}
                        onChange={(e) => arbitratorForm.setData('phone', e.target.value)}
                        error={arbitratorForm.errors.phone}
                        placeholder="08xxxxxxxxxx"
                    />

                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                        <strong>Akun login {editingArbitrator ? '(Opsional)' : 'opsional'}.</strong>{' '}
                        {editingArbitrator
                            ? 'Isi email untuk sinkronisasi akun login. Kosongkan kolom password jika tidak ingin mengubah password saat ini.'
                            : 'Isi email dan password agar Personil Arbitrase dapat login ke event ini.'}
                    </div>

                    <Input
                        label="Email Login"
                        type="email"
                        value={arbitratorForm.data.email}
                        onChange={(e) => arbitratorForm.setData('email', e.target.value)}
                        error={arbitratorForm.errors.email}
                        autoComplete="username"
                        placeholder="arbitrase@perkemi.id"
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label={editingArbitrator ? 'Password Baru (Kosongkan jika tetap)' : 'Password'}
                            type="password"
                            value={arbitratorForm.data.password}
                            onChange={(e) => arbitratorForm.setData('password', e.target.value)}
                            error={arbitratorForm.errors.password}
                            autoComplete="new-password"
                        />
                        <Input
                            label="Konfirmasi Password"
                            type="password"
                            value={arbitratorForm.data.password_confirmation}
                            onChange={(e) => arbitratorForm.setData('password_confirmation', e.target.value)}
                            autoComplete="new-password"
                        />
                    </div>
                </form>
            </Modal>

            {/* Modal Transfer Penugasan Universal (Arbitrase ⇄ Wasit ⇄ Koordinator) */}
            <TransferAssignmentModal
                isOpen={isTransferModalOpen}
                onClose={() => {
                    setIsTransferModalOpen(false);
                    setTransferTarget(null);
                }}
                transferTarget={transferTarget}
                transferForm={transferForm}
                submitTransfer={submitTransfer}
                arbitratorRoleOptions={arbitratorRoleOptions}
                refereeRoleOptions={refereeRoleOptions}
                fieldCoordinatorAreaOptions={fieldCoordinatorAreaOptions}
            />
        </AdminLayout>
    );
}
