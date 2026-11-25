import React from 'react';
import { useForm } from '@inertiajs/react';
import { Button, Input } from '@/Components/UI';

export default function DatesTab({ event }) {
    const datesForm = useForm({
        start_date: event.start_date || '',
        end_date: event.end_date || '',
        registration_start: event.registration_start || '',
        registration_end: event.registration_end || '',
    });

    const submitDates = (e) => {
        e.preventDefault();
        datesForm.put(`/admin/master/event/${event.id}/dates`, {
            preserveScroll: true,
        });
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#ede9e1] dark:border-slate-800 shadow-xs overflow-hidden">
            <form onSubmit={submitDates}>
                <div className="p-5 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#ede9e1] dark:border-slate-800">
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="font-sans text-base md:text-lg font-bold text-[#0f0d0b] dark:text-white tracking-tight">
                                Jadwal Tanggal Acara & Pendaftaran
                            </h3>
                        </div>
                        <p className="text-xs text-[#b5afa6] dark:text-slate-400 mt-1">
                            Atur periode pelaksanaan kejuaraan dan tenggat waktu pendaftaran atlet oleh kontingen
                        </p>
                    </div>
                    <Button
                        variant="unstyled"
                        size="none"
                        type="submit"
                        disabled={datesForm.processing}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#c0392b] to-[#96281b] hover:from-[#a93226] hover:to-[#7b1f14] shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
                    >
                        <i className="fa-solid fa-check text-xs"></i>
                        <span>Simpan Jadwal Acara</span>
                    </Button>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Jadwal Pertandingan */}
                        <div className="bg-[#fbf9f5] p-5 rounded-2xl border border-[#ede9e1] space-y-4 dark:border-slate-800 dark:bg-slate-950/40">
                            <h4 className="text-sm font-bold text-[#141210] flex items-center gap-2 dark:text-white">
                                <i className="fa-solid fa-trophy text-[#c0392b]"></i>
                                Jadwal Hari Pertandingan
                            </h4>
                            <Input
                                label="Tanggal Mulai Pertandingan"
                                type="date"
                                required
                                value={datesForm.data.start_date}
                                onChange={(e) => datesForm.setData('start_date', e.target.value)}
                                error={datesForm.errors.start_date}
                            />
                            <Input
                                label="Tanggal Selesai Pertandingan"
                                type="date"
                                required
                                value={datesForm.data.end_date}
                                onChange={(e) => datesForm.setData('end_date', e.target.value)}
                                error={datesForm.errors.end_date}
                            />
                        </div>

                        {/* Jadwal Registrasi */}
                        <div className="bg-[#fbf9f5] p-5 rounded-2xl border border-[#ede9e1] space-y-4 dark:border-slate-800 dark:bg-slate-950/40">
                            <h4 className="text-sm font-bold text-[#141210] flex items-center gap-2 dark:text-white">
                                <i className="fa-solid fa-user-plus text-emerald-600"></i>
                                Jadwal Pembukaan Pendaftaran
                            </h4>
                            <Input
                                label="Tanggal Buka Pendaftaran"
                                type="date"
                                value={datesForm.data.registration_start}
                                onChange={(e) => datesForm.setData('registration_start', e.target.value)}
                                error={datesForm.errors.registration_start}
                            />
                            <Input
                                label="Batas Akhir Pendaftaran (Deadline)"
                                type="date"
                                value={datesForm.data.registration_end}
                                onChange={(e) => datesForm.setData('registration_end', e.target.value)}
                                error={datesForm.errors.registration_end}
                            />
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
