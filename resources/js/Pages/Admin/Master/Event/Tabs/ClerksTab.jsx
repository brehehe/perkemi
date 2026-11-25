import React, { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Button, Input, Combobox, Modal } from '@/Components/UI';

export default function ClerksTab({
    event,
    clerks = [],
    eventClerks = [],
}) {
    const [isNewClerkModalOpen, setIsNewClerkModalOpen] = useState(false);

    const clerkRoleOptions = [
        { value: 'operator', label: 'Operator Meja Pertandingan' },
        { value: 'scorekeeper', label: 'Pencatat Nilai' },
        { value: 'timekeeper', label: 'Pencatat Waktu' },
        { value: 'announcer', label: 'Announcer' },
        { value: 'admin_desk', label: 'Petugas Administrasi Meja' },
    ];

    const clerkOptions = clerks.map((clerk) => ({
        value: clerk.id,
        label: clerk.name,
        sublabel: [clerk.certification, clerk.region, clerk.employee_number].filter(Boolean).join(' · '),
    }));

    const clerkAssignmentForm = useForm({ clerk_id: '', role: 'operator' });
    const newClerkForm = useForm({
        create_new: true,
        name: '',
        employee_number: '',
        certification: '',
        region: '',
        phone: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'operator',
    });

    const submitClerkAssignment = (e) => {
        e.preventDefault();
        clerkAssignmentForm.post(`/admin/master/event/${event.id}/clerk`, {
            preserveScroll: true,
            onSuccess: () => clerkAssignmentForm.setData({ clerk_id: '', role: 'operator' }),
        });
    };

    const submitNewClerk = (e) => {
        e.preventDefault();
        newClerkForm.post(`/admin/master/event/${event.id}/clerk`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsNewClerkModalOpen(false);
                newClerkForm.reset();
            },
        });
    };

    const removeEventClerk = (clerk) => {
        router.delete(`/admin/master/event/${event.id}/clerk/${clerk.id}`, { preserveScroll: true });
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-[#ede9e1] bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 border-b border-[#ede9e1] p-5 md:flex-row md:items-center md:justify-between dark:border-slate-800">
                <div>
                    <h3 className="text-base font-bold text-[#0f0d0b] dark:text-white">Penugasan Panitera</h3>
                    <p className="mt-1 text-xs text-[#706860] dark:text-slate-400">Atur perangkat meja, pencatat nilai, waktu, dan operator event.</p>
                </div>
                <Button type="button" onClick={() => setIsNewClerkModalOpen(true)} className="bg-[#141210] text-amber-400 hover:bg-black">
                    <i className="fa-solid fa-user-plus mr-2" />
                    Tambah Panitera Baru
                </Button>
            </div>

            <div className="border-b border-[#ede9e1] bg-[#fcfbf9] p-5 dark:border-slate-800 dark:bg-slate-950/40">
                <form onSubmit={submitClerkAssignment} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
                    <Combobox
                        label="Pilih dari Master Data Panitera"
                        value={clerkAssignmentForm.data.clerk_id}
                        onChange={(value) => clerkAssignmentForm.setData('clerk_id', value)}
                        options={clerkOptions}
                        placeholder="Cari panitera..."
                        searchPlaceholder="Cari panitera..."
                        error={clerkAssignmentForm.errors.clerk_id}
                    />
                    <Combobox
                        label="Peran di Event"
                        value={clerkAssignmentForm.data.role}
                        onChange={(value) => clerkAssignmentForm.setData('role', value)}
                        options={clerkRoleOptions}
                        clearable={false}
                        error={clerkAssignmentForm.errors.role}
                    />
                    <Button type="submit" loading={clerkAssignmentForm.processing} disabled={!clerkAssignmentForm.data.clerk_id}>
                        <i className="fa-solid fa-plus mr-2" />
                        Tugaskan
                    </Button>
                </form>
            </div>

            {eventClerks.length ? (
                <div className="divide-y divide-[#ede9e1] dark:divide-slate-800">
                    {eventClerks.map((clerk) => (
                        <div key={clerk.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 transition-colors hover:bg-zinc-50/70 dark:hover:bg-slate-800/40">
                            <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200/60 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-800/50 shadow-2xs mt-0.5 sm:mt-0">
                                    <i className="fa-solid fa-clipboard-list text-sm" />
                                </span>
                                <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white leading-tight">
                                            {clerk.name}
                                        </h4>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                                        {[clerk.certification, clerk.region].filter(Boolean).length > 0 && (
                                            <span>{[clerk.certification, clerk.region].filter(Boolean).join(' · ')}</span>
                                        )}
                                        {clerk.employee_number && (
                                            <span className="text-zinc-500 dark:text-zinc-500">ID: {clerk.employee_number}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 whitespace-nowrap shrink-0">
                                    {clerkRoleOptions.find((option) => option.value === clerk.role)?.label || clerk.role}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => removeEventClerk(clerk)}
                                        className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-2xs transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-red-950/40 dark:hover:text-red-400 cursor-pointer"
                                        title="Hapus panitera dari event"
                                        aria-label={`Hapus ${clerk.name} dari event`}
                                    >
                                        <i className="fa-solid fa-trash text-xs" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center">
                    <i className="fa-solid fa-clipboard-list text-3xl text-[#d8d0c7] dark:text-slate-600" />
                    <p className="mt-3 font-semibold text-[#141210] dark:text-white">Belum ada panitera yang ditugaskan</p>
                    <p className="mt-1 text-sm text-[#706860] dark:text-slate-400">Pilih dari master atau tambah panitera baru langsung dari event ini.</p>
                </div>
            )}

            {/* Modal Tambah Panitera Baru */}
            <Modal
                isOpen={isNewClerkModalOpen}
                onClose={() => setIsNewClerkModalOpen(false)}
                title="Tambah Panitera Baru ke Event"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsNewClerkModalOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={submitNewClerk} loading={newClerkForm.processing}>
                            Simpan & Tugaskan
                        </Button>
                    </>
                }
            >
                <form onSubmit={submitNewClerk} className="space-y-4">
                    <Input
                        label="Nama Panitera"
                        required
                        value={newClerkForm.data.name}
                        onChange={(e) => newClerkForm.setData('name', e.target.value)}
                        error={newClerkForm.errors.name}
                        placeholder="Contoh: Dewi Lestari"
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="ID Panitia / Nomor Pegawai"
                            value={newClerkForm.data.employee_number}
                            onChange={(e) => newClerkForm.setData('employee_number', e.target.value)}
                            error={newClerkForm.errors.employee_number}
                        />
                        <Combobox
                            label="Peran di Event"
                            value={newClerkForm.data.role}
                            onChange={(value) => newClerkForm.setData('role', value)}
                            options={clerkRoleOptions}
                            clearable={false}
                            error={newClerkForm.errors.role}
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Sertifikasi"
                            value={newClerkForm.data.certification}
                            onChange={(e) => newClerkForm.setData('certification', e.target.value)}
                            error={newClerkForm.errors.certification}
                        />
                        <Input
                            label="Wilayah / Pengda"
                            value={newClerkForm.data.region}
                            onChange={(e) => newClerkForm.setData('region', e.target.value)}
                            error={newClerkForm.errors.region}
                        />
                    </div>
                    <Input
                        label="Nomor Telepon"
                        value={newClerkForm.data.phone}
                        onChange={(e) => newClerkForm.setData('phone', e.target.value)}
                        error={newClerkForm.errors.phone}
                    />
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                        <strong>Akun login opsional.</strong> Isi email dan password agar Panitera dapat login ke event ini.
                    </div>
                    <Input
                        label="Email Login"
                        type="email"
                        value={newClerkForm.data.email}
                        onChange={(e) => newClerkForm.setData('email', e.target.value)}
                        error={newClerkForm.errors.email}
                        autoComplete="username"
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Password"
                            type="password"
                            value={newClerkForm.data.password}
                            onChange={(e) => newClerkForm.setData('password', e.target.value)}
                            error={newClerkForm.errors.password}
                            autoComplete="new-password"
                        />
                        <Input
                            label="Konfirmasi Password"
                            type="password"
                            value={newClerkForm.data.password_confirmation}
                            onChange={(e) => newClerkForm.setData('password_confirmation', e.target.value)}
                            autoComplete="new-password"
                        />
                    </div>
                </form>
            </Modal>
        </div>
    );
}
