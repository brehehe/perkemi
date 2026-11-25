import React, { useState, useMemo } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Button, Input, Combobox, Modal } from '@/Components/UI';
import EventRefereeImport from '@/Components/Admin/EventRefereeImport';

export default function RefereesTab({
    event,
    referees = [],
    eventReferees = [],
    openTransferModal,
}) {
    const [isRefereeModalOpen, setIsRefereeModalOpen] = useState(false);
    const [editingReferee, setEditingReferee] = useState(null);
    const [refereeSearch, setRefereeSearch] = useState('');

    const refereeOptions = useMemo(() => {
        return referees.map((ref) => ({
            value: ref.id,
            label: ref.name,
            sublabel: [ref.certification_level, ref.dan_grade, ref.region].filter(Boolean).join(' · '),
        }));
    }, [referees]);

    const refereeRoleOptions = [
        { value: 'referee', label: 'Wasit & Juri Pertandingan' },
        { value: 'head_referee', label: 'Ketua / Dewan Wasit' },
        { value: 'tatami_manager', label: 'Manager Tatami' },
        { value: 'line_judge', label: 'Juri Garis' },
        { value: 'arbitrator', label: 'Komisi Arbitrase' },
    ];

    const refereeAssignmentForm = useForm({ referee_id: '', role: 'referee' });
    const refereeForm = useForm({
        name: '',
        gender: 'male',
        dan_grade: '',
        certification_level: '',
        license_number: '',
        region: '',
        phone: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'referee',
    });

    const submitRefereeAssignment = (e) => {
        e.preventDefault();
        refereeAssignmentForm.post(`/admin/master/event/${event.id}/referee`, {
            preserveScroll: true,
            onSuccess: () => refereeAssignmentForm.setData({ referee_id: '', role: 'referee' }),
        });
    };

    const openCreateRefereeModal = () => {
        setEditingReferee(null);
        refereeForm.reset();
        refereeForm.clearErrors();
        refereeForm.setData({
            name: '',
            gender: 'male',
            dan_grade: '',
            certification_level: '',
            license_number: '',
            region: '',
            phone: '',
            email: '',
            password: '',
            password_confirmation: '',
            role: 'referee',
        });
        setIsRefereeModalOpen(true);
    };

    const openEditRefereeModal = (referee) => {
        setEditingReferee(referee);
        refereeForm.clearErrors();
        refereeForm.setData({
            name: referee.name || '',
            gender: referee.gender || 'male',
            dan_grade: referee.dan_grade || '',
            certification_level: referee.certification_level || '',
            license_number: referee.license_number || '',
            region: referee.region || '',
            phone: referee.phone || '',
            email: referee.email || '',
            password: '',
            password_confirmation: '',
            role: referee.role || 'referee',
        });
        setIsRefereeModalOpen(true);
    };

    const submitReferee = (e) => {
        e.preventDefault();
        if (editingReferee) {
            refereeForm.put(`/admin/master/event/${event.id}/referee/${editingReferee.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsRefereeModalOpen(false);
                    setEditingReferee(null);
                    refereeForm.reset();
                },
            });
        } else {
            refereeForm.transform((data) => ({ ...data, create_new: true }));
            refereeForm.post(`/admin/master/event/${event.id}/referee`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsRefereeModalOpen(false);
                    refereeForm.reset();
                },
            });
        }
    };

    const removeEventReferee = (referee) => {
        router.delete(`/admin/master/event/${event.id}/referee/${referee.id}`, { preserveScroll: true });
    };

    const filteredReferees = useMemo(() => {
        if (!refereeSearch) return eventReferees;
        const q = refereeSearch.toLowerCase();
        return eventReferees.filter((referee) => {
            return (
                referee.name?.toLowerCase().includes(q) ||
                referee.dan_grade?.toLowerCase().includes(q) ||
                referee.certification_level?.toLowerCase().includes(q) ||
                referee.region?.toLowerCase().includes(q) ||
                referee.license_number?.toLowerCase().includes(q) ||
                referee.email?.toLowerCase().includes(q) ||
                referee.phone?.toLowerCase().includes(q)
            );
        });
    }, [eventReferees, refereeSearch]);

    return (
        <div className="overflow-hidden rounded-2xl border border-[#ede9e1] bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 border-b border-[#ede9e1] p-5 md:flex-row md:items-center md:justify-between dark:border-slate-800">
                <div>
                    <h3 className="text-base font-bold text-[#0f0d0b] dark:text-white">Penugasan Wasit & Juri</h3>
                    <p className="mt-1 text-xs text-[#706860] dark:text-slate-400">Pilih perangkat perwasitan dari master data untuk event ini atau edit langsung data wasit.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <EventRefereeImport eventId={event.id} />
                    <Button type="button" onClick={openCreateRefereeModal} className="bg-[#141210] text-amber-400 hover:bg-black">
                        <i className="fa-solid fa-user-plus mr-2" />
                        Tambah Wasit Baru
                    </Button>
                </div>
            </div>

            <div className="border-b border-[#ede9e1] bg-[#fcfbf9] p-5 dark:border-slate-800 dark:bg-slate-950/40">
                <form onSubmit={submitRefereeAssignment} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
                    <Combobox
                        label="Pilih dari Master Data Wasit"
                        value={refereeAssignmentForm.data.referee_id}
                        onChange={(value) => refereeAssignmentForm.setData('referee_id', value)}
                        options={refereeOptions}
                        placeholder="Cari nama wasit..."
                        searchPlaceholder="Cari wasit..."
                        error={refereeAssignmentForm.errors.referee_id}
                    />
                    <Combobox
                        label="Peran di Event"
                        value={refereeAssignmentForm.data.role}
                        onChange={(value) => refereeAssignmentForm.setData('role', value)}
                        options={refereeRoleOptions}
                        clearable={false}
                        error={refereeAssignmentForm.errors.role}
                    />
                    <Button type="submit" loading={refereeAssignmentForm.processing} disabled={!refereeAssignmentForm.data.referee_id}>
                        <i className="fa-solid fa-plus mr-2" />
                        Tugaskan
                    </Button>
                </form>
            </div>

            {eventReferees.length > 0 && (
                <div className="flex items-center justify-between border-b border-[#ede9e1] bg-[#fbfaf8] px-5 py-3 dark:border-slate-800 dark:bg-slate-950/30">
                    <p className="text-xs font-semibold text-[#706860] dark:text-slate-400">
                        Total Ditugaskan: <span className="font-bold text-[#0f0d0b] dark:text-white">{eventReferees.length} Wasit</span>
                    </p>
                    <div className="w-full max-w-xs">
                        <Input
                            placeholder="Cari wasit event..."
                            value={refereeSearch}
                            onChange={(e) => setRefereeSearch(e.target.value)}
                            iconLeft={<i className="fa-solid fa-magnifying-glass text-[#a89f91]" />}
                            containerClassName="text-xs"
                        />
                    </div>
                </div>
            )}

            {!eventReferees.length ? (
                <div className="p-8 text-center">
                    <i className="fa-solid fa-scale-balanced text-3xl text-[#d8d0c7] dark:text-slate-600" />
                    <p className="mt-3 font-semibold text-[#141210] dark:text-white">Belum ada wasit yang ditugaskan</p>
                    <p className="mt-1 text-sm text-[#706860] dark:text-slate-400">Pilih dari master atau tambahkan wasit baru langsung dari event ini.</p>
                </div>
            ) : !filteredReferees.length ? (
                <div className="p-8 text-center">
                    <i className="fa-solid fa-magnifying-glass text-2xl text-[#d8d0c7] dark:text-slate-600" />
                    <p className="mt-2 text-sm font-semibold text-[#141210] dark:text-white">Tidak ada wasit yang cocok dengan pencarian "{refereeSearch}"</p>
                </div>
            ) : (
                <div className="divide-y divide-[#ede9e1] dark:divide-slate-800">
                    {filteredReferees.map((referee) => (
                        <div key={referee.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 transition-colors hover:bg-zinc-50/70 dark:hover:bg-slate-800/40">
                            <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/50 shadow-2xs mt-0.5 sm:mt-0">
                                    <i className="fa-solid fa-scale-balanced text-sm" />
                                </span>
                                <div className="min-w-0 flex-1 space-y-1">
                                    <h4 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white leading-tight">
                                        {referee.name}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                                        {[referee.dan_grade, referee.certification_level, referee.region].filter(Boolean).length > 0 && (
                                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                                {[referee.dan_grade, referee.certification_level, referee.region].filter(Boolean).join(' · ')}
                                            </span>
                                        )}
                                        {(referee.license_number || referee.email || referee.phone) && (
                                            <span className="text-zinc-500 dark:text-zinc-500">
                                                {[
                                                    referee.license_number ? `Lisensi: ${referee.license_number}` : null,
                                                    referee.email,
                                                    referee.phone,
                                                ].filter(Boolean).join(' · ')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 whitespace-nowrap shrink-0">
                                    {refereeRoleOptions.find((option) => option.value === referee.role)?.label || referee.role}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {openTransferModal && (
                                        <button
                                            type="button"
                                            onClick={() => openTransferModal('referee', referee)}
                                            className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-2xs transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 cursor-pointer"
                                            title="Alihkan Penugasan (Arbitrase / Koordinator Lapangan)"
                                            aria-label={`Alihkan penugasan ${referee.name}`}
                                        >
                                            <i className="fa-solid fa-right-left text-xs" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => openEditRefereeModal(referee)}
                                        className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-2xs transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-amber-950/40 dark:hover:text-amber-400 cursor-pointer"
                                        title="Edit data wasit langsung"
                                        aria-label={`Edit ${referee.name}`}
                                    >
                                        <i className="fa-solid fa-pen-to-square text-xs" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeEventReferee(referee)}
                                        className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-2xs transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-red-950/40 dark:hover:text-red-400 cursor-pointer"
                                        title="Hapus wasit dari event"
                                        aria-label={`Hapus ${referee.name} dari event`}
                                    >
                                        <i className="fa-solid fa-trash text-xs" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Tambah / Edit Wasit */}
            <Modal
                isOpen={isRefereeModalOpen}
                onClose={() => {
                    setIsRefereeModalOpen(false);
                    setEditingReferee(null);
                }}
                title={editingReferee ? 'Edit Data Wasit & Penugasan' : 'Tambah Wasit Baru ke Event'}
                footer={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsRefereeModalOpen(false);
                                setEditingReferee(null);
                            }}
                        >
                            Batal
                        </Button>
                        <Button onClick={submitReferee} loading={refereeForm.processing}>
                            {editingReferee ? 'Simpan Perubahan' : 'Simpan & Tugaskan'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submitReferee} className="space-y-4">
                    <Input
                        label="Nama Wasit / Juri"
                        required
                        value={refereeForm.data.name}
                        onChange={(e) => refereeForm.setData('name', e.target.value)}
                        error={refereeForm.errors.name}
                        placeholder="Contoh: Sensei Budi Santoso"
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Combobox
                            label="Jenis Kelamin"
                            value={refereeForm.data.gender}
                            onChange={(val) => refereeForm.setData('gender', val)}
                            options={[
                                { value: 'male', label: 'Laki-laki' },
                                { value: 'female', label: 'Perempuan' },
                            ]}
                            clearable={false}
                            error={refereeForm.errors.gender}
                        />
                        <Combobox
                            label="Peran di Event"
                            value={refereeForm.data.role}
                            onChange={(value) => refereeForm.setData('role', value)}
                            options={refereeRoleOptions}
                            clearable={false}
                            error={refereeRoleOptions.find((o) => o.value === refereeForm.data.role) ? undefined : refereeForm.errors.role}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Tingkatan Dan"
                            value={refereeForm.data.dan_grade}
                            onChange={(e) => refereeForm.setData('dan_grade', e.target.value)}
                            error={refereeForm.errors.dan_grade}
                            placeholder="Contoh: IV DAN"
                        />
                        <Input
                            label="Tingkat Sertifikasi"
                            value={refereeForm.data.certification_level}
                            onChange={(e) => refereeForm.setData('certification_level', e.target.value)}
                            error={refereeForm.errors.certification_level}
                            placeholder="Contoh: Wasit Nasional / Wasit Daerah"
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Nomor Lisensi"
                            value={refereeForm.data.license_number}
                            onChange={(e) => refereeForm.setData('license_number', e.target.value)}
                            error={refereeForm.errors.license_number}
                            placeholder="Contoh: 69.1.13.03.99.001"
                        />
                        <Input
                            label="Wilayah / Pengda"
                            value={refereeForm.data.region}
                            onChange={(e) => refereeForm.setData('region', e.target.value)}
                            error={refereeForm.errors.region}
                            placeholder="Contoh: Jawa Timur"
                        />
                    </div>

                    <Input
                        label="Nomor Telepon"
                        value={refereeForm.data.phone}
                        onChange={(e) => refereeForm.setData('phone', e.target.value)}
                        error={refereeForm.errors.phone}
                        placeholder="08xxxxxxxxxx"
                    />

                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                        <strong>Akun login {editingReferee ? '(Opsional)' : 'opsional'}.</strong>{' '}
                        {editingReferee
                            ? 'Isi email untuk sinkronisasi akun login. Kosongkan kolom password jika tidak ingin mengubah password saat ini.'
                            : 'Isi email dan password agar Wasit dapat login dan mengakses event ini.'}
                    </div>

                    <Input
                        label="Email Login"
                        type="email"
                        value={refereeForm.data.email}
                        onChange={(e) => refereeForm.setData('email', e.target.value)}
                        error={refereeForm.errors.email}
                        autoComplete="username"
                        placeholder="wasit@perkemi.id"
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label={editingReferee ? 'Password Baru (Kosongkan jika tetap)' : 'Password'}
                            type="password"
                            value={refereeForm.data.password}
                            onChange={(e) => refereeForm.setData('password', e.target.value)}
                            error={refereeForm.errors.password}
                            autoComplete="new-password"
                        />
                        <Input
                            label="Konfirmasi Password"
                            type="password"
                            value={refereeForm.data.password_confirmation}
                            onChange={(e) => refereeForm.setData('password_confirmation', e.target.value)}
                            autoComplete="new-password"
                        />
                    </div>
                </form>
            </Modal>
        </div>
    );
}
