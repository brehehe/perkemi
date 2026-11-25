import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import MasterDataTransfer from '@/Components/Admin/MasterDataTransfer';
import { Button, Checkbox, EmptyState, Input, Modal, Pagination, Textarea } from '@/Components/UI';

export default function KyuIndex({ kyus = { data: [], total: 0 }, filters = { search: '' }, auth = {} }) {
    const [search, setSearch] = useState(filters.search || '');
    const [editingKyu, setEditingKyu] = useState(null);
    const [deletingKyu, setDeletingKyu] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const form = useForm({ name: '', belt_color: '', order: 0, is_active: true, description: '' });

    const openCreate = () => {
        setEditingKyu(null);
        form.reset();
        form.clearErrors();
        form.setData({ name: '', belt_color: '', order: (kyus.total || 0) + 1, is_active: true, description: '' });
        setIsModalOpen(true);
    };

    const openEdit = (kyu) => {
        setEditingKyu(kyu);
        form.clearErrors();
        form.setData({
            name: kyu.name || '',
            belt_color: kyu.belt_color || '',
            order: kyu.order ?? 0,
            is_active: kyu.is_active ?? true,
            description: kyu.description || '',
        });
        setIsModalOpen(true);
    };

    const submit = (event) => {
        event.preventDefault();
        const options = {
            onSuccess: () => {
                setIsModalOpen(false);
                setEditingKyu(null);
            },
        };
        editingKyu
            ? form.put(`/admin/master/kyu/${editingKyu.id}`, options)
            : form.post('/admin/master/kyu', options);
    };

    const applySearch = (event) => {
        event.preventDefault();
        router.get('/admin/master/kyu', { search }, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout auth={auth} title="Master Kyu & Dan">
            <Head title="Master Kyu & Dan - Smart Perkemi" />

            <div className="space-y-6 pb-12">
                {/* ════ HEADER SECTION ════ */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                        {/* <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                <i className="fa-solid fa-database text-[9px] text-[#c0392b]" />
                                Master Data Global
                            </span>
                        </div> */}
                        <h1 className="font-sans text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Tingkatan Kyu & Dan
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Sumber pilihan tingkatan sabuk resmi untuk data atlet kenshi dan nomor pertandingan.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                        <MasterDataTransfer type="kyu" label="Kyu & Dan" />
                        <Button
                            variant="unstyled"
                            size="none"
                            type="button"
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-transparent bg-[#c0392b] hover:bg-[#a93226] text-white font-semibold text-xs md:text-sm shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                        >
                            <i className="fa-solid fa-circle-plus text-xs" />
                            <span>Tambah Tingkatan Kyu</span>
                        </Button>
                    </div>
                </div>

                {/* ════ TABLE CONTAINER & SEARCH BAR ════ */}
                <div className="overflow-hidden rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                    <div className="flex flex-col gap-3 border-b border-[#ede9e1] dark:border-slate-800 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900">
                        <form onSubmit={applySearch} className="w-full sm:max-w-sm">
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Cari tingkatan Kyu atau Dan..."
                                iconLeft={<i className="fa-solid fa-magnifying-glass" />}
                                clearable
                                onClear={() => {
                                    setSearch('');
                                    router.get('/admin/master/kyu', { search: '' }, { preserveState: true, replace: true });
                                }}
                                size="sm"
                            />
                        </form>
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            <strong className="text-slate-900 dark:text-white">{kyus.total || 0}</strong> tingkatan terdaftar
                        </span>
                    </div>

                    {kyus.data?.length ? (
                        <>
                            <TableContainer ariaLabel="Tabel data tingkat kyu dan dan">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#ede9e1] dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                                            <th className="px-5 py-3 w-16 text-center">Urutan</th>
                                            <th className="px-5 py-3">Tingkatan</th>
                                            <th className="px-5 py-3">Warna Sabuk</th>
                                            <th className="px-5 py-3 text-center">Status</th>
                                            <th className="px-5 py-3 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#ede9e1] dark:divide-slate-800">
                                        {kyus.data.map((kyu) => (
                                            <tr key={kyu.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-5 py-3.5 font-mono text-xs text-center text-slate-500 dark:text-slate-400 tabular-nums">
                                                    #{kyu.order}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <p className="font-semibold text-slate-900 dark:text-white text-xs md:text-sm">
                                                        {kyu.name}
                                                    </p>
                                                    {kyu.description && (
                                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                            {kyu.description}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium">
                                                        {kyu.belt_color || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${kyu.is_active
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                            }`}
                                                    >
                                                        <span className={`size-1.5 rounded-full ${kyu.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                        {kyu.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEdit(kyu)}
                                                            className="size-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center transition-all cursor-pointer"
                                                            title={`Edit ${kyu.name}`}
                                                            aria-label={`Edit ${kyu.name}`}
                                                        >
                                                            <i className="fa-solid fa-pen text-xs" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeletingKyu(kyu)}
                                                            className="size-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 inline-flex items-center justify-center transition-all cursor-pointer"
                                                            title={`Hapus ${kyu.name}`}
                                                            aria-label={`Hapus ${kyu.name}`}
                                                        >
                                                            <i className="fa-solid fa-trash-can text-xs" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </TableContainer>
                            <Pagination
                                pagination={kyus}
                                label="tingkatan"
                                onPageChange={(page) => router.get('/admin/master/kyu', { search, page }, { preserveState: true })}
                            />
                        </>
                    ) : (
                        <div className="p-8">
                            <EmptyState
                                title="Belum ada Master Kyu"
                                description="Tambahkan tingkatan Kyu atau Dan agar dapat dipilih pada formulir atlet dan nomor pertandingan."
                                action={<Button onClick={openCreate}>Tambah Kyu</Button>}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ════ MODAL CREATE / EDIT ════ */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingKyu ? 'Edit Master Kyu' : 'Tambah Master Kyu'}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={submit} loading={form.processing}>
                            {editingKyu ? 'Simpan Perubahan' : 'Tambah Kyu'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Nama Tingkatan"
                            required
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            error={form.errors.name}
                            placeholder="Contoh: Kyu 1"
                        />
                        <Input
                            label="Warna Sabuk"
                            value={form.data.belt_color}
                            onChange={(event) => form.setData('belt_color', event.target.value)}
                            error={form.errors.belt_color}
                            placeholder="Contoh: Coklat"
                        />
                    </div>
                    <Input
                        label="Urutan"
                        type="number"
                        min="0"
                        required
                        value={form.data.order}
                        onChange={(event) => form.setData('order', event.target.value)}
                        error={form.errors.order}
                    />
                    <Textarea
                        label="Keterangan"
                        rows={3}
                        value={form.data.description}
                        onChange={(event) => form.setData('description', event.target.value)}
                        error={form.errors.description}
                    />
                    <Checkbox
                        id="kyu-is-active"
                        label="Aktif dan dapat dipilih"
                        checked={form.data.is_active}
                        onChange={(event) => form.setData('is_active', event.target.checked)}
                    />
                </form>
            </Modal>

            {/* ════ MODAL DELETE CONFIRMATION ════ */}
            <Modal
                isOpen={!!deletingKyu}
                onClose={() => setDeletingKyu(null)}
                title="Hapus Master Kyu"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setDeletingKyu(null)}>
                            Batal
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => router.delete(`/admin/master/kyu/${deletingKyu.id}`, { onSuccess: () => setDeletingKyu(null) })}
                        >
                            Hapus
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    Apakah Anda yakin ingin menghapus tingkatan <strong>{deletingKyu?.name}</strong> dari master data?
                </p>
            </Modal>
        </AdminLayout>
    );
}
