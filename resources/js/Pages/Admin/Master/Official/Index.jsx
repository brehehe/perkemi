import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Modal, Pagination, Input, Textarea, Combobox, Button } from '@/Components/UI';

export default function OfficialIndex({
    officials = { data: [], links: [], from: 1, to: 1, total: 0, current_page: 1, last_page: 1 },
    stats = { total_officials: 0, total_managers: 0, total_coaches: 0, total_medics: 0 },
    contingentsList = [],
    rolesList = [],
    filters = { search: '', role: 'all', contingent_id: 'all', gender: 'all' },
    auth = {},
}) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedRole, setSelectedRole] = useState(filters.role || 'all');
    const [selectedContingent, setSelectedContingent] = useState(filters.contingent_id || 'all');
    const [selectedGender, setSelectedGender] = useState(filters.gender || 'all');

    // Modals state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingOfficial, setEditingOfficial] = useState(null);
    const [detailOfficial, setDetailOfficial] = useState(null);
    const [deletingOfficial, setDeletingOfficial] = useState(null);

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
        contingent_id: contingentsList[0]?.id || '',
        name: '',
        role: 'Pelatih',
        gender: 'male',
        phone: '',
        email: '',
        id_card_number: '',
        notes: '',
    });

    const handleFilter = (newFilters = {}) => {
        const queryParams = {
            search: newFilters.search !== undefined ? newFilters.search : searchTerm,
            role: newFilters.role !== undefined ? newFilters.role : selectedRole,
            contingent_id: newFilters.contingent_id !== undefined ? newFilters.contingent_id : selectedContingent,
            gender: newFilters.gender !== undefined ? newFilters.gender : selectedGender,
        };

        router.get('/admin/master/official', queryParams, { preserveState: true, replace: true });
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
            '/admin/master/official',
            {
                search: searchTerm,
                role: selectedRole,
                contingent_id: selectedContingent,
                gender: selectedGender,
                page,
            },
            { preserveState: true, replace: true }
        );
    };

    const openCreateModal = () => {
        reset();
        clearErrors();
        setEditingOfficial(null);
        if (contingentsList.length > 0) {
            setData('contingent_id', contingentsList[0].id);
        }
        setIsCreateModalOpen(true);
    };

    const openEditModal = (official) => {
        clearErrors();
        setEditingOfficial(official);
        setData({
            contingent_id: official.contingent_id || '',
            name: official.name || '',
            role: official.role || 'Pelatih',
            gender: official.gender || 'male',
            phone: official.phone || '',
            email: official.email || '',
            id_card_number: official.id_card_number || '',
            notes: official.notes || '',
        });
        setIsCreateModalOpen(true);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (editingOfficial) {
            put(`/admin/master/official/${editingOfficial.id}`, {
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    setEditingOfficial(null);
                    reset();
                },
            });
        } else {
            post('/admin/master/official', {
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    reset();
                },
            });
        }
    };

    const confirmDelete = (e) => {
        e.preventDefault();
        if (!deletingOfficial) return;
        router.delete(`/admin/master/official/${deletingOfficial.id}`, {
            onSuccess: () => setDeletingOfficial(null),
        });
    };

    const getRoleBadge = (roleName) => {
        const lower = (roleName || '').toLowerCase();
        if (lower.includes('manajer')) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    <i className="fa-solid fa-user-tie text-[9px]"></i>
                    <span>{roleName}</span>
                </span>
            );
        }
        if (lower.includes('kepala')) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <i className="fa-solid fa-chalkboard-user text-[9px]"></i>
                    <span>{roleName}</span>
                </span>
            );
        }
        if (lower.includes('pelatih')) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                    <i className="fa-solid fa-graduation-cap text-[9px]"></i>
                    <span>{roleName}</span>
                </span>
            );
        }
        if (lower.includes('medis') || lower.includes('dokter')) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    <i className="fa-solid fa-kit-medical text-[9px]"></i>
                    <span>{roleName}</span>
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <i className="fa-solid fa-id-badge text-[9px]"></i>
                <span>{roleName}</span>
            </span>
        );
    };

    return (
        <AdminLayout auth={auth}>
            <Head title="Master Data Official - Smart Perkemi" />

            {/* ════ HEADER SECTION (CINZEL TITLE & ACTION) ════ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2.5 text-xs text-[#8c827a] mb-1">
                        <Link href="/admin/dashboard" className="hover:text-[#c0392b] transition-colors">
                            Dashboard
                        </Link>
                        <span>/</span>
                        <span className="text-[#0f0d0b] font-medium">Master Data</span>
                        <span>/</span>
                        <span className="text-[#c0392b] font-semibold">Official</span>
                    </div>
                    <h1 className="font-cinzel text-xl md:text-2xl font-bold text-[#0f0d0b] tracking-wide flex items-center gap-3">
                        <span>Master Data Official Kontingen</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#c0392b]/10 text-[#c0392b] border border-[#c0392b]/20 font-sans font-bold">
                            {officials.total} Terdaftar
                        </span>
                    </h1>
                    <p className="text-xs text-[#706860] mt-1 max-w-xl">
                        Kelola data manajer, pelatih kepala, pelatih, ofisial, dan tim medis seluruh kontingen dojo Shorinji Kempo.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button variant="unstyled" size="none"
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#c0392b] to-[#96281b] hover:from-[#a93226] hover:to-[#7b1f14] shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
                    >
                        <i className="fa-solid fa-user-plus text-xs"></i>
                        <span>Tambah Official Baru</span>
                    </Button>
                </div>
            </div>

            {/* ════ STATS METRICS (4 CARDS) ════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-2xl border border-[#ede9e1] bg-white shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#706860]">Total Official</span>
                        <div className="w-8 h-8 rounded-xl bg-[#c0392b]/10 text-[#c0392b] flex items-center justify-center text-xs">
                            <i className="fa-solid fa-id-badge"></i>
                        </div>
                    </div>
                    <p className="font-cinzel font-bold text-2xl text-[#0f0d0b] mt-2">
                        {stats.total_officials || 0}
                    </p>
                    <span className="text-[10px] text-[#8c827a] mt-0.5 block">
                        Semua jabatan terdaftar
                    </span>
                </div>

                <div className="p-4 rounded-2xl border border-[#ede9e1] bg-white shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#706860]">Manajer Tim</span>
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-xs">
                            <i className="fa-solid fa-user-tie"></i>
                        </div>
                    </div>
                    <p className="font-cinzel font-bold text-2xl text-purple-700 mt-2">
                        {stats.total_managers || 0}
                    </p>
                    <span className="text-[10px] text-[#8c827a] mt-0.5 block">
                        Penanggung jawab kontingen
                    </span>
                </div>

                <div className="p-4 rounded-2xl border border-[#ede9e1] bg-white shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#706860]">Pelatih & Asisten</span>
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center text-xs">
                            <i className="fa-solid fa-chalkboard-user"></i>
                        </div>
                    </div>
                    <p className="font-cinzel font-bold text-2xl text-teal-700 mt-2">
                        {stats.total_coaches || 0}
                    </p>
                    <span className="text-[10px] text-[#8c827a] mt-0.5 block">
                        Pelatih teknik dan fisik
                    </span>
                </div>

                <div className="p-4 rounded-2xl border border-[#ede9e1] bg-white shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#706860]">Tim Medis</span>
                        <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center text-xs">
                            <i className="fa-solid fa-kit-medical"></i>
                        </div>
                    </div>
                    <p className="font-cinzel font-bold text-2xl text-rose-700 mt-2">
                        {stats.total_medics || 0}
                    </p>
                    <span className="text-[10px] text-[#8c827a] mt-0.5 block">
                        Tenaga kesehatan & fisioterapi
                    </span>
                </div>
            </div>

            {/* ════ TOOLBAR & FILTER SECTION ════ */}
            <div className="p-4 rounded-2xl border border-[#ede9e1] bg-white shadow-xs mb-6 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Search Bar */}
                    <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
                        <Input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Cari nama official, telepon, kontingen..."
                            iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                            clearable
                            onClear={() => {
                                setSearchTerm('');
                                handleFilter({ search: '' });
                            }}
                            size="sm"
                        />
                    </form>

                    {/* Filter Dropdowns */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Kontingen Filter */}
                        <div className="w-52 sm:w-60">
                            <Combobox
                                size="sm"
                                placeholder="Semua Kontingen"
                                searchPlaceholder="Cari kontingen / dojo..."
                                options={[
                                    { value: 'all', label: `Semua Kontingen (${contingentsList.length})` },
                                    ...contingentsList.map((con) => ({
                                        value: con.id,
                                        label: con.name,
                                        sublabel: con.city,
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

                        {/* Role Filter */}
                        <div className="w-44 sm:w-48">
                            <Combobox
                                size="sm"
                                placeholder="Semua Jabatan"
                                searchPlaceholder="Cari jabatan..."
                                options={[
                                    { value: 'all', label: 'Semua Jabatan' },
                                    { value: 'Manajer Tim', label: 'Manajer Tim' },
                                    { value: 'Pelatih Kepala', label: 'Pelatih Kepala' },
                                    { value: 'Pelatih', label: 'Pelatih' },
                                    { value: 'Asisten Pelatih', label: 'Asisten Pelatih' },
                                    { value: 'Tim Medis', label: 'Tim Medis' },
                                    { value: 'Ofisial Tim', label: 'Ofisial Tim' },
                                ]}
                                value={selectedRole}
                                onChange={(val) => {
                                    const nextVal = val || 'all';
                                    setSelectedRole(nextVal);
                                    handleFilter({ role: nextVal });
                                }}
                            />
                        </div>

                        {/* Reset Filter Button */}
                        {(searchTerm || selectedRole !== 'all' || selectedContingent !== 'all' || selectedGender !== 'all') && (
                            <Button variant="unstyled" size="none"
                                type="button"
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedRole('all');
                                    setSelectedContingent('all');
                                    setSelectedGender('all');
                                    router.get('/admin/master/official', {}, { preserveState: true, replace: true });
                                }}
                                className="px-3 py-2 rounded-xl border border-[#ede9e1] text-xs font-semibold text-[#c0392b] hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                            >
                                <i className="fa-solid fa-rotate-left mr-1"></i>
                                Reset Filter
                            </Button>
                        )}
                    </div>
                </div>

                {/* Gender Tabs Filter */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-[#ede9e1]/60">
                    <span className="text-[11px] text-[#8c827a] font-medium mr-1.5">Jenis Kelamin:</span>
                    {[
                        { key: 'all', label: 'Semua Gender' },
                        { key: 'male', label: 'Putra (L)' },
                        { key: 'female', label: 'Putri (P)' },
                    ].map((tab) => (
                        <Button variant="unstyled" size="none"
                            key={tab.key}
                            type="button"
                            onClick={() => handleGenderTabClick(tab.key)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                selectedGender === tab.key
                                    ? 'bg-[#c0392b] text-white shadow-xs'
                                    : 'bg-[#f7f4ef] text-[#706860] hover:bg-[#ede9e1]'
                            }`}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* ════ TABLE VIEW (ELEVATED & TIDY) ════ */}
            {officials.data.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-[#ede9e1] bg-white shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-[#c0392b]/10 text-[#c0392b] flex items-center justify-center mx-auto mb-3 text-xl">
                        <i className="fa-solid fa-id-badge"></i>
                    </div>
                    <h3 className="font-cinzel text-sm font-bold text-[#0f0d0b]">
                        Tidak Ada Data Official Ditemukan
                    </h3>
                    <p className="text-xs text-[#706860] mt-1 max-w-sm mx-auto">
                        Belum ada data official yang sesuai dengan kriteria pencarian ini. Anda dapat mendaftarkan official baru.
                    </p>
                    <Button variant="unstyled" size="none"
                        type="button"
                        onClick={openCreateModal}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#c0392b] hover:bg-[#a93226] transition-all cursor-pointer shadow-xs"
                    >
                        <i className="fa-solid fa-plus text-xs"></i>
                        <span>Tambah Official Baru</span>
                    </Button>
                </div>
            ) : (
                <div className="mb-6 rounded-2xl border border-[#ede9e1] bg-white shadow-xs overflow-hidden">
                    <TableContainer ariaLabel="Tabel data">
                        <table className="responsive-data-table whitespace-nowrap w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#faf8f5] border-b border-[#ede9e1] text-[#8c827a] uppercase text-[10px] font-semibold tracking-wider whitespace-nowrap">
                                    <th className="py-3 px-4 w-12 text-center">#</th>
                                    <th className="py-3 px-4">Nama Official</th>
                                    <th className="py-3 px-3">Jabatan / Peran</th>
                                    <th className="py-3 px-3">Kontingen Asal</th>
                                    <th className="py-3 px-3 text-center">Gender</th>
                                    <th className="py-3 px-3">Kontak WhatsApp</th>
                                    <th className="py-3 px-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ede9e1]">
                                {officials.data.map((off, idx) => (
                                    <tr
                                        key={off.id}
                                        className="transition-colors hover:bg-[#fcfaf7]"
                                    >
                                        {/* Column 0: Index */}
                                        <td className="py-3.5 px-4 text-center font-mono text-[11px] text-[#8c827a] whitespace-nowrap">
                                            {(officials.from || 1) + idx}
                                        </td>

                                        {/* Column 1: Nama & Avatar */}
                                        <td className="py-3.5 px-4 min-w-[200px]">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c0392b] to-[#d4a843] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                                    {(off.name || 'O').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span
                                                        onClick={() => setDetailOfficial(off)}
                                                        className="font-semibold text-xs md:text-[13px] text-[#0f0d0b] hover:text-[#c0392b] transition-colors cursor-pointer leading-snug block"
                                                    >
                                                        {off.name}
                                                    </span>
                                                    {off.email && (
                                                        <span className="text-[10.5px] text-[#8c827a] font-mono">
                                                            {off.email}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Column 2: Jabatan */}
                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                            {getRoleBadge(off.role)}
                                        </td>

                                        {/* Column 3: Kontingen */}
                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                            {off.contingent ? (
                                                <div>
                                                    <div className="flex items-center gap-1.5 font-medium text-[#0f0d0b] text-xs">
                                                        <i className="fa-solid fa-flag text-[10px] text-[#d4a843]"></i>
                                                        <span>{off.contingent.name}</span>
                                                    </div>
                                                    <span className="text-[10px] text-[#8c827a] ml-4">
                                                        {off.contingent.city}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[#8c827a] text-[11px]">—</span>
                                            )}
                                        </td>

                                        {/* Column 4: Gender */}
                                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                                                    off.gender === 'male' || off.gender === 'putra'
                                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                }`}
                                            >
                                                <i className={`fa-solid ${off.gender === 'male' || off.gender === 'putra' ? 'fa-mars text-[9px]' : 'fa-venus text-[9px]'}`}></i>
                                                <span>{off.gender === 'male' || off.gender === 'putra' ? 'Putra' : 'Putri'}</span>
                                            </span>
                                        </td>

                                        {/* Column 5: Kontak WhatsApp */}
                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                            {off.phone ? (
                                                <a
                                                    href={`https://wa.me/${off.phone.replace(/[^0-9]/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs text-[#0f0d0b] hover:text-emerald-600 transition-colors font-mono"
                                                    title="Hubungi via WhatsApp"
                                                >
                                                    <i className="fa-brands fa-whatsapp text-emerald-600 text-xs"></i>
                                                    <span>{off.phone}</span>
                                                </a>
                                            ) : (
                                                <span className="text-[#8c827a] text-[11px]">—</span>
                                            )}
                                        </td>

                                        {/* Column 6: Aksi */}
                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center justify-end gap-1.5">
                                                <Button variant="unstyled" size="none"
                                                    type="button"
                                                    onClick={() => setDetailOfficial(off)}
                                                    className="w-7 h-7 rounded-lg border border-[#ede9e1] bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-[#706860] flex items-center justify-center transition-all cursor-pointer"
                                                    title="Lihat Detail Official"
                                                >
                                                    <i className="fa-solid fa-eye text-xs"></i>
                                                </Button>
                                                <Button variant="unstyled" size="none"
                                                    type="button"
                                                    onClick={() => openEditModal(off)}
                                                    className="w-7 h-7 rounded-lg border border-[#ede9e1] bg-white hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 text-[#706860] flex items-center justify-center transition-all cursor-pointer"
                                                    title="Edit Data Official"
                                                >
                                                    <i className="fa-solid fa-pen text-xs"></i>
                                                </Button>
                                                <Button variant="unstyled" size="none"
                                                    type="button"
                                                    onClick={() => setDeletingOfficial(off)}
                                                    className="w-7 h-7 rounded-lg border border-[#ede9e1] bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-[#706860] flex items-center justify-center transition-all cursor-pointer"
                                                    title="Hapus Official"
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
                    {officials.total > 0 && (
                        <Pagination
                            pagination={officials}
                            label="official"
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
            )}

            {/* ════ MODAL CREATE / EDIT OFFICIAL ════ */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title={editingOfficial ? 'Perbarui Data Official' : 'Tambah Official Baru'}
                subtitle="Lengkapi informasi manajer, pelatih, atau tim pendukung kontingen dojo"
                size="md"
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
                            type="submit"
                            form="officialForm"
                            variant="primary"
                            size="sm"
                            loading={processing}
                        >
                            {editingOfficial ? 'Simpan Perubahan' : 'Tambah Official'}
                        </Button>
                    </div>
                }
            >
                <form id="officialForm" onSubmit={handleFormSubmit} className="space-y-4">
                    {/* Kontingen */}
                    <Combobox
                        label="Pilih Kontingen"
                        required
                        options={contingentsList.map((con) => ({
                            value: con.id,
                            label: con.name,
                            sublabel: con.city,
                        }))}
                        value={data.contingent_id}
                        onChange={(val) => setData('contingent_id', val)}
                        clearable={false}
                        searchPlaceholder="Ketik nama dojo atau kota..."
                        error={errors.contingent_id}
                    />

                    {/* Nama Lengkap */}
                    <Input
                        label="Nama Lengkap Official"
                        required
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="Contoh: Sensei Bambang Suryono, S.Pd."
                        error={errors.name}
                    />

                    {/* 2 Kolom: Jabatan / Peran & Gender */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Combobox
                            label="Jabatan / Peran"
                            required
                            options={[
                                { value: 'Manajer Tim', label: 'Manajer Tim' },
                                { value: 'Pelatih Kepala', label: 'Pelatih Kepala' },
                                { value: 'Pelatih', label: 'Pelatih' },
                                { value: 'Asisten Pelatih', label: 'Asisten Pelatih' },
                                { value: 'Tim Medis', label: 'Tim Medis' },
                                { value: 'Ofisial Tim', label: 'Ofisial Tim' },
                            ]}
                            value={data.role}
                            onChange={(val) => setData('role', val)}
                            clearable={false}
                            searchPlaceholder="Pilih jabatan..."
                            error={errors.role}
                        />

                        <Combobox
                            label="Jenis Kelamin"
                            required
                            options={[
                                { value: 'male', label: 'Putra (L)' },
                                { value: 'female', label: 'Putri (P)' },
                            ]}
                            value={data.gender}
                            onChange={(val) => setData('gender', val)}
                            clearable={false}
                            searchPlaceholder="Pilih jenis kelamin..."
                            error={errors.gender}
                        />
                    </div>

                    {/* 2 Kolom: WhatsApp & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                            label="Nomor WhatsApp / Telepon"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            placeholder="0812-3456-7890"
                            error={errors.phone}
                        />

                        <Input
                            label="Alamat Email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="official@email.com"
                            error={errors.email}
                        />
                    </div>

                    {/* NIK / No. KTP */}
                    <Input
                        label="Nomor Identitas (NIK / KTP)"
                        value={data.id_card_number}
                        onChange={(e) => setData('id_card_number', e.target.value)}
                        placeholder="16 digit NIK sesuai KTP"
                        error={errors.id_card_number}
                    />

                    {/* Catatan */}
                    <Textarea
                        label="Catatan / Keterangan Khusus"
                        rows={2}
                        value={data.notes}
                        onChange={(e) => setData('notes', e.target.value)}
                        placeholder="Keterangan tugas khusus, sertifikasi kepelatihan, dll."
                        error={errors.notes}
                    />
                </form>
            </Modal>

            {/* ════ MODAL DETAIL OFFICIAL ════ */}
            <Modal
                isOpen={!!detailOfficial}
                onClose={() => setDetailOfficial(null)}
                title="Rincian Data Official"
                subtitle={detailOfficial?.contingent?.name || 'Kontingen'}
                size="md"
                footer={
                    <div className="flex items-center justify-between w-full">
                        <div className="text-[11px] text-[#8c827a]">
                            Terdaftar: {detailOfficial?.created_at || '-'}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDetailOfficial(null)}
                            >
                                Tutup
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                iconLeft={<i className="fa-solid fa-pen text-xs"></i>}
                                onClick={() => {
                                    const off = detailOfficial;
                                    setDetailOfficial(null);
                                    openEditModal(off);
                                }}
                            >
                                Edit Data
                            </Button>
                        </div>
                    </div>
                }
            >
                {detailOfficial && (
                    <div className="space-y-4 text-xs">
                        {/* Header Box */}
                        <div className="p-4 rounded-xl bg-[#f7f4ef] border border-[#ede9e1] flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#c0392b] to-[#d4a843] text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm">
                                {(detailOfficial.name || 'O').substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-sm text-[#0f0d0b] truncate">
                                    {detailOfficial.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {getRoleBadge(detailOfficial.role)}
                                    <span className="text-[11px] text-[#8c827a] flex items-center gap-1">
                                        <i className="fa-solid fa-flag text-[9px] text-[#d4a843]"></i>
                                        {detailOfficial.contingent?.name} ({detailOfficial.contingent?.city})
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Rincian Grid */}
                        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-[#ede9e1] bg-white">
                            <div>
                                <span className="text-[10.5px] text-[#8c827a] block">Jenis Kelamin</span>
                                <span className="font-semibold text-[#0f0d0b] text-xs capitalize">
                                    {detailOfficial.gender === 'male' || detailOfficial.gender === 'putra' ? 'Putra (Laki-laki)' : 'Putri (Perempuan)'}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10.5px] text-[#8c827a] block">Jabatan Resmi</span>
                                <span className="font-semibold text-[#0f0d0b] text-xs">
                                    {detailOfficial.role}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10.5px] text-[#8c827a] block">Nomor Telepon / WA</span>
                                <span className="font-mono font-semibold text-[#0f0d0b] text-xs">
                                    {detailOfficial.phone || '—'}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10.5px] text-[#8c827a] block">Alamat Email</span>
                                <span className="font-mono font-semibold text-[#0f0d0b] text-xs">
                                    {detailOfficial.email || '—'}
                                </span>
                            </div>
                            <div className="col-span-2 border-t border-[#ede9e1]/80 pt-2.5">
                                <span className="text-[10.5px] text-[#8c827a] block">Nomor Identitas (NIK / KTP)</span>
                                <span className="font-mono font-semibold text-[#0f0d0b] text-xs">
                                    {detailOfficial.id_card_number || '—'}
                                </span>
                            </div>
                            {detailOfficial.notes && (
                                <div className="col-span-2 border-t border-[#ede9e1]/80 pt-2.5">
                                    <span className="text-[10.5px] text-[#8c827a] block">Catatan Tambahan</span>
                                    <p className="text-xs text-[#706860] mt-0.5 leading-relaxed">
                                        {detailOfficial.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* ════ MODAL DELETE CONFIRMATION ════ */}
            <Modal
                isOpen={!!deletingOfficial}
                onClose={() => setDeletingOfficial(null)}
                title="Hapus Data Official"
                size="sm"
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingOfficial(null)}
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
                        Apakah Anda yakin ingin menghapus data official <strong className="text-[#0f0d0b]">{deletingOfficial?.name}</strong>?
                    </p>
                    <p className="text-[11px] text-[#8c827a]">
                        Official ini terdaftar sebagai <strong>{deletingOfficial?.role}</strong> pada kontingen <strong>{deletingOfficial?.contingent?.name}</strong>.
                    </p>
                </div>
            </Modal>
        </AdminLayout>
    );
}
