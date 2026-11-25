import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import MasterDataTransfer from '@/Components/Admin/MasterDataTransfer';
import { Button, Checkbox, Combobox, EmptyState, Input, Modal, Pagination, Textarea } from '@/Components/UI';

const genderOptions = [
    { value: 'male', label: 'Putra' },
    { value: 'female', label: 'Putri' },
];

export default function RefereeIndex({
    referees = { data: [], total: 0 },
    filters = { search: '' },
    auth = {},
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [editingReferee, setEditingReferee] = useState(null);
    const [deletingReferee, setDeletingReferee] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const form = useForm({
        name: '',
        gender: 'male',
        dan_grade: '',
        license_number: '',
        certification_level: '',
        region: '',
        phone: '',
        email: '',
        password: '',
        password_confirmation: '',
        notes: '',
        is_active: true,
    });

    const openCreate = () => {
        setEditingReferee(null);
        form.reset();
        form.clearErrors();
        form.setData({
            name: '',
            gender: 'male',
            dan_grade: '',
            license_number: '',
            certification_level: '',
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

    const openEdit = (referee) => {
        setEditingReferee(referee);
        form.clearErrors();
        form.setData({
            name: referee.name || '',
            gender: referee.gender || 'male',
            dan_grade: referee.dan_grade || '',
            license_number: referee.license_number || '',
            certification_level: referee.certification_level || '',
            region: referee.region || '',
            phone: referee.phone || '',
            email: referee.email || '',
            password: '',
            password_confirmation: '',
            notes: referee.notes || '',
            is_active: referee.is_active ?? true,
        });
        setIsModalOpen(true);
    };

    const submit = (event) => {
        event.preventDefault();
        const options = {
            onSuccess: () => {
                setIsModalOpen(false);
                setEditingReferee(null);
            },
        };
        editingReferee
            ? form.put(`/admin/master/referee/${editingReferee.id}`, options)
            : form.post('/admin/master/referee', options);
    };

    const applySearch = (event) => {
        event.preventDefault();
        router.get('/admin/master/referee', { search }, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout auth={auth} title="Direktori Wasit Nasional">
            <Head title="Direktori Wasit Nasional - Smart Perkemi" />

            <div className="space-y-6 pb-12">
                {/* ════ HEADER SECTION ════ */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                        {/* <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                <i className="fa-solid fa-scale-balanced text-[9px] text-[#c0392b]" />
                                Korps Arbitrase & Penjurian
                            </span>
                        </div> */}
                        <h1 className="font-sans text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Direktori Wasit & Juri Nasional
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Database korps wasit, juri, sertifikasi lisensi nasional, dan akun login penilai lapangan.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                        <MasterDataTransfer type="referee" label="Wasit" supportsLogin />
                        <Button
                            variant="unstyled"
                            size="none"
                            type="button"
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-transparent bg-[#c0392b] hover:bg-[#a93226] text-white font-semibold text-xs md:text-sm shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                        >
                            <i className="fa-solid fa-user-plus text-xs" />
                            <span>Tambah Wasit Baru</span>
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
                                placeholder="Cari nama, lisensi, atau wilayah..."
                                iconLeft={<i className="fa-solid fa-magnifying-glass" />}
                                clearable
                                onClear={() => {
                                    setSearch('');
                                    router.get('/admin/master/referee', { search: '' }, { preserveState: true, replace: true });
                                }}
                                size="sm"
                            />
                        </form>
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            <strong className="text-slate-900 dark:text-white">{referees.total || 0}</strong> wasit terdaftar
                        </span>
                    </div>

                    {referees.data?.length ? (
                        <>
                            <TableContainer ariaLabel="Tabel master data wasit">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#ede9e1] dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                                            <th className="px-5 py-3">Nama Wasit / Juri</th>
                                            <th className="px-5 py-3">Dan & Lisensi</th>
                                            <th className="px-5 py-3">Wilayah / Pengda</th>
                                            <th className="px-5 py-3">Kontak</th>
                                            <th className="px-5 py-3 text-center">Status</th>
                                            <th className="px-5 py-3 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#ede9e1] dark:divide-slate-800">
                                        {referees.data.map((referee) => (
                                            <tr key={referee.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <p className="font-semibold text-slate-900 dark:text-white text-xs md:text-sm">
                                                        {referee.name}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                        {referee.certification_level || 'Belum ada sertifikasi'}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                                                        {referee.dan_grade || 'Dan —'}
                                                    </span>
                                                    {referee.license_number && (
                                                        <p className="mt-1 font-mono text-[10.5px] text-slate-500 dark:text-slate-400 tabular-nums">
                                                            {referee.license_number}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                                                    <span className="inline-flex items-center gap-1">
                                                        <i className="fa-solid fa-location-dot text-[10px] text-[#c0392b]" />
                                                        <span>{referee.region || '—'}</span>
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                                                    <p className="tabular-nums font-medium text-slate-900 dark:text-white">
                                                        {referee.phone || '—'}
                                                    </p>
                                                    {referee.email && (
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                            {referee.email}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${referee.is_active
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                            }`}
                                                    >
                                                        <span className={`size-1.5 rounded-full ${referee.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                        {referee.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEdit(referee)}
                                                            className="size-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center transition-all cursor-pointer"
                                                            title={`Edit ${referee.name}`}
                                                            aria-label={`Edit ${referee.name}`}
                                                        >
                                                            <i className="fa-solid fa-pen text-xs" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeletingReferee(referee)}
                                                            className="size-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 inline-flex items-center justify-center transition-all cursor-pointer"
                                                            title={`Hapus ${referee.name}`}
                                                            aria-label={`Hapus ${referee.name}`}
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
                                pagination={referees}
                                label="wasit"
                                onPageChange={(page) => router.get('/admin/master/referee', { search, page }, { preserveState: true })}
                            />
                        </>
                    ) : (
                        <div className="p-8">
                            <EmptyState
                                title="Belum ada data wasit"
                                description="Tambahkan wasit atau juri bersertifikasi agar dapat ditugaskan pada setiap court kejuaraan."
                                action={<Button onClick={openCreate}>Tambah Wasit Baru</Button>}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ════ MODAL CREATE / EDIT ════ */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingReferee ? 'Edit Data Wasit' : 'Tambah Data Wasit'}
                subtitle="Spesifikasi lisensi, tingkatan Dan, dan wilayah tugas wasit"
                size="lg"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={submit} loading={form.processing}>
                            {editingReferee ? 'Simpan Perubahan' : 'Tambah Wasit'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Nama Wasit / Juri"
                            required
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            error={form.errors.name}
                            placeholder="Contoh: Sensei Budi Santoso"
                        />
                        <Combobox
                            label="Gender"
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
                            label="Tingkatan Dan"
                            value={form.data.dan_grade}
                            onChange={(event) => form.setData('dan_grade', event.target.value)}
                            error={form.errors.dan_grade}
                            placeholder="Contoh: Dan IV"
                        />
                        <Input
                            label="Nomor Lisensi"
                            value={form.data.license_number}
                            onChange={(event) => form.setData('license_number', event.target.value)}
                            error={form.errors.license_number}
                            placeholder="Contoh: PB-WASIT-2024-001"
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Tingkat Sertifikasi"
                            value={form.data.certification_level}
                            onChange={(event) => form.setData('certification_level', event.target.value)}
                            error={form.errors.certification_level}
                            placeholder="Contoh: Wasit Nasional A"
                        />
                        <Input
                            label="Wilayah / Pengda"
                            value={form.data.region}
                            onChange={(event) => form.setData('region', event.target.value)}
                            error={form.errors.region}
                            placeholder="Contoh: Jawa Timur"
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Nomor WhatsApp / Telepon"
                            value={form.data.phone}
                            onChange={(event) => form.setData('phone', event.target.value)}
                            error={form.errors.phone}
                            placeholder="0812-3456-7890"
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={form.data.email}
                            onChange={(event) => form.setData('email', event.target.value)}
                            error={form.errors.email}
                            placeholder="wasit@perkemi.id"
                        />
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                        <i className="fa-solid fa-key mr-2 text-amber-600 dark:text-amber-400" />
                        <strong>Akun login Wasit (opsional):</strong> Isi email dan password jika ingin mengizinkan wasit masuk ke panel penilaian court. Saat edit, kosongkan password jika tidak ingin menggantinya.
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
                        placeholder="Catatan keikutsertaan penataran wasit..."
                    />

                    <Checkbox
                        id="referee-is-active"
                        label="Aktif dan dapat ditugaskan pada event"
                        checked={form.data.is_active}
                        onChange={(event) => form.setData('is_active', event.target.checked)}
                    />
                </form>
            </Modal>

            {/* ════ MODAL DELETE CONFIRMATION ════ */}
            <Modal
                isOpen={!!deletingReferee}
                onClose={() => setDeletingReferee(null)}
                title="Hapus Data Wasit"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setDeletingReferee(null)}>
                            Batal
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => router.delete(`/admin/master/referee/${deletingReferee.id}`, { onSuccess: () => setDeletingReferee(null) })}
                        >
                            Hapus
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    Apakah Anda yakin ingin menghapus wasit <strong>{deletingReferee?.name}</strong> dari master data?
                </p>
            </Modal>
        </AdminLayout>
    );
}
