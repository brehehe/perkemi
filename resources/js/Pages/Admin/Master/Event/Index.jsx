import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
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
    const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');

    // Modals state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [detailEvent, setDetailEvent] = useState(null);
    const [deletingEvent, setDeletingEvent] = useState(null);
    const [activeTab, setActiveTab] = useState('general'); // 'general' | 'schedule' | 'fees'
    const [isHomepageModalOpen, setIsHomepageModalOpen] = useState(false);

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
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                        <i className="fa-solid fa-flag-checkered text-[9px] text-slate-500"></i>
                        Selesai
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
                        <i className="fa-solid fa-file-pen text-[9px] text-slate-400"></i>
                        Draft
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

    return (
        <AdminLayout auth={auth} title="Master Event & Kejuaraan">
            <Head title="Master Event & Acara — Smart Perkemi" />

            {/* ════ HEADER SECTION ════ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-cinzel text-xl md:text-2xl font-bold text-[#0f0d0b] tracking-tight">
                        Manajemen Event & Kejuaraan
                    </h1>
                    <p className="text-xs md:text-sm text-[#706860] mt-0.5">
                        Kelola agenda kejuaraan, status operasional, serta pendaftaran setiap event secara terpisah.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <Button variant="unstyled" size="none"
                        type="button"
                        onClick={() => setIsHomepageModalOpen(true)}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#faf8f5] text-[#504840] font-semibold text-xs md:text-sm border border-[#ded8ce] shadow-sm transition-all"
                    >
                        <i className="fa-solid fa-house-chimney-window text-[#c0392b] text-xs"></i>
                        <span>Landing Beranda</span>
                    </Button>
                    <Link
                        href="/admin/master/event/detail"
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#141210] hover:bg-black text-amber-400 font-semibold text-xs md:text-sm border border-amber-400/20 shadow-sm transition-all"
                    >
                        <i className="fa-solid fa-sliders text-xs"></i>
                        <span>Pengaturan & Detail Event</span>
                    </Link>
                    <Button variant="unstyled" size="none"
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#c0392b] to-[#96281b] hover:from-[#d33a2a] hover:to-[#a93226] text-white font-medium text-xs md:text-sm shadow-md shadow-[#c0392b]/25 transition-all cursor-pointer hover:shadow-lg active:scale-98"
                    >
                        <i className="fa-solid fa-circle-plus text-sm"></i>
                        <span>Tambah Event Baru</span>
                    </Button>
                </div>
            </div>

            {/* ════ 4 POLISHED STAT CARDS ════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {/* 1. Total Seluruh Event */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[#ede9e1] bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#8c827a]">
                            Total Seluruh Event
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-[#c0392b]/10 text-[#c0392b] flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-trophy text-xs"></i>
                        </div>
                    </div>
                    <div className="mt-2.5">
                        <div className="text-2xl font-bold text-[#0f0d0b] tracking-tight">
                            {stats.total_events}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#706860]">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#f7f4ef] text-[#0f0d0b] font-medium text-[10.5px] border border-[#ede9e1]">
                                <i className="fa-solid fa-database text-[9px] text-[#c0392b]"></i>
                                Terdata di sistem
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Event Operasional */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[#d4a843]/40 bg-gradient-to-br from-white via-white to-amber-50/30 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#b8860b]">
                            Event Operasional
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-[#d4a843]/15 text-[#b8860b] flex items-center justify-center shrink-0 shadow-xs">
                            <i className="fa-solid fa-star text-xs"></i>
                        </div>
                    </div>
                    <div className="mt-2.5">
                        <div className="text-2xl sm:text-3xl font-bold text-[#0f0d0b] tracking-tight leading-tight">
                            {stats.active_events || 0}
                        </div>
                        <div className="mt-1.5 text-xs">
                            <span className="text-[#8c827a] text-[10.5px]">
                                {stats.active_events === 1 ? '1 event tersedia di menu kerja' : `${stats.active_events || 0} event dapat berjalan bersamaan`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Pendaftaran Terbuka */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[#ede9e1] bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#8c827a]">
                            Pendaftaran Terbuka
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-door-open text-xs"></i>
                        </div>
                    </div>
                    <div className="mt-2.5">
                        <div className="text-2xl font-bold text-[#0f0d0b] tracking-tight">
                            {stats.open_registration}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#706860]">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium text-[10.5px] border border-blue-200/70">
                                <i className="fa-solid fa-user-plus text-[9px]"></i>
                                Menerima kontingen
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Event Selesai / Arsip */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[#ede9e1] bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#8c827a]">
                            Event Selesai / Arsip
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-box-archive text-xs"></i>
                        </div>
                    </div>
                    <div className="mt-2.5">
                        <div className="text-2xl font-bold text-[#0f0d0b] tracking-tight">
                            {stats.completed_events}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#706860]">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium text-[10.5px] border border-emerald-200/70">
                                <i className="fa-solid fa-medal text-[9px]"></i>
                                Riwayat medali tersimpan
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════ ACTIVE EVENT HERO BANNER (POLISHED) ════ */}
            {activeEvent && (
                <div
                    className="relative rounded-2xl p-5 md:p-6 mb-6 overflow-hidden border border-[#d4a843]/40 shadow-xl text-white"
                    style={{
                        background: 'linear-gradient(135deg, #0f0d0b 0%, #1a1410 50%, #241710 100%)',
                    }}
                >
                    {/* Watermark Kanji Background */}
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 text-8xl md:text-9xl font-cinzel font-black text-white/[0.04] pointer-events-none select-none">
                        拳
                    </div>
                    {/* Glowing radial accent */}
                    <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-[radial-gradient(circle,rgba(212,168,67,0.25)_0%,transparent_70%)] pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                        <div className="space-y-2 max-w-2xl">
                            {/* Chips Row */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#d4a843] text-[#0f0d0b] shadow-xs">
                                    <i className="fa-solid fa-crown text-[10px]"></i>
                                    Event Aktif Terbaru
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/10">
                                    <i className="fa-regular fa-calendar text-[#d4a843]"></i>
                                    {activeEvent.dates}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/10">
                                    <i className="fa-solid fa-location-dot text-[#e74c3c]"></i>
                                    {activeEvent.venue}, {activeEvent.city}
                                </span>
                            </div>

                            {/* Titles */}
                            <div>
                                <h2 className="font-cinzel text-lg md:text-xl font-bold text-white tracking-normal leading-snug">
                                    {activeEvent.name}
                                </h2>
                                {activeEvent.edition && (
                                    <p className="text-xs text-[#f0c060] font-normal tracking-wide mt-0.5">
                                        {activeEvent.edition}
                                    </p>
                                )}
                            </div>

                            {/* Stat Chips */}
                            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[#b5afa6]">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                                    <i className="fa-solid fa-flag text-[#d4a843] text-[11px]"></i>
                                    <strong className="text-white">{activeEvent.contingents_count}</strong> Kontingen Terhubung
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                                    <i className="fa-solid fa-file-signature text-[#27ae60] text-[11px]"></i>
                                    <strong className="text-white">{activeEvent.registrations_count}</strong> Berkas Registrasi
                                </span>
                            </div>
                            {stats.active_events > 1 && (
                                <p className="text-xs leading-relaxed text-white/65">
                                    Ada {stats.active_events} event aktif. Data registrasi, nomor pertandingan, verifikasi, drawing, dan merge tetap dipisahkan berdasarkan event yang dipilih.
                                </p>
                            )}
                        </div>

                        {/* Action Button */}
                        <div className="flex items-center shrink-0">
                            <Link
                                href={`/admin/master/event/${activeEvent.id}/detail`}
                                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs md:text-sm font-semibold border border-white/20 transition-all hover:border-white/40 shadow-sm cursor-pointer"
                            >
                                <i className="fa-solid fa-sliders text-[#d4a843]"></i>
                                <span>Kelola Event Ini</span>
                                <i className="fa-solid fa-arrow-right text-xs text-white/70"></i>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ FILTER, SEARCH & VIEW CONTROLS (TIDY & SLEEK) ════ */}
            <div className="p-3.5 mb-6 rounded-2xl bg-white border border-[#ede9e1] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Status Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                    {statusTabs.map((tab) => {
                        const isSelected = selectedStatus === tab.key;
                        return (
                            <Button variant="unstyled" size="none"
                                key={tab.key}
                                type="button"
                                onClick={() => handleStatusTabClick(tab.key)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                                    isSelected
                                        ? 'bg-[#0f0d0b] text-white shadow-xs font-semibold'
                                        : 'text-[#706860] hover:text-[#0f0d0b] hover:bg-[#f7f4ef]'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span
                                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                                        isSelected
                                            ? 'bg-white/20 text-white'
                                            : 'bg-[#ede9e1] text-[#706860]'
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
                    <div className="flex items-center rounded-xl bg-[#ede9e1]/70 p-1 border border-black/5 shrink-0">
                        <Button variant="unstyled" size="none"
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                                viewMode === 'table'
                                    ? 'bg-white text-[#0f0d0b] shadow-xs'
                                    : 'text-[#8c827a] hover:text-[#0f0d0b]'
                            }`}
                            title="Tampilan Tabel"
                        >
                            <i className="fa-solid fa-list text-xs"></i>
                            <span className="hidden sm:inline">Tabel</span>
                        </Button>
                        <Button variant="unstyled" size="none"
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                                viewMode === 'grid'
                                    ? 'bg-white text-[#0f0d0b] shadow-xs'
                                    : 'text-[#8c827a] hover:text-[#0f0d0b]'
                            }`}
                            title="Tampilan Kartu"
                        >
                            <i className="fa-solid fa-border-all text-xs"></i>
                            <span className="hidden sm:inline">Kartu</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* ════ MAIN CONTENT (TABLE OR GRID) ════ */}
            {events.data.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-[#ede9e1] bg-white shadow-xs">
                    <div className="w-16 h-16 rounded-2xl bg-[#c0392b]/10 text-[#c0392b] flex items-center justify-center mx-auto mb-4 text-2xl">
                        <i className="fa-solid fa-calendar-xmark"></i>
                    </div>
                    <h3 className="font-cinzel text-base font-bold text-[#0f0d0b]">
                        Tidak Ada Event Ditemukan
                    </h3>
                    <p className="text-xs text-[#706860] mt-1 max-w-sm mx-auto">
                        Belum ada event kejuaraan dengan kriteria pencarian ini. Anda dapat membuat agenda event baru.
                    </p>
                    <Button variant="unstyled" size="none"
                        type="button"
                        onClick={openCreateModal}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#c0392b] hover:bg-[#a93226] text-white text-xs font-medium cursor-pointer shadow-xs"
                    >
                        <i className="fa-solid fa-plus"></i>
                        <span>Tambah Event Baru</span>
                    </Button>
                </div>
            ) : viewMode === 'table' ? (
                /* ════ ELEVATED & TIDY TABLE VIEW ════ */
                <div className="mb-6 rounded-2xl border border-[#ede9e1] bg-white shadow-xs overflow-hidden">
                    <TableContainer ariaLabel="Tabel data">
                        <table className="responsive-data-table whitespace-nowrap w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#faf8f5] border-b border-[#ede9e1] text-[#8c827a] uppercase text-[10px] font-semibold tracking-wider whitespace-nowrap">
                                    <th className="py-3 px-4">Nama Kejuaraan</th>
                                    <th className="py-3 px-3">Lokasi & Venue</th>
                                    <th className="py-3 px-3">Jadwal Acara</th>
                                    <th className="py-3 px-3">Biaya Registrasi</th>
                                    <th className="py-3 px-3 text-center">Status</th>
                                    <th className="py-3 px-3 text-center">Partisipasi</th>
                                    <th className="py-3 px-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ede9e1]">
                                {events.data.map((event) => (
                                    <tr
                                        key={event.id}
                                        className={`transition-colors hover:bg-[#fcfaf7] ${
                                            event.is_active
                                                ? 'bg-amber-50/25 border-l-4 border-l-[#d4a843]'
                                                : 'border-l-4 border-l-transparent'
                                        }`}
                                    >
                                        {/* Column 1: Nama Kejuaraan */}
                                        <td className="py-3.5 px-4 min-w-[220px]">
                                            <div className="flex items-start gap-3">
                                                {event.cover_image_url ? (
                                                    <img src={event.cover_image_url} alt="" className="h-10 w-10 shrink-0 rounded-xl border border-[#ded8ce] object-cover" />
                                                ) : (
                                                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-[#17120f] text-[#d4a843]" title="Gambar event belum tersedia">
                                                        <span className="font-cinzel text-sm font-bold">拳</span>
                                                        <span className="text-[5px] font-bold uppercase tracking-wider text-white/50">No Image</span>
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    onClick={() => setDetailEvent(event)}
                                                    className="font-semibold text-xs md:text-[13px] text-[#0f0d0b] hover:text-[#c0392b] transition-colors cursor-pointer leading-snug"
                                                >
                                                    {event.name}
                                                </span>
                                                {event.is_active && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-[#d4a843]/20 text-[#b8860b] shrink-0 whitespace-nowrap">
                                                        <i className="fa-solid fa-star text-[8px]"></i>
                                                        Operasional
                                                    </span>
                                                )}
                                            </div>
                                            {event.edition && (
                                                <div className="text-[11px] text-[#8c827a] font-normal mt-0.5">
                                                    {event.edition}
                                                </div>
                                            )}
                                            {event.slug && (
                                                <div className="mt-1">
                                                    <a
                                                        href={`/event/${event.slug}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-[#c0392b] bg-[#c0392b]/5 hover:bg-[#c0392b]/10 border border-[#c0392b]/20 transition-colors"
                                                        title="Buka Halaman Publik Event"
                                                    >
                                                        <i className="fa-solid fa-link text-[8px]"></i>
                                                        <span>/event/{event.slug}</span>
                                                    </a>
                                                </div>
                                            )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Column 2: Lokasi & Venue */}
                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                            <div className="font-medium text-[#0f0d0b] text-xs">
                                                {event.venue}
                                            </div>
                                            <div className="text-[11px] text-[#8c827a] mt-0.5 flex items-center gap-1">
                                                <i className="fa-solid fa-location-dot text-[10px] text-[#c0392b]"></i>
                                                <span>{event.city}</span>
                                            </div>
                                        </td>

                                        {/* Column 3: Jadwal Acara */}
                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                            <div className="font-normal text-[#0f0d0b] text-xs flex items-center gap-1.5">
                                                <i className="fa-regular fa-calendar text-[11px] text-[#3498db]"></i>
                                                <span>{event.start_date_formatted}</span>
                                                <span className="text-[#8c827a]">—</span>
                                                <span>{event.end_date_formatted}</span>
                                            </div>
                                            {event.registration_end_formatted && (
                                                <div className="text-[10.5px] text-[#8c827a] mt-0.5">
                                                    Pendaftaran s/d {event.registration_end_formatted}
                                                </div>
                                            )}
                                        </td>

                                        {/* Column 4: Biaya Registrasi */}
                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                            {event.is_paid ? <>
                                                <div className="font-semibold text-xs text-[#27ae60]">
                                                    {formatRupiah(event.fee_per_athlete)}
                                                    <span className="text-[10px] font-normal text-[#8c827a]"> / atlet</span>
                                                </div>
                                                {event.fee_per_contingent > 0 && (
                                                    <div className="text-[10.5px] text-[#706860] mt-0.5">
                                                        Kontingen: {formatRupiah(event.fee_per_contingent)}
                                                    </div>
                                                )}
                                            </> : <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Gratis</span>}
                                        </td>

                                        {/* Column 5: Status */}
                                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                            {getStatusBadge(event.status)}
                                        </td>

                                        {/* Column 6: Partisipasi (Tidy Duo Blocks) */}
                                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5">
                                                <div className="px-2 py-0.5 rounded-md bg-[#f7f4ef] border border-[#ede9e1] text-center min-w-[55px]">
                                                    <span className="font-bold text-xs text-[#0f0d0b]">
                                                        {event.contingents_count}
                                                    </span>
                                                    <span className="text-[9px] text-[#8c827a] block leading-tight">
                                                        Kontingen
                                                    </span>
                                                </div>
                                                <div className="px-2 py-0.5 rounded-md bg-[#f7f4ef] border border-[#ede9e1] text-center min-w-[55px]">
                                                    <span className="font-bold text-xs text-[#0f0d0b]">
                                                        {event.registrations_count}
                                                    </span>
                                                    <span className="text-[9px] text-[#8c827a] block leading-tight">
                                                        Berkas
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Column 7: Aksi (Structured Group) */}
                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center justify-end gap-1.5">
                                                {!event.is_active ? (
                                                    <Button variant="unstyled" size="none"
                                                        type="button"
                                                        onClick={() => handleActivate(event.id)}
                                                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 border border-amber-500/20 transition-all flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
                                                        title="Aktifkan event ini untuk menu operasional"
                                                    >
                                                        <i className="fa-solid fa-star text-[10px] text-[#d4a843]"></i>
                                                        <span>Aktifkan</span>
                                                    </Button>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 whitespace-nowrap">
                                                        <i className="fa-solid fa-check text-[10px]"></i>
                                                        <span>Aktif</span>
                                                    </span>
                                                )}

                                                <a
                                                    href={`/event/${event.slug}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="w-7 h-7 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-all cursor-pointer"
                                                    title="Buka Halaman Publik Event"
                                                >
                                                    <i className="fa-solid fa-globe text-xs"></i>
                                                </a>
                                                <a
                                                    href={`/event/${event.slug}/admin`}
                                                    className="w-7 h-7 rounded-lg border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center transition-all cursor-pointer"
                                                    title="Masuk ke Panel Panitia Event Ini"
                                                >
                                                    <i className="fa-solid fa-door-open text-xs"></i>
                                                </a>
                                                <Link
                                                    href={`/admin/master/event/${event.id}/detail`}
                                                    className="w-7 h-7 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center transition-all cursor-pointer"
                                                    title="Pengaturan & Detail Event (Kelompok Umur, Court, Nomer Tanding)"
                                                >
                                                    <i className="fa-solid fa-sliders text-xs"></i>
                                                </Link>
                                                <Button variant="unstyled" size="none"
                                                    type="button"
                                                    onClick={() => setDetailEvent(event)}
                                                    className="w-7 h-7 rounded-lg border border-[#ede9e1] bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-[#706860] flex items-center justify-center transition-all cursor-pointer"
                                                    title="Lihat Detail Event"
                                                >
                                                    <i className="fa-solid fa-eye text-xs"></i>
                                                </Button>
                                                <Button variant="unstyled" size="none"
                                                    type="button"
                                                    onClick={() => openEditModal(event)}
                                                    className="w-7 h-7 rounded-lg border border-[#ede9e1] bg-white hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 text-[#706860] flex items-center justify-center transition-all cursor-pointer"
                                                    title="Edit Data Event"
                                                >
                                                    <i className="fa-solid fa-pen text-xs"></i>
                                                </Button>
                                                <Button variant="unstyled" size="none"
                                                    type="button"
                                                    onClick={() => setDeletingEvent(event)}
                                                    className="w-7 h-7 rounded-lg border border-[#ede9e1] bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-[#706860] flex items-center justify-center transition-all cursor-pointer"
                                                    title="Hapus Event"
                                                >
                                                    <i className="fa-solid fa-trash-can text-xs"></i>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></TableContainer>

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
                    {/* ════ GRID CARDS VIEW (POLISHED) ════ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
                    {events.data.map((event) => (
                        <div
                            key={event.id}
                            className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between bg-white relative overflow-hidden group hover:shadow-lg ${
                                event.is_active
                                    ? 'border-[#d4a843] ring-2 ring-[#d4a843]/30 shadow-md'
                                    : 'border-[#ede9e1] hover:border-[#b5afa6]'
                            }`}
                        >
                            {/* Accent Top Bar */}
                            <div
                                className={`h-1.5 w-full ${
                                    event.is_active
                                        ? 'bg-gradient-to-r from-[#d4a843] via-[#e74c3c] to-[#c0392b]'
                                        : 'bg-[#ede9e1] group-hover:bg-[#c0392b]/40'
                                }`}
                            />

                            <div className="p-5 flex-1 flex flex-col">
                                {/* Top Badge & Actions */}
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    {getStatusBadge(event.status)}
                                    <span className="text-[11px] font-mono text-[#8c827a] flex items-center gap-1">
                                        <i className="fa-regular fa-calendar text-[10px]"></i>
                                        {event.start_date_formatted}
                                    </span>
                                </div>

                                {/* Event Title */}
                                <h3
                                    onClick={() => setDetailEvent(event)}
                                    className="font-cinzel font-bold text-base text-[#0f0d0b] group-hover:text-[#c0392b] transition-colors line-clamp-2 leading-snug cursor-pointer"
                                >
                                    {event.name}
                                </h3>
                                {event.edition && (
                                    <p className="text-xs text-[#b8860b] font-medium mt-0.5">
                                        {event.edition}
                                    </p>
                                )}

                                {/* Location & Details */}
                                <div className="mt-3.5 space-y-2 text-xs text-[#706860]">
                                    <div className="flex items-center gap-2">
                                        <i className="fa-solid fa-location-dot w-4 text-[#e74c3c] text-[11px]"></i>
                                        <span className="line-clamp-1">{event.venue}, {event.city}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <i className="fa-regular fa-calendar-days w-4 text-[#3498db] text-[11px]"></i>
                                        <span>{event.start_date_formatted} — {event.end_date_formatted}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <i className="fa-solid fa-ticket w-4 text-[#27ae60] text-[11px]"></i>
                                        <span className="font-semibold text-[#27ae60]">{event.is_paid ? formatRupiah(event.fee_per_athlete) : 'Gratis'}</span>
                                        {event.is_paid && <span className="text-[10px] text-[#8c827a]">/ atlet</span>}
                                    </div>
                                    {event.organizer && (
                                        <div className="flex items-center gap-2">
                                            <i className="fa-solid fa-building-columns w-4 text-[#8e44ad] text-[11px]"></i>
                                            <span className="line-clamp-1">{event.organizer}</span>
                                        </div>
                                    )}
                                </div>

                                {/* 3 Metric Chips */}
                                <div className="mt-4 pt-3.5 border-t border-[#ede9e1] grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className="bg-[#f7f4ef] rounded-xl py-2 px-1 border border-[#ede9e1]">
                                        <p className="font-bold text-xs text-[#0f0d0b]">{event.contingents_count}</p>
                                        <p className="text-[9.5px] text-[#8c827a] mt-0.5">Kontingen</p>
                                    </div>
                                    <div className="bg-[#f7f4ef] rounded-xl py-2 px-1 border border-[#ede9e1]">
                                        <p className="font-bold text-xs text-[#0f0d0b]">{event.registrations_count}</p>
                                        <p className="text-[9.5px] text-[#8c827a] mt-0.5">Pendaftar</p>
                                    </div>
                                    <div className="bg-[#f7f4ef] rounded-xl py-2 px-1 border border-[#ede9e1]">
                                        <p className="font-bold text-xs text-[#0f0d0b]">{event.rundowns_count}</p>
                                        <p className="text-[9.5px] text-[#8c827a] mt-0.5">Rundown</p>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="px-5 py-3 bg-[#faf8f5] border-t border-[#ede9e1] flex items-center justify-between gap-2">
                                {!event.is_active ? (
                                    <Button variant="unstyled" size="none"
                                        type="button"
                                        onClick={() => handleActivate(event.id)}
                                        className="text-xs font-semibold text-[#b8860b] hover:text-[#d4a843] flex items-center gap-1.5 cursor-pointer py-1.5 px-2.5 rounded-lg hover:bg-[#d4a843]/10 transition-colors"
                                        title="Aktifkan event ini untuk menu operasional"
                                    >
                                        <i className="fa-solid fa-star text-[10px]"></i>
                                        <span>Aktifkan Event</span>
                                    </Button>
                                ) : (
                                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 px-2 py-1">
                                        <i className="fa-solid fa-check text-[10px]"></i>
                                        <span>Sedang Aktif</span>
                                    </span>
                                )}

                                <div className="flex items-center gap-1">
                                    <a
                                        href={`/event/${event.slug}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-8 h-8 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors cursor-pointer"
                                        title="Buka Halaman Publik Event"
                                    >
                                        <i className="fa-solid fa-globe text-xs"></i>
                                    </a>
                                    <a
                                        href={`/event/${event.slug}/admin`}
                                        className="w-8 h-8 rounded-lg border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center transition-colors cursor-pointer"
                                        title="Masuk ke Panel Panitia Event Ini"
                                    >
                                        <i className="fa-solid fa-door-open text-xs"></i>
                                    </a>
                                    <Link
                                        href={`/admin/master/event/${event.id}/detail`}
                                        className="w-8 h-8 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center transition-colors cursor-pointer"
                                        title="Pengaturan & Detail Event"
                                    >
                                        <i className="fa-solid fa-sliders text-xs"></i>
                                    </Link>
                                    <Button variant="unstyled" size="none"
                                        type="button"
                                        onClick={() => setDetailEvent(event)}
                                        className="w-8 h-8 rounded-lg border border-[#ede9e1] bg-white hover:bg-blue-50 hover:text-blue-600 text-[#706860] flex items-center justify-center transition-colors cursor-pointer"
                                        title="Lihat Rincian Event"
                                    >
                                        <i className="fa-solid fa-eye text-xs"></i>
                                    </Button>
                                    <Button variant="unstyled" size="none"
                                        type="button"
                                        onClick={() => openEditModal(event)}
                                        className="w-8 h-8 rounded-lg border border-[#ede9e1] bg-white hover:bg-amber-50 hover:text-amber-600 text-[#706860] flex items-center justify-center transition-colors cursor-pointer"
                                        title="Edit Event"
                                    >
                                        <i className="fa-solid fa-pen text-xs"></i>
                                    </Button>
                                    <Button variant="unstyled" size="none"
                                        type="button"
                                        onClick={() => setDeletingEvent(event)}
                                        className="w-8 h-8 rounded-lg border border-[#ede9e1] bg-white hover:bg-red-50 hover:text-red-600 text-[#706860] flex items-center justify-center transition-colors cursor-pointer"
                                        title="Hapus Event"
                                    >
                                        <i className="fa-solid fa-trash-can text-xs"></i>
                                    </Button>
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
                        className={`pb-2.5 transition-colors cursor-pointer relative ${
                            activeTab === 'general'
                                ? 'text-[#c0392b] font-bold border-b-2 border-[#c0392b]'
                                : 'text-[#706860] hover:text-black'
                        }`}
                    >
                        1. Informasi Dasar
                    </Button>
                    <Button variant="unstyled" size="none"
                        type="button"
                        onClick={() => setActiveTab('schedule')}
                        className={`pb-2.5 transition-colors cursor-pointer relative ${
                            activeTab === 'schedule'
                                ? 'text-[#c0392b] font-bold border-b-2 border-[#c0392b]'
                                : 'text-[#706860] hover:text-black'
                        }`}
                    >
                        2. Waktu & Lokasi
                    </Button>
                    <Button variant="unstyled" size="none"
                        type="button"
                        onClick={() => setActiveTab('fees')}
                        className={`pb-2.5 transition-colors cursor-pointer relative ${
                            activeTab === 'fees'
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
