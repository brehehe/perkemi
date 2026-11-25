import { useState, useMemo } from 'react';
import { useForm, router } from '@inertiajs/react';
import { Input, Button, Modal, Checkbox, Pagination } from '@/Components/UI';
import TableContainer from '@/Components/UI/DataDisplay/TableContainer';

export default function AgeCategoriesTab({ event, ageCategories = [] }) {
    const itemsPerPage = 5;
    const [ageSearch, setAgeSearch] = useState('');
    const [agePage, setAgePage] = useState(1);

    // Modal state
    const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);
    const [editingAgeCategory, setEditingAgeCategory] = useState(null);
    const [deletingAgeCategory, setDeletingAgeCategory] = useState(null);

    // Helper: format currency IDR
    const formatIDR = (val) => {
        const num = Number(val) || 0;
        return 'Rp ' + num.toLocaleString('id-ID');
    };

    // Form hook
    const ageForm = useForm({
        name: '',
        min_age: '',
        max_age: '',
        fee: 400000,
        description: '',
        order: 0,
        is_active: true,
    });

    // Filtering & Pagination
    const filteredAgeCategories = useMemo(() => {
        return ageCategories.filter((cat) => {
            if (!ageSearch) return true;
            const q = ageSearch.toLowerCase();
            return (
                cat.name?.toLowerCase().includes(q) ||
                cat.description?.toLowerCase().includes(q) ||
                cat.age_range?.toLowerCase().includes(q)
            );
        });
    }, [ageCategories, ageSearch]);

    const paginatedAgeCategories = useMemo(() => {
        return filteredAgeCategories.slice(
            (agePage - 1) * itemsPerPage,
            agePage * itemsPerPage
        );
    }, [filteredAgeCategories, agePage]);

    // Handlers
    const openCreateAgeModal = () => {
        setEditingAgeCategory(null);
        ageForm.reset();
        ageForm.clearErrors();
        ageForm.setData({
            name: '',
            min_age: '',
            max_age: '',
            fee: 400000,
            description: '',
            order: (ageCategories.length || 0) + 1,
            is_active: true,
        });
        setIsAgeModalOpen(true);
    };

    const openEditAgeModal = (cat) => {
        setEditingAgeCategory(cat);
        ageForm.clearErrors();
        ageForm.setData({
            name: cat.name || '',
            min_age: cat.min_age ?? '',
            max_age: cat.max_age ?? '',
            fee: cat.fee ?? 0,
            description: cat.description || '',
            order: cat.order ?? 0,
            is_active: cat.is_active ?? true,
        });
        setIsAgeModalOpen(true);
    };

    const submitAgeCategory = (e) => {
        e.preventDefault();
        if (editingAgeCategory) {
            ageForm.put(`/admin/master/event/${event.id}/age-category/${editingAgeCategory.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsAgeModalOpen(false);
                    setEditingAgeCategory(null);
                },
            });
        } else {
            ageForm.post(`/admin/master/event/${event.id}/age-category`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsAgeModalOpen(false);
                    ageForm.reset();
                },
            });
        }
    };

    const confirmDeleteAgeCategory = () => {
        if (!deletingAgeCategory) return;
        router.delete(`/admin/master/event/${event.id}/age-category/${deletingAgeCategory.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingAgeCategory(null),
        });
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#ede9e1] dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Table Header / Toolbar */}
            <div className="p-5 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h3 className="font-sans text-base md:text-lg font-bold text-[#0f0d0b] dark:text-white tracking-tight">
                            Kelompok Umur & Tarif
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#c0392b]/10 text-[#c0392b] dark:bg-[#c0392b]/20 dark:text-[#f0c060] border border-[#c0392b]/20">
                            {ageCategories.length} Total
                        </span>
                    </div>
                    <p className="text-xs text-[#b5afa6] dark:text-slate-400 mt-1">
                        Daftar kelompok usia kenshi beserta tarif pendaftaran masing-masing kategori
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Search Input Bar */}
                    <Input
                        type="search"
                        size="sm"
                        value={ageSearch}
                        onChange={(event) => {
                            setAgeSearch(event.target.value);
                            setAgePage(1);
                        }}
                        placeholder="Cari kelompok umur..."
                        iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                        clearable
                        onClear={() => { setAgeSearch(''); setAgePage(1); }}
                        containerClassName="w-56 sm:w-64"
                    />

                    <Button
                        variant="unstyled"
                        size="none"
                        type="button"
                        onClick={openCreateAgeModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#c0392b] to-[#96281b] hover:from-[#a93226] hover:to-[#7b1f14] shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
                        title="Tambah Kelompok Umur Baru"
                    >
                        <i className="fa-solid fa-plus text-xs" />
                        <span>Tambah Kelompok Umur</span>
                    </Button>
                </div>
            </div>

            {/* Table Content */}
            <TableContainer ariaLabel="Tabel kelompok umur">
                <table className="responsive-data-table whitespace-nowrap w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[#f7f4ef] dark:bg-slate-800/70 border-y border-[#ede9e1] dark:border-slate-800 text-[10px] uppercase font-semibold text-[#8c827a] dark:text-slate-400 tracking-wider whitespace-nowrap">
                            <th scope="col" className="py-3 px-4 text-center w-14">#</th>
                            <th scope="col" className="py-3 px-4 min-w-[220px]">Kelompok Umur</th>
                            <th scope="col" className="py-3 px-4 min-w-[140px]">Rentang Usia</th>
                            <th scope="col" className="py-3 px-4 min-w-[150px]">Tarif Pendaftaran</th>
                            <th scope="col" className="py-3 px-4 min-w-[220px]">Keterangan / Kelahiran</th>
                            <th scope="col" className="py-3 px-4 text-center w-32">Nomer Tanding</th>
                            <th scope="col" className="py-3 px-4 text-center w-28">Status</th>
                            <th scope="col" className="py-3 px-4 text-center w-24">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ede9e1]/80 dark:divide-slate-800/80 text-xs">
                        {paginatedAgeCategories.length > 0 ? (
                            paginatedAgeCategories.map((cat, idx) => (
                                <tr
                                    key={cat.id}
                                    className="hover:bg-[#fcfbf9] dark:hover:bg-slate-800/40 transition-colors group"
                                >
                                    {/* Row Index */}
                                    <td className="py-3.5 px-4 text-center text-[#888] dark:text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                        {(agePage - 1) * itemsPerPage + idx + 1}
                                    </td>

                                    {/* Kelompok Umur with Initials Avatar Badge */}
                                    <td className="py-3.5 px-4 font-medium text-[#0f0d0b] dark:text-white">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                                                style={{
                                                    background: 'linear-gradient(135deg, #c0392b, #d4a843)',
                                                }}
                                            >
                                                {(cat.name || 'KU').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p
                                                    onClick={() => openEditAgeModal(cat)}
                                                    className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-[#c0392b] dark:group-hover:text-[#f0c060] transition-colors cursor-pointer truncate"
                                                >
                                                    {cat.name}
                                                </p>
                                                <p className="text-[10px] text-[#8c827a] dark:text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                                    <i className="fa-solid fa-hashtag text-[8px] opacity-70" />
                                                    <span>Urutan #{cat.order}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Rentang Usia */}
                                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <i className="fa-regular fa-calendar-check text-[11px] text-[#c0392b]/70 shrink-0" />
                                            <span>{cat.age_range}</span>
                                        </div>
                                    </td>

                                    {/* Tarif Pendaftaran */}
                                    <td className="py-3.5 px-4 font-mono font-bold text-[#0f0d0b] dark:text-white whitespace-nowrap text-sm">
                                        {cat.fee_formatted}
                                    </td>

                                    {/* Keterangan */}
                                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs">
                                        <span className="truncate block max-w-xs">{cat.description || '-'}</span>
                                    </td>

                                    {/* Nomer Tanding Count */}
                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
                                            <i className="fa-solid fa-award text-[10px] text-amber-600" />
                                            {cat.match_categories_count} Nomor
                                        </span>
                                    </td>

                                    {/* Status */}
                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        {cat.is_active ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Aktif
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                Nonaktif
                                            </span>
                                        )}
                                    </td>

                                    {/* Action Buttons */}
                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <Button
                                                variant="unstyled"
                                                size="none"
                                                type="button"
                                                onClick={() => openEditAgeModal(cat)}
                                                className="w-8 h-8 rounded-xl border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#c0392b] hover:text-white hover:border-[#c0392b] dark:hover:bg-[#c0392b] transition-all inline-flex items-center justify-center cursor-pointer shadow-xs hover:scale-105"
                                                title="Edit Kelompok Umur"
                                            >
                                                <i className="fa-solid fa-pen-to-square text-xs" />
                                            </Button>
                                            <Button
                                                variant="unstyled"
                                                size="none"
                                                type="button"
                                                onClick={() => setDeletingAgeCategory(cat)}
                                                className="w-8 h-8 rounded-xl border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all inline-flex items-center justify-center cursor-pointer shadow-xs hover:scale-105"
                                                title="Hapus Kelompok Umur"
                                            >
                                                <i className="fa-solid fa-trash-can text-xs" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="py-12 text-center text-[#b5afa6] italic text-xs">
                                    <i className="fa-solid fa-users-line text-3xl mb-2 block opacity-40" />
                                    Belum ada data kelompok umur yang sesuai.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </TableContainer>

            {/* Table Footer with Pagination Controls */}
            {filteredAgeCategories.length > 0 && (
                <Pagination
                    currentPage={agePage}
                    totalPages={Math.ceil(filteredAgeCategories.length / itemsPerPage) || 1}
                    total={filteredAgeCategories.length}
                    from={(agePage - 1) * itemsPerPage + 1}
                    to={Math.min(agePage * itemsPerPage, filteredAgeCategories.length)}
                    onPageChange={(p) => setAgePage(p)}
                    label="kelompok umur"
                    variant="footer"
                />
            )}

            {/* MODAL: CREATE / EDIT AGE CATEGORY */}
            <Modal
                isOpen={isAgeModalOpen}
                onClose={() => setIsAgeModalOpen(false)}
                title={editingAgeCategory ? 'Edit Kelompok Umur' : 'Tambah Kelompok Umur Baru'}
                description="Tentukan nama kelompok umur, rentang usia, dan tarif biaya pendaftarannya."
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAgeModalOpen(false)}
                            disabled={ageForm.processing}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={submitAgeCategory}
                            loading={ageForm.processing}
                            className="bg-[#141210] hover:bg-black text-amber-400 font-semibold"
                        >
                            {editingAgeCategory ? 'Simpan Perubahan' : 'Tambahkan Kategori'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={submitAgeCategory} className="space-y-4">
                    <Input
                        label="Nama Kelompok Umur"
                        required
                        value={ageForm.data.name}
                        onChange={(e) => ageForm.setData('name', e.target.value)}
                        error={ageForm.errors.name}
                        placeholder="e.g. Pemula, Remaja A, Dewasa"
                    />

                    <div className="space-y-1">
                        <Input
                            label="Tarif Biaya Pendaftaran (Rp)"
                            type="number"
                            min="0"
                            step="1000"
                            required
                            value={ageForm.data.fee}
                            onChange={(e) => ageForm.setData('fee', e.target.value)}
                            error={ageForm.errors.fee}
                            iconLeft={<span className="text-xs font-bold text-gray-400">Rp</span>}
                            placeholder="400000"
                        />
                        <p className="text-xs text-emerald-700 font-bold">
                            Pratinjau Biaya: {formatIDR(ageForm.data.fee)}
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                            label="Usia Minimal (Tahun)"
                            type="number"
                            min="1"
                            max="100"
                            value={ageForm.data.min_age}
                            onChange={(e) => ageForm.setData('min_age', e.target.value)}
                            error={ageForm.errors.min_age}
                            placeholder="e.g. 7"
                        />
                        <Input
                            label="Usia Maksimal (Tahun)"
                            type="number"
                            min="1"
                            max="100"
                            value={ageForm.data.max_age}
                            onChange={(e) => ageForm.setData('max_age', e.target.value)}
                            error={ageForm.errors.max_age}
                            placeholder="e.g. 10"
                        />
                    </div>

                    <Input
                        label="Keterangan / Batasan Kelahiran"
                        value={ageForm.data.description}
                        onChange={(e) => ageForm.setData('description', e.target.value)}
                        error={ageForm.errors.description}
                        placeholder="e.g. Kenshi kelahiran 2016 - 2019"
                    />

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <Input
                            label="Urutan Tampilan"
                            type="number"
                            min="0"
                            value={ageForm.data.order}
                            onChange={(e) => ageForm.setData('order', e.target.value)}
                            error={ageForm.errors.order}
                        />
                        <div className="flex items-center pt-6">
                            <Checkbox
                                id="age-category-is-active"
                                label="Status Aktif"
                                checked={ageForm.data.is_active}
                                onChange={(event) => ageForm.setData('is_active', event.target.checked)}
                            />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* MODAL: DELETE AGE CATEGORY CONFIRMATION */}
            <Modal
                isOpen={!!deletingAgeCategory}
                onClose={() => setDeletingAgeCategory(null)}
                title="Konfirmasi Hapus Kelompok Umur"
                description={`Apakah Anda yakin ingin menghapus kelompok umur '${deletingAgeCategory?.name}'? Seluruh nomer pertandingan yang terhubung akan disesuaikan.`}
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button variant="outline" onClick={() => setDeletingAgeCategory(null)}>
                            Batal
                        </Button>
                        <Button variant="danger" onClick={confirmDeleteAgeCategory}>
                            Hapus Kategori
                        </Button>
                    </div>
                }
            />
        </div>
    );
}
