import SchoolFields, { schoolDefaults, schoolData } from '@/Components/UI/Forms/SchoolFields';
import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Modal, Pagination, Input, Combobox, Button } from '@/Components/UI';
import Textarea from '@/Components/UI/Forms/Textarea';

export default function AthleteIndex({
    athletes = { data: [], links: [], from: 1, to: 1, total: 0, current_page: 1, last_page: 1 },
    stats = { total_athletes: 0, male_athletes: 0, female_athletes: 0, avg_weight: 0 },
    contingentsList = [],
    kyuDanList = [],
    filters = { search: '', gender: 'all', contingent_id: 'all', kyu_dan: 'all' },
    auth = {},
}) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedGender, setSelectedGender] = useState(filters.gender || 'all');
    const [selectedContingent, setSelectedContingent] = useState(filters.contingent_id || 'all');
    const [selectedKyuDan, setSelectedKyuDan] = useState(filters.kyu_dan || 'all');

    // Modals state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingAthlete, setEditingAthlete] = useState(null);
    const [detailAthlete, setDetailAthlete] = useState(null);
    const [deletingAthlete, setDeletingAthlete] = useState(null);

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
        ...schoolDefaults,
        contingent_id: selectedContingent !== 'all' ? selectedContingent : contingentsList[0]?.id || '',
        name: '',
        nik: '',
        kenshi_number: '',
        gender: 'male',
        birth_place: '',
        blood_type: '',
        home_address: '',
        dojo_name: '',
        kyu_dan: 'Kyu 1',
        weight: '',
        height: '',
        birth_date: '',
    });

    const handleFilter = (newFilters = {}) => {
        const queryParams = {
            search: newFilters.search !== undefined ? newFilters.search : searchTerm,
            gender: newFilters.gender !== undefined ? newFilters.gender : selectedGender,
            contingent_id: newFilters.contingent_id !== undefined ? newFilters.contingent_id : selectedContingent,
            kyu_dan: newFilters.kyu_dan !== undefined ? newFilters.kyu_dan : selectedKyuDan,
        };

        router.get('/admin/master/athlete', queryParams, { preserveState: true, replace: true });
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        handleFilter({ search: searchTerm });
    };

    const handleGenderTabClick = (genderKey) => {
        setSelectedGender(genderKey);
        handleFilter({ gender: genderKey });
    };

    const handlePageChange = (page) => {
        router.get(
            '/admin/master/athlete',
            {
                search: searchTerm,
                gender: selectedGender,
                contingent_id: selectedContingent,
                kyu_dan: selectedKyuDan,
                page,
            },
            { preserveState: true, replace: true }
        );
    };

    const openCreateModal = () => {
        reset();
        clearErrors();
        setEditingAthlete(null);
        if (contingentsList.length > 0) {
            setData('contingent_id', selectedContingent !== 'all' ? selectedContingent : contingentsList[0].id);
        }
        setIsCreateModalOpen(true);
    };

    const openEditModal = (athlete) => {
        clearErrors();
        setEditingAthlete(athlete);
        setData({
            ...schoolData(athlete),            contingent_id: athlete.contingent_id || '',
            name: athlete.name || '',
            nik: athlete.nik || '',
            kenshi_number: athlete.kenshi_number || '',
            gender: athlete.gender || 'male',
            birth_place: athlete.birth_place || '',
            blood_type: athlete.blood_type || '',
            home_address: athlete.home_address || '',
            dojo_name: athlete.dojo_name || '',
            kyu_dan: athlete.kyu_dan || 'Kyu 1',
            weight: athlete.weight || '',
            height: athlete.height || '',
            birth_date: athlete.birth_date || '',
        });
        setIsCreateModalOpen(true);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (editingAthlete) {
            put(`/admin/master/athlete/${editingAthlete.id}`, {
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    setEditingAthlete(null);
                    reset();
                },
            });
        } else {
            post('/admin/master/athlete', {
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    reset();
                },
            });
        }
    };

    const confirmDelete = (e) => {
        e.preventDefault();
        if (!deletingAthlete) return;
        router.delete(`/admin/master/athlete/${deletingAthlete.id}`, {
            onSuccess: () => setDeletingAthlete(null),
        });
    };

    const genderTabs = [
        { key: 'all', label: 'Semua Atlet', count: stats.total_athletes },
        { key: 'male', label: 'Kenshi Putra', count: stats.male_athletes },
        { key: 'female', label: 'Kenshi Putri', count: stats.female_athletes },
    ];

    return (
        <AdminLayout auth={auth} title="Master Data Atlet & Kenshi">
            <Head title="Data Atlet & Kenshi — Smart Perkemi" />

            {/* ════ HEADER SECTION ════ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#8c827a] tracking-wider uppercase mb-1">
                        <i className="fa-solid fa-folder-tree text-[11px]"></i>
                        <span>Master Data</span>
                        <i className="fa-solid fa-chevron-right text-[9px] text-[#b5afa6]"></i>
                        <span className="text-[#c0392b]">Data Atlet & Kenshi</span>
                    </div>
                    <h1 className="font-cinzel text-xl md:text-2xl font-bold text-[#0f0d0b] tracking-tight">
                        Manajemen Atlet & Kenshi
                    </h1>
                    <p className="text-xs md:text-sm text-[#706860] mt-0.5">
                        Kelola data biodata kenshi, verifikasi tingkatan Kyu/Dan, data fisik BB/TB, dan asosiasi kontingen.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="unstyled" size="none"
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#c0392b] to-[#96281b] hover:from-[#d33a2a] hover:to-[#a93226] text-white font-medium text-xs md:text-sm shadow-md shadow-[#c0392b]/25 transition-all cursor-pointer hover:shadow-lg active:scale-98"
                    >
                        <i className="fa-solid fa-circle-plus text-sm"></i>
                        <span>Tambah Atlet Baru</span>
                    </Button>
                </div>
            </div>

            {/* ════ 4 POLISHED STAT CARDS ════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {/* 1. Total Kenshi */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[#ede9e1] bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#8c827a]">
                            Total Kenshi Terdaftar
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-[#c0392b]/10 text-[#c0392b] flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-user-ninja text-xs"></i>
                        </div>
                    </div>
                    <div className="mt-2.5">
                        <div className="text-2xl font-bold text-[#0f0d0b] tracking-tight">
                            {stats.total_athletes}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#706860]">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#f7f4ef] text-[#0f0d0b] font-medium text-[10.5px] border border-[#ede9e1]">
                                <i className="fa-solid fa-database text-[9px] text-[#c0392b]"></i>
                                Terdata di database
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Kenshi Putra */}
                <div className="p-4 sm:p-5 rounded-2xl border border-blue-200/80 bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-blue-800">
                            Kenshi Putra
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-mars text-xs"></i>
                        </div>
                    </div>
                    <div className="mt-2.5">
                        <div className="text-2xl font-bold text-blue-700 tracking-tight">
                            {stats.male_athletes}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#706860]">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium text-[10.5px] border border-blue-200/70">
                                <i className="fa-solid fa-mars text-[9px]"></i>
                                Atlet putra
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Kenshi Putri */}
                <div className="p-4 sm:p-5 rounded-2xl border border-rose-200/80 bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-rose-800">
                            Kenshi Putri
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-venus text-xs"></i>
                        </div>
                    </div>
                    <div className="mt-2.5">
                        <div className="text-2xl font-bold text-rose-700 tracking-tight">
                            {stats.female_athletes}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#706860]">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-medium text-[10.5px] border border-rose-200/70">
                                <i className="fa-solid fa-venus text-[9px]"></i>
                                Atlet putri
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Rata-Rata Berat Badan */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[#ede9e1] bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#8c827a]">
                            Rata-Rata Berat
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-weight-scale text-xs"></i>
                        </div>
                    </div>
                    <div className="mt-2.5">
                        <div className="text-2xl font-bold text-[#0f0d0b] tracking-tight">
                            {stats.avg_weight} <span className="text-xs font-normal text-[#8c827a]">kg</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#706860]">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium text-[10.5px] border border-emerald-200/70">
                                <i className="fa-solid fa-scale-balanced text-[9px]"></i>
                                Standar Randori
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════ FILTER & SEARCH BAR ════ */}
            <div className="p-3.5 mb-6 rounded-2xl bg-white border border-[#ede9e1] shadow-xs flex flex-col gap-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Gender Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                        {genderTabs.map((tab) => {
                            const isSelected = selectedGender === tab.key;
                            return (
                                <Button variant="unstyled" size="none"
                                    key={tab.key}
                                    type="button"
                                    onClick={() => handleGenderTabClick(tab.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${isSelected
                                        ? 'bg-[#0f0d0b] text-white shadow-xs font-semibold'
                                        : 'text-[#706860] hover:text-[#0f0d0b] hover:bg-[#f7f4ef]'
                                        }`}
                                >
                                    <span>{tab.label}</span>
                                    <span
                                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${isSelected
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

                    {/* Search Bar */}
                    <form onSubmit={handleSearchSubmit} className="w-full sm:w-72">
                        <Input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Cari atlet, kontingen, kyu/dan..."
                            iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                            clearable
                            onClear={() => {
                                setSearchTerm('');
                                handleFilter({ search: '' });
                            }}
                            size="sm"
                        />
                    </form>
                </div>

                {/* Secondary Filter Row (Contingent & Kyu/Dan) */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#ede9e1]/70">
                    <div className="flex items-center gap-2">
                        <label className="text-[11px] font-semibold text-[#8c827a] whitespace-nowrap">
                            Kontingen:
                        </label>
                        <div className="w-52 sm:w-60">
                            <Combobox
                                size="sm"
                                placeholder="Semua Kontingen"
                                searchPlaceholder="Cari kontingen / kota..."
                                options={[
                                    { value: 'all', label: `Semua Kontingen (${contingentsList.length})` },
                                    ...contingentsList.map((c) => ({
                                        value: c.id,
                                        label: c.name,
                                        sublabel: c.city,
                                    })),
                                ]}
                                value={selectedContingent}
                                onChange={(val) => {
                                    const nextVal = val || 'all';
                                    setSelectedContingent(nextVal);
                                    handleFilter({ contingent_id: nextVal });
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-[11px] font-semibold text-[#8c827a] whitespace-nowrap">
                            Tingkatan:
                        </label>
                        <div className="w-44 sm:w-48">
                            <Combobox
                                size="sm"
                                placeholder="Semua Tingkatan"
                                searchPlaceholder="Cari kyu / dan..."
                                options={[
                                    { value: 'all', label: 'Semua Tingkatan' },
                                    ...kyuDanList.map((kd) => ({ value: kd, label: kd })),
                                ]}
                                value={selectedKyuDan}
                                onChange={(val) => {
                                    const nextVal = val || 'all';
                                    setSelectedKyuDan(nextVal);
                                    handleFilter({ kyu_dan: nextVal });
                                }}
                            />
                        </div>
                    </div>

                    {(selectedContingent !== 'all' || selectedKyuDan !== 'all' || selectedGender !== 'all' || searchTerm) && (
                        <Button variant="unstyled" size="none"
                            type="button"
                            onClick={() => {
                                setSelectedGender('all');
                                setSelectedContingent('all');
                                setSelectedKyuDan('all');
                                setSearchTerm('');
                                router.get('/admin/master/athlete', {}, { preserveState: true, replace: true });
                            }}
                            className="text-[11px] text-[#c0392b] hover:underline flex items-center gap-1 cursor-pointer ml-auto"
                        >
                            <i className="fa-solid fa-rotate-left text-[10px]"></i>
                            <span>Reset Filter</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* ════ TABLE VIEW (ELEVATED & TIDY) ════ */}
            {athletes.data.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-[#ede9e1] bg-white shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-[#c0392b]/10 text-[#c0392b] flex items-center justify-center mx-auto mb-3 text-xl">
                        <i className="fa-solid fa-user-ninja"></i>
                    </div>
                    <h3 className="font-cinzel text-sm font-bold text-[#0f0d0b]">
                        Tidak Ada Data Atlet Ditemukan
                    </h3>
                    <p className="text-xs text-[#706860] mt-1 max-w-sm mx-auto">
                        Belum ada kenshi yang sesuai dengan kriteria pencarian ini.
                    </p>
                </div>
            ) : (
                <div className="mb-6 rounded-2xl border border-[#ede9e1] bg-white shadow-xs overflow-hidden">
                    <TableContainer ariaLabel="Tabel data">
                        <table className="responsive-data-table whitespace-nowrap w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#faf8f5] border-b border-[#ede9e1] text-[#8c827a] uppercase text-[10px] font-semibold tracking-wider whitespace-nowrap">
                                    <th className="py-3 px-4">Nama Lengkap Kenshi</th>
                                    <th className="py-3 px-3">Kontingen / Dojo</th>
                                    <th className="py-3 px-3 text-center">Gender</th>
                                    <th className="py-3 px-3 text-center">Tingkatan</th>
                                    <th className="py-3 px-3 text-right">Fisik (BB / TB)</th>
                                    <th className="py-3 px-3">Tanggal Lahir / Usia</th>
                                    <th className="py-3 px-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ede9e1]">
                                {athletes.data.map((athlete) => (
                                    <tr
                                        key={athlete.id}
                                        className="transition-colors hover:bg-[#fcfaf7]"
                                    >
                                        {/* Column 1: Nama Lengkap */}
                                        <td className="py-3.5 px-4 min-w-[200px]">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-7 h-7 rounded-lg text-white font-bold text-[10px] flex items-center justify-center shrink-0 ${athlete.gender === 'male' ? 'bg-blue-600' : 'bg-rose-500'
                                                    }`}>
                                                    {athlete.gender === 'male' ? 'PA' : 'PI'}
                                                </div>
                                                <span
                                                    onClick={() => setDetailAthlete(athlete)}
                                                    className="font-semibold text-xs md:text-[13px] text-[#0f0d0b] hover:text-[#c0392b] transition-colors cursor-pointer leading-snug"
                                                >
                                                    {athlete.name}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Column 2: Kontingen */}
                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                            <div className="font-medium text-[#0f0d0b] text-xs">
                                                {athlete.contingent?.name || '-'}
                                            </div>
                                            {athlete.contingent?.city && (
                                                <div className="text-[11px] text-[#8c827a] mt-0.5 flex items-center gap-1">
                                                    <i className="fa-solid fa-location-dot text-[10px] text-[#c0392b]"></i>
                                                    <span>{athlete.contingent.city}</span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Column 3: Gender */}
                                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-medium ${athlete.gender === 'male'
                                                ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                                                : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                                                }`}>
                                                {athlete.gender === 'male' ? 'Putra' : 'Putri'}
                                            </span>
                                        </td>

                                        {/* Column 4: Tingkatan Kyu / Dan */}
                                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                            <span className="px-2.5 py-0.5 rounded-md bg-[#0f0d0b] text-[#f0c060] font-mono font-bold text-xs shadow-2xs border border-white/10">
                                                {athlete.kyu_dan || '-'}
                                            </span>
                                        </td>

                                        {/* Column 5: Fisik (BB / TB) */}
                                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                            <div className="font-medium text-xs text-[#0f0d0b]">
                                                {athlete.weight ? `${athlete.weight} kg` : '-'}
                                            </div>
                                            <div className="text-[10.5px] text-[#8c827a] mt-0.5">
                                                {athlete.height ? `${athlete.height} cm` : '-'}
                                            </div>
                                        </td>

                                        {/* Column 6: Tanggal Lahir / Usia */}
                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                            <div className="font-medium text-xs text-[#0f0d0b]">
                                                {athlete.birth_date_formatted}
                                            </div>
                                            {athlete.age !== null && (
                                                <div className="text-[10.5px] text-[#8c827a] mt-0.5">
                                                    {athlete.age} tahun
                                                </div>
                                            )}
                                        </td>

                                        {/* Column 7: Aksi */}
                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center justify-end gap-1.5">
                                                <Button variant="unstyled" size="none"
                                                    type="button"
                                                    onClick={() => setDetailAthlete(athlete)}
                                                    className="w-7 h-7 rounded-lg border border-[#ede9e1] bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-[#706860] flex items-center justify-center transition-all cursor-pointer"
                                                    title="Lihat Profil Lengkap"
                                                >
                                                    <i className="fa-solid fa-eye text-xs"></i>
                                                </Button>
                                                <Link
                                                    href={`/admin/master/athlete/${athlete.id}/detail`}
                                                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#ede9e1] bg-white px-2 text-[#706860] transition-all hover:border-[#d4a843] hover:bg-[#f6ecd7] hover:text-[#8a631c]"
                                                    title="Profil dan Riwayat Kenshi"
                                                    aria-label={`Profil dan riwayat ${athlete.name}`}
                                                >
                                                    <i className="fa-solid fa-clock-rotate-left text-xs"></i>
                                                    <span className="text-[10px] font-semibold">Detail</span>
                                                </Link>
                                                <Button variant="unstyled" size="none"
                                                    type="button"
                                                    onClick={() => openEditModal(athlete)}
                                                    className="w-7 h-7 rounded-lg border border-[#ede9e1] bg-white hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 text-[#706860] flex items-center justify-center transition-all cursor-pointer"
                                                    title="Edit Data Atlet"
                                                >
                                                    <i className="fa-solid fa-pen text-xs"></i>
                                                </Button>
                                                <Button variant="unstyled" size="none"
                                                    type="button"
                                                    onClick={() => setDeletingAthlete(athlete)}
                                                    className="w-7 h-7 rounded-lg border border-[#ede9e1] bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-[#706860] flex items-center justify-center transition-all cursor-pointer"
                                                    title="Hapus Atlet"
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
                    {athletes.total > 0 && (
                        <Pagination
                            pagination={athletes}
                            label="atlet"
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
            )}

            {/* ════ MODAL CREATE / EDIT ATHLETE ════ */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title={editingAthlete ? 'Perbarui Data Kenshi' : 'Tambah Atlet Kenshi Baru'}
                subtitle="Lengkapi data kenshi, verifikasi kyu/dan, dan data fisik pertandingan"
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
                            {editingAthlete ? 'Simpan Perubahan' : 'Tambah Atlet'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <Input
                        label="Nama Lengkap Kenshi"
                        required
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        error={errors.name}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="NIK" required inputMode="numeric" maxLength={16} value={data.nik} onChange={(e) => setData('nik', e.target.value)} error={errors.nik} />
                        <Input label="Nomor Induk Kenshi" required value={data.kenshi_number} onChange={(e) => setData('kenshi_number', e.target.value)} error={errors.kenshi_number} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Combobox
                            label="Asal Kontingen"
                            required
                            options={contingentsList.map((c) => ({
                                value: c.id,
                                label: c.name,
                                sublabel: c.city,
                            }))}
                            value={data.contingent_id}
                            onChange={(val) => setData('contingent_id', val)}
                            clearable={false}
                            searchPlaceholder="Cari kontingen / dojo..."
                            error={errors.contingent_id}
                        />

                        <Combobox
                            label="Jenis Kelamin"
                            required
                            options={[
                                { value: 'male', label: 'Putra (PA)' },
                                { value: 'female', label: 'Putri (PI)' },
                            ]}
                            value={data.gender}
                            onChange={(val) => setData('gender', val)}
                            clearable={false}
                            searchPlaceholder="Pilih jenis kelamin..."
                            error={errors.gender}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Tempat Lahir" required value={data.birth_place} onChange={(e) => setData('birth_place', e.target.value)} error={errors.birth_place} />
                        <Input label="Tanggal Lahir" type="date" required value={data.birth_date} onChange={(e) => setData('birth_date', e.target.value)} error={errors.birth_date} />
                        <div className="md:col-span-2"><SchoolFields form={{ data, setData, errors }} /></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Asal Dojo" required value={data.dojo_name} onChange={(e) => setData('dojo_name', e.target.value)} error={errors.dojo_name} />
                        <Combobox
                            label="Golongan Darah (Opsional)"
                            options={['A', 'B', 'AB', 'O'].map((value) => ({ value, label: value }))}
                            value={data.blood_type}
                            onChange={(value) => setData('blood_type', value || '')}
                            searchPlaceholder="Pilih golongan darah..."
                            error={errors.blood_type}
                        />
                    </div>

                    <Textarea label="Alamat Rumah" required rows={2} value={data.home_address} onChange={(e) => setData('home_address', e.target.value)} error={errors.home_address} />

                    <Combobox
                        label="Tingkatan Kyu / Dan"
                        required
                        options={kyuDanList.map((kyu) => ({ value: kyu, label: kyu }))}
                        value={data.kyu_dan}
                        onChange={(val) => setData('kyu_dan', val)}
                        clearable={false}
                        searchPlaceholder="Cari tingkatan sabuk..."
                        error={errors.kyu_dan}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Berat Badan (kg)"
                            type="number"
                            step="0.1"
                            value={data.weight}
                            onChange={(e) => setData('weight', e.target.value)}
                            placeholder="Contoh: 60.5"
                            error={errors.weight}
                        />

                        <Input
                            label="Tinggi Badan (cm)"
                            type="number"
                            step="0.1"
                            value={data.height}
                            onChange={(e) => setData('height', e.target.value)}
                            placeholder="Contoh: 170"
                            error={errors.height}
                        />
                    </div>
                </form>
            </Modal>

            {/* ════ MODAL DETAIL ATHLETE ════ */}
            <Modal
                isOpen={!!detailAthlete}
                onClose={() => setDetailAthlete(null)}
                title={detailAthlete?.name}
                subtitle={`Profil Kenshi — ${detailAthlete?.contingent?.name || ''}`}
                size="md"
                footer={
                    <div className="flex items-center justify-end w-full">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setDetailAthlete(null)}
                        >
                            Tutup
                        </Button>
                    </div>
                }
            >
                {detailAthlete && (
                    <div className="space-y-4 text-xs">
                        <div className="flex items-center gap-4 pb-3 border-b border-[#ede9e1]">
                            <div className={`w-12 h-12 rounded-2xl text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md ${detailAthlete.gender === 'male' ? 'bg-blue-600' : 'bg-rose-500'
                                }`}>
                                {detailAthlete.gender === 'male' ? 'PA' : 'PI'}
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-[#0f0d0b]">{detailAthlete.name}</h3>
                                <p className="text-xs text-[#8c827a] mt-0.5">{detailAthlete.contingent?.name} ({detailAthlete.contingent?.city})</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 py-1">
                            <div>
                                <span className="text-[#8c827a] block text-[10.5px]">Tingkatan Sabuk</span>
                                <span className="font-bold text-[#0f0d0b] text-xs font-mono">{detailAthlete.kyu_dan || '-'}</span>
                            </div>
                            <div>
                                <span className="text-[#8c827a] block text-[10.5px]">Jenis Kelamin</span>
                                <span className="font-bold text-[#0f0d0b] text-xs">
                                    {detailAthlete.gender === 'male' ? 'Putra' : 'Putri'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 py-1">
                            <div>
                                <span className="text-[#8c827a] block text-[10.5px]">Berat Badan (BB)</span>
                                <span className="font-bold text-[#0f0d0b] text-xs">
                                    {detailAthlete.weight ? `${detailAthlete.weight} kg` : '-'}
                                </span>
                            </div>
                            <div>
                                <span className="text-[#8c827a] block text-[10.5px]">Tinggi Badan (TB)</span>
                                <span className="font-bold text-[#0f0d0b] text-xs">
                                    {detailAthlete.height ? `${detailAthlete.height} cm` : '-'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 py-1">
                            <div>
                                <span className="text-[#8c827a] block text-[10.5px]">Tanggal Lahir</span>
                                <span className="font-bold text-[#0f0d0b] text-xs">
                                    {detailAthlete.birth_date_formatted}
                                </span>
                            </div>
                            <div>
                                <span className="text-[#8c827a] block text-[10.5px]">Usia</span>
                                <span className="font-bold text-[#0f0d0b] text-xs">
                                    {detailAthlete.age !== null ? `${detailAthlete.age} tahun` : '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ════ MODAL DELETE CONFIRMATION ════ */}
            <Modal
                isOpen={!!deletingAthlete}
                onClose={() => setDeletingAthlete(null)}
                title="Hapus Data Atlet"
                size="sm"
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingAthlete(null)}
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
                        Apakah Anda yakin ingin menghapus kenshi <strong className="text-[#0f0d0b]">{deletingAthlete?.name}</strong>?
                    </p>
                    <p className="text-[11px] text-[#8c827a] bg-red-500/10 text-red-700 p-2.5 rounded-lg border border-red-500/20">
                        Data atlet akan dihapus secara soft-delete.
                    </p>
                </div>
            </Modal>
        </AdminLayout>
    );
}
