import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import AlertConfirm from '@/Components/UI/Feedback/AlertConfirm';
import Combobox from '@/Components/UI/Forms/Combobox';
import Tabs from '@/Components/UI/Navigation/Tabs';
import Modal from '@/Components/UI/Overlays/Modal';
import { Button, Input } from '@/Components/UI';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const blankReferee = {
    source: 'existing',
    referee_id: '',
    name: '',
    gender: 'male',
    dan_grade: '',
    license_number: '',
    certification_level: '',
    region: '',
    phone: '',
    email: '',
    profile_photo: null,
    notes: '',
    is_active: true,
    role: 'judge',
};

const genderOptions = [
    { value: 'male', label: 'Laki-laki' },
    { value: 'female', label: 'Perempuan' },
];

const roleOptions = [
    { value: 'chief', label: 'Wasit Utama' },
    { value: 'referee', label: 'Wasit' },
    { value: 'judge', label: 'Juri' },
    { value: 'reserve', label: 'Wasit Cadangan' },
];

function StatCard({ icon, label, value, helper, tone = 'slate' }) {
    const tones = {
        slate: 'bg-slate-100 text-slate-700',
        emerald: 'bg-emerald-50 text-emerald-700',
        blue: 'bg-blue-50 text-blue-700',
        amber: 'bg-amber-50 text-amber-700',
    };

    return (
        <article className="rounded-2xl border border-[#ede9e1] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-[#7a746e]">{label}</span>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm ${tones[tone]}`}>
                    <i className={`fa-solid ${icon}`} aria-hidden="true" />
                </span>
            </div>
            <p className="mt-2 text-2xl font-black text-[#17120f]">{value}</p>
            <p className="mt-1 text-[10px] text-[#8c837b]">{helper}</p>
        </article>
    );
}

export default function ArbitrationReferee({ referees = [], availableReferees = [], events = [], stats = {}, filters = {}, activeEvent, canManageEventReferees = false }) {
    const [search, setSearch] = useState(filters.search || '');
    const [editingReferee, setEditingReferee] = useState(null);
    const [deletingReferee, setDeletingReferee] = useState(null);
    const form = useForm(blankReferee);
    const activeStatus = filters.status || 'all';
    const eventId = activeEvent?.id;

    const visitFilters = (next = {}) => {
        router.get('/admin/arbitrase/wasit', {
            event_id: eventId,
            search,
            status: activeStatus,
            ...next,
        }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const handleSearch = (event) => {
        event.preventDefault();
        visitFilters({ search, status: activeStatus });
    };

    const openCreate = () => {
        setEditingReferee({ mode: 'create' });
        form.setData(blankReferee);
        form.clearErrors();
    };

    const openEdit = (referee) => {
        setEditingReferee({ mode: 'edit', referee });
        form.setData({
            source: 'new',
            referee_id: '',
            name: referee.name || '',
            gender: referee.gender || 'male',
            dan_grade: referee.dan_grade === '-' ? '' : referee.dan_grade || '',
            license_number: referee.license_number || '',
            certification_level: referee.certification_level || '',
            region: referee.region === '-' ? '' : referee.region || '',
            phone: referee.phone === '-' ? '' : referee.phone || '',
            email: referee.email || '',
            profile_photo: null,
            notes: referee.notes || '',
            is_active: Boolean(referee.is_active),
            role: referee.role || 'judge',
        });
        form.clearErrors();
    };

    const closeEditor = () => {
        if (form.processing) return;
        setEditingReferee(null);
        form.reset();
        form.clearErrors();
    };

    const submitReferee = (event) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: closeEditor,
        };

        if (editingReferee?.mode === 'edit') {
            form.transform((data) => ({ ...data, _method: 'put' })).post(`/admin/arbitrase/wasit/${editingReferee.referee.id}?event_id=${encodeURIComponent(eventId)}`, {
                ...options,
                forceFormData: true,
            });
            return;
        }

        form.transform((data) => data).post(`/admin/arbitrase/wasit?event_id=${encodeURIComponent(eventId)}`, {
            ...options,
            forceFormData: true,
        });
    };

    const removeReferee = () => {
        if (!deletingReferee) return;

        router.delete(`/admin/arbitrase/wasit/${deletingReferee.id}?event_id=${encodeURIComponent(eventId)}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingReferee(null),
        });
    };

    const tabs = [
        { key: 'all', label: 'Semua Wasit', count: stats.total_referees ?? 0, icon: <i className="fa-solid fa-users" aria-hidden="true" /> },
        { key: 'active', label: 'Aktif', count: stats.active_referees ?? 0, icon: <i className="fa-solid fa-circle-check" aria-hidden="true" /> },
        { key: 'inactive', label: 'Tidak Aktif', count: stats.inactive_referees ?? 0, icon: <i className="fa-solid fa-circle-pause" aria-hidden="true" /> },
    ];

    return (
        <AdminLayout title="Data Wasit & Juri">
            <Head title="Data Wasit & Juri | Smart Perkemi" />

            <div className="space-y-5 pb-8 sm:space-y-6">
                <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f0d0b] via-[#211b16] to-[#0f0d0b] p-5 text-white shadow-xl sm:p-6">
                    <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#d4a843]/15 blur-3xl" />
                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#e1b94e]"><i className="fa-solid fa-gavel" aria-hidden="true" /> Korps Wasit & Juri</p>
                            <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Data Wasit Event</h1>
                            <p className="mt-2 text-sm leading-6 text-white/70">Kelola profil, peran, dan status Wasit untuk {activeEvent?.name || 'event yang dipilih'}.</p>
                        </div>
                        <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto] xl:w-auto xl:min-w-[32rem]">
                            <Combobox label="Event dipilih" labelClassName="text-white/60" value={eventId || ''} onChange={(value) => router.get('/admin/arbitrase/wasit', { event_id: value, status: 'all' })} clearable={false} options={events.map((event) => ({ value: event.id, label: event.name, sublabel: [event.status_label, event.date_label, event.city].filter(Boolean).join(' · ') }))} />
                            {canManageEventReferees && (
                                <Button type="button" variant="gold" size="md" onClick={openCreate} iconLeft={<i className="fa-solid fa-user-plus" aria-hidden="true" />} className="w-full self-end sm:w-auto">
                                    Tambah Wasit
                                </Button>
                            )}
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4" aria-label="Ringkasan data Wasit">
                    <StatCard icon="fa-users" label="Total Wasit" value={stats.total_referees ?? 0} helper="terdaftar pada event" />
                    <StatCard icon="fa-circle-check" label="Siap Tugas" value={stats.active_referees ?? 0} helper="status aktif" tone="emerald" />
                    <StatCard icon="fa-certificate" label="Nasional A" value={stats.national_a ?? 0} helper="sertifikasi utama" tone="amber" />
                    <StatCard icon="fa-award" label="Nasional B" value={stats.national_b ?? 0} helper="sertifikasi juri" tone="blue" />
                </section>

                <section className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
                    <div className="border-b border-[#eee8e0] bg-[#fbfaf8] p-4 sm:p-5">
                        <Tabs tabs={tabs} activeTab={activeStatus} onChange={(status) => visitFilters({ status })} variant="pills" />
                        <form onSubmit={handleSearch} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-[#7a746e]">Menampilkan <strong className="text-[#17120f]">{referees.length}</strong> Wasit sesuai filter.</p>
                            <div className="flex w-full gap-2 sm:w-auto">
                                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, lisensi, atau daerah..." iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />} size="sm" clearable onClear={() => { setSearch(''); visitFilters({ search: '' }); }} containerClassName="min-w-0 flex-1 sm:w-80" />
                                <Button type="submit" variant="dark" size="sm">Cari</Button>
                            </div>
                        </form>
                    </div>

                    <TableContainer className="custom-scrollbar" ariaLabel="Tabel data Wasit event">
                        <table className="responsive-data-table w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b border-[#ede9e1] bg-white text-[10px] font-bold uppercase tracking-wider text-[#7a746e]">
                                    <th className="px-4 py-3">Nama Wasit</th><th className="px-4 py-3">Tingkatan</th><th className="px-4 py-3">Sertifikasi</th><th className="px-4 py-3">Daerah</th><th className="px-4 py-3">Peran Event</th><th className="px-4 py-3">Status</th>{canManageEventReferees && <th className="px-4 py-3 text-right">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ede9e1] text-sm text-[#17120f]">
                                {referees.length === 0 ? (
                                    <tr><td colSpan={canManageEventReferees ? 7 : 6} className="px-5 py-14 text-center text-sm text-[#7a746e]">Tidak ada Wasit yang cocok dengan filter ini.</td></tr>
                                ) : referees.map((referee) => (
                                    <tr key={referee.id} className="transition-colors hover:bg-[#fbfaf8]">
                                        <td data-label="Nama Wasit" className="px-4 py-3.5"><div className="flex items-center gap-3">{referee.photo_url ? <img src={referee.photo_url} alt={`Foto ${referee.name}`} className="h-10 w-10 shrink-0 rounded-xl border border-[#e6dfd6] object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#17120f] font-bold text-[#d4a843]">{referee.name?.slice(0, 2).toUpperCase()}</span>}<div className="min-w-0"><p className="font-bold text-[#17120f]">{referee.name}</p><p className="mt-0.5 truncate text-[11px] text-[#8a8178]">{referee.email || referee.phone || 'Kontak belum dicatat'}</p></div></div></td>
                                        <td data-label="Tingkatan" className="px-4 py-3.5"><span className="rounded-lg border border-[#e6dfd6] bg-[#f7f4ef] px-2.5 py-1 text-xs font-bold">{referee.dan_grade}</span></td>
                                        <td data-label="Sertifikasi" className="px-4 py-3.5"><span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><i className="fa-solid fa-certificate text-[10px]" aria-hidden="true" />{referee.license}</span></td>
                                        <td data-label="Daerah" className="px-4 py-3.5 text-[#6f675f]">{referee.region}</td>
                                        <td data-label="Peran Event" className="px-4 py-3.5 font-semibold">{referee.role_label}</td>
                                        <td data-label="Status" className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${referee.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}><span className={`h-1.5 w-1.5 rounded-full ${referee.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />{referee.is_active ? 'Aktif' : 'Tidak Aktif'}</span></td>
                                        {canManageEventReferees && <td data-label="Aksi" className="px-4 py-3.5"><div className="flex justify-end gap-2"><Button type="button" variant="outline" size="xs" onClick={() => openEdit(referee)} iconLeft={<i className="fa-solid fa-pen" aria-hidden="true" />}>Edit</Button><Button type="button" variant="danger" size="xs" onClick={() => setDeletingReferee(referee)} aria-label={`Hapus ${referee.name} dari event`}><i className="fa-solid fa-trash" aria-hidden="true" /></Button></div></td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </TableContainer>
                </section>
            </div>

            <Modal isOpen={Boolean(editingReferee)} onClose={closeEditor} title={editingReferee?.mode === 'edit' ? 'Edit Data Wasit' : 'Tambah Wasit Event'} subtitle="Data ini digunakan pada penugasan dan laporan penilaian." size="2xl" footer={<><Button type="button" variant="outline" onClick={closeEditor} disabled={form.processing}>Batal</Button><Button type="submit" form="event-referee-form" loading={form.processing}>{editingReferee?.mode === 'edit' ? 'Simpan Perubahan' : 'Tambah Wasit'}</Button></>}>
                <form id="event-referee-form" onSubmit={submitReferee} className="grid gap-4 sm:grid-cols-2">
                    {editingReferee?.mode === 'create' && (
                        <div className="sm:col-span-2">
                            <Tabs tabs={[{ key: 'existing', label: 'Pilih Wasit yang Sudah Ada', icon: <i className="fa-solid fa-address-book" aria-hidden="true" /> }, { key: 'new', label: 'Buat Wasit Baru', icon: <i className="fa-solid fa-user-plus" aria-hidden="true" /> }]} activeTab={form.data.source} onChange={(source) => form.setData({ ...blankReferee, source })} variant="boxed" />
                        </div>
                    )}
                    {editingReferee?.mode === 'create' && form.data.source === 'existing' ? (
                        <>
                            <Combobox label="Wasit dari master" required value={form.data.referee_id} onChange={(value) => form.setData('referee_id', value)} options={availableReferees.map((referee) => ({ value: referee.id, label: referee.name, sublabel: referee.sublabel }))} error={form.errors.referee_id} placeholder="Cari nama, lisensi, atau daerah..." emptyMessage="Semua Wasit master sudah masuk ke event ini." containerClassName="sm:col-span-2" />
                            <Combobox label="Peran di event" required value={form.data.role} onChange={(value) => form.setData('role', value)} options={roleOptions} error={form.errors.role} clearable={false} containerClassName="sm:col-span-2" />
                        </>
                    ) : <>
                    <Input label="Nama lengkap" required value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} error={form.errors.name} placeholder="Contoh: Sensei Budi Santoso" containerClassName="sm:col-span-2" />
                    <Combobox label="Jenis kelamin" required value={form.data.gender} onChange={(value) => form.setData('gender', value)} options={genderOptions} error={form.errors.gender} clearable={false} />
                    <Combobox label="Peran di event" required value={form.data.role} onChange={(value) => form.setData('role', value)} options={roleOptions} error={form.errors.role} clearable={false} />
                    <Input label="Tingkatan Dan" value={form.data.dan_grade} onChange={(event) => form.setData('dan_grade', event.target.value)} error={form.errors.dan_grade} placeholder="Contoh: Dan IV" />
                    <Input label="Nomor lisensi" value={form.data.license_number} onChange={(event) => form.setData('license_number', event.target.value)} error={form.errors.license_number} placeholder="Contoh: WST-001" />
                    <Input label="Tingkat sertifikasi" value={form.data.certification_level} onChange={(event) => form.setData('certification_level', event.target.value)} error={form.errors.certification_level} placeholder="Contoh: Wasit Nasional A" />
                    <Input label="Pengprov / daerah" value={form.data.region} onChange={(event) => form.setData('region', event.target.value)} error={form.errors.region} placeholder="Contoh: Jawa Timur" />
                    <Input label="Nomor telepon" value={form.data.phone} onChange={(event) => form.setData('phone', event.target.value)} error={form.errors.phone} placeholder="08xxxxxxxxxx" />
                    <Input label="Email" type="email" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} error={form.errors.email} placeholder="wasit@example.test" />
                    <div className="sm:col-span-2">
                        <Input label="Foto Wasit (opsional)" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => form.setData('profile_photo', event.target.files?.[0] || null)} error={form.errors.profile_photo} />
                        {editingReferee?.referee?.photo_url && !form.data.profile_photo && <div className="mt-2 flex items-center gap-2 text-xs text-[#7a746e]"><img src={editingReferee.referee.photo_url} alt="Foto Wasit saat ini" className="h-10 w-10 rounded-lg object-cover" /><span>Foto saat ini akan dipertahankan.</span></div>}
                    </div>
                    <div className="space-y-1.5 sm:col-span-2"><label htmlFor="referee-notes" className="text-xs font-semibold text-slate-700">Catatan</label><textarea id="referee-notes" value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} rows="3" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#c0392b] focus:ring-2 focus:ring-[#c0392b]/20" placeholder="Catatan tambahan (opsional)" />{form.errors.notes && <p className="text-xs font-medium text-rose-600">{form.errors.notes}</p>}</div>
                    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#e6dfd6] bg-[#fbfaf8] p-4 sm:col-span-2"><span><span className="block text-sm font-bold text-[#17120f]">Status aktif</span><span className="mt-0.5 block text-xs text-[#7a746e]">Wasit aktif dapat dipilih untuk bertugas pada event.</span></span><input type="checkbox" checked={form.data.is_active} onChange={(event) => form.setData('is_active', event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-[#c0392b] focus:ring-[#c0392b]" /></label>
                    </>}
                </form>
            </Modal>

            <AlertConfirm isOpen={Boolean(deletingReferee)} title="Hapus Wasit dari event?" message={`${deletingReferee?.name || 'Wasit'} akan dilepas dari event dan penugasan courtnya dibersihkan. Riwayat penilaian tetap disimpan.`} confirmText="Hapus dari Event" onConfirm={removeReferee} onCancel={() => setDeletingReferee(null)} />
        </AdminLayout>
    );
}
