import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Modal, Pagination, Input, Textarea, Combobox, Button } from '@/Components/UI';

export default function ContingentIndex({
    contingents = { data: [], links: [], from: 1, to: 1, total: 0, current_page: 1, last_page: 1 },
    stats = { total_contingents: 0, verified_contingents: 0, pending_contingents: 0, total_athletes: 0, total_officials: 0 },
    activeEvent = null,
    users = [],
    filters = { search: '', status: 'all' },
    auth = {},
}) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');

    // Modals state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingContingent, setEditingContingent] = useState(null);
    const [detailContingent, setDetailContingent] = useState(null);
    const [deletingContingent, setDeletingContingent] = useState(null);
    const [modalActiveTab, setModalActiveTab] = useState('athletes'); // 'athletes' | 'officials'

    // Form for Create & Edit
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
        city: '',
        manager_name: '',
        phone: '',
        address: '',
        status: 'pending',
        user_id: '',
    });

    const handleFilter = (newStatus = selectedStatus, newSearch = searchTerm) => {
        router.get(
            '/admin/master/contingent',
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
            '/admin/master/contingent',
            {
                search: searchTerm,
                status: selectedStatus,
                page,
            },
            { preserveState: true, replace: true }
        );
    };

    const openCreateModal = () => {
        reset();
        clearErrors();
        setEditingContingent(null);
        setIsCreateModalOpen(true);
    };

    const openEditModal = (contingent) => {
        clearErrors();
        setEditingContingent(contingent);
        setData({
            name: contingent.name || '',
            city: contingent.city || '',
            manager_name: contingent.manager_name || '',
            phone: contingent.phone || '',
            address: contingent.address || '',
            status: contingent.status || 'pending',
            user_id: contingent.user_id || '',
        });
        setIsCreateModalOpen(true);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (editingContingent) {
            put(`/admin/master/contingent/${editingContingent.id}`, {
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    setEditingContingent(null);
                    reset();
                },
            });
        } else {
            post('/admin/master/contingent', {
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleVerify = (contingentId) => {
        router.post(
            `/admin/master/contingent/${contingentId}/verify`,
            {},
            { preserveScroll: true }
        );
    };

    const confirmDelete = (e) => {
        e.preventDefault();
        if (!deletingContingent) return;
        router.delete(`/admin/master/contingent/${deletingContingent.id}`, {
            onSuccess: () => setDeletingContingent(null),
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'verified':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Terverifikasi
                    </span>
                );
            case 'pending':
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Menunggu Verifikasi
                    </span>
                );
        }
    };

    const statusTabs = [
        { key: 'all', label: 'Semua Kontingen', count: stats.total_contingents },
        { key: 'verified', label: 'Terverifikasi', count: stats.verified_contingents },
        { key: 'pending', label: 'Menunggu', count: stats.pending_contingents },
    ];

    return (
        <AdminLayout auth={auth} title="Master Data Kontingen">
            <Head title="Data Kontingen & Dojo — Smart Perkemi" />

            {/* ════ HEADER SECTION ════ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#8c827a] tracking-wider uppercase mb-1">
                        <i className="fa-solid fa-folder-tree text-[11px]"></i>
                        <span>Master Data</span>
                        <i className="fa-solid fa-chevron-right text-[9px] text-[#b5afa6]"></i>
                        <span className="text-[#c0392b]">Data Kontingen</span>
                    </div>
                    <h1 className="font-cinzel text-xl md:text-2xl font-bold text-[#0f0d0b] tracking-tight">
                        Manajemen Data Kontingen
                    </h1>
                    <p className="text-xs md:text-sm text-[#706860] mt-0.5">
                        Kelola seluruh data kontingen cabang/dojo, verifikasi keabsahan, dan pantau jumlah atlet terdaftar.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="unstyled" size="none"
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#c0392b] to-[#96281b] hover:from-[#d33a2a] hover:to-[#a93226] text-white font-medium text-xs md:text-sm shadow-md shadow-[#c0392b]/25 transition-all cursor-pointer hover:shadow-lg active:scale-98"
                    >
                        <i className="fa-solid fa-circle-plus text-sm"></i>
                        <span>Tambah Kontingen Baru</span>
                    </Button>
                </div>
            </div>

            {/* ════ 4 POLISHED STAT CARDS ════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {/* 1. Total Kontingen */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[#ede9e1] bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#8c827a]">
                            Total Kontingen
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-[#c0392b]/10 text-[#c0392b] flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-flag text-xs"></i>
                        </div>
                    </div>
                    <div className="mt-2.5">
                        <div className="text-2xl font-bold text-[#0f0d0b] tracking-tight">
                            {stats.total_contingents}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#706860]">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#f7f4ef] text-[#0f0d0b] font-medium text-[10.5px] border border-[#ede9e1]">
                                <i className="fa-solid fa-database text-[9px] text-[#c0392b]"></i>
                                Terdata di sistem
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Terverifikasi */}
                <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200/80 bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-emerald-800">
                            Terverifikasi
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-circle-check text-xs"></i>
                        </div>
                    </div>
                    <div className="mt-2.5">
                        <div className="text-2xl font-bold text-emerald-700 tracking-tight">
                            {stats.verified_contingents}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#706860]">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium text-[10.5px] border border-emerald-200/70">
                                <i className="fa-solid fa-check text-[9px]"></i>
                                Berkas disetujui
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Menunggu Verifikasi */}
                <div className="p-4 sm:p-5 rounded-2xl border border-amber-200/80 bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-amber-800">
                            Menunggu Verifikasi
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-hourglass-half text-xs"></i>
                        </div>
                    </div>
                    <div className="mt-2.5">
                        <div className="text-2xl font-bold text-amber-700 tracking-tight">
                            {stats.pending_contingents}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#706860]">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium text-[10.5px] border border-amber-200/70">
                                <i className="fa-solid fa-bell text-[9px]"></i>
                                Perlu ditinjau
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Partisipan Kontingen (Atlet & Official) */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[#ede9e1] bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#8c827a]">
                            Partisipan Kontingen
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-users text-xs"></i>
                        </div>
                    </div>
                    <div className="mt-2.5">
                        <div className="text-xl font-bold text-[#0f0d0b] tracking-tight flex items-baseline gap-2 flex-wrap">
                            <span>{stats.total_athletes || 0} <span className="text-xs font-normal text-[#8c827a]">atlet</span></span>
                            <span className="text-xs text-[#ede9e1]">|</span>
                            <span className="text-amber-700">{stats.total_officials || 0} <span className="text-xs font-normal text-[#8c827a]">official</span></span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#706860]">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium text-[10.5px] border border-blue-200/70">
                                <i className="fa-solid fa-user-check text-[9px]"></i>
                                Terdaftar di sistem
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════ FILTER & SEARCH BAR ════ */}
            <div className="p-3.5 mb-6 rounded-2xl bg-white border border-[#ede9e1] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

                <form onSubmit={handleSearchSubmit} className="w-full sm:w-72">
                    <Input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Cari kontingen, kota, manajer..."
                        iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                        clearable
                        onClear={() => {
                            setSearchTerm('');
                            handleFilter(selectedStatus, '');
                        }}
                        size="sm"
                    />
                </form>
            </div>

            {/* ════ TABLE VIEW (ELEVATED & TIDY) ════ */}
            {contingents.data.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-[#ede9e1] bg-white shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-[#c0392b]/10 text-[#c0392b] flex items-center justify-center mx-auto mb-3 text-xl">
                        <i className="fa-solid fa-flag"></i>
                    </div>
                    <h3 className="font-cinzel text-sm font-bold text-[#0f0d0b]">
                        Tidak Ada Data Kontingen Ditemukan
                    </h3>
                    <p className="text-xs text-[#706860] mt-1 max-w-sm mx-auto">
                        Belum ada kontingen yang sesuai dengan kriteria pencarian ini.
                    </p>
                </div>
            ) : (
                <div className="mb-6 rounded-2xl border border-[#ede9e1] bg-white shadow-xs overflow-hidden">
                    <TableContainer ariaLabel="Tabel data">
                        <table className="responsive-data-table whitespace-nowrap w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#faf8f5] border-b border-[#ede9e1] text-[#8c827a] uppercase text-[10px] font-semibold tracking-wider whitespace-nowrap">
                                    <th className="py-3 px-4">Kontingen & Dojo</th>
                                    <th className="py-3 px-3">Kota / Wilayah</th>
                                    <th className="py-3 px-3">Manajer & Kontak</th>
                                    <th className="py-3 px-3 text-center">Partisipasi (Atlet & Official)</th>
                                    <th className="py-3 px-3 text-center">Status</th>
                                    <th className="py-3 px-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ede9e1]">
                                {contingents.data.map((contingent) => (
                                    <tr
                                        key={contingent.id}
                                        className="transition-colors hover:bg-[#fcfaf7]"
                                    >
                                        {/* Column 1: Nama Kontingen */}
                                        <td className="py-3.5 px-4 min-w-[220px]">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #c0392b, #d4a843)',
                                                    }}
                                                >
                                                    {(contingent.name || 'K').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span
                                                        onClick={() => setDetailContingent(contingent)}
                                                        className="font-semibold text-xs md:text-[13px] text-[#0f0d0b] hover:text-[#c0392b] transition-colors cursor-pointer leading-snug"
                                                    >
                                                        {contingent.name}
                                                    </span>
                                                    {contingent.address && (
                                                        <p className="text-[11px] text-[#8c827a] mt-0.5 line-clamp-1 max-w-xs font-normal">
                                                            {contingent.address}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Column 2: Kota / Wilayah */}
                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                            <div className="font-medium text-[#0f0d0b] text-xs flex items-center gap-1.5">
                                                <i className="fa-solid fa-location-dot text-[11px] text-[#c0392b]"></i>
                                                <span>{contingent.city}</span>
                                            </div>
                                        </td>

                                        {/* Column 3: Manajer & Kontak */}
                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                            <div className="font-medium text-[#0f0d0b] text-xs">
                                                {contingent.manager_name}
                                            </div>
                                            <div className="text-[11px] text-[#8c827a] mt-0.5 flex items-center gap-1">
                                                <i className="fa-brands fa-whatsapp text-[11px] text-emerald-600"></i>
                                                <span>{contingent.phone}</span>
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-[#8c827a]">
                                                Akun: {contingent.user?.name || 'Belum ditentukan'}
                                            </div>
                                        </td>

                                        {/* Column 4: Jumlah Atlet & Official */}
                                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5">
                                                <span
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50/70 border border-blue-200/60 font-bold text-xs text-blue-800"
                                                    title="Jumlah Atlet Terdaftar"
                                                >
                                                    <i className="fa-solid fa-users text-[10px] text-blue-600"></i>
                                                    <span>{contingent.athletes_count ?? contingent.athletes?.length ?? 0}</span>
                                                    <span className="text-[10px] font-normal text-blue-600">atlet</span>
                                                </span>
                                                <span
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50/70 border border-amber-200/60 font-bold text-xs text-amber-800"
                                                    title="Jumlah Official Terdaftar"
                                                >
                                                    <i className="fa-solid fa-id-badge text-[10px] text-amber-600"></i>
                                                    <span>{contingent.officials_count ?? contingent.officials?.length ?? 0}</span>
                                                    <span className="text-[10px] font-normal text-amber-600">official</span>
                                                </span>
                                            </div>
                                        </td>

                                        {/* Column 5: Status */}
                                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                            {getStatusBadge(contingent.status)}
                                        </td>

                                        {/* Column 6: Aksi */}
                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center justify-end gap-1.5">
                                                {contingent.status === 'pending' && (
                                                    <Button variant="unstyled" size="none"
                                                        type="button"
                                                        onClick={() => handleVerify(contingent.id)}
                                                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
                                                        title="Verifikasi berkas kontingen"
                                                    >
                                                        <i className="fa-solid fa-check text-[10px]"></i>
                                                        <span>Verifikasi</span>
                                                    </Button>
                                                )}

                                                <Button variant="unstyled" size="none"
                                                    type="button"
                                                    onClick={() => setDetailContingent(contingent)}
                                                    className="w-7 h-7 rounded-lg border border-[#ede9e1] bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-[#706860] flex items-center justify-center transition-all cursor-pointer"
                                                    title="Lihat Daftar Atlet & Detail"
                                                >
                                                    <i className="fa-solid fa-eye text-xs"></i>
                                                </Button>
                                                <Button variant="unstyled" size="none"
                                                    type="button"
                                                    onClick={() => openEditModal(contingent)}
                                                    className="w-7 h-7 rounded-lg border border-[#ede9e1] bg-white hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 text-[#706860] flex items-center justify-center transition-all cursor-pointer"
                                                    title="Edit Data Kontingen"
                                                >
                                                    <i className="fa-solid fa-pen text-xs"></i>
                                                </Button>
                                                <Button variant="unstyled" size="none"
                                                    type="button"
                                                    onClick={() => setDeletingContingent(contingent)}
                                                    className="w-7 h-7 rounded-lg border border-[#ede9e1] bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-[#706860] flex items-center justify-center transition-all cursor-pointer"
                                                    title="Hapus Kontingen"
                                                >
                                                    <i className="fa-solid fa-trash-can text-xs"></i>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></TableContainer>

                    {/* Pagination Controls */}
                    {contingents.total > 0 && (
                        <Pagination
                            pagination={contingents}
                            label="kontingen"
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
            )}

            {/* ════ MODAL CREATE / EDIT CONTINGENT ════ */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title={editingContingent ? 'Perbarui Data Kontingen' : 'Tambah Kontingen Baru'}
                subtitle="Lengkapi data perwakilan dojo/pengkot kontingen Shorinji Kempo"
                size="lg"
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
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
                            {editingContingent ? 'Simpan Perubahan' : 'Tambah Kontingen'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <Input
                        label="Nama Kontingen / Dojo"
                        required
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="Contoh: Dojo Garuda Sakti Surabaya"
                        error={errors.name}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Kota / Wilayah"
                            required
                            value={data.city}
                            onChange={(e) => setData('city', e.target.value)}
                            placeholder="Contoh: Kota Surabaya"
                            error={errors.city}
                        />

                        <Combobox
                            label="Status Keabsahan"
                            options={[
                                { value: 'pending', label: 'Menunggu Verifikasi', sublabel: 'Status pendaftaran baru' },
                                { value: 'verified', label: 'Terverifikasi', sublabel: 'Sah terverifikasi panitia' },
                            ]}
                            value={data.status}
                            onChange={(val) => setData('status', val)}
                            clearable={false}
                            searchPlaceholder="Cari status keabsahan..."
                            error={errors.status}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Nama Manajer / Pelatih"
                            required
                            value={data.manager_name}
                            onChange={(e) => setData('manager_name', e.target.value)}
                            placeholder="Sensei Hendra Wijaya"
                            error={errors.manager_name}
                        />

                        <Input
                            label="No. Telepon / WhatsApp"
                            required
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            placeholder="0812-3456-7890"
                            error={errors.phone}
                        />
                    </div>

                    <Combobox
                        label="Pengguna Penanggung Jawab Kontingen"
                        value={data.user_id}
                        onChange={(value) => setData('user_id', value)}
                        options={users.map((user) => ({ value: user.id, label: user.name, sublabel: user.email }))}
                        placeholder="Pilih akun pengguna..."
                        searchPlaceholder="Cari nama atau email..."
                        hint="Jika kosong saat membuat kontingen, akun Anda akan digunakan."
                        error={errors.user_id}
                    />

                    <Textarea
                        label="Alamat Sekretariat / Dojo"
                        rows={3}
                        value={data.address}
                        onChange={(e) => setData('address', e.target.value)}
                        placeholder="Alamat lengkap dojo atau sekretariat pengurus cabang..."
                        error={errors.address}
                    />
                </form>
            </Modal>

            {/* ════ MODAL DETAIL CONTINGENT & ROSTER ATLET ════ */}
            <Modal
                isOpen={!!detailContingent}
                onClose={() => setDetailContingent(null)}
                title={detailContingent?.name}
                subtitle={`Roster Atlet & Profil Kontingen — ${detailContingent?.city || ''}`}
                size="xl"
                footer={
                    <div className="flex items-center justify-between w-full">
                        <div>
                            {detailContingent?.status === 'pending' && (
                                <Button variant="unstyled" size="none"
                                    type="button"
                                    onClick={() => {
                                        handleVerify(detailContingent.id);
                                        setDetailContingent(null);
                                    }}
                                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer flex items-center gap-1.5"
                                >
                                    <i className="fa-solid fa-check text-[10px]"></i>
                                    <span>Verifikasi Kontingen Ini Sekarang</span>
                                </Button>
                            )}
                        </div>
                        <Button variant="unstyled" size="none"
                            type="button"
                            onClick={() => setDetailContingent(null)}
                            className="px-4 py-2 rounded-xl bg-[#0f0d0b] text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
                        >
                            Tutup
                        </Button>
                    </div>
                }
            >
                {detailContingent && (
                    <div className="space-y-4 text-xs">
                        {/* Summary Bar */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#f7f4ef] border border-[#ede9e1]">
                            <div>
                                <span className="text-[10.5px] text-[#8c827a] block">Kota / Wilayah</span>
                                <span className="font-bold text-[#0f0d0b] text-xs">{detailContingent.city}</span>
                            </div>
                            <div>
                                <span className="text-[10.5px] text-[#8c827a] block">Manajer / Pelatih</span>
                                <span className="font-bold text-[#0f0d0b] text-xs">{detailContingent.manager_name}</span>
                            </div>
                            <div>
                                <span className="text-[10.5px] text-[#8c827a] block">Status Verifikasi</span>
                                {getStatusBadge(detailContingent.status)}
                            </div>
                            <div>
                                <span className="text-[10.5px] text-[#8c827a] block">Akun Penanggung Jawab</span>
                                <span className="font-bold text-[#0f0d0b] text-xs">{detailContingent.user?.name || 'Belum ditentukan'}</span>
                                {detailContingent.user?.email && <span className="block break-all text-[10.5px] text-[#706860]">{detailContingent.user.email}</span>}
                            </div>
                        </div>

                        {/* Tab Switcher: Atlet vs Official */}
                        <div className="flex items-center gap-2 border-b border-[#ede9e1] pb-2">
                            <Button variant="unstyled" size="none"
                                type="button"
                                onClick={() => setModalActiveTab('athletes')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    modalActiveTab === 'athletes'
                                        ? 'bg-[#c0392b] text-white shadow-xs'
                                        : 'bg-[#f7f4ef] text-[#706860] hover:bg-[#ede9e1]'
                                }`}
                            >
                                <i className="fa-solid fa-user-ninja text-xs"></i>
                                <span>Daftar Atlet & Kenshi ({detailContingent.athletes?.length || 0})</span>
                            </Button>
                            <Button variant="unstyled" size="none"
                                type="button"
                                onClick={() => setModalActiveTab('officials')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    modalActiveTab === 'officials'
                                        ? 'bg-[#c0392b] text-white shadow-xs'
                                        : 'bg-[#f7f4ef] text-[#706860] hover:bg-[#ede9e1]'
                                }`}
                            >
                                <i className="fa-solid fa-id-badge text-xs"></i>
                                <span>Daftar Official ({detailContingent.officials?.length || 0})</span>
                            </Button>
                        </div>

                        {/* Athletes Tab Content */}
                        {modalActiveTab === 'athletes' && (
                            <div>
                                {(!detailContingent.athletes || detailContingent.athletes.length === 0) ? (
                                    <p className="text-center py-6 text-xs text-[#8c827a] bg-[#faf8f5] rounded-xl border border-[#ede9e1]">
                                        Belum ada atlet yang terdaftar untuk kontingen ini.
                                    </p>
                                ) : (
                                    <TableContainer className="max-h-60 rounded-xl border border-[#ede9e1]" ariaLabel="Tabel data">
                                        <table className="responsive-data-table whitespace-nowrap w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-[#faf8f5] border-b border-[#ede9e1] text-[#8c827a] uppercase text-[9.5px] font-semibold tracking-wider whitespace-nowrap sticky top-0">
                                                    <th className="py-2.5 px-3">#</th>
                                                    <th className="py-2.5 px-3">Nama Atlet</th>
                                                    <th className="py-2.5 px-3 text-center">Gender</th>
                                                    <th className="py-2.5 px-3 text-center">Tingkatan</th>
                                                    <th className="py-2.5 px-3 text-right">BB / TB</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#ede9e1]">
                                                {detailContingent.athletes.map((athlete, idx) => (
                                                    <tr key={athlete.id} className="hover:bg-[#fcfaf7]">
                                                        <td className="py-2 px-3 text-[#8c827a] font-mono text-[10.5px] whitespace-nowrap">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="py-2 px-3 font-semibold text-[#0f0d0b] whitespace-nowrap">
                                                            {athlete.name}
                                                        </td>
                                                        <td className="py-2 px-3 text-center whitespace-nowrap">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                                                athlete.gender === 'male' || athlete.gender === 'putra'
                                                                    ? 'bg-blue-50 text-blue-700'
                                                                    : 'bg-rose-50 text-rose-700'
                                                            }`}>
                                                                {athlete.gender === 'male' || athlete.gender === 'putra' ? 'Putra' : 'Putri'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-3 text-center font-mono font-medium text-xs whitespace-nowrap">
                                                            {athlete.kyu_dan || '-'}
                                                        </td>
                                                        <td className="py-2 px-3 text-right text-[#706860] font-mono text-[11px] whitespace-nowrap">
                                                            {athlete.weight ? `${athlete.weight} kg` : '-'} / {athlete.height ? `${athlete.height} cm` : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table></TableContainer>
                                )}
                            </div>
                        )}

                        {/* Officials Tab Content */}
                        {modalActiveTab === 'officials' && (
                            <div>
                                {(!detailContingent.officials || detailContingent.officials.length === 0) ? (
                                    <div className="text-center py-6 text-xs text-[#8c827a] bg-[#faf8f5] rounded-xl border border-[#ede9e1]">
                                        <p>Belum ada official yang terdaftar untuk kontingen ini.</p>
                                        <Link
                                            href="/admin/master/official"
                                            className="mt-2 inline-flex items-center gap-1 text-xs text-[#c0392b] font-semibold hover:underline"
                                        >
                                            <span>Tambah di menu Master Official</span>
                                            <i className="fa-solid fa-arrow-right text-[10px]"></i>
                                        </Link>
                                    </div>
                                ) : (
                                    <TableContainer className="max-h-60 rounded-xl border border-[#ede9e1]" ariaLabel="Tabel data">
                                        <table className="responsive-data-table whitespace-nowrap w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-[#faf8f5] border-b border-[#ede9e1] text-[#8c827a] uppercase text-[9.5px] font-semibold tracking-wider whitespace-nowrap sticky top-0">
                                                    <th className="py-2.5 px-3">#</th>
                                                    <th className="py-2.5 px-3">Nama Official</th>
                                                    <th className="py-2.5 px-3">Jabatan / Peran</th>
                                                    <th className="py-2.5 px-3 text-center">Gender</th>
                                                    <th className="py-2.5 px-3">Kontak WA</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#ede9e1]">
                                                {detailContingent.officials.map((official, idx) => (
                                                    <tr key={official.id} className="hover:bg-[#fcfaf7]">
                                                        <td className="py-2 px-3 text-[#8c827a] font-mono text-[10.5px] whitespace-nowrap">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="py-2 px-3 font-semibold text-[#0f0d0b] whitespace-nowrap">
                                                            {official.name}
                                                        </td>
                                                        <td className="py-2 px-3 whitespace-nowrap">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                                                <i className="fa-solid fa-id-badge text-[8px]"></i>
                                                                <span>{official.role}</span>
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-3 text-center whitespace-nowrap">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                                                official.gender === 'male' || official.gender === 'putra' || official.gender === 'L'
                                                                    ? 'bg-blue-50 text-blue-700'
                                                                    : 'bg-rose-50 text-rose-700'
                                                            }`}>
                                                                {official.gender === 'male' || official.gender === 'putra' || official.gender === 'L' ? 'Putra' : 'Putri'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">
                                                            {official.phone ? (
                                                                <a
                                                                    href={`https://wa.me/${official.phone.replace(/[^0-9]/g, '')}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-emerald-600 hover:underline flex items-center gap-1"
                                                                >
                                                                    <i className="fa-brands fa-whatsapp text-xs"></i>
                                                                    <span>{official.phone}</span>
                                                                </a>
                                                            ) : (
                                                                <span className="text-[#8c827a]">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table></TableContainer>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* ════ MODAL DELETE CONFIRMATION ════ */}
            <Modal
                isOpen={!!deletingContingent}
                onClose={() => setDeletingContingent(null)}
                title="Hapus Data Kontingen"
                size="sm"
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingContingent(null)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            iconLeft={<i className="fa-solid fa-trash-can"></i>}
                            onClick={confirmDelete}
                        >
                            Ya, Hapus
                        </Button>
                    </div>
                }
            >
                <div className="text-xs text-[#706860] space-y-2">
                    <p>
                        Apakah Anda yakin ingin menghapus kontingen <strong className="text-[#0f0d0b]">{deletingContingent?.name}</strong>?
                    </p>
                    <p className="text-[11px] text-[#8c827a] bg-red-500/10 text-red-700 p-2.5 rounded-lg border border-red-500/20">
                        Kontingen akan dihapus secara soft-delete. Seluruh atlet terdaftar di bawah kontingen ini tetap tersimpan di database.
                    </p>
                </div>
            </Modal>
        </AdminLayout>
    );
}
