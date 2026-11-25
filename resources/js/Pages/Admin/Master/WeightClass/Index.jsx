import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import MasterDataTransfer from '@/Components/Admin/MasterDataTransfer';
import { Button, Checkbox, Combobox, EmptyState, Input, Modal, Pagination, Textarea } from '@/Components/UI';

const genderOptions = [
    { value: 'male', label: 'Putra' },
    { value: 'female', label: 'Putri' },
    { value: 'mixed', label: 'Campuran' },
];

const genderLabel = (gender) => genderOptions.find((option) => option.value === gender)?.label || 'Campuran';

const formatWeightRange = (weightClass) => {
    if (weightClass.min_weight && weightClass.max_weight) return `${weightClass.min_weight}–${weightClass.max_weight} kg`;
    if (weightClass.min_weight) return `≥ ${weightClass.min_weight} kg`;
    if (weightClass.max_weight) return `≤ ${weightClass.max_weight} kg`;

    return 'Tanpa batas berat';
};

export default function WeightClassIndex({
    weightClasses = { data: [], total: 0 },
    filters = { search: '' },
    auth = {},
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [editingWeightClass, setEditingWeightClass] = useState(null);
    const [deletingWeightClass, setDeletingWeightClass] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const form = useForm({
        name: '',
        gender: 'mixed',
        min_weight: '',
        max_weight: '',
        order: 0,
        is_active: true,
        description: '',
    });

    const openCreate = () => {
        setEditingWeightClass(null);
        form.reset();
        form.clearErrors();
        form.setData({
            name: '',
            gender: 'mixed',
            min_weight: '',
            max_weight: '',
            order: (weightClasses.total || 0) + 1,
            is_active: true,
            description: '',
        });
        setIsModalOpen(true);
    };

    const openEdit = (weightClass) => {
        setEditingWeightClass(weightClass);
        form.clearErrors();
        form.setData({
            name: weightClass.name || '',
            gender: weightClass.gender || 'mixed',
            min_weight: weightClass.min_weight ?? '',
            max_weight: weightClass.max_weight ?? '',
            order: weightClass.order ?? 0,
            is_active: weightClass.is_active ?? true,
            description: weightClass.description || '',
        });
        setIsModalOpen(true);
    };

    const submit = (event) => {
        event.preventDefault();
        const options = {
            onSuccess: () => {
                setIsModalOpen(false);
                setEditingWeightClass(null);
            },
        };

        if (editingWeightClass) {
            form.put(`/admin/master/weight-class/${editingWeightClass.id}`, options);
        } else {
            form.post('/admin/master/weight-class', options);
        }
    };

    const applySearch = (event) => {
        event.preventDefault();
        router.get('/admin/master/weight-class', { search }, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout auth={auth} title="Master Berat Badan">
            <Head title="Master Berat Badan - Smart Perkemi" />

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
                            Kelas Berat Badan Randori
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Referensi kelas berat Randori standar yang dapat langsung dipilih saat merumuskan nomor pertandingan kejuaraan.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                        <MasterDataTransfer type="weight-class" label="Berat Badan" />
                        <Button
                            variant="unstyled"
                            size="none"
                            type="button"
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-transparent bg-[#c0392b] hover:bg-[#a93226] text-white font-semibold text-xs md:text-sm shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                        >
                            <i className="fa-solid fa-circle-plus text-xs" />
                            <span>Tambah Kelas Berat</span>
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
                                placeholder="Cari nama kelas berat..."
                                iconLeft={<i className="fa-solid fa-magnifying-glass" />}
                                clearable
                                onClear={() => {
                                    setSearch('');
                                    router.get('/admin/master/weight-class', { search: '' }, { preserveState: true, replace: true });
                                }}
                                size="sm"
                            />
                        </form>
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            <strong className="text-slate-900 dark:text-white">{weightClasses.total || 0}</strong> kelas terdaftar
                        </span>
                    </div>

                    {weightClasses.data?.length ? (
                        <>
                            <TableContainer ariaLabel="Tabel master kelas berat badan">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#ede9e1] dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                                            <th className="px-5 py-3 w-16 text-center">Urutan</th>
                                            <th className="px-5 py-3">Kelas Berat</th>
                                            <th className="px-5 py-3">Gender</th>
                                            <th className="px-5 py-3">Rentang Berat</th>
                                            <th className="px-5 py-3 text-center">Status</th>
                                            <th className="px-5 py-3 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#ede9e1] dark:divide-slate-800">
                                        {weightClasses.data.map((weightClass) => (
                                            <tr key={weightClass.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-5 py-3.5 font-mono text-xs text-center text-slate-500 dark:text-slate-400 tabular-nums">
                                                    #{weightClass.order}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <p className="font-semibold text-slate-900 dark:text-white text-xs md:text-sm">
                                                        {weightClass.name}
                                                    </p>
                                                    {weightClass.description && (
                                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                            {weightClass.description}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                        {genderLabel(weightClass.gender)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white tabular-nums">
                                                    {formatWeightRange(weightClass)}
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${weightClass.is_active
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                            }`}
                                                    >
                                                        <span className={`size-1.5 rounded-full ${weightClass.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                        {weightClass.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEdit(weightClass)}
                                                            className="size-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center transition-all cursor-pointer"
                                                            title={`Edit ${weightClass.name}`}
                                                            aria-label={`Edit ${weightClass.name}`}
                                                        >
                                                            <i className="fa-solid fa-pen text-xs" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeletingWeightClass(weightClass)}
                                                            className="size-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 inline-flex items-center justify-center transition-all cursor-pointer"
                                                            title={`Hapus ${weightClass.name}`}
                                                            aria-label={`Hapus ${weightClass.name}`}
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
                                pagination={weightClasses}
                                label="kelas"
                                onPageChange={(page) => router.get('/admin/master/weight-class', { search, page }, { preserveState: true })}
                            />
                        </>
                    ) : (
                        <div className="p-8">
                            <EmptyState
                                title="Belum ada kelas berat"
                                description="Tambahkan kelas berat agar batas Randori dapat dipilih konsisten pada setiap event."
                                action={<Button onClick={openCreate}>Tambah Kelas Berat</Button>}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ════ MODAL CREATE / EDIT ════ */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingWeightClass ? 'Edit Kelas Berat' : 'Tambah Kelas Berat'}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={submit} loading={form.processing}>
                            {editingWeightClass ? 'Simpan Perubahan' : 'Tambah Kelas Berat'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Nama Kelas Berat"
                            required
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            error={form.errors.name}
                            placeholder="Contoh: Kelas -50 kg"
                        />
                        <Combobox
                            label="Kategori Gender"
                            required
                            value={form.data.gender}
                            onChange={(value) => form.setData('gender', value)}
                            options={genderOptions}
                            clearable={false}
                            error={form.errors.gender}
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Berat Minimal (kg)"
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.data.min_weight}
                            onChange={(event) => form.setData('min_weight', event.target.value)}
                            error={form.errors.min_weight}
                            placeholder="Kosongkan bila tanpa batas bawah"
                        />
                        <Input
                            label="Berat Maksimal (kg)"
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.data.max_weight}
                            onChange={(event) => form.setData('max_weight', event.target.value)}
                            error={form.errors.max_weight}
                            placeholder="Kosongkan bila tanpa batas atas"
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
                        placeholder="Catatan khusus kelas, bila ada."
                    />
                    <Checkbox
                        id="weight-class-is-active"
                        label="Aktif dan dapat dipilih pada event"
                        checked={form.data.is_active}
                        onChange={(event) => form.setData('is_active', event.target.checked)}
                    />
                </form>
            </Modal>

            {/* ════ MODAL DELETE CONFIRMATION ════ */}
            <Modal
                isOpen={!!deletingWeightClass}
                onClose={() => setDeletingWeightClass(null)}
                title="Hapus Kelas Berat"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setDeletingWeightClass(null)}>
                            Batal
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => router.delete(`/admin/master/weight-class/${deletingWeightClass.id}`, { onSuccess: () => setDeletingWeightClass(null) })}
                        >
                            Hapus
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    Apakah Anda yakin ingin menghapus kelas <strong>{deletingWeightClass?.name}</strong> dari master data?
                </p>
            </Modal>
        </AdminLayout>
    );
}
