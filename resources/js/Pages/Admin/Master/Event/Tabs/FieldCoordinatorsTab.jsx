import React, { useState, useMemo } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Button, Input, Combobox, Modal } from '@/Components/UI';

export default function FieldCoordinatorsTab({
    event,
    fieldCoordinators = [],
    eventFieldCoordinators = [],
    courts = [],
    openTransferModal,
}) {
    const [isFieldCoordinatorModalOpen, setIsFieldCoordinatorModalOpen] = useState(false);
    const [editingFieldCoordinator, setEditingFieldCoordinator] = useState(null);
    const [fieldCoordinatorSearch, setFieldCoordinatorSearch] = useState('');

    const fieldCoordinatorAreaOptions = [
        { value: 'koordinator_pertandingan', label: 'Koordinator Pertandingan' },
        { value: 'wakil_koordinator_pertandingan', label: 'Wakil Koordinator Pertandingan' },
        { value: 'koordinator_court', label: 'Koordinator Court' },
        { value: 'court', label: 'Koordinator Lapangan / Court' },
        { value: 'chief', label: 'Koordinator Utama' },
        { value: 'logistics', label: 'Koordinator Logistik' },
        { value: 'liaison', label: 'Liaison / Penghubung' },
        { value: 'general', label: 'Koordinator Umum' },
    ];

    const fieldCoordinatorOptions = useMemo(() => {
        return fieldCoordinators.map((coordinator) => ({
            value: coordinator.id,
            label: coordinator.name,
            sublabel: [
                coordinator.gender === 'female' ? 'Perempuan' : 'Laki-laki',
                coordinator.dan_grade,
                coordinator.coordinator_number,
                coordinator.region,
            ].filter(Boolean).join(' · '),
        }));
    }, [fieldCoordinators]);

    const fieldCoordinatorAssignmentForm = useForm({
        field_coordinator_id: '',
        assignment_area: 'koordinator_pertandingan',
    });

    const fieldCoordinatorForm = useForm({
        name: '',
        gender: 'male',
        dan_grade: '',
        certification_level: '',
        coordinator_number: '',
        region: '',
        phone: '',
        email: '',
        password: '',
        password_confirmation: '',
        assignment_area: 'koordinator_pertandingan',
    });

    const submitFieldCoordinatorAssignment = (e) => {
        e.preventDefault();
        fieldCoordinatorAssignmentForm.post(`/admin/master/event/${event.id}/field-coordinator`, {
            preserveScroll: true,
            onSuccess: () => fieldCoordinatorAssignmentForm.setData({ field_coordinator_id: '', assignment_area: 'koordinator_pertandingan' }),
        });
    };

    const openCreateFieldCoordinatorModal = () => {
        setEditingFieldCoordinator(null);
        fieldCoordinatorForm.reset();
        fieldCoordinatorForm.clearErrors();
        fieldCoordinatorForm.setData({
            name: '',
            gender: 'male',
            dan_grade: '',
            certification_level: '',
            coordinator_number: '',
            region: '',
            phone: '',
            email: '',
            password: '',
            password_confirmation: '',
            assignment_area: 'koordinator_pertandingan',
        });
        setIsFieldCoordinatorModalOpen(true);
    };

    const openEditFieldCoordinatorModal = (coordinator) => {
        setEditingFieldCoordinator(coordinator);
        fieldCoordinatorForm.clearErrors();
        fieldCoordinatorForm.setData({
            name: coordinator.name || '',
            gender: coordinator.gender || 'male',
            dan_grade: coordinator.dan_grade || '',
            certification_level: coordinator.certification_level || '',
            coordinator_number: coordinator.coordinator_number || '',
            region: coordinator.region || '',
            phone: coordinator.phone || '',
            email: coordinator.email || '',
            password: '',
            password_confirmation: '',
            assignment_area: coordinator.assignment_area || 'koordinator_pertandingan',
        });
        setIsFieldCoordinatorModalOpen(true);
    };

    const submitFieldCoordinator = (e) => {
        e.preventDefault();
        if (editingFieldCoordinator) {
            fieldCoordinatorForm.put(`/admin/master/event/${event.id}/field-coordinator/${editingFieldCoordinator.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsFieldCoordinatorModalOpen(false);
                    setEditingFieldCoordinator(null);
                    fieldCoordinatorForm.reset();
                },
            });
        } else {
            fieldCoordinatorForm.transform((data) => ({ ...data, create_new: true }));
            fieldCoordinatorForm.post(`/admin/master/event/${event.id}/field-coordinator`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsFieldCoordinatorModalOpen(false);
                    fieldCoordinatorForm.reset();
                },
            });
        }
    };

    const removeEventFieldCoordinator = (coordinator) => {
        router.delete(`/admin/master/event/${event.id}/field-coordinator/${coordinator.id}`, { preserveScroll: true });
    };

    const filteredCoordinators = useMemo(() => {
        if (!fieldCoordinatorSearch) return eventFieldCoordinators;
        const q = fieldCoordinatorSearch.toLowerCase();
        return eventFieldCoordinators.filter((coordinator) => {
            return (
                coordinator.name?.toLowerCase().includes(q) ||
                coordinator.coordinator_number?.toLowerCase().includes(q) ||
                coordinator.region?.toLowerCase().includes(q) ||
                coordinator.email?.toLowerCase().includes(q) ||
                coordinator.phone?.toLowerCase().includes(q) ||
                coordinator.notes?.toLowerCase().includes(q)
            );
        });
    }, [eventFieldCoordinators, fieldCoordinatorSearch]);

    return (
        <div className="overflow-hidden rounded-2xl border border-[#ede9e1] bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 border-b border-[#ede9e1] p-5 md:flex-row md:items-center md:justify-between dark:border-slate-800">
                <div>
                    <h3 className="text-base font-bold text-[#0f0d0b] dark:text-white">Penugasan Koordinator Lapangan</h3>
                    <p className="mt-1 text-xs text-[#706860] dark:text-slate-400">Pilih koordinator lapangan dari master data untuk event ini atau edit langsung data koordinator.</p>
                </div>
                <Button type="button" onClick={openCreateFieldCoordinatorModal} className="bg-[#141210] text-amber-400 hover:bg-black">
                    <i className="fa-solid fa-user-plus mr-2" />
                    Tambah Koordinator Baru
                </Button>
            </div>

            <div className="border-b border-[#ede9e1] bg-[#fcfbf9] p-5 dark:border-slate-800 dark:bg-slate-950/40">
                <form onSubmit={submitFieldCoordinatorAssignment} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
                    <Combobox
                        label="Pilih dari Master Data Koordinator"
                        value={fieldCoordinatorAssignmentForm.data.field_coordinator_id}
                        onChange={(value) => fieldCoordinatorAssignmentForm.setData('field_coordinator_id', value)}
                        options={fieldCoordinatorOptions}
                        placeholder="Cari koordinator..."
                        searchPlaceholder="Cari koordinator..."
                        error={fieldCoordinatorAssignmentForm.errors.field_coordinator_id}
                    />
                    <Combobox
                        label="Area Penugasan di Event"
                        value={fieldCoordinatorAssignmentForm.data.assignment_area}
                        onChange={(value) => fieldCoordinatorAssignmentForm.setData('assignment_area', value)}
                        options={fieldCoordinatorAreaOptions}
                        clearable={false}
                        error={fieldCoordinatorAssignmentForm.errors.assignment_area}
                    />
                    <Button type="submit" loading={fieldCoordinatorAssignmentForm.processing} disabled={!fieldCoordinatorAssignmentForm.data.field_coordinator_id}>
                        <i className="fa-solid fa-plus mr-2" />
                        Tugaskan
                    </Button>
                </form>
            </div>

            {eventFieldCoordinators.length > 0 && (
                <div className="flex items-center justify-between border-b border-[#ede9e1] bg-[#fbfaf8] px-5 py-3 dark:border-slate-800 dark:bg-slate-950/30">
                    <p className="text-xs font-semibold text-[#706860] dark:text-slate-400">
                        Total Ditugaskan: <span className="font-bold text-[#0f0d0b] dark:text-white">{eventFieldCoordinators.length} Koordinator</span>
                    </p>
                    <div className="w-full max-w-xs">
                        <Input
                            placeholder="Cari koordinator event..."
                            value={fieldCoordinatorSearch}
                            onChange={(e) => setFieldCoordinatorSearch(e.target.value)}
                            iconLeft={<i className="fa-solid fa-magnifying-glass text-[#a89f91]" />}
                            containerClassName="text-xs"
                        />
                    </div>
                </div>
            )}

            {!eventFieldCoordinators.length ? (
                <div className="p-8 text-center">
                    <i className="fa-solid fa-people-group text-3xl text-[#d8d0c7] dark:text-slate-600" />
                    <p className="mt-3 font-semibold text-[#141210] dark:text-white">Belum ada koordinator yang ditugaskan</p>
                    <p className="mt-1 text-sm text-[#706860] dark:text-slate-400">Pilih dari master atau tambahkan koordinator baru langsung dari event ini.</p>
                </div>
            ) : !filteredCoordinators.length ? (
                <div className="p-8 text-center">
                    <i className="fa-solid fa-magnifying-glass text-2xl text-[#d8d0c7] dark:text-slate-600" />
                    <p className="mt-2 text-sm font-semibold text-[#141210] dark:text-white">Tidak ada koordinator yang cocok dengan pencarian "{fieldCoordinatorSearch}"</p>
                </div>
            ) : (
                <div className="divide-y divide-[#ede9e1] dark:divide-slate-800">
                    {filteredCoordinators.map((coordinator) => (
                        <div key={coordinator.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 transition-colors hover:bg-zinc-50/70 dark:hover:bg-slate-800/40">
                            <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime-50 text-lime-700 border border-lime-200/60 dark:bg-lime-950/40 dark:text-lime-400 dark:border-lime-800/50 shadow-2xs mt-0.5 sm:mt-0">
                                    <i className="fa-solid fa-people-group text-sm" />
                                </span>
                                <div className="min-w-0 flex-1 space-y-1">
                                    <h4 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white leading-tight">
                                        {coordinator.name}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                                        {[coordinator.dan_grade, coordinator.certification_level, coordinator.region].filter(Boolean).length > 0 && (
                                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                                {[coordinator.dan_grade, coordinator.certification_level, coordinator.region].filter(Boolean).join(' · ')}
                                            </span>
                                        )}
                                        {(coordinator.coordinator_number || coordinator.email || coordinator.phone || coordinator.notes) && (
                                            <span className="text-zinc-500 dark:text-zinc-500">
                                                {[
                                                    coordinator.coordinator_number ? `No: ${coordinator.coordinator_number}` : null,
                                                    coordinator.email,
                                                    coordinator.phone,
                                                    coordinator.notes ? `Catatan: ${coordinator.notes}` : null,
                                                ].filter(Boolean).join(' · ')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 whitespace-nowrap shrink-0">
                                    {fieldCoordinatorAreaOptions.find((option) => option.value === coordinator.assignment_area)?.label || coordinator.assignment_area}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {openTransferModal && (
                                        <button
                                            type="button"
                                            onClick={() => openTransferModal('coordinator', coordinator)}
                                            className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-2xs transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 cursor-pointer"
                                            title="Alihkan Penugasan (Arbitrase / Wasit & Juri)"
                                            aria-label={`Alihkan penugasan ${coordinator.name}`}
                                        >
                                            <i className="fa-solid fa-right-left text-xs" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => openEditFieldCoordinatorModal(coordinator)}
                                        className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-2xs transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-amber-950/40 dark:hover:text-amber-400 cursor-pointer"
                                        title="Edit data koordinator langsung"
                                        aria-label={`Edit ${coordinator.name}`}
                                    >
                                        <i className="fa-solid fa-pen-to-square text-xs" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeEventFieldCoordinator(coordinator)}
                                        className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-2xs transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-red-950/40 dark:hover:text-red-400 cursor-pointer"
                                        title="Hapus koordinator dari event"
                                        aria-label={`Hapus ${coordinator.name} dari event`}
                                    >
                                        <i className="fa-solid fa-trash text-xs" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Tambah / Edit Koordinator Lapangan */}
            <Modal
                isOpen={isFieldCoordinatorModalOpen}
                onClose={() => {
                    setIsFieldCoordinatorModalOpen(false);
                    setEditingFieldCoordinator(null);
                }}
                title={editingFieldCoordinator ? 'Edit Data Koordinator & Penugasan' : 'Tambah Koordinator Baru ke Event'}
                footer={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsFieldCoordinatorModalOpen(false);
                                setEditingFieldCoordinator(null);
                            }}
                        >
                            Batal
                        </Button>
                        <Button onClick={submitFieldCoordinator} loading={fieldCoordinatorForm.processing}>
                            {editingFieldCoordinator ? 'Simpan Perubahan' : 'Simpan & Tugaskan'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submitFieldCoordinator} className="space-y-4">
                    <Input
                        label="Nama Koordinator"
                        required
                        value={fieldCoordinatorForm.data.name}
                        onChange={(e) => fieldCoordinatorForm.setData('name', e.target.value)}
                        error={fieldCoordinatorForm.errors.name}
                        placeholder="Contoh: Sensei Bambang Sugiono"
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Combobox
                            label="Jenis Kelamin"
                            value={fieldCoordinatorForm.data.gender}
                            onChange={(val) => fieldCoordinatorForm.setData('gender', val)}
                            options={[
                                { value: 'male', label: 'Laki-laki' },
                                { value: 'female', label: 'Perempuan' },
                            ]}
                            clearable={false}
                            error={fieldCoordinatorForm.errors.gender}
                        />
                        <Combobox
                            label="Area Penugasan di Event"
                            value={fieldCoordinatorForm.data.assignment_area}
                            onChange={(value) => fieldCoordinatorForm.setData('assignment_area', value)}
                            options={fieldCoordinatorAreaOptions}
                            clearable={false}
                            error={fieldCoordinatorForm.errors.assignment_area}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Tingkatan Dan"
                            value={fieldCoordinatorForm.data.dan_grade}
                            onChange={(e) => fieldCoordinatorForm.setData('dan_grade', e.target.value)}
                            error={fieldCoordinatorForm.errors.dan_grade}
                            placeholder="Contoh: V DAN"
                        />
                        <Input
                            label="Tingkat Sertifikasi"
                            value={fieldCoordinatorForm.data.certification_level}
                            onChange={(e) => fieldCoordinatorForm.setData('certification_level', e.target.value)}
                            error={fieldCoordinatorForm.errors.certification_level}
                            placeholder="Contoh: Wasit Nasional / Pengawas"
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="ID / Lisensi Koordinator"
                            value={fieldCoordinatorForm.data.coordinator_number}
                            onChange={(e) => fieldCoordinatorForm.setData('coordinator_number', e.target.value)}
                            error={fieldCoordinatorForm.errors.coordinator_number}
                            placeholder="Contoh: KORD-001"
                        />
                        <Input
                            label="Wilayah / Pengda"
                            value={fieldCoordinatorForm.data.region}
                            onChange={(e) => fieldCoordinatorForm.setData('region', e.target.value)}
                            error={fieldCoordinatorForm.errors.region}
                            placeholder="Contoh: Jawa Timur"
                        />
                    </div>

                    <Input
                        label="Nomor Telepon"
                        value={fieldCoordinatorForm.data.phone}
                        onChange={(e) => fieldCoordinatorForm.setData('phone', e.target.value)}
                        error={fieldCoordinatorForm.errors.phone}
                        placeholder="08xxxxxxxxxx"
                    />

                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                        <strong>Akun login {editingFieldCoordinator ? '(Opsional)' : 'opsional'}.</strong>{' '}
                        {editingFieldCoordinator
                            ? 'Isi email untuk sinkronisasi akun login. Kosongkan kolom password jika tidak ingin mengubah password saat ini.'
                            : 'Isi email dan password agar Koordinator dapat login ke event ini.'}
                    </div>

                    <Input
                        label="Email Login"
                        type="email"
                        value={fieldCoordinatorForm.data.email}
                        onChange={(e) => fieldCoordinatorForm.setData('email', e.target.value)}
                        error={fieldCoordinatorForm.errors.email}
                        autoComplete="username"
                        placeholder="koordinator@perkemi.id"
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label={editingFieldCoordinator ? 'Password Baru (Kosongkan jika tetap)' : 'Password'}
                            type="password"
                            value={fieldCoordinatorForm.data.password}
                            onChange={(e) => fieldCoordinatorForm.setData('password', e.target.value)}
                            error={fieldCoordinatorForm.errors.password}
                            autoComplete="new-password"
                        />
                        <Input
                            label="Konfirmasi Password"
                            type="password"
                            value={fieldCoordinatorForm.data.password_confirmation}
                            onChange={(e) => fieldCoordinatorForm.setData('password_confirmation', e.target.value)}
                            autoComplete="new-password"
                        />
                    </div>
                </form>
            </Modal>
        </div>
    );
}
