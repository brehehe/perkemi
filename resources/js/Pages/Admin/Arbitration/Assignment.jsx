import AdminLayout from '@/Layouts/AdminLayout';
import Button from '@/Components/UI/Elements/Button';
import Input from '@/Components/UI/Forms/Input';
import Combobox from '@/Components/UI/Forms/Combobox';
import Modal from '@/Components/UI/Overlays/Modal';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function ArbitrationAssignment({ activeEvent, tatamis, canManageEventStaff, staffOptions }) {
    const [assignmentCourt, setAssignmentCourt] = useState(null);
    const form = useForm({ staff_type: 'referee', staff_id: '', role: 'judge' });
    const assignmentTypeLabels = {
        referee: 'Wasit / Juri',
        clerk: 'Panitera',
        field_coordinator: 'Koordinator Lapangan',
    };
    const openAssignment = (court) => {
        setAssignmentCourt(court);
        form.clearErrors();
        form.setData({ staff_type: 'referee', staff_id: '', role: 'judge' });
    };
    const submitAssignment = (event) => {
        event.preventDefault();
        if (!assignmentCourt) return;
        form.post(`/admin/arbitrase/penugasan/${assignmentCourt.id}/staff`, { onSuccess: () => setAssignmentCourt(null) });
    };
    const removeAssignment = (court, assignment) => {
        router.delete(`/admin/arbitrase/penugasan/${court.id}/staff/${assignment.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <AdminLayout title="Penugasan Wasit">
            <Head title="Penugasan Wasit | Smart Perkemi" />

            <div className="space-y-6">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-[#0f0d0b] via-[#1a1714] to-[#0f0d0b] text-[#f7f4ef] rounded-2xl p-6 border border-white/10 shadow-xl relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-[radial-gradient(circle,rgba(212,168,67,0.25)_0%,transparent_70%)] pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs text-[#d4a843] font-medium tracking-wide uppercase mb-1">
                                <i className="fa-solid fa-users-gear"></i>
                                <span>Manajemen Court & Arbitrase</span>
                            </div>
                            <h1 className="font-cinzel text-xl md:text-2xl font-bold tracking-tight text-white">
                                Penugasan Wasit Tatami
                            </h1>
                            <p className="text-xs text-[#b5afa6] mt-1 max-w-2xl">
                                Perangkat pertandingan untuk lapangan yang dikonfigurasi pada {activeEvent?.name || 'event aktif'}.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Event-level roster notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-950">
                    <i className="fa-solid fa-circle-info text-blue-600 text-sm mt-0.5"></i>
                    <div>
                        <p className="font-semibold">Perangkat event:</p>
                        <p className="text-[#7a746e] mt-0.5">
                            Wasit, panitera, dan koordinator lapangan ditentukan dari tab event. Penugasan spesifik per partai dapat dilakukan setelah jadwal pertandingan tersedia.
                        </p>
                    </div>
                </div>

                {/* Tatami Boards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {tatamis.length === 0 ? (
                        <div className="md:col-span-3 bg-white rounded-2xl border border-dashed border-[#d9d3c9] p-10 text-center text-sm text-[#7a746e]">
                            Belum ada lapangan yang dikonfigurasi untuk event ini.
                        </div>
                    ) : tatamis.map((tatami) => (
                        <div key={tatami.id} className="bg-white rounded-2xl border border-[#ede9e1] shadow-xs overflow-hidden flex flex-col">
                            {/* Tatami Top Bar */}
                            <div className="bg-[#0f0d0b] text-[#f7f4ef] p-4 flex items-center justify-between border-b border-white/10">
                                <div>
                                    <h3 className="font-cinzel font-bold text-sm text-[#f0c060]">{tatami.name}</h3>
                                    <p className="text-[10px] text-[#b5afa6] mt-0.5">{tatami.current_match}</p>
                                </div>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    tatami.status === 'Tidak aktif' ? 'bg-white/10 text-white/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                }`}>
                                    {tatami.status}
                                </span>
                            </div>

                            {/* Officials Roster */}
                            <div className="p-4 space-y-3 flex-1 text-xs">
                                <div className="p-3 bg-[#f7f4ef] rounded-xl border border-[#ede9e1]">
                                    <span className="text-[10px] uppercase font-bold text-[#d4a843] block mb-0.5 tracking-wider">
                                        Wasit Utama (Shushin):
                                    </span>
                                    <p className="font-semibold text-[#0f0d0b]">{tatami.chief_referee}</p>
                                </div>

                                <div className="p-3 bg-[#f7f4ef] rounded-xl border border-[#ede9e1] space-y-1.5">
                                    <span className="text-[10px] uppercase font-bold text-[#7a746e] block mb-1 tracking-wider">
                                        Dewan Juri (Fukushin):
                                    </span>
                                    {tatami.judges.length === 0 ? (
                                        <p className="text-[#7a746e]">Belum ditentukan</p>
                                    ) : tatami.judges.map((j) => (
                                        <p key={j} className="text-[#0f0d0b] flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#d4a843]"></span>
                                            <span>{j}</span>
                                        </p>
                                    ))}
                                </div>

                                <div className="p-3 bg-[#f7f4ef] rounded-xl border border-[#ede9e1]">
                                    <span className="text-[10px] uppercase font-bold text-[#7a746e] block mb-0.5 tracking-wider">
                                        Panitera / Operator Event:
                                    </span>
                                    {tatami.clerks.length === 0 ? (
                                        <p className="font-semibold text-[#7a746e]">Belum ditentukan</p>
                                    ) : tatami.clerks.map((clerk) => (
                                        <p key={clerk} className="font-semibold text-[#0f0d0b]">{clerk}</p>
                                    ))}
                                </div>

                                <div className="p-3 bg-[#f7f4ef] rounded-xl border border-[#ede9e1]">
                                    <span className="text-[10px] uppercase font-bold text-[#7a746e] block mb-0.5 tracking-wider">
                                        Koordinator Lapangan:
                                    </span>
                                    {tatami.field_coordinators.length === 0 ? (
                                        <p className="font-semibold text-[#7a746e]">Belum ditentukan</p>
                                    ) : tatami.field_coordinators.map((coordinator) => (
                                        <p key={coordinator} className="font-semibold text-[#0f0d0b]">{coordinator}</p>
                                    ))}
                                </div>

                                {canManageEventStaff && tatami.assignments.length > 0 && (
                                    <div className="rounded-xl border border-[#ede9e1] bg-white p-3">
                                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#7a746e]">
                                            Kelola penugasan tatami
                                        </span>
                                        <div className="space-y-1.5">
                                            {tatami.assignments.map((assignment) => (
                                                <div key={assignment.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#fbfaf8] px-2.5 py-2">
                                                    <p className="min-w-0 text-[11px] text-[#0f0d0b]">
                                                        <span className="font-semibold">{assignment.staff_name}</span>
                                                        <span className="text-[#7a746e]"> · {assignmentTypeLabels[assignment.staff_type]} / {assignment.role}</span>
                                                    </p>
                                                    <Button variant="unstyled" size="none"
                                                        type="button"
                                                        onClick={() => removeAssignment(tatami, assignment)}
                                                        className="shrink-0 rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50"
                                                        aria-label={`Hapus ${assignment.staff_name} dari ${tatami.name}`}
                                                        title="Hapus penugasan"
                                                    >
                                                        <i className="fa-solid fa-trash" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {canManageEventStaff && (
                                <div className="p-3 border-t border-[#ede9e1] bg-[#fbfaf8] flex items-center justify-between">
                                    <Button variant="unstyled" size="none"
                                        type="button"
                                        onClick={() => openAssignment(tatami)}
                                        className="w-full py-1.5 text-xs font-semibold bg-[#ede9e1] hover:bg-[#e2ddd3] text-[#0f0d0b] rounded-lg transition-colors cursor-pointer text-center"
                                    >
                                        <i className="fa-solid fa-plus mr-1.5"></i> Tugaskan Perangkat
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <Modal
                    isOpen={Boolean(assignmentCourt)}
                    onClose={() => !form.processing && setAssignmentCourt(null)}
                    title="Tugaskan Perangkat Lapangan"
                    subtitle={assignmentCourt?.name}
                    footer={<><Button variant="outline" onClick={() => setAssignmentCourt(null)}>Batal</Button><Button type="submit" form="court-assignment-form" loading={form.processing}>Simpan Penugasan</Button></>}
                >
                    <form id="court-assignment-form" onSubmit={submitAssignment} className="space-y-4">
                        <Combobox label="Jenis Perangkat" value={form.data.staff_type} onChange={(value) => { form.setData('staff_type', value); form.setData('staff_id', ''); }} options={[{ value: 'referee', label: 'Wasit / Juri' }, { value: 'clerk', label: 'Panitera' }, { value: 'field_coordinator', label: 'Koordinator Lapangan' }]} />
                        <Combobox label="Nama Perangkat" required value={form.data.staff_id} onChange={(value) => form.setData('staff_id', value)} error={form.errors.staff_id} options={(staffOptions?.[form.data.staff_type] || []).map((staff) => ({ value: staff.id, label: staff.name }))} placeholder="Pilih perangkat event" />
                        <Input label="Peran di Tatami" required value={form.data.role} onChange={(event) => form.setData('role', event.target.value)} error={form.errors.role} hint="Contoh: chief, judge, timekeeper, scorekeeper, koordinator." />
                    </form>
                </Modal>
            </div>
        </AdminLayout>
    );
}
