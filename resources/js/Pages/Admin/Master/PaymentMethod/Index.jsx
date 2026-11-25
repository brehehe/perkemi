import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import MasterDataTransfer from '@/Components/Admin/MasterDataTransfer';
import { Button, Checkbox, Combobox, EmptyState, Input, Modal, Pagination, Textarea } from '@/Components/UI';

const typeOptions = [
    { value: 'bank_transfer', label: 'Transfer Bank' },
    { value: 'qris', label: 'QRIS' },
    { value: 'ewallet', label: 'Dompet Digital' },
    { value: 'cash', label: 'Tunai' },
];

const typeLabel = (type) => typeOptions.find((option) => option.value === type)?.label || type;

export default function PaymentMethodIndex({
    paymentMethods = { data: [], total: 0 },
    filters = { search: '' },
    auth = {},
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [editingPaymentMethod, setEditingPaymentMethod] = useState(null);
    const [deletingPaymentMethod, setDeletingPaymentMethod] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const form = useForm({
        name: '',
        code: '',
        type: 'bank_transfer',
        provider: '',
        account_name: '',
        account_number: '',
        instructions: '',
        order: 0,
        is_active: true,
    });

    const openCreate = () => {
        setEditingPaymentMethod(null);
        form.reset();
        form.clearErrors();
        form.setData({
            name: '',
            code: '',
            type: 'bank_transfer',
            provider: '',
            account_name: '',
            account_number: '',
            instructions: '',
            order: (paymentMethods.total || 0) + 1,
            is_active: true,
        });
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
        const options = {
            onSuccess: () => {
                setIsModalOpen(false);
                setEditingPaymentMethod(null);
            },
        };

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
                            Metode Pembayaran
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Kelola rekening bank, QRIS, dan kanal pembayaran yang dapat diaktifkan oleh panitia pada setiap event kejuaraan.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                        <MasterDataTransfer type="payment-method" label="Metode Pembayaran" />
                        <Button
                            variant="unstyled"
                            size="none"
                            type="button"
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-transparent bg-[#c0392b] hover:bg-[#a93226] text-white font-semibold text-xs md:text-sm shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                        >
                            <i className="fa-solid fa-circle-plus text-xs" />
                            <span>Tambah Metode Pembayaran</span>
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
                                placeholder="Cari nama metode atau bank..."
                                iconLeft={<i className="fa-solid fa-magnifying-glass" />}
                                clearable
                                onClear={() => {
                                    setSearch('');
                                    router.get('/admin/master/payment-method', { search: '' }, { preserveState: true, replace: true });
                                }}
                                size="sm"
                            />
                        </form>
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            <strong className="text-slate-900 dark:text-white">{paymentMethods.total || 0}</strong> metode terdaftar
                        </span>
                    </div>

                    {paymentMethods.data?.length ? (
                        <>
                            <TableContainer ariaLabel="Tabel master metode pembayaran">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#ede9e1] dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                                            <th className="px-5 py-3">Metode & Kanal</th>
                                            <th className="px-5 py-3">Tipe</th>
                                            <th className="px-5 py-3">Penerima / Nomor Rekening</th>
                                            <th className="px-5 py-3 text-center">Status</th>
                                            <th className="px-5 py-3 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#ede9e1] dark:divide-slate-800">
                                        {paymentMethods.data.map((paymentMethod) => (
                                            <tr key={paymentMethod.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <p className="font-semibold text-slate-900 dark:text-white text-xs md:text-sm">
                                                        {paymentMethod.name}
                                                    </p>
                                                    <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                                        {paymentMethod.code}
                                                        {paymentMethod.provider ? ` · ${paymentMethod.provider}` : ''}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                        {typeLabel(paymentMethod.type)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                                                    <p className="font-medium text-slate-900 dark:text-white">
                                                        {paymentMethod.account_name || '—'}
                                                    </p>
                                                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                                                        {paymentMethod.account_number || ''}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${paymentMethod.is_active
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                            }`}
                                                    >
                                                        <span className={`size-1.5 rounded-full ${paymentMethod.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                        {paymentMethod.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEdit(paymentMethod)}
                                                            className="size-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center transition-all cursor-pointer"
                                                            title={`Edit ${paymentMethod.name}`}
                                                            aria-label={`Edit ${paymentMethod.name}`}
                                                        >
                                                            <i className="fa-solid fa-pen text-xs" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeletingPaymentMethod(paymentMethod)}
                                                            className="size-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 inline-flex items-center justify-center transition-all cursor-pointer"
                                                            title={`Hapus ${paymentMethod.name}`}
                                                            aria-label={`Hapus ${paymentMethod.name}`}
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
                                pagination={paymentMethods}
                                label="metode"
                                onPageChange={(page) => router.get('/admin/master/payment-method', { search, page }, { preserveState: true })}
                            />
                        </>
                    ) : (
                        <div className="p-8">
                            <EmptyState
                                title="Belum ada metode pembayaran"
                                description="Tambahkan rekening, QRIS, atau kanal pembayaran untuk digunakan pada formulir pembayaran event."
                                action={<Button onClick={openCreate}>Tambah Metode Pembayaran</Button>}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ════ MODAL CREATE / EDIT ════ */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPaymentMethod ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran'}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={submit} loading={form.processing}>
                            {editingPaymentMethod ? 'Simpan Perubahan' : 'Tambah Metode'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Nama Metode"
                            required
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            error={form.errors.name}
                            placeholder="Contoh: Transfer Bank BCA"
                        />
                        <Input
                            label="Kode Metode"
                            required
                            value={form.data.code}
                            onChange={(event) => form.setData('code', event.target.value)}
                            error={form.errors.code}
                            placeholder="Contoh: transfer-bca"
                            hint="Huruf kecil, angka, atau tanda minus."
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Combobox
                            label="Tipe Pembayaran"
                            required
                            value={form.data.type}
                            onChange={(value) => form.setData('type', value)}
                            options={typeOptions}
                            clearable={false}
                            error={form.errors.type}
                        />
                        <Input
                            label="Penyedia / Bank"
                            value={form.data.provider}
                            onChange={(event) => form.setData('provider', event.target.value)}
                            error={form.errors.provider}
                            placeholder="Contoh: BCA, Mandiri, atau QRIS"
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Nama Pemilik / Penerima"
                            value={form.data.account_name}
                            onChange={(event) => form.setData('account_name', event.target.value)}
                            error={form.errors.account_name}
                            placeholder="Contoh: Pengprov Perkemi Jatim"
                        />
                        <Input
                            label="Nomor Rekening / Akun"
                            value={form.data.account_number}
                            onChange={(event) => form.setData('account_number', event.target.value)}
                            error={form.errors.account_number}
                            placeholder="Contoh: 1234567890"
                        />
                    </div>
                    <Textarea
                        label="Instruksi Pembayaran"
                        rows={3}
                        value={form.data.instructions}
                        onChange={(event) => form.setData('instructions', event.target.value)}
                        error={form.errors.instructions}
                        placeholder="Contoh: Cantumkan nama kontingen pada berita transfer."
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
                    <Checkbox
                        id="payment-method-is-active"
                        label="Aktif dan dapat dipilih pada event"
                        checked={form.data.is_active}
                        onChange={(event) => form.setData('is_active', event.target.checked)}
                    />
                </form>
            </Modal>

            {/* ════ MODAL DELETE CONFIRMATION ════ */}
            <Modal
                isOpen={!!deletingPaymentMethod}
                onClose={() => setDeletingPaymentMethod(null)}
                title="Hapus Metode Pembayaran"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setDeletingPaymentMethod(null)}>
                            Batal
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => router.delete(`/admin/master/payment-method/${deletingPaymentMethod.id}`, { onSuccess: () => setDeletingPaymentMethod(null) })}
                        >
                            Hapus
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    Apakah Anda yakin ingin menghapus metode <strong>{deletingPaymentMethod?.name}</strong> dari master data?
                </p>
            </Modal>
        </AdminLayout>
    );
}
