import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import MasterDataTransfer from '@/Components/Admin/MasterDataTransfer';
import { Button, Checkbox, EmptyState, Input, Modal, Pagination, Textarea } from '@/Components/UI';

export default function ClerkIndex({
    clerks = { data: [], total: 0 },
    filters = { search: '' },
    auth = {},
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [editingClerk, setEditingClerk] = useState(null);
    const [deletingClerk, setDeletingClerk] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const form = useForm({
        name: '',
        employee_number: '',
        certification: '',
        region: '',
        phone: '',
        email: '',
        password: '',
        password_confirmation: '',
        notes: '',
        is_active: true,
    });

    const openCreate = () => {
        setEditingClerk(null);
        form.reset();
        form.clearErrors();
        form.setData({
            name: '',
            employee_number: '',
            certification: '',
            region: '',
            phone: '',
            email: '',
            password: '',
            password_confirmation: '',
            notes: '',
            is_active: true,
        });
        setIsModalOpen(true);
    };

    const openEdit = (clerk) => {
        setEditingClerk(clerk);
        form.clearErrors();
        form.setData({
            name: clerk.name || '',
            employee_number: clerk.employee_number || '',
            certification: clerk.certification || '',
            region: clerk.region || '',
            phone: clerk.phone || '',
            email: clerk.email || '',
            password: '',
            password_confirmation: '',
            notes: clerk.notes || '',
            is_active: clerk.is_active ?? true,
        });
        setIsModalOpen(true);
    };

    const submit = (event) => {
        event.preventDefault();
        const options = {
            onSuccess: () => {
                setIsModalOpen(false);
                setEditingClerk(null);
            },
        };
        editingClerk
            ? form.put(`/admin/master/clerk/${editingClerk.id}`, options)
            : form.post('/admin/master/clerk', options);
    };

    const applySearch = (event) => {
        event.preventDefault();
        router.get('/admin/master/clerk', { search }, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout auth={auth} title="Direktori Panitera">
            <Head title="Direktori Panitera - Smart Perkemi" />

            <div className="space-y-6 pb-12">
                {/* ════ HEADER SECTION ════ */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                        {/* <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                <i className="fa-solid fa-clipboard-check text-[9px] text-[#c0392b]" />
                                Korps Petugas Meja Arena
                            </span>
                        </div> */}
                        <h1 className="font-sans text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Direktori Panitera & Operator Meja
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Database petugas panitera, operator scoreboard, pengatur waktu (timer), dan pencatat hasil pertandingan.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                        <MasterDataTransfer type="clerk" label="Panitera" supportsLogin />
                        <Button
                            variant="unstyled"
                            size="none"
                            type="button"
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-transparent bg-[#c0392b] hover:bg-[#a93226] text-white font-semibold text-xs md:text-sm shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                        >
                            <i className="fa-solid fa-user-plus text-xs" />
                            <span>Tambah Panitera Baru</span>
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
                                placeholder="Cari nama, ID, atau wilayah..."
                                iconLeft={<i className="fa-solid fa-magnifying-glass" />}
                                clearable
                                onClear={() => {
                                    setSearch('');
                                    router.get('/admin/master/clerk', { search: '' }, { preserveState: true, replace: true });
                                }}
                                size="sm"
                            />
                        </form>
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            <strong className="text-slate-900 dark:text-white">{clerks.total || 0}</strong> panitera terdaftar
                        </span>
                    </div>

                    {clerks.data?.length ? (
                        <>
                            <TableContainer ariaLabel="Tabel master data panitera">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#ede9e1] dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                                            <th className="px-5 py-3">Petugas Panitera</th>
                                            <th className="px-5 py-3">ID & Sertifikasi</th>
                                            <th className="px-5 py-3">Wilayah / Pengda</th>
                                            <th className="px-5 py-3">Kontak</th>
                                            <th className="px-5 py-3 text-center">Status</th>
                                            <th className="px-5 py-3 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#ede9e1] dark:divide-slate-800">
                                        {clerks.data.map((clerk) => (
                                            <tr key={clerk.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <p className="font-semibold text-slate-900 dark:text-white text-xs md:text-sm">
                                                        {clerk.name}
                                                    </p>
                                                    {clerk.notes && (
                                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                            {clerk.notes}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                                                    <p className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
                                                        {clerk.employee_number || '—'}
                                                    </p>
                                                    {clerk.certification && (
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                            {clerk.certification}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                                                    <span className="inline-flex items-center gap-1">
                                                        <i className="fa-solid fa-location-dot text-[10px] text-[#c0392b]" />
                                                        <span>{clerk.region || '—'}</span>
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                                                    <p className="tabular-nums font-medium text-slate-900 dark:text-white">
                                                        {clerk.phone || '—'}
                                                    </p>
                                                    {clerk.email && (
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                            {clerk.email}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${clerk.is_active
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                            }`}
                                                    >
                                                        <span className={`size-1.5 rounded-full ${clerk.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                        {clerk.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEdit(clerk)}
                                                            className="size-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center transition-all cursor-pointer"
                                                            title={`Edit ${clerk.name}`}
                                                            aria-label={`Edit ${clerk.name}`}
                                                        >
                                                            <i className="fa-solid fa-pen text-xs" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeletingClerk(clerk)}
                                                            className="size-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 inline-flex items-center justify-center transition-all cursor-pointer"
                                                            title={`Hapus ${clerk.name}`}
                                                            aria-label={`Hapus ${clerk.name}`}
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
                                pagination={clerks}
                                label="panitera"
                                onPageChange={(page) => router.get('/admin/master/clerk', { search, page }, { preserveState: true })}
                            />
                        </>
                    ) : (
                        <div className="p-8">
                            <EmptyState
                                title="Belum ada data panitera"
                                description="Tambahkan panitera meja agar dapat ditugaskan mengelola timer, nilai, dan scoreboard court."
                                action={<Button onClick={openCreate}>Tambah Panitera Baru</Button>}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ════ MODAL CREATE / EDIT ════ */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingClerk ? 'Edit Data Panitera' : 'Tambah Data Panitera'}
                subtitle="Identitas dan penugasan meja pertandingan arena"
                size="lg"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={submit} loading={form.processing}>
                            {editingClerk ? 'Simpan Perubahan' : 'Tambah Panitera'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submit} className="space-y-4">
                    <Input
                        label="Nama Panitera"
                        required
                        value={form.data.name}
                        onChange={(event) => form.setData('name', event.target.value)}
                        error={form.errors.name}
                        placeholder="Contoh: Ahmad Fauzi"
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="ID Panitia / Nomor Pegawai"
                            value={form.data.employee_number}
                            onChange={(event) => form.setData('employee_number', event.target.value)}
                            error={form.errors.employee_number}
                            placeholder="Contoh: PAN-001"
                        />
                        <Input
                            label="Sertifikasi / Peran Khusus"
                            value={form.data.certification}
                            onChange={(event) => form.setData('certification', event.target.value)}
                            error={form.errors.certification}
                            placeholder="Contoh: Operator Timer & Nilai"
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Wilayah / Pengda"
                            value={form.data.region}
                            onChange={(event) => form.setData('region', event.target.value)}
                            error={form.errors.region}
                            placeholder="Contoh: Surabaya"
                        />
                        <Input
                            label="Nomor Telepon / WhatsApp"
                            value={form.data.phone}
                            onChange={(event) => form.setData('phone', event.target.value)}
                            error={form.errors.phone}
                            placeholder="0812-3456-7890"
                        />
                    </div>
                    <Input
                        label="Email Login (Opsional)"
                        type="email"
                        value={form.data.email}
                        onChange={(event) => form.setData('email', event.target.value)}
                        error={form.errors.email}
                        placeholder="panitera@perkemi.id"
                    />

                    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                        <i className="fa-solid fa-key mr-2 text-amber-600 dark:text-amber-400" />
                        <strong>Akun login Panitera (opsional):</strong> Isi email dan password jika panitera membutuhkan akses langsung ke panel panitera meja. Saat edit, kosongkan password jika tidak ingin menggantinya.
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Password Login"
                            type="password"
                            value={form.data.password}
                            onChange={(event) => form.setData('password', event.target.value)}
                            error={form.errors.password}
                            autoComplete="new-password"
                            placeholder="Minimal 8 karakter"
                        />
                        <Input
                            label="Konfirmasi Password"
                            type="password"
                            value={form.data.password_confirmation}
                            onChange={(event) => form.setData('password_confirmation', event.target.value)}
                            error={form.errors.password_confirmation}
                            autoComplete="new-password"
                            placeholder="Ulangi password"
                        />
                    </div>

                    <Textarea
                        label="Catatan Khusus"
                        rows={2}
                        value={form.data.notes}
                        onChange={(event) => form.setData('notes', event.target.value)}
                        error={form.errors.notes}
                        placeholder="Catatan penugasan meja atau keahlian teknis..."
                    />

                    <Checkbox
                        id="clerk-is-active"
                        label="Aktif dan dapat ditugaskan pada event"
                        checked={form.data.is_active}
                        onChange={(event) => form.setData('is_active', event.target.checked)}
                    />
                </form>
            </Modal>

            {/* ════ MODAL DELETE CONFIRMATION ════ */}
            <Modal
                isOpen={!!deletingClerk}
                onClose={() => setDeletingClerk(null)}
                title="Hapus Data Panitera"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setDeletingClerk(null)}>
                            Batal
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => router.delete(`/admin/master/clerk/${deletingClerk.id}`, { onSuccess: () => setDeletingClerk(null) })}
                        >
                            Hapus
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    Apakah Anda yakin ingin menghapus panitera <strong>{deletingClerk?.name}</strong> dari master data?
                </p>
            </Modal>
        </AdminLayout>
    );
}
