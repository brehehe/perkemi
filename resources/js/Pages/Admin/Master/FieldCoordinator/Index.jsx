import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import MasterDataTransfer from '@/Components/Admin/MasterDataTransfer';
import { Button, Checkbox, EmptyState, Input, Modal, Pagination, Textarea } from '@/Components/UI';

export default function FieldCoordinatorIndex({
    fieldCoordinators = { data: [], total: 0 },
    filters = { search: '' },
    auth = {},
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [isOpen, setIsOpen] = useState(false);

    const form = useForm({
        name: '',
        coordinator_number: '',
        region: '',
        phone: '',
        email: '',
        password: '',
        password_confirmation: '',
        notes: '',
        is_active: true,
    });

    const startCreate = () => {
        setEditing(null);
        form.reset();
        form.clearErrors();
        form.setData({
            name: '',
            coordinator_number: '',
            region: '',
            phone: '',
            email: '',
            password: '',
            password_confirmation: '',
            notes: '',
            is_active: true,
        });
        setIsOpen(true);
    };

    const startEdit = (item) => {
        setEditing(item);
        form.clearErrors();
        form.setData({
            name: item?.name || '',
            coordinator_number: item?.coordinator_number || '',
            region: item?.region || '',
            phone: item?.phone || '',
            email: item?.email || '',
            password: '',
            password_confirmation: '',
            notes: item?.notes || '',
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
            ? form.put(`/admin/master/field-coordinator/${editing.id}`, options)
            : form.post('/admin/master/field-coordinator', options);
    };

    const applySearch = (event) => {
        event.preventDefault();
        router.get('/admin/master/field-coordinator', { search }, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout auth={auth} title="Koordinator Lapangan">
            <Head title="Koordinator Lapangan - Smart Perkemi" />

            <div className="space-y-6 pb-12">
                {/* ════ HEADER SECTION ════ */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                        {/* <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                <i className="fa-solid fa-users-gear text-[9px] text-[#c0392b]" />
                                Pengawas Arena & Operasional
                            </span>
                        </div> */}
                        <h1 className="font-sans text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Koordinator Lapangan (Koorlap)
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Database penanggung jawab kelancaran pertandingan tiap court, pemanggilan kenshi, dan koordinasi wasit.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                        <MasterDataTransfer type="field-coordinator" label="Koordinator Lapangan" supportsLogin />
                        <Button
                            variant="unstyled"
                            size="none"
                            type="button"
                            onClick={startCreate}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-transparent bg-[#c0392b] hover:bg-[#a93226] text-white font-semibold text-xs md:text-sm shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                        >
                            <i className="fa-solid fa-user-plus text-xs" />
                            <span>Tambah Koordinator Baru</span>
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
                                placeholder="Cari nama koordinator atau wilayah..."
                                iconLeft={<i className="fa-solid fa-magnifying-glass" />}
                                clearable
                                onClear={() => {
                                    setSearch('');
                                    router.get('/admin/master/field-coordinator', { search: '' }, { preserveState: true, replace: true });
                                }}
                                size="sm"
                            />
                        </form>
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            <strong className="text-slate-900 dark:text-white">{fieldCoordinators.total || 0}</strong> koordinator terdaftar
                        </span>
                    </div>

                    {fieldCoordinators.data?.length ? (
                        <>
                            <TableContainer ariaLabel="Tabel master data koordinator lapangan">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#ede9e1] dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                                            <th className="px-5 py-3">Nama Koordinator</th>
                                            <th className="px-5 py-3">ID Petugas</th>
                                            <th className="px-5 py-3">Wilayah / Pengda</th>
                                            <th className="px-5 py-3">Kontak</th>
                                            <th className="px-5 py-3 text-center">Status</th>
                                            <th className="px-5 py-3 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#ede9e1] dark:divide-slate-800">
                                        {fieldCoordinators.data.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <p className="font-semibold text-slate-900 dark:text-white text-xs md:text-sm">
                                                        {item.name}
                                                    </p>
                                                    {item.notes && (
                                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                            {item.notes}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                                                    <p className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
                                                        {item.coordinator_number || '—'}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                                                    <span className="inline-flex items-center gap-1">
                                                        <i className="fa-solid fa-location-dot text-[10px] text-[#c0392b]" />
                                                        <span>{item.region || '—'}</span>
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                                                    <p className="tabular-nums font-medium text-slate-900 dark:text-white">
                                                        {item.phone || item.email || '—'}
                                                    </p>
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
                                pagination={fieldCoordinators}
                                label="koordinator"
                                onPageChange={(page) => router.get('/admin/master/field-coordinator', { search, page }, { preserveState: true })}
                            />
                        </>
                    ) : (
                        <div className="p-8">
                            <EmptyState
                                title="Belum ada koordinator lapangan"
                                description="Tambahkan koordinator lapangan agar dapat ditugaskan mengawasi dan mengendalikan court turnamen."
                                action={<Button onClick={startCreate}>Tambah Koordinator Baru</Button>}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ════ MODAL CREATE / EDIT ════ */}
            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title={editing ? 'Edit Koordinator Lapangan' : 'Tambah Koordinator Lapangan'}
                subtitle="Identitas dan penugasan pengawas arena kejuaraan"
                size="lg"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={save} loading={form.processing}>
                            {editing ? 'Simpan Perubahan' : 'Tambah Koordinator'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={save} className="space-y-4">
                    <Input
                        label="Nama Koordinator"
                        required
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        error={form.errors.name}
                        placeholder="Contoh: Hendro Siswanto"
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="ID Koordinator"
                            value={form.data.coordinator_number}
                            onChange={(e) => form.setData('coordinator_number', e.target.value)}
                            error={form.errors.coordinator_number}
                            placeholder="Contoh: KOR-001"
                        />
                        <Input
                            label="Wilayah / Pengda"
                            value={form.data.region}
                            onChange={(e) => form.setData('region', e.target.value)}
                            error={form.errors.region}
                            placeholder="Contoh: Jawa Timur"
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Nomor Telepon / WhatsApp"
                            value={form.data.phone}
                            onChange={(e) => form.setData('phone', e.target.value)}
                            error={form.errors.phone}
                            placeholder="0812-3456-7890"
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={form.data.email}
                            onChange={(e) => form.setData('email', e.target.value)}
                            error={form.errors.email}
                            placeholder="koorlap@perkemi.id"
                        />
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                        <i className="fa-solid fa-key mr-2 text-amber-600 dark:text-amber-400" />
                        <strong>Akun login Koordinator (opsional):</strong> Isi email dan password untuk membuat akses login panel koordinator court. Saat edit, kosongkan password jika tidak ingin menggantinya.
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Password Login"
                            type="password"
                            value={form.data.password}
                            onChange={(e) => form.setData('password', e.target.value)}
                            error={form.errors.password}
                            autoComplete="new-password"
                            placeholder="Minimal 8 karakter"
                        />
                        <Input
                            label="Konfirmasi Password"
                            type="password"
                            value={form.data.password_confirmation}
                            onChange={(e) => form.setData('password_confirmation', e.target.value)}
                            autoComplete="new-password"
                            placeholder="Ulangi password"
                        />
                    </div>

                    <Textarea
                        label="Catatan Khusus"
                        rows={2}
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                        error={form.errors.notes}
                        placeholder="Pengalaman atau spesialisasi pengawasan lapangan..."
                    />

                    <Checkbox
                        id="field-coordinator-is-active"
                        label="Aktif dan dapat ditugaskan pada event"
                        checked={form.data.is_active}
                        onChange={(event) => form.setData('is_active', event.target.checked)}
                    />
                </form>
            </Modal>

            {/* ════ MODAL DELETE CONFIRMATION ════ */}
            <Modal
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                title="Hapus Koordinator"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setDeleting(null)}>
                            Batal
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => router.delete(`/admin/master/field-coordinator/${deleting.id}`, { onSuccess: () => setDeleting(null) })}
                        >
                            Hapus
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    Apakah Anda yakin ingin menghapus koordinator <strong>{deleting?.name}</strong> dari master data?
                </p>
            </Modal>
        </AdminLayout>
    );
}
