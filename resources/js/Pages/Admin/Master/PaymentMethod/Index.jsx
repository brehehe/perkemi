import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Button, Checkbox, Combobox, EmptyState, Input, Modal, Pagination, Textarea } from '@/Components/UI';

const typeOptions = [
    { value: 'bank_transfer', label: 'Transfer Bank' },
    { value: 'qris', label: 'QRIS' },
    { value: 'ewallet', label: 'Dompet Digital' },
    { value: 'cash', label: 'Tunai' },
];

const typeLabel = (type) => typeOptions.find((option) => option.value === type)?.label || type;

export default function PaymentMethodIndex({ paymentMethods = { data: [], total: 0 }, filters = { search: '' }, auth = {} }) {
    const [search, setSearch] = useState(filters.search || '');
    const [editingPaymentMethod, setEditingPaymentMethod] = useState(null);
    const [deletingPaymentMethod, setDeletingPaymentMethod] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const form = useForm({ name: '', code: '', type: 'bank_transfer', provider: '', account_name: '', account_number: '', instructions: '', order: 0, is_active: true });

    const openCreate = () => {
        setEditingPaymentMethod(null);
        form.reset();
        form.clearErrors();
        form.setData({ name: '', code: '', type: 'bank_transfer', provider: '', account_name: '', account_number: '', instructions: '', order: (paymentMethods.total || 0) + 1, is_active: true });
        setIsModalOpen(true);
    };

    const openEdit = (paymentMethod) => {
        setEditingPaymentMethod(paymentMethod);
        form.clearErrors();
        form.setData({
            name: paymentMethod.name || '',
            code: paymentMethod.code || '',
            type: paymentMethod.type || 'bank_transfer',
            provider: paymentMethod.provider || '',
            account_name: paymentMethod.account_name || '',
            account_number: paymentMethod.account_number || '',
            instructions: paymentMethod.instructions || '',
            order: paymentMethod.order ?? 0,
            is_active: paymentMethod.is_active ?? true,
        });
        setIsModalOpen(true);
    };

    const submit = (event) => {
        event.preventDefault();
        const options = { onSuccess: () => { setIsModalOpen(false); setEditingPaymentMethod(null); } };

        if (editingPaymentMethod) {
            form.put(`/admin/master/payment-method/${editingPaymentMethod.id}`, options);
        } else {
            form.post('/admin/master/payment-method', options);
        }
    };

    const applySearch = (event) => {
        event.preventDefault();
        router.get('/admin/master/payment-method', { search }, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout auth={auth} title="Master Metode Pembayaran">
            <Head title="Master Metode Pembayaran - Smart Perkemi" />

            <div className="space-y-6 pb-12">
                <div className="rounded-2xl bg-gradient-to-r from-[#141210] via-[#1c1917] to-[#292524] p-6 text-white shadow-xl">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Master Data</p>
                            <h1 className="mt-1 text-2xl font-bold">Metode Pembayaran</h1>
                            <p className="mt-1 text-sm text-white/65">Kelola rekening dan kanal pembayaran yang dapat diaktifkan untuk setiap event.</p>
                        </div>
                        <Button onClick={openCreate} className="bg-amber-400 text-[#141210] hover:bg-amber-300"><i className="fa-solid fa-plus mr-2" />Tambah Metode</Button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#ede9e1] bg-white shadow-xs">
                    <div className="flex flex-col gap-3 border-b border-[#ede9e1] p-5 sm:flex-row sm:items-center sm:justify-between">
                        <form onSubmit={applySearch} className="w-full sm:max-w-sm"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari metode atau penyedia..." iconLeft={<i className="fa-solid fa-magnifying-glass" />} /></form>
                        <span className="text-xs text-[#706860]"><strong className="text-[#141210]">{paymentMethods.total || 0}</strong> metode terdaftar</span>
                    </div>

                    {paymentMethods.data?.length ? <><TableContainer ariaLabel="Tabel data"><table className="responsive-data-table whitespace-nowrap w-full text-left text-sm"><thead><tr className="border-b border-[#ede9e1] bg-[#f7f4ef] text-[10px] font-semibold uppercase tracking-wider text-[#8c827a]"><th className="px-5 py-3">Metode</th><th className="px-5 py-3">Tipe</th><th className="px-5 py-3">Penerima / Nomor</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-[#ede9e1]">{paymentMethods.data.map((paymentMethod) => <tr key={paymentMethod.id} className="hover:bg-[#fcfbf9]"><td className="px-5 py-4"><p className="font-semibold text-[#141210]">{paymentMethod.name}</p><p className="mt-0.5 font-mono text-xs text-[#8c827a]">{paymentMethod.code}{paymentMethod.provider ? ` · ${paymentMethod.provider}` : ''}</p></td><td className="px-5 py-4 text-[#706860]">{typeLabel(paymentMethod.type)}</td><td className="px-5 py-4 text-[#706860]"><p>{paymentMethod.account_name || '—'}</p><p className="text-xs">{paymentMethod.account_number || ''}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${paymentMethod.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{paymentMethod.is_active ? 'Aktif' : 'Nonaktif'}</span></td><td className="px-5 py-4 text-right"><Button variant="unstyled" size="none" onClick={() => openEdit(paymentMethod)} className="p-2 text-blue-600 hover:bg-blue-50" aria-label={`Edit ${paymentMethod.name}`}><i className="fa-solid fa-pen" /></Button><Button variant="unstyled" size="none" onClick={() => setDeletingPaymentMethod(paymentMethod)} className="p-2 text-red-600 hover:bg-red-50" aria-label={`Hapus ${paymentMethod.name}`}><i className="fa-solid fa-trash" /></Button></td></tr>)}</tbody></table></TableContainer><Pagination pagination={paymentMethods} label="metode" onPageChange={(page) => router.get('/admin/master/payment-method', { search, page }, { preserveState: true })} /></> : <div className="p-6"><EmptyState title="Belum ada metode pembayaran" description="Tambahkan rekening, QRIS, atau kanal pembayaran untuk digunakan pada event." action={<Button onClick={openCreate}>Tambah Metode</Button>} /></div>}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPaymentMethod ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran'} footer={<><Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button><Button onClick={submit} loading={form.processing}>{editingPaymentMethod ? 'Simpan Perubahan' : 'Tambah Metode'}</Button></>}>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2"><Input label="Nama Metode" required value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} error={form.errors.name} placeholder="Contoh: Transfer BCA Panitia" /><Input label="Kode Metode" required value={form.data.code} onChange={(event) => form.setData('code', event.target.value)} error={form.errors.code} placeholder="Contoh: transfer-bca" hint="Huruf, angka, garis minus, atau underscore." /></div>
                    <div className="grid gap-4 sm:grid-cols-2"><Combobox label="Tipe Pembayaran" required value={form.data.type} onChange={(value) => form.setData('type', value)} options={typeOptions} clearable={false} error={form.errors.type} /><Input label="Penyedia / Bank" value={form.data.provider} onChange={(event) => form.setData('provider', event.target.value)} error={form.errors.provider} placeholder="Contoh: BCA, DANA, atau QRIS" /></div>
                    <div className="grid gap-4 sm:grid-cols-2"><Input label="Nama Pemilik / Penerima" value={form.data.account_name} onChange={(event) => form.setData('account_name', event.target.value)} error={form.errors.account_name} placeholder="Contoh: Pengprov Perkemi Jatim" /><Input label="Nomor Rekening / Akun" value={form.data.account_number} onChange={(event) => form.setData('account_number', event.target.value)} error={form.errors.account_number} placeholder="Contoh: 1234567890" /></div>
                    <Textarea label="Instruksi Pembayaran" rows={4} value={form.data.instructions} onChange={(event) => form.setData('instructions', event.target.value)} error={form.errors.instructions} placeholder="Contoh: Cantumkan nama kontingen pada berita transfer." />
                    <Input label="Urutan" type="number" min="0" required value={form.data.order} onChange={(event) => form.setData('order', event.target.value)} error={form.errors.order} />
                    <Checkbox id="payment-method-is-active" label="Aktif dan dapat dipilih pada event" checked={form.data.is_active} onChange={(event) => form.setData('is_active', event.target.checked)} />
                </form>
            </Modal>

            <Modal isOpen={!!deletingPaymentMethod} onClose={() => setDeletingPaymentMethod(null)} title="Hapus Metode Pembayaran" footer={<><Button variant="outline" onClick={() => setDeletingPaymentMethod(null)}>Batal</Button><Button variant="danger" onClick={() => router.delete(`/admin/master/payment-method/${deletingPaymentMethod.id}`, { onSuccess: () => setDeletingPaymentMethod(null) })}>Hapus</Button></>}><p>Hapus <strong>{deletingPaymentMethod?.name}</strong> dari master data?</p></Modal>
        </AdminLayout>
    );
}
