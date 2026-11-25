import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import ActionMenuDropdown from '@/Components/UI/Elements/ActionMenuDropdown';
import {
    Card,
    Button,
    Checkbox,
    Input,
    RadioGroup,
    Textarea,
    Combobox,
    Modal,
    Pagination,
} from '@/Components/UI';

export default function EventIndex({
    events = { data: [], links: [], from: 1, to: 1, total: 0, current_page: 1, last_page: 1 },
    stats = {
        total_events: 0,
        active_events: 0,
        open_registration: 0,
        ongoing_events: 0,
        completed_events: 0,
        draft_events: 0,
    },
    activeEvent = null,
    filters = { search: '', status: 'all' },
    homepageSettings = { home_landing_mode: 'default', featured_event_id: '' },
    homepageEventOptions = [],
    auth = {},
}) {
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');

    // Modals state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [detailEvent, setDetailEvent] = useState(null);
    const [deletingEvent, setDeletingEvent] = useState(null);
    const [activeTab, setActiveTab] = useState('general'); // 'general' | 'schedule' | 'fees'
    const [isHomepageModalOpen, setIsHomepageModalOpen] = useState(false);

    // Event Package Import Modal
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const importFileInputRef = useRef(null);
    const importPackageForm = useForm({
        package_file: null,
    });

    const handleImportPackageSubmit = (e) => {
        e.preventDefault();
        if (!importPackageForm.data.package_file) {
            return;
        }
        importPackageForm.post('/admin/master/event/import-package', {
            preserveScroll: true,
            onSuccess: () => {
                setIsImportModalOpen(false);
                importPackageForm.reset();
                if (importFileInputRef.current) {
                    importFileInputRef.current.value = '';
                }
            },
        });
    };

    const homepageForm = useForm({
        home_landing_mode: homepageSettings.home_landing_mode || 'default',
        featured_event_id: homepageSettings.featured_event_id || '',
    });

    // Inertia form for Create & Edit
    const {
        data,
        setData,
        post,
        put,
        processing,
        errors,
        reset,
        clearErrors,
    } = useForm({
        name: '',
        edition: '',
        description: '',
        venue: '',
        city: '',
        province: '',
        start_date: '',
        end_date: '',
        registration_start: '',
        registration_end: '',
        is_paid: true,
        fee_per_athlete: 150000,
        fee_per_contingent: 0,
        status: 'open_registration',
        is_active: false,
        organizer: '',
        contact_person: '',
        contact_phone: '',
    });

    // Search filter submission
    const handleFilter = (newStatus = selectedStatus, newSearch = searchTerm) => {
        router.get(
            '/admin/master/event',
            {
                search: newSearch,
                status: newStatus,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        handleFilter(selectedStatus, searchTerm);
    };

    const handleStatusTabClick = (statusKey) => {
        setSelectedStatus(statusKey);
        handleFilter(statusKey, searchTerm);
    };

    const handlePageChange = (page) => {
        router.get(
            '/admin/master/event',
            {
                search: searchTerm,
                status: selectedStatus,
                page,
            },
            { preserveState: true, replace: true }
        );
    };

    // Open create modal
    const openCreateModal = () => {
        reset();
        clearErrors();
        setEditingEvent(null);
        setActiveTab('general');
        setIsCreateModalOpen(true);
    };

    // Open edit modal
    const openEditModal = (event) => {
        clearErrors();
        setEditingEvent(event);
        setActiveTab('general');
        setData({
            name: event.name || '',
            edition: event.edition || '',
            description: event.description || '',
            venue: event.venue || '',
            city: event.city || '',
            province: event.province || '',
            start_date: event.start_date || '',
            end_date: event.end_date || '',
            registration_start: event.registration_start || '',
            registration_end: event.registration_end || '',
            is_paid: event.is_paid ?? true,
            fee_per_athlete: event.fee_per_athlete || 0,
            fee_per_contingent: event.fee_per_contingent || 0,
            status: event.status || 'open_registration',
            is_active: event.is_active || false,
            organizer: event.organizer || '',
            contact_person: event.contact_person || '',
            contact_phone: event.contact_phone || '',
        });
        setIsCreateModalOpen(true);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (editingEvent) {
            put(`/admin/master/event/${editingEvent.id}`, {
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    setEditingEvent(null);
                    reset();
                },
            });
        } else {
            post('/admin/master/event', {
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleActivate = (eventId) => {
        router.post(
            `/admin/master/event/${eventId}/activate`,
            {},
            { preserveScroll: true }
        );
    };

    const confirmDelete = (e) => {
        e.preventDefault();
        if (!deletingEvent) return;
        router.delete(`/admin/master/event/${deletingEvent.id}`, {
            onSuccess: () => setDeletingEvent(null),
        });
    };

    const submitHomepageSettings = (e) => {
        e.preventDefault();
        homepageForm.put('/admin/master/event/homepage-settings', {
            preserveScroll: true,
            onSuccess: () => setIsHomepageModalOpen(false),
        });
    };

    const formatRupiah = (val) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(val || 0);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
                        <i className="fa-solid fa-circle-check text-[9px] text-emerald-500"></i>
                        Selesai
                    </span>
                );
            case 'open_registration':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Pendaftaran Buka
                    </span>
                );
            case 'ongoing':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Sedang Berlangsung
                    </span>
                );
            case 'closed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap">
                        <i className="fa-solid fa-lock text-[9px] text-rose-500"></i>
                        Pendaftaran Ditutup
                    </span>
                );
            case 'draft':
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                        <i className="fa-solid fa-clock text-[9px] text-slate-400"></i>
                        Akan Datang
                    </span>
                );
        }
    };

    const statusTabs = [
        { key: 'all', label: 'Semua Event', count: stats.total_events },
        { key: 'active', label: 'Event Aktif', count: stats.active_events },
        { key: 'open_registration', label: 'Pendaftaran Buka', count: stats.open_registration },
        { key: 'ongoing', label: 'Berlangsung', count: stats.ongoing_events },
        { key: 'completed', label: 'Selesai', count: stats.completed_events },
        { key: 'draft', label: 'Draft', count: stats.draft_events },
    ];

    const getEventActionItems = (event) => [
        {
            label: 'Mode Event (Panel Kerja)',
            description: 'Buka panel kerja operasional dan kendali turnamen',
            icon: <i className="fa-solid fa-right-to-bracket text-[#c0392b]" />,
            href: `/admin/event/${event.id}/enter`,
            tone: 'rose',
        },
        {
            label: 'Rincian & Informasi Event',
            description: 'Lihat ringkasan jadwal, lokasi, dan penyelenggara',
            icon: <i className="fa-solid fa-eye text-blue-600" />,
            onClick: () => setDetailEvent(event),
        },
        {
            label: 'Edit Data Event',
            description: 'Ubah nama, tanggal pelaksanaan, kuota, atau venue',
            icon: <i className="fa-solid fa-pen text-amber-600" />,
            onClick: () => openEditModal(event),
        },
        {
            label: 'Pengaturan Lanjutan (14 Tab)',
            description: 'Kelola kelompok umur, nomor tanding, wasit & court',
            icon: <i className="fa-solid fa-sliders text-[#d4a843]" />,
            href: `/admin/master/event/${event.id}/detail`,
        },
        {
            label: 'Ekspor Paket Data (.json)',
            description: 'Unduh paket sinkronisasi offline & backup arsip',
            icon: <i className="fa-solid fa-cloud-arrow-down text-teal-600" />,
            href: `/admin/master/event/${event.id}/export-package`,
            download: true,
            badge: 'JSON',
        },
        ...(event.slug ? [{
            label: 'Halaman Publik Event',
            description: 'Buka portal web pendaftaran publik kejuaraan',
            icon: <i className="fa-solid fa-globe text-emerald-600" />,
            href: `/event/${event.slug}`,
        }] : []),
        {
            divider: true,
        },
        {
            label: 'Hapus Event',
            description: 'Hapus data kejuaraan ini dari database',
            icon: <i className="fa-solid fa-trash-can text-rose-600" />,
            onClick: () => setDeletingEvent(event),
            tone: 'rose',
        },
    ];

    const globalEventSettingsItems = [
        {
            label: 'Landing Beranda',
            description: 'Atur event yang ditampilkan di halaman beranda utama',
            icon: <i className="fa-solid fa-house-chimney-window text-[#c0392b]" />,
            onClick: () => setIsHomepageModalOpen(true),
        },
        {
            label: 'Pengaturan Global (14 Tab)',
            description: 'Pengaturan detail komprehensif master event & aturan',
            icon: <i className="fa-solid fa-sliders text-[#d4a843]" />,
            href: '/admin/master/event/detail',
            isLink: true,
        },
        {
            label: 'Impor Event (.json)',
            description: 'Impor paket data event dari file JSON (sinkronisasi offline/online)',
            icon: <i className="fa-solid fa-cloud-arrow-up text-emerald-600" />,
            onClick: () => setIsImportModalOpen(true),
            badge: 'JSON',
        },
    ];

    return (
        <AdminLayout auth={auth} title="Master Event & Kejuaraan">
            <Head title="Master Event & Acara — Smart Perkemi" />

            {/* ════ HEADER SECTION ════ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="min-w-0">
                    <h1 className="font-sans text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Manajemen Event & Kejuaraan
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Kelola agenda kejuaraan, status operasional, serta pendaftaran setiap event secara terpisah.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    <ActionMenuDropdown
                        label="Pengaturan & Alat"
                        theme="light"
                        menuHeader="Alat & Konfigurasi Global"
                        icon={<i className="fa-solid fa-sliders text-xs text-[#d4a843]" />}
                        items={globalEventSettingsItems}
                    />
                    <Button variant="unstyled" size="none"
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-transparent bg-[#c0392b] hover:bg-[#a93226] text-white font-semibold text-xs md:text-sm shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                    >
                        <i className="fa-solid fa-circle-plus text-xs" />
                        <span>Tambah Event Baru</span>
                    </Button>
                </div>
            </div>

            {/* ════ 4 POLISHED STAT CARDS ════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {/* 1. Total Seluruh Event */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Total Seluruh Event
                        </span>
                        <div className="size-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-[#c0392b] flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/30">
                            <i className="fa-solid fa-trophy text-xs" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                            {stats.total_events}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] border border-slate-200 dark:border-slate-700">
                                <i className="fa-solid fa-database text-[9px] text-[#c0392b]" />
                                Terdata di sistem
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Event Operasional */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Event Operasional
                        </span>
                        <div className="size-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-[#b8860b] flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-900/30 shadow-2xs">
                            <i className="fa-solid fa-star text-xs" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                            {stats.active_events || 0}
                        </div>
                        <div className="mt-2 text-xs">
                            <span className="text-slate-500 dark:text-slate-400 text-[11px] tabular-nums">
                                {stats.active_events === 1 ? '1 event aktif di menu kerja' : `${stats.active_events || 0} event dapat berjalan bersamaan`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Pendaftaran Terbuka */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Pendaftaran Terbuka
                        </span>
                        <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/30">
                            <i className="fa-solid fa-door-open text-xs" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                            {stats.open_registration}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium text-[11px] border border-blue-200 dark:border-blue-800">
                                <i className="fa-solid fa-user-plus text-[9px]" />
                                Menerima kontingen
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Event Selesai / Arsip */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Event Selesai / Arsip
                        </span>
                        <div className="size-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/30">
                            <i className="fa-solid fa-box-archive text-xs" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                            {stats.completed_events}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium text-[11px] border border-emerald-200 dark:border-emerald-800">
                                <i className="fa-solid fa-medal text-[9px]" />
                                Riwayat medali tersimpan
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════ ACTIVE EVENT HERO BANNER (EXECUTIVE & CLEAN) ════ */}
            {/* {activeEvent && (
                <div className="relative rounded-2xl p-5 md:p-6 mb-6 border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs transition-all">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        <div className="space-y-2.5 max-w-2xl min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                                    <i className="fa-solid fa-crown text-[10px] text-[#b8860b]" />
                                    Event Utama Aktif
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 tabular-nums">
                                    <i className="fa-regular fa-calendar text-[#3498db]" />
                                    {activeEvent.dates}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    <i className="fa-solid fa-location-dot text-[#c0392b]" />
                                    {activeEvent.venue}, {activeEvent.city}
                                </span>
                            </div>

                            <div>
                                <h2 className="font-sans text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                                    {activeEvent.name}
                                </h2>
                                {activeEvent.edition && (
                                    <p className="text-xs text-[#b8860b] dark:text-[#f0c060] font-medium tracking-wide mt-0.5">
                                        {activeEvent.edition}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-xs text-slate-600 dark:text-slate-400">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <i className="fa-solid fa-flag text-[#b8860b] text-[11px]" />
                                    <strong className="text-slate-900 dark:text-white tabular-nums">{activeEvent.contingents_count}</strong> Kontingen Terhubung
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <i className="fa-solid fa-file-signature text-emerald-600 text-[11px]" />
                                    <strong className="text-slate-900 dark:text-white tabular-nums">{activeEvent.registrations_count}</strong> Berkas Registrasi
                                </span>
                            </div>
                            {stats.active_events > 1 && (
                                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                    Terdapat {stats.active_events} event aktif. Data registrasi, nomor pertandingan, verifikasi, drawing, dan merge dipisahkan berdasarkan event yang dipilih.
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                            <a
                                href={`/admin/event/${activeEvent.id}/enter`}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#c0392b] hover:bg-[#a93226] text-white text-xs md:text-sm font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
                                title="Masuk Mode Event untuk mengelola kejuaraan ini"
                            >
                                <i className="fa-solid fa-right-to-bracket text-xs" />
                                <span>Masuk Mode Event</span>
                                <i className="fa-solid fa-arrow-right text-[11px] text-white/80" />
                            </a>
                            <Link
                                href={`/admin/master/event/${activeEvent.id}/detail`}
                                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs md:text-sm font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                                title="Pengaturan & Detail Event (Kelompok Umur, Court, Nomor Tanding)"
                            >
                                <i className="fa-solid fa-sliders text-[#b8860b] text-xs" />
                                <span>Kelola Detail</span>
                            </Link>
                        </div>
                    </div>
                </div>
            )} */}

            {/* ════ FILTER, SEARCH & VIEW CONTROLS ════ */}
            <div className="p-3.5 mb-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#ede9e1] dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Status Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                    {statusTabs.map((tab) => {
                        const isSelected = selectedStatus === tab.key;
                        return (
                            <Button variant="unstyled" size="none"
                                key={tab.key}
                                type="button"
                                onClick={() => handleStatusTabClick(tab.key)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${isSelected
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs font-semibold'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <span>{tab.label}</span>
                                <span
                                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none tabular-nums ${isSelected
                                            ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                        }`}
                                >
                                    {tab.count}
                                </span>
                            </Button>
                        );
                    })}
                </div>

                {/* Search & View Mode Switcher */}
                <div className="flex items-center gap-3 shrink-0">
                    <form onSubmit={handleSearchSubmit} className="w-full sm:w-64">
                        <Input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Cari event, venue, kota..."
                            iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                            clearable
                            onClear={() => {
                                setSearchTerm('');
                                handleFilter(selectedStatus, '');
                            }}
                            size="sm"
                        />
                    </form>

                    {/* View Switcher */}
                    <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shrink-0">
                        <Button variant="unstyled" size="none"
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'table'
                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            title="Tampilan Tabel"
                        >
                            <i className="fa-solid fa-list text-xs" />
                            <span className="hidden sm:inline">Tabel</span>
                        </Button>
                        <Button variant="unstyled" size="none"
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'grid'
                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            title="Tampilan Kartu"
                        >
                            <i className="fa-solid fa-border-all text-xs" />
                            <span className="hidden sm:inline">Kartu</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* ════ MAIN CONTENT (TABLE OR GRID) ════ */}
            {events.data.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                    <div className="size-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#c0392b] flex items-center justify-center mx-auto mb-4 text-xl border border-rose-100 dark:border-rose-900/30">
                        <i className="fa-solid fa-calendar-xmark" />
                    </div>
                    <h3 className="font-sans text-base font-bold text-slate-900 dark:text-white">
                        Tidak Ada Event Ditemukan
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                        Belum ada event kejuaraan dengan kriteria pencarian ini. Anda dapat membuat agenda event baru.
                    </p>
                    <Button variant="unstyled" size="none"
                        type="button"
                        onClick={openCreateModal}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#c0392b] hover:bg-[#a93226] text-white text-xs font-semibold cursor-pointer shadow-2xs"
                    >
                        <i className="fa-solid fa-plus" />
                        <span>Tambah Event Baru</span>
                    </Button>
                </div>
            ) : viewMode === 'table' ? (
                /* ════ ELEVATED & TIDY TABLE VIEW (NO HORIZONTAL OVERFLOW) ════ */
                <div className="mb-6 rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
                    <TableContainer ariaLabel="Tabel data master kejuaraan">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#ede9e1] dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                                    <th className="py-3 px-4">Nama Kejuaraan</th>
                                    <th className="py-3 px-3">Lokasi & Venue</th>
                                    <th className="py-3 px-3 whitespace-nowrap">Jadwal Acara</th>
                                    <th className="py-3 px-3 whitespace-nowrap">Biaya Registrasi</th>
                                    <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                                    <th className="py-3 px-3 text-center whitespace-nowrap">Partisipasi</th>
                                    <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ede9e1] dark:divide-slate-800">
                                {events.data.map((event) => (
                                    <tr
                                        key={event.id}
                                        className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${event.is_active
                                                ? 'bg-amber-50/20 dark:bg-amber-950/10 border-l-4 border-l-[#d4a843]'
                                                : 'border-l-4 border-l-transparent'
                                            }`}
                                    >
                                        {/* Column 1: Nama Kejuaraan */}
                                        <td className="py-3.5 px-4 min-w-[200px] max-w-[280px]">
                                            <div className="flex items-start gap-3">
                                                {event.cover_image_url ? (
                                                    <img src={event.cover_image_url} alt="" className="size-10 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 object-cover" />
                                                ) : (
                                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500" title="Event Perkemi">
                                                        <i className="fa-solid fa-trophy text-xs text-[#d4a843]" />
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => setDetailEvent(event)}
                                                            className="font-semibold text-xs md:text-[13px] text-slate-900 dark:text-white hover:text-[#c0392b] dark:hover:text-rose-400 transition-colors text-left leading-snug line-clamp-2 cursor-pointer"
                                                        >
                                                            {event.name}
                                                        </button>
                                                        {event.is_active && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-800 dark:text-amber-300 shrink-0 whitespace-nowrap">
                                                                <i className="fa-solid fa-star text-[8px]" />
                                                                Operasional
                                                            </span>
                                                        )}
                                                    </div>
                                                    {event.edition && (
                                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5 line-clamp-1">
                                                            {event.edition}
                                                        </div>
                                                    )}
                                                    {event.slug && (
                                                        <div className="mt-1">
                                                            <a
                                                                href={`/event/${event.slug}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#c0392b] dark:text-rose-400 hover:underline"
                                                                title={`Buka Portal Publik: /event/${event.slug}`}
                                                            >
                                                                <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
                                                                <span>Portal Publik</span>
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Column 2: Lokasi & Venue */}
                                        <td className="py-3.5 px-3 min-w-[140px] max-w-[200px]">
                                            <div className="font-medium text-slate-900 dark:text-white text-xs truncate" title={event.venue}>
                                                {event.venue}
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 truncate" title={event.city}>
                                                <i className="fa-solid fa-location-dot text-[10px] text-[#c0392b] shrink-0" />
                                                <span className="truncate">{event.city}</span>
                                            </div>
                                        </td>

                                        {/* Column 3: Jadwal Acara */}
                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                            <div className="font-medium text-slate-900 dark:text-white text-xs flex items-center gap-1.5 tabular-nums">
                                                <i className="fa-regular fa-calendar text-[11px] text-sky-500" />
                                                <span>{event.start_date_formatted}</span>
                                                <span className="text-slate-400">—</span>
                                                <span>{event.end_date_formatted}</span>
                                            </div>
                                            {event.registration_end_formatted && (
                                                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                                                    Pendaftaran s/d {event.registration_end_formatted}
                                                </div>
                                            )}
                                        </td>

                                        {/* Column 4: Biaya Registrasi */}
                                        <td className="py-3.5 px-3 whitespace-nowrap tabular-nums">
                                            {event.is_paid ? (
                                                <>
                                                    <div className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                                                        {formatRupiah(event.fee_per_athlete)}
                                                        <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400"> / atlet</span>
                                                    </div>
                                                    {event.fee_per_contingent > 0 && (
                                                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                            Kontingen: {formatRupiah(event.fee_per_contingent)}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="inline-flex rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                                    Gratis
                                                </span>
                                            )}
                                        </td>

                                        {/* Column 5: Status */}
                                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                            {getStatusBadge(event.status)}
                                        </td>

                                        {/* Column 6: Partisipasi */}
                                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5 tabular-nums">
                                                <div className="px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center min-w-[52px]">
                                                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                        {event.contingents_count}
                                                    </span>
                                                    <span className="text-[9px] text-slate-500 dark:text-slate-400 block leading-tight">
                                                        Kontingen
                                                    </span>
                                                </div>
                                                <div className="px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center min-w-[52px]">
                                                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                        {event.registrations_count}
                                                    </span>
                                                    <span className="text-[9px] text-slate-500 dark:text-slate-400 block leading-tight">
                                                        Berkas
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Column 7: Aksi */}
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center justify-end gap-1.5">
                                                {!event.is_active ? (
                                                    <Button
                                                        variant="unstyled"
                                                        size="none"
                                                        type="button"
                                                        onClick={() => handleActivate(event.id)}
                                                        className="px-2 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/20 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                                        title="Aktifkan event ini untuk menu operasional"
                                                    >
                                                        <i className="fa-solid fa-star text-[10px] text-[#d4a843]" />
                                                        <span>Aktifkan</span>
                                                    </Button>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                                        <i className="fa-solid fa-check text-[9px]" />
                                                        <span>Aktif</span>
                                                    </span>
                                                )}

                                                <a
                                                    href={`/admin/event/${event.id}/enter`}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#c0392b] hover:bg-[#a93226] text-white font-semibold text-xs shadow-2xs transition-all cursor-pointer active:scale-95"
                                                    title="Masuk Mode Event untuk mengelola turnamen ini"
                                                >
                                                    <i className="fa-solid fa-right-to-bracket text-[10px]" />
                                                    <span>Mode Event</span>
                                                </a>

                                                <ActionMenuDropdown
                                                    menuHeader="Aksi Kejuaraan"
                                                    theme="light"
                                                    items={getEventActionItems(event)}
                                                    trigger={
                                                        <button
                                                            type="button"
                                                            className="size-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer"
                                                            title="Menu Aksi Lainnya"
                                                            aria-label="Menu aksi lainnya"
                                                        >
                                                            <i className="fa-solid fa-ellipsis-vertical text-xs" />
                                                        </button>
                                                    }
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </TableContainer>

                    {/* Pagination for Table View */}
                    {events.total > 0 && (
                        <Pagination
                            pagination={events}
                            label="event"
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
            ) : (
                <>
                    {/* ════ GRID CARDS VIEW (4 COLUMNS & RICH COVER IMAGES) ════ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 md:gap-5 mb-6">
                        {events.data.map((event) => (
                            <div
                                key={event.id}
                                className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between bg-white dark:bg-slate-900 relative overflow-hidden group hover:shadow-md ${event.is_active
                                        ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/20 shadow-xs'
                                        : 'border-[#ede9e1] dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                            >
                                {/* Card Cover Image Header */}
                                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900 select-none">
                                    {event.cover_image_url ? (
                                        <img
                                            src={event.cover_image_url}
                                            alt={event.name}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-[#1c1714] via-[#2a1c17] to-[#120f0e]">
                                            <img
                                                src="/hero-fighters.png"
                                                alt=""
                                                className="h-full w-full object-cover opacity-35 mix-blend-luminosity filter transition-transform duration-300 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/35" />
                                            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white/90">
                                                <span className="font-serif text-2xl font-black text-white/25 select-none leading-none">拳</span>
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-xs text-[10px] font-semibold text-amber-200 border border-white/10">
                                                    <i className="fa-solid fa-trophy text-[9px] text-[#d4a843]" />
                                                    <span>PERKEMI</span>
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Subtle Top & Bottom Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                                    {/* Top Badges over Image */}
                                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
                                        <div className="pointer-events-auto shadow-xs">
                                            {getStatusBadge(event.status)}
                                        </div>

                                        {event.is_active ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950 shadow-xs pointer-events-auto">
                                                <i className="fa-solid fa-star text-[8px]" />
                                                <span>Aktif</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-black/60 backdrop-blur-md text-white border border-white/15 tabular-nums pointer-events-auto shadow-xs">
                                                <i className="fa-regular fa-calendar text-[9px] text-sky-300" />
                                                <span>{event.start_date_formatted}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 flex-1 flex flex-col justify-between">
                                    <div>
                                        {/* Event Title */}
                                        <h3
                                            onClick={() => setDetailEvent(event)}
                                            className="font-sans font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#c0392b] dark:group-hover:text-rose-400 transition-colors line-clamp-2 leading-snug cursor-pointer"
                                            title={event.name}
                                        >
                                            {event.name}
                                        </h3>
                                        {event.edition && (
                                            <p className="text-[11px] text-[#b8860b] dark:text-[#f0c060] font-medium mt-1 line-clamp-1" title={event.edition}>
                                                {event.edition}
                                            </p>
                                        )}

                                        {/* Location & Details */}
                                        <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                                            <div className="flex items-center gap-2" title={`${event.venue}, ${event.city}`}>
                                                <i className="fa-solid fa-location-dot w-3.5 text-[#c0392b] text-[11px] shrink-0" />
                                                <span className="truncate">{event.venue}, {event.city}</span>
                                            </div>
                                            <div className="flex items-center gap-2 tabular-nums">
                                                <i className="fa-regular fa-calendar-days w-3.5 text-sky-500 text-[11px] shrink-0" />
                                                <span className="truncate">{event.start_date_formatted} — {event.end_date_formatted}</span>
                                            </div>
                                            <div className="flex items-center gap-2 tabular-nums">
                                                <i className="fa-solid fa-ticket w-3.5 text-emerald-600 text-[11px] shrink-0" />
                                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                    {event.is_paid ? formatRupiah(event.fee_per_athlete) : 'Gratis'}
                                                </span>
                                                {event.is_paid && <span className="text-[10px] text-slate-500 dark:text-slate-400">/ atlet</span>}
                                            </div>
                                            {event.organizer && (
                                                <div className="flex items-center gap-2" title={event.organizer}>
                                                    <i className="fa-solid fa-building-columns w-3.5 text-purple-600 text-[11px] shrink-0" />
                                                    <span className="truncate">{event.organizer}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3 Metric Chips */}
                                    <div className="mt-3.5 pt-3 border-t border-[#ede9e1] dark:border-slate-800 grid grid-cols-3 gap-1.5 text-center text-xs tabular-nums">
                                        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl py-1.5 px-1 border border-slate-200/80 dark:border-slate-700">
                                            <p className="font-bold text-xs text-slate-900 dark:text-white">{event.contingents_count}</p>
                                            <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Kontingen</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl py-1.5 px-1 border border-slate-200/80 dark:border-slate-700">
                                            <p className="font-bold text-xs text-slate-900 dark:text-white">{event.registrations_count}</p>
                                            <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Pendaftar</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl py-1.5 px-1 border border-slate-200/80 dark:border-slate-700">
                                            <p className="font-bold text-xs text-slate-900 dark:text-white">{event.rundowns_count}</p>
                                            <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Rundown</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer Actions */}
                                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-[#ede9e1] dark:border-slate-800 flex items-center justify-between gap-1.5">
                                    <div>
                                        {!event.is_active ? (
                                            <Button variant="unstyled" size="none"
                                                type="button"
                                                onClick={() => handleActivate(event.id)}
                                                className="text-xs font-semibold text-amber-800 dark:text-amber-300 hover:text-amber-900 flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors"
                                                title="Aktifkan event ini untuk menu operasional"
                                            >
                                                <i className="fa-solid fa-star text-[10px] text-[#d4a843]" />
                                                <span>Aktifkan</span>
                                            </Button>
                                        ) : (
                                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                                                <i className="fa-solid fa-check text-[9px]" />
                                                <span>Aktif</span>
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <a
                                            href={`/admin/event/${event.id}/enter`}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#c0392b] hover:bg-[#a93226] text-white font-semibold text-xs shadow-2xs transition-all cursor-pointer hover:shadow-xs active:scale-95 shrink-0"
                                            title="Masuk Mode Event untuk mengelola turnamen ini"
                                        >
                                            <i className="fa-solid fa-right-to-bracket text-[10px]" />
                                            <span>Mode Event</span>
                                        </a>

                                        <ActionMenuDropdown
                                            menuHeader="Aksi Kejuaraan"
                                            theme="light"
                                            items={getEventActionItems(event)}
                                            trigger={
                                                <button
                                                    type="button"
                                                    className="size-7.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                                                    title="Menu Aksi Lainnya"
                                                    aria-label="Menu aksi lainnya"
                                                >
                                                    <i className="fa-solid fa-ellipsis-vertical text-xs" />
                                                </button>
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination for Grid View */}
                    {events.total > 0 && (
                        <Pagination
                            pagination={events}
                            label="event"
                            variant="card"
                            onPageChange={handlePageChange}
                        />
                    )}
                </>
            )}

            <Modal
                isOpen={isHomepageModalOpen}
                onClose={() => setIsHomepageModalOpen(false)}
                title="Pengaturan Landing Page Utama"
                subtitle="Pilih isi beranda utama tanpa menghapus landing SMART-PERKEMI yang sekarang"
                size="lg"
                footer={
                    <div className="flex w-full items-center justify-end gap-2">
                        <Button variant="unstyled" size="none" type="button" onClick={() => setIsHomepageModalOpen(false)}
                            className="px-4 py-2 rounded-xl border border-[#ded8ce] bg-white text-xs font-semibold text-[#706860] hover:bg-[#f7f4ef]">
                            Batal
                        </Button>
                        <Button variant="unstyled" size="none" type="submit" form="homepage-settings-form" disabled={homepageForm.processing}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#c0392b] text-white text-xs font-semibold hover:bg-[#a93226] disabled:opacity-60">
                            <i className="fa-solid fa-check"></i>
                            {homepageForm.processing ? 'Menyimpan...' : 'Simpan Pengaturan'}
                        </Button>
                    </div>
                }
            >
                <form id="homepage-settings-form" onSubmit={submitHomepageSettings} className="space-y-5">
                    <RadioGroup
                        name="home_landing_mode"
                        label="Mode Beranda"
                        variant="cards"
                        value={homepageForm.data.home_landing_mode}
                        onChange={(value) => homepageForm.setData('home_landing_mode', value)}
                        error={homepageForm.errors.home_landing_mode}
                        options={[
                            {
                                value: 'default',
                                label: 'Landing SMART-PERKEMI',
                                description: 'Gunakan kembali halaman utama organisasi yang sekarang.',
                                icon: <i className="fa-solid fa-building-columns text-[#c0392b]"></i>,
                            },
                            {
                                value: 'featured_event',
                                label: 'Event Pilihan',
                                description: 'Tampilkan landing satu event yang ditentukan admin.',
                                icon: <i className="fa-solid fa-star text-[#d4a843]"></i>,
                            },
                            {
                                value: 'upcoming_event',
                                label: 'Event Terdekat',
                                description: 'Pilih otomatis event publik dengan jadwal paling dekat.',
                                icon: <i className="fa-solid fa-calendar-check text-emerald-600"></i>,
                            },
                        ]}
                    />

                    {homepageForm.data.home_landing_mode === 'featured_event' && (
                        <Combobox
                            label="Event yang Ditampilkan"
                            value={homepageForm.data.featured_event_id}
                            onChange={(value) => homepageForm.setData('featured_event_id', value)}
                            options={homepageEventOptions}
                            placeholder="Pilih event untuk landing utama..."
                            searchPlaceholder="Cari nama event..."
                            error={homepageForm.errors.featured_event_id}
                        />
                    )}

                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                        <i className="fa-solid fa-circle-info mr-2 text-amber-600"></i>
                        Halaman publik <strong>/event/slug-event</strong> tetap tersedia pada semua mode. Pengaturan ini hanya mengubah isi URL beranda <strong>/</strong>.
                    </div>
                </form>
            </Modal>

            {/* ════ MODAL CREATE / EDIT EVENT (POLISHED) ════ */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title={editingEvent ? 'Perbarui Data Event' : 'Tambah Event Kejuaraan Baru'}
                subtitle="Isi spesifikasi lengkap pelaksanaan agenda kejuaraan Perkemi"
                size="2xl"
                footer={
                    <div className="flex items-center justify-between w-full">
                        <div className="text-xs text-[#8c827a]">
                            * Kolom bertanda bintang wajib diisi
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsCreateModalOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                loading={processing}
                                onClick={handleFormSubmit}
                            >
                                {editingEvent ? 'Simpan Perubahan' : 'Buat Event'}
                            </Button>
                        </div>
                    </div>
                }
            >
                {/* Form Tabs */}
                <div className="flex border-b border-[#ede9e1] mb-5 gap-4 text-xs font-medium">
                    <Button variant="unstyled" size="none"
                        type="button"
                        onClick={() => setActiveTab('general')}
                        className={`pb-2.5 transition-colors cursor-pointer relative ${activeTab === 'general'
                                ? 'text-[#c0392b] font-bold border-b-2 border-[#c0392b]'
                                : 'text-[#706860] hover:text-black'
                            }`}
                    >
                        1. Informasi Dasar
                    </Button>
                    <Button variant="unstyled" size="none"
                        type="button"
                        onClick={() => setActiveTab('schedule')}
                        className={`pb-2.5 transition-colors cursor-pointer relative ${activeTab === 'schedule'
                                ? 'text-[#c0392b] font-bold border-b-2 border-[#c0392b]'
                                : 'text-[#706860] hover:text-black'
                            }`}
                    >
                        2. Waktu & Lokasi
                    </Button>
                    <Button variant="unstyled" size="none"
                        type="button"
                        onClick={() => setActiveTab('fees')}
                        className={`pb-2.5 transition-colors cursor-pointer relative ${activeTab === 'fees'
                                ? 'text-[#c0392b] font-bold border-b-2 border-[#c0392b]'
                                : 'text-[#706860] hover:text-black'
                            }`}
                    >
                        3. Biaya, Status & Kontak
                    </Button>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                    {/* TAB 1: Informasi Dasar */}
                    {activeTab === 'general' && (
                        <div className="space-y-4">
                            <Input
                                label="Nama Kejuaraan / Event"
                                required
                                value={data.name}
                                onChange={(event) => setData('name', event.target.value)}
                                placeholder="Contoh: Kejurnas Shorinji Kempo Antar Kota 2026"
                                error={errors.name}
                                size="sm"
                            />

                            <Input
                                label="Edisi / Sub-judul / Piala"
                                value={data.edition}
                                onChange={(event) => setData('edition', event.target.value)}
                                placeholder="Contoh: Piala Walikota Surabaya Ke-X"
                                error={errors.edition}
                                size="sm"
                            />

                            <Input
                                label="Penyelenggara / Panitia Pelaksana"
                                value={data.organizer}
                                onChange={(event) => setData('organizer', event.target.value)}
                                placeholder="Contoh: Pengkot PERKEMI Kota Surabaya & PB PERKEMI"
                                error={errors.organizer}
                                size="sm"
                            />

                            <Textarea
                                label="Deskripsi Singkat Acara"
                                rows={3}
                                value={data.description}
                                onChange={(event) => setData('description', event.target.value)}
                                placeholder="Jelaskan nomor yang dipertandingkan, tujuan kejuaraan, atau ketentuan khusus..."
                                error={errors.description}
                            />
                        </div>
                    )}

                    {/* TAB 2: Waktu & Lokasi */}
                    {activeTab === 'schedule' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    label="Kota / Kabupaten Pelaksanaan"
                                    required
                                    value={data.city}
                                    onChange={(event) => setData('city', event.target.value)}
                                    placeholder="Contoh: Kota Surabaya"
                                    error={errors.city}
                                    size="sm"
                                />

                                <Input
                                    label="Provinsi"
                                    value={data.province}
                                    onChange={(event) => setData('province', event.target.value)}
                                    placeholder="Contoh: Jawa Timur"
                                    error={errors.province}
                                    size="sm"
                                />
                            </div>

                            <Input
                                label="Venue / Gedung Olahraga (GOR)"
                                required
                                value={data.venue}
                                onChange={(event) => setData('venue', event.target.value)}
                                placeholder="Contoh: GOR Gelora Pancasila"
                                error={errors.venue}
                                size="sm"
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    type="date"
                                    label="Tanggal Mulai Pertandingan"
                                    required
                                    value={data.start_date}
                                    onChange={(event) => setData('start_date', event.target.value)}
                                    error={errors.start_date}
                                    size="sm"
                                />

                                <Input
                                    type="date"
                                    label="Tanggal Selesai Pertandingan"
                                    required
                                    value={data.end_date}
                                    onChange={(event) => setData('end_date', event.target.value)}
                                    error={errors.end_date}
                                    size="sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    type="date"
                                    label="Pendaftaran Dibuka (Opsional)"
                                    value={data.registration_start}
                                    onChange={(event) => setData('registration_start', event.target.value)}
                                    error={errors.registration_start}
                                    size="sm"
                                />

                                <Input
                                    type="date"
                                    label="Batas Akhir Pendaftaran (Opsional)"
                                    value={data.registration_end}
                                    onChange={(event) => setData('registration_end', event.target.value)}
                                    error={errors.registration_end}
                                    size="sm"
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB 3: Biaya, Status & Kontak */}
                    {activeTab === 'fees' && (
                        <div className="space-y-4">
                            <RadioGroup
                                label="Skema Biaya Event"
                                name="event-pricing-mode"
                                variant="cards"
                                value={data.is_paid ? 'paid' : 'free'}
                                onChange={(value) => setData('is_paid', value === 'paid')}
                                error={errors.is_paid}
                                options={[
                                    { value: 'paid', label: 'Event Berbayar', description: 'Kontingen membayar biaya registrasi dan/atau biaya per atlet.', icon: <i className="fa-solid fa-wallet" /> },
                                    { value: 'free', label: 'Event Gratis', description: 'Registrasi tanpa tagihan, kode unik, atau metode pembayaran.', icon: <i className="fa-solid fa-gift" /> },
                                ]}
                            />

                            {data.is_paid ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    type="number"
                                    label="Biaya Registrasi per Atlet (IDR)"
                                    required
                                    value={data.fee_per_athlete}
                                    onChange={(event) => setData('fee_per_athlete', event.target.value)}
                                    placeholder="150000"
                                    error={errors.fee_per_athlete}
                                    size="sm"
                                />

                                <Input
                                    type="number"
                                    label="Biaya per Kontingen (IDR)"
                                    value={data.fee_per_contingent}
                                    onChange={(event) => setData('fee_per_contingent', event.target.value)}
                                    placeholder="0"
                                    error={errors.fee_per_contingent}
                                    size="sm"
                                />
                            </div> : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                                <p className="font-semibold"><i className="fa-solid fa-circle-check mr-2" />Registrasi tanpa biaya</p>
                                <p className="mt-1 text-xs text-emerald-700">Nilai biaya akan disimpan Rp0 dan peserta dapat melewati langkah pembayaran.</p>
                            </div>}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    label="Contact Person (Panitia)"
                                    value={data.contact_person}
                                    onChange={(event) => setData('contact_person', event.target.value)}
                                    placeholder="Sensei Hendra Wijaya"
                                    error={errors.contact_person}
                                    size="sm"
                                />

                                <Input
                                    type="tel"
                                    label="No. WhatsApp / Telepon Panitia"
                                    value={data.contact_phone}
                                    onChange={(event) => setData('contact_phone', event.target.value)}
                                    placeholder="0812-3456-7890"
                                    error={errors.contact_phone}
                                    size="sm"
                                />
                            </div>

                            <Combobox
                                label="Status Kejuaraan"
                                required
                                options={[
                                    { value: 'draft', label: 'Draft (Belum Dipublikasikan)', sublabel: 'Hanya terlihat administrator' },
                                    { value: 'open_registration', label: 'Pendaftaran Dibuka', sublabel: 'Kontingen dapat mendaftarkan atlet' },
                                    { value: 'ongoing', label: 'Sedang Berlangsung', sublabel: 'Pertandingan aktif berjalan' },
                                    { value: 'completed', label: 'Selesai', sublabel: 'Event dan bagan telah selesai' },
                                    { value: 'closed', label: 'Pendaftaran Ditutup', sublabel: 'Pendaftaran terkunci' },
                                ]}
                                value={data.status}
                                onChange={(val) => setData('status', val)}
                                clearable={false}
                                searchPlaceholder="Cari status event..."
                                error={errors.status}
                            />

                            <div className="pt-3 border-t border-[#ede9e1]">
                                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-[#d4a843]/30">
                                    <Checkbox
                                        label="Aktifkan Event untuk Operasional"
                                        description="Event aktif tersedia di menu registrasi dan pertandingan. Event aktif lain tetap berjalan."
                                        checked={data.is_active}
                                        onChange={(event) => setData('is_active', event.target.checked)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </Modal>

            {/* ════ MODAL DETAIL EVENT ════ */}
            <Modal
                isOpen={!!detailEvent}
                onClose={() => setDetailEvent(null)}
                title={detailEvent?.name}
                subtitle={detailEvent?.edition || 'Rincian Lengkap Event Kejuaraan'}
                size="lg"
                footer={
                    <div className="flex items-center justify-between w-full">
                        <div>
                            {detailEvent && !detailEvent.is_active && (
                                <Button variant="unstyled" size="none"
                                    type="button"
                                    onClick={() => {
                                        handleActivate(detailEvent.id);
                                        setDetailEvent(null);
                                    }}
                                    className="text-xs font-semibold text-[#b8860b] hover:underline cursor-pointer flex items-center gap-1.5"
                                >
                                    <i className="fa-solid fa-star text-[10px]"></i>
                                    <span>Aktifkan Event Ini</span>
                                </Button>
                            )}
                        </div>
                        <Button variant="unstyled" size="none"
                            type="button"
                            onClick={() => setDetailEvent(null)}
                            className="px-4 py-2 rounded-xl bg-[#0f0d0b] text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
                        >
                            Tutup
                        </Button>
                    </div>
                }
            >
                {detailEvent && (
                    <div className="space-y-4 text-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-[#ede9e1]">
                            <span className="text-[#8c827a] font-medium">Status Kejuaraan</span>
                            {getStatusBadge(detailEvent.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-3 py-1">
                            <div>
                                <span className="text-[#8c827a] block text-[11px]">Venue / Lokasi</span>
                                <span className="font-bold text-[#0f0d0b] text-xs">
                                    {detailEvent.venue}, {detailEvent.city}
                                </span>
                            </div>
                            <div>
                                <span className="text-[#8c827a] block text-[11px]">Provinsi</span>
                                <span className="font-bold text-[#0f0d0b] text-xs">
                                    {detailEvent.province || '-'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 py-1">
                            <div>
                                <span className="text-[#8c827a] block text-[11px]">Tanggal Pelaksanaan</span>
                                <span className="font-bold text-[#0f0d0b] text-xs">
                                    {detailEvent.start_date_formatted} s/d {detailEvent.end_date_formatted}
                                </span>
                            </div>
                            <div>
                                <span className="text-[#8c827a] block text-[11px]">Batas Pendaftaran</span>
                                <span className="font-bold text-[#0f0d0b] text-xs">
                                    {detailEvent.registration_end_formatted || 'Tidak Ditentukan'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 py-1">
                            <div>
                                <span className="text-[#8c827a] block text-[11px]">Biaya per Atlet</span>
                                <span className="font-bold text-[#27ae60] text-xs">
                                    {detailEvent.is_paid ? formatRupiah(detailEvent.fee_per_athlete) : 'Gratis'}
                                </span>
                            </div>
                            <div>
                                <span className="text-[#8c827a] block text-[11px]">Biaya per Kontingen</span>
                                <span className="font-bold text-[#0f0d0b] text-xs">
                                    {detailEvent.is_paid ? formatRupiah(detailEvent.fee_per_contingent) : 'Gratis'}
                                </span>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-[#ede9e1]">
                            <span className="text-[#8c827a] block text-[11px]">Penyelenggara & Kontak</span>
                            <p className="font-medium text-[#0f0d0b] mt-0.5">
                                {detailEvent.organizer || '-'}
                            </p>
                            {detailEvent.contact_person && (
                                <p className="text-[#706860] mt-0.5">
                                    CP: {detailEvent.contact_person} ({detailEvent.contact_phone || '-'})
                                </p>
                            )}
                        </div>

                        {detailEvent.description && (
                            <div className="pt-3 border-t border-[#ede9e1]">
                                <span className="text-[#8c827a] block text-[11px]">Deskripsi Acara</span>
                                <p className="text-[#706860] mt-1 leading-relaxed bg-[#f7f4ef] p-3 rounded-xl border border-[#ede9e1]">
                                    {detailEvent.description}
                                </p>
                            </div>
                        )}

                        <div className="pt-3 border-t border-[#ede9e1] grid grid-cols-3 gap-2 text-center">
                            <div className="bg-[#f7f4ef] p-2.5 rounded-xl border border-[#ede9e1]">
                                <p className="text-base font-bold text-[#0f0d0b]">{detailEvent.contingents_count}</p>
                                <p className="text-[10px] text-[#8c827a]">Kontingen Terdaftar</p>
                            </div>
                            <div className="bg-[#f7f4ef] p-2.5 rounded-xl border border-[#ede9e1]">
                                <p className="text-base font-bold text-[#0f0d0b]">{detailEvent.registrations_count}</p>
                                <p className="text-[10px] text-[#8c827a]">Berkas Registrasi</p>
                            </div>
                            <div className="bg-[#f7f4ef] p-2.5 rounded-xl border border-[#ede9e1]">
                                <p className="text-base font-bold text-[#0f0d0b]">{detailEvent.rundowns_count}</p>
                                <p className="text-[10px] text-[#8c827a]">Sesi Jadwal</p>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ════ MODAL IMPOR PAKET DATA EVENT (.JSON) ════ */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => {
                    if (!importPackageForm.processing) {
                        setIsImportModalOpen(false);
                    }
                }}
                title="Impor Paket Data Event (.json)"
                subtitle="Unggah file paket JSON data event yang diekspor dari sistem offline / laptop lokal ke server ini."
                size="md"
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button
                            variant="unstyled"
                            size="none"
                            type="button"
                            onClick={() => setIsImportModalOpen(false)}
                            disabled={importPackageForm.processing}
                            className="px-4 py-2 rounded-xl border border-[#ede9e1] bg-white text-xs font-semibold text-[#706860] hover:bg-[#f7f4ef] transition-colors cursor-pointer disabled:opacity-50"
                        >
                            Batal
                        </Button>
                        <Button
                            variant="unstyled"
                            size="none"
                            type="button"
                            onClick={handleImportPackageSubmit}
                            disabled={!importPackageForm.data.package_file || importPackageForm.processing}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {importPackageForm.processing ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin text-xs" />
                                    <span>Mengimpor Data...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-cloud-arrow-up text-xs" />
                                    <span>Mulai Impor Data Event</span>
                                </>
                            )}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleImportPackageSubmit} className="space-y-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                        <div className="flex items-start gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-black font-black">
                                <i className="fa-solid fa-triangle-exclamation" />
                            </span>
                            <div className="space-y-1">
                                <p className="font-bold text-sm text-amber-950">
                                    Perhatian Sinkronisasi Data Offline ⇄ Online:
                                </p>
                                <p className="leading-relaxed text-[#706860]">
                                    File paket <code>.json</code> berisi data lengkap event, nomor pertandingan, kontingen, atlet, bagan pertandingan, nilai wasit (W1 - W5), timer randori, dan hasil juara. Jika event sudah ada di sistem, data akan disinkronkan dan diperbarui secara otomatis.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[#0f0d0b] mb-2">
                            Pilih File Paket JSON (.json) <span className="text-red-500">*</span>
                        </label>
                        <input
                            ref={importFileInputRef}
                            type="file"
                            accept=".json,application/json"
                            disabled={importPackageForm.processing}
                            onChange={(e) => importPackageForm.setData('package_file', e.target.files?.[0] || null)}
                            className="block w-full text-xs text-[#706860] file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer border border-[#ded8ce] rounded-xl p-2 bg-[#fcfbfa]"
                        />
                        {importPackageForm.errors.package_file && (
                            <p className="mt-1.5 text-xs font-semibold text-red-600">{importPackageForm.errors.package_file}</p>
                        )}
                        <p className="mt-2 text-[11px] text-[#8c827a]">
                            Ukuran maksimal 50 MB. Pastikan file merupakan hasil unduhan dari tombol <strong>Ekspor (.json)</strong>.
                        </p>
                    </div>
                </form>
            </Modal>

            {/* ════ MODAL DELETE CONFIRMATION ════ */}
            <Modal
                isOpen={!!deletingEvent}
                onClose={() => setDeletingEvent(null)}
                title="Hapus Event Kejuaraan"
                size="sm"
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button variant="unstyled" size="none"
                            type="button"
                            onClick={() => setDeletingEvent(null)}
                            className="px-4 py-2 rounded-xl border border-[#ede9e1] bg-white text-xs font-semibold text-[#706860] hover:bg-[#f7f4ef] transition-colors cursor-pointer"
                        >
                            Batal
                        </Button>
                        <Button variant="unstyled" size="none"
                            type="button"
                            onClick={confirmDelete}
                            className="px-4 py-2 rounded-xl bg-[#c0392b] hover:bg-[#a93226] text-white text-xs font-semibold cursor-pointer shadow-sm transition-all flex items-center gap-1.5"
                        >
                            <i className="fa-solid fa-trash-can"></i>
                            <span>Ya, Hapus</span>
                        </Button>
                    </div>
                }
            >
                <div className="text-xs text-[#706860] space-y-2">
                    <p>
                        Apakah Anda yakin ingin menghapus event <strong className="text-[#0f0d0b]">{deletingEvent?.name}</strong>?
                    </p>
                    <p className="text-[11px] text-[#8c827a] bg-red-500/10 text-red-700 p-2.5 rounded-lg border border-red-500/20">
                        Event akan dihapus secara soft-delete. Data kontingen atau pertandingan yang terhubung tidak akan terhapus permanen.
                    </p>
                </div>
            </Modal>
        </AdminLayout>
    );
}
