import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
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
        form.setData({ name: kyu.name || '', belt_color: kyu.belt_color || '', order: kyu.order ?? 0, is_active: kyu.is_active ?? true, description: kyu.description || '' });
        setIsModalOpen(true);
    };
    const submit = (event) => {
        event.preventDefault();
        const options = { onSuccess: () => { setIsModalOpen(false); setEditingKyu(null); } };
        editingKyu ? form.put(`/admin/master/kyu/${editingKyu.id}`, options) : form.post('/admin/master/kyu', options);
    };
    const applySearch = (event) => {
        event.preventDefault();
        router.get('/admin/master/kyu', { search }, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout auth={auth} title="Master Kyu">
            <Head title="Master Kyu - Smart Perkemi" />
            <div className="space-y-6 pb-12">
                <div className="rounded-2xl bg-gradient-to-r from-[#141210] via-[#1c1917] to-[#292524] p-6 text-white shadow-xl">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div><p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Master Data</p><h1 className="mt-1 text-2xl font-bold">Tingkatan Kyu & Dan</h1><p className="mt-1 text-sm text-white/65">Sumber pilihan tingkatan sabuk untuk data kenshi dan nomor pertandingan.</p></div>
                        <Button onClick={openCreate} className="bg-amber-400 text-[#141210] hover:bg-amber-300"><i className="fa-solid fa-plus mr-2" />Tambah Kyu</Button>
                    </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-[#ede9e1] bg-white shadow-xs">
                    <div className="flex flex-col gap-3 border-b border-[#ede9e1] p-5 sm:flex-row sm:items-center sm:justify-between">
                        <form onSubmit={applySearch} className="relative w-full sm:max-w-sm"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari tingkatan Kyu atau Dan..." iconLeft={<i className="fa-solid fa-magnifying-glass" />} /></form>
                        <span className="text-xs text-[#706860]"><strong className="text-[#141210]">{kyus.total || 0}</strong> tingkatan terdaftar</span>
                    </div>
                    {kyus.data?.length ? <><TableContainer ariaLabel="Tabel data"><table className="responsive-data-table whitespace-nowrap w-full text-left text-sm"><thead><tr className="border-b border-[#ede9e1] bg-[#f7f4ef] text-[10px] font-semibold uppercase tracking-wider text-[#8c827a]"><th className="px-5 py-3">Urutan</th><th className="px-5 py-3">Tingkatan</th><th className="px-5 py-3">Warna Sabuk</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-[#ede9e1]">{kyus.data.map((kyu) => <tr key={kyu.id} className="hover:bg-[#fcfbf9]"><td className="px-5 py-4 font-mono text-xs">#{kyu.order}</td><td className="px-5 py-4"><p className="font-semibold text-[#141210]">{kyu.name}</p>{kyu.description && <p className="mt-0.5 text-xs text-[#8c827a]">{kyu.description}</p>}</td><td className="px-5 py-4 text-[#706860]">{kyu.belt_color || '—'}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${kyu.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{kyu.is_active ? 'Aktif' : 'Nonaktif'}</span></td><td className="px-5 py-4 text-right"><Button variant="unstyled" size="none" onClick={() => openEdit(kyu)} className="p-2 text-blue-600 hover:bg-blue-50" aria-label={`Edit ${kyu.name}`}><i className="fa-solid fa-pen" /></Button><Button variant="unstyled" size="none" onClick={() => setDeletingKyu(kyu)} className="p-2 text-red-600 hover:bg-red-50" aria-label={`Hapus ${kyu.name}`}><i className="fa-solid fa-trash" /></Button></td></tr>)}</tbody></table></TableContainer><Pagination pagination={kyus} label="tingkatan" onPageChange={(page) => router.get('/admin/master/kyu', { search, page }, { preserveState: true })} /></> : <div className="p-6"><EmptyState title="Belum ada Master Kyu" description="Tambahkan tingkatan Kyu atau Dan agar dapat dipilih pada formulir atlet dan nomor pertandingan." action={<Button onClick={openCreate}>Tambah Kyu</Button>} /></div>}
                </div>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingKyu ? 'Edit Master Kyu' : 'Tambah Master Kyu'} footer={<><Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button><Button onClick={submit} loading={form.processing}>{editingKyu ? 'Simpan Perubahan' : 'Tambah Kyu'}</Button></>}><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Input label="Nama Tingkatan" required value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} error={form.errors.name} placeholder="Contoh: Kyu 1" /><Input label="Warna Sabuk" value={form.data.belt_color} onChange={(event) => form.setData('belt_color', event.target.value)} error={form.errors.belt_color} placeholder="Contoh: Coklat" /></div><Input label="Urutan" type="number" min="0" required value={form.data.order} onChange={(event) => form.setData('order', event.target.value)} error={form.errors.order} /><Textarea label="Keterangan" rows={3} value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} error={form.errors.description} /><Checkbox id="kyu-is-active" label="Aktif dan dapat dipilih" checked={form.data.is_active} onChange={(event) => form.setData('is_active', event.target.checked)} /></form></Modal>
            <Modal isOpen={!!deletingKyu} onClose={() => setDeletingKyu(null)} title="Hapus Master Kyu" footer={<><Button variant="outline" onClick={() => setDeletingKyu(null)}>Batal</Button><Button variant="danger" onClick={() => router.delete(`/admin/master/kyu/${deletingKyu.id}`, { onSuccess: () => setDeletingKyu(null) })}>Hapus</Button></>}><p>Hapus <strong>{deletingKyu?.name}</strong> dari master data?</p></Modal>
        </AdminLayout>
    );
}
