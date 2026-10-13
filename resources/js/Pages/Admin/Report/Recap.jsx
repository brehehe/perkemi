import Button from "@/Components/UI/Elements/Button";
import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import Combobox from '@/Components/UI/Forms/Combobox';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

export default function ReportRecap({ activeEvent, events = [], recaps, filters }) {
    const [typeFilter, setTypeFilter] = useState(filters.type || 'all');

    const handleFilter = (type) => {
        setTypeFilter(type);
        router.get('/admin/laporan/rekap-embu', { event_id: activeEvent?.id, type }, { preserveState: true });
    };

    const handlePrint = () => {
        window.print();
    };

    const getRankBadge = (rank) => {
        const val = typeof rank === 'object' ? rank.value : rank;
        switch (Number(val)) {
            case 1:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap dark:border-amber-500/40 dark:bg-amber-400/15 dark:text-amber-200">
                        <i className="fa-solid fa-medal text-amber-600"></i> Medali Emas
                    </span>
                );
            case 2:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 whitespace-nowrap dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100">
                        <i className="fa-solid fa-medal text-slate-500"></i> Medali Perak
                    </span>
                );
            case 3:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-900/10 text-amber-950 border border-amber-800/30 whitespace-nowrap dark:border-orange-500/40 dark:bg-orange-400/15 dark:text-orange-200">
                        <i className="fa-solid fa-medal text-amber-800"></i> Medali Perunggu
                    </span>
                );
            default:
                return (
                    <span className="text-[11px] text-[#7a746e] whitespace-nowrap dark:text-slate-300">
                        Peringkat {val}
                    </span>
                );
        }
    };

    return (
        <AdminLayout title="Rekapitulasi Pertandingan">
            <Head title="Rekapitulasi Pertandingan | Smart Perkemi" />

            <div className="space-y-6">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-[#0f0d0b] via-[#1a1714] to-[#0f0d0b] text-[#f7f4ef] rounded-2xl p-6 border border-white/10 shadow-xl relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-[radial-gradient(circle,rgba(212,168,67,0.25)_0%,transparent_70%)] pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs text-[#d4a843] font-medium tracking-wide uppercase mb-1">
                                <i className="fa-solid fa-chart-bar"></i>
                                <span>Rekap Nilai & Hasil Partai</span>
                            </div>
                            <h1 className="font-cinzel text-xl md:text-2xl font-bold tracking-tight text-white">
                                Rekapitulasi Embu & Randori
                            </h1>
                            <p className="text-xs text-[#b5afa6] mt-1 max-w-2xl">
                                Arsip digital seluruh rekaman nilai partai pertandingan Embu berpasangan/beregu dan hasil partai tanding Randori kejuaraan.
                            </p>
                        </div>

                        <div className="flex w-full flex-col gap-2 md:max-w-md">
                            <Combobox
                                ariaLabel="Pilih event rekap pertandingan"
                                options={events.map((event) => ({ value: event.id, label: event.name, sublabel: event.city }))}
                                value={activeEvent?.id || ''}
                                onChange={(eventId) => router.get('/admin/laporan/rekap-embu', { event_id: eventId, type: typeFilter })}
                                clearable={false}
                            />
                            <Button variant="unstyled" size="none"
                                type="button"
                                onClick={handlePrint}
                                className="min-h-11 justify-center px-4 py-2 text-xs font-semibold bg-[#d4a843] hover:bg-[#b88f34] text-[#0f0d0b] rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-md"
                            >
                                <i className="fa-solid fa-print"></i>
                                <span>Cetak Berita Acara</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Table Rekap */}
                <div className="bg-white rounded-xl border border-[#ede9e1] shadow-xs overflow-hidden dark:border-slate-700 dark:bg-[#171a20]">
                    <TableContainer className="custom-scrollbar" ariaLabel="Tabel data">
                        <table className="responsive-data-table whitespace-nowrap w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#ede9e1] bg-[#fbfaf8] text-[11px] font-semibold text-[#7a746e] uppercase tracking-wider dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                                    <th className="py-3 px-4 whitespace-nowrap">Nomor Pertandingan</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Nama Atlet / Pasangan</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Kontingen / Dojo</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Tingkatan Dan/Kyu</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Hasil Akhir</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-right">Tanggal Laga</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ede9e1] text-xs text-[#0f0d0b] dark:divide-slate-700 dark:text-slate-200">
                                {recaps.data && recaps.data.length > 0 ? (
                                    recaps.data.map((res) => (
                                        <tr key={res.id} className="hover:bg-[#f7f4ef]/50 transition-colors dark:bg-[#171a20] dark:hover:bg-[#272d36]">
                                            <td className="py-3.5 px-4 whitespace-nowrap font-medium text-[#0f0d0b] dark:text-slate-100">
                                                {res.match_category || 'Randori Perorangan'}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-[#0f0d0b] dark:text-slate-100">
                                                {res.athlete?.name || 'Kenshi Perkemi'}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap text-[#7a746e] dark:text-slate-300">
                                                {res.contingent?.name || res.contingent_name || '-'}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#f7f4ef] border border-[#ede9e1] text-[#0f0d0b] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                                                    {res.athlete?.kyu_dan || 'Kyu 1'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                {getRankBadge(res.rank)}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap text-right font-mono text-[#7a746e] dark:text-slate-300">
                                                {res.created_at ? new Date(res.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="py-12 text-center text-[#7a746e] dark:text-slate-300">
                                            Belum ada arsip hasil pertandingan.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table></TableContainer>
                </div>
            </div>
        </AdminLayout>
    );
}
