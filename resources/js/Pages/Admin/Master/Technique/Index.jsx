import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import MasterDataTransfer from '@/Components/Admin/MasterDataTransfer';
import { Button, Checkbox, Combobox, EmptyState, Input, Modal, Pagination, Textarea } from '@/Components/UI';

export default function TechniqueIndex({
    techniques = { data: [], total: 0 },
    kyus = [],
    filters = { search: '' },
    auth = {},
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [isOpen, setIsOpen] = useState(false);

    const form = useForm({
        kyu_id: '',
        name: '',
        category: '',
        description: '',
        order: 0,
        is_active: true,
    });

    const startCreate = () => {
        setEditing(null);
        form.reset();
        form.clearErrors();
        form.setData({
            kyu_id: '',
            name: '',
            category: '',
            description: '',
            order: (techniques.total || 0) + 1,
            is_active: true,
        });
        setIsOpen(true);
    };

    const startEdit = (item) => {
        setEditing(item);
        form.clearErrors();
        form.setData({
            kyu_id: item?.kyu_id || '',
            name: item?.name || '',
            category: item?.category || '',
            description: item?.description || '',
            order: item?.order ?? (techniques.total || 0) + 1,
            is_active: item?.is_active ?? true,
        });
        setIsOpen(true);
    };

    const save = (event) => {
        event.preventDefault();
        const options = {
            onSuccess: () => {
                setIsOpen(false);
                setEditing(null);
            },
        };
        editing
            ? form.put(`/admin/master/technique/${editing.id}`, options)
            : form.post('/admin/master/technique', options);
    };

    const applySearch = (event) => {
        event.preventDefault();
        router.get('/admin/master/technique', { search }, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout auth={auth} title="Master Teknik Embu">
            <Head title="Master Teknik Embu - Smart Perkemi" />

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
                            Master Teknik Embu
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Katalog materi teknik Shorinji Kempo (Goho, Juho) yang dikelompokkan berdasarkan tingkatan Kyu & Dan.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                        <MasterDataTransfer type="technique" label="Teknik" />
                        <Button
                            variant="unstyled"
                            size="none"
                            type="button"
                            onClick={startCreate}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-transparent bg-[#c0392b] hover:bg-[#a93226] text-white font-semibold text-xs md:text-sm shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                        >
                            <i className="fa-solid fa-circle-plus text-xs" />
                            <span>Tambah Teknik Baru</span>
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
                                placeholder="Cari nama teknik atau kategori..."
                                iconLeft={<i className="fa-solid fa-magnifying-glass" />}
                                clearable
                                onClear={() => {
                                    setSearch('');
                                    router.get('/admin/master/technique', { search: '' }, { preserveState: true, replace: true });
                                }}
                                size="sm"
                            />
                        </form>
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            <strong className="text-slate-900 dark:text-white">{techniques.total || 0}</strong> teknik terdaftar
                        </span>
                    </div>

                    {techniques.data?.length ? (
                        <>
                            <TableContainer ariaLabel="Tabel master teknik embu">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#ede9e1] dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                                            <th className="px-5 py-3 w-16 text-center">Urutan</th>
                                            <th className="px-5 py-3">Nama Teknik</th>
                                            <th className="px-5 py-3">Tingkatan Kyu</th>
                                            <th className="px-5 py-3">Kategori</th>
                                            <th className="px-5 py-3 text-center">Status</th>
                                            <th className="px-5 py-3 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#ede9e1] dark:divide-slate-800">
                                        {techniques.data.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-5 py-3.5 font-mono text-xs text-center text-slate-500 dark:text-slate-400 tabular-nums">
                                                    #{item.order}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <p className="font-semibold text-slate-900 dark:text-white text-xs md:text-sm">
                                                        {item.name}
                                                    </p>
                                                    {item.description && (
                                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium">
                                                        {item.kyu?.name || 'Semua Kyu'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                        {item.category || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${item.is_active
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                            }`}
                                                    >
                                                        <span className={`size-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                        {item.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => startEdit(item)}
                                                            className="size-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center transition-all cursor-pointer"
                                                            title={`Edit ${item.name}`}
                                                            aria-label={`Edit ${item.name}`}
                                                        >
                                                            <i className="fa-solid fa-pen text-xs" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleting(item)}
                                                            className="size-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 inline-flex items-center justify-center transition-all cursor-pointer"
                                                            title={`Hapus ${item.name}`}
                                                            aria-label={`Hapus ${item.name}`}
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
                                pagination={techniques}
                                label="teknik"
                                onPageChange={(page) => router.get('/admin/master/technique', { search, page }, { preserveState: true })}
                            />
                        </>
                    ) : (
                        <div className="p-8">
                            <EmptyState
                                title="Belum ada data teknik"
                                description="Tambahkan materi teknik Embu agar dapat dipilih dalam penilaian dan aturan pertandingan."
                                action={<Button onClick={startCreate}>Tambah Teknik Baru</Button>}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ════ MODAL CREATE / EDIT ════ */}
            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title={editing ? 'Edit Teknik Embu' : 'Tambah Teknik Embu'}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={save} loading={form.processing}>
                            {editing ? 'Simpan Perubahan' : 'Tambah Teknik'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={save} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Nama Teknik"
                            required
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            error={form.errors.name}
                            placeholder="Contoh: Ryuo Ken Dai Ichi-kei"
                        />
                        <Combobox
                            label="Tingkatan Kyu"
                            value={form.data.kyu_id}
                            onChange={(value) => form.setData('kyu_id', value)}
                            options={kyus.map((kyu) => ({ value: kyu.id, label: kyu.name }))}
                            placeholder="Pilih tingkatan Kyu..."
                            error={form.errors.kyu_id}
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Kategori Teknik"
                            value={form.data.category}
                            onChange={(event) => form.setData('category', event.target.value)}
                            error={form.errors.category}
                            placeholder="Contoh: Goho atau Juho"
                        />
                        <Input
                            label="Urutan"
                            type="number"
                            min="0"
                            required
                            value={form.data.order}
                            onChange={(event) => form.setData('order', event.target.value)}
                            error={form.errors.order}
                        />
                    </div>
                    <Textarea
                        label="Deskripsi & Catatan"
                        rows={3}
                        value={form.data.description}
                        onChange={(event) => form.setData('description', event.target.value)}
                        error={form.errors.description}
                        placeholder="Rincian gerakan, poin kunci, atau variasi..."
                    />
                    <Checkbox
                        id="technique-is-active"
                        label="Aktif dan dapat digunakan dalam sistem"
                        checked={form.data.is_active}
                        onChange={(event) => form.setData('is_active', event.target.checked)}
                    />
                </form>
            </Modal>

            {/* ════ MODAL DELETE CONFIRMATION ════ */}
            <Modal
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                title="Hapus Teknik"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setDeleting(null)}>
                            Batal
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => router.delete(`/admin/master/technique/${deleting.id}`, { onSuccess: () => setDeleting(null) })}
                        >
                            Hapus
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    Apakah Anda yakin ingin menghapus teknik <strong>{deleting?.name}</strong> dari master data?
                </p>
            </Modal>
        </AdminLayout>
    );
}
