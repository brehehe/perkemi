import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
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

export default function WeightClassIndex({ weightClasses = { data: [], total: 0 }, filters = { search: '' }, auth = {} }) {
    const [search, setSearch] = useState(filters.search || '');
    const [editingWeightClass, setEditingWeightClass] = useState(null);
    const [deletingWeightClass, setDeletingWeightClass] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const form = useForm({ name: '', gender: 'mixed', min_weight: '', max_weight: '', order: 0, is_active: true, description: '' });

    const openCreate = () => {
        setEditingWeightClass(null);
        form.reset();
        form.clearErrors();
        form.setData({ name: '', gender: 'mixed', min_weight: '', max_weight: '', order: (weightClasses.total || 0) + 1, is_active: true, description: '' });
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
        const options = { onSuccess: () => { setIsModalOpen(false); setEditingWeightClass(null); } };

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
                <div className="rounded-2xl bg-gradient-to-r from-[#141210] via-[#1c1917] to-[#292524] p-6 text-white shadow-xl">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Master Data</p>
                            <h1 className="mt-1 text-2xl font-bold">Kelas Berat Badan</h1>
                            <p className="mt-1 text-sm text-white/65">Referensi kelas berat Randori yang dapat langsung dipilih pada nomor pertandingan event.</p>
                        </div>
                        <Button onClick={openCreate} className="bg-amber-400 text-[#141210] hover:bg-amber-300">
                            <i className="fa-solid fa-plus mr-2" />Tambah Kelas Berat
                        </Button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#ede9e1] bg-white shadow-xs">
                    <div className="flex flex-col gap-3 border-b border-[#ede9e1] p-5 sm:flex-row sm:items-center sm:justify-between">
                        <form onSubmit={applySearch} className="w-full sm:max-w-sm">
                            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kelas berat..." iconLeft={<i className="fa-solid fa-magnifying-glass" />} />
                        </form>
                        <span className="text-xs text-[#706860]"><strong className="text-[#141210]">{weightClasses.total || 0}</strong> kelas terdaftar</span>
                    </div>

                    {weightClasses.data?.length ? (
                        <>
                            <TableContainer ariaLabel="Tabel data">
                                <table className="responsive-data-table whitespace-nowrap w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-[#ede9e1] bg-[#f7f4ef] text-[10px] font-semibold uppercase tracking-wider text-[#8c827a]">
                                            <th className="px-5 py-3">Urutan</th>
                                            <th className="px-5 py-3">Kelas Berat</th>
                                            <th className="px-5 py-3">Gender</th>
                                            <th className="px-5 py-3">Rentang Berat</th>
                                            <th className="px-5 py-3">Status</th>
                                            <th className="px-5 py-3 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#ede9e1]">
                                        {weightClasses.data.map((weightClass) => (
                                            <tr key={weightClass.id} className="hover:bg-[#fcfbf9]">
                                                <td className="px-5 py-4 font-mono text-xs">#{weightClass.order}</td>
                                                <td className="px-5 py-4">
                                                    <p className="font-semibold text-[#141210]">{weightClass.name}</p>
                                                    {weightClass.description && <p className="mt-0.5 text-xs text-[#8c827a]">{weightClass.description}</p>}
                                                </td>
                                                <td className="px-5 py-4 text-[#706860]">{genderLabel(weightClass.gender)}</td>
                                                <td className="px-5 py-4 font-medium text-[#141210]">{formatWeightRange(weightClass)}</td>
                                                <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${weightClass.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{weightClass.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                                                <td className="px-5 py-4 text-right">
                                                    <Button variant="unstyled" size="none" onClick={() => openEdit(weightClass)} className="p-2 text-blue-600 hover:bg-blue-50" aria-label={`Edit ${weightClass.name}`}><i className="fa-solid fa-pen" /></Button>
                                                    <Button variant="unstyled" size="none" onClick={() => setDeletingWeightClass(weightClass)} className="p-2 text-red-600 hover:bg-red-50" aria-label={`Hapus ${weightClass.name}`}><i className="fa-solid fa-trash" /></Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table></TableContainer>
                            <Pagination pagination={weightClasses} label="kelas" onPageChange={(page) => router.get('/admin/master/weight-class', { search, page }, { preserveState: true })} />
                        </>
                    ) : (
                        <div className="p-6"><EmptyState title="Belum ada kelas berat" description="Tambahkan kelas berat agar batas Randori dapat dipilih konsisten pada setiap event." action={<Button onClick={openCreate}>Tambah Kelas Berat</Button>} /></div>
                    )}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingWeightClass ? 'Edit Kelas Berat' : 'Tambah Kelas Berat'} footer={<><Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button><Button onClick={submit} loading={form.processing}>{editingWeightClass ? 'Simpan Perubahan' : 'Tambah Kelas Berat'}</Button></>}>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input label="Nama Kelas Berat" required value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} error={form.errors.name} placeholder="Contoh: Kelas -50 kg" />
                        <Combobox label="Kategori Gender" required value={form.data.gender} onChange={(value) => form.setData('gender', value)} options={genderOptions} clearable={false} error={form.errors.gender} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input label="Berat Minimal (kg)" type="number" min="0" step="0.01" value={form.data.min_weight} onChange={(event) => form.setData('min_weight', event.target.value)} error={form.errors.min_weight} placeholder="Kosongkan bila tanpa batas bawah" />
                        <Input label="Berat Maksimal (kg)" type="number" min="0" step="0.01" value={form.data.max_weight} onChange={(event) => form.setData('max_weight', event.target.value)} error={form.errors.max_weight} placeholder="Kosongkan bila tanpa batas atas" />
                    </div>
                    <Input label="Urutan" type="number" min="0" required value={form.data.order} onChange={(event) => form.setData('order', event.target.value)} error={form.errors.order} />
                    <Textarea label="Keterangan" rows={3} value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} error={form.errors.description} placeholder="Catatan khusus kelas, bila ada." />
                    <Checkbox id="weight-class-is-active" label="Aktif dan dapat dipilih pada event" checked={form.data.is_active} onChange={(event) => form.setData('is_active', event.target.checked)} />
                </form>
            </Modal>

            <Modal isOpen={!!deletingWeightClass} onClose={() => setDeletingWeightClass(null)} title="Hapus Kelas Berat" footer={<><Button variant="outline" onClick={() => setDeletingWeightClass(null)}>Batal</Button><Button variant="danger" onClick={() => router.delete(`/admin/master/weight-class/${deletingWeightClass.id}`, { onSuccess: () => setDeletingWeightClass(null) })}>Hapus</Button></>}>
                <p>Hapus <strong>{deletingWeightClass?.name}</strong> dari master data?</p>
            </Modal>
        </AdminLayout>
    );
}
