import Button from "@/Components/UI/Elements/Button";
import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import Combobox from '@/Components/UI/Forms/Combobox';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';

export default function ReportMedals({ activeEvent, events = [], medalStats, standings }) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <AdminLayout title="Hasil Juara & Perolehan Medali">
            <Head title="Klasemen Medali | Smart Perkemi" />

            <div className="space-y-6">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-[#0f0d0b] via-[#1a1714] to-[#0f0d0b] text-[#f7f4ef] rounded-2xl p-6 border border-white/10 shadow-xl relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-[radial-gradient(circle,rgba(212,168,67,0.25)_0%,transparent_70%)] pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs text-[#d4a843] font-medium tracking-wide uppercase mb-1">
                                <i className="fa-solid fa-medal"></i>
                                <span>Laporan Resmi Hasil Kejuaraan</span>
                            </div>
                            <h1 className="font-cinzel text-xl md:text-2xl font-bold tracking-tight text-white">
                                Klasemen Perolehan Medali & Juara Umum
                            </h1>
                            <p className="text-xs text-[#b5afa6] mt-1 max-w-2xl">
                                Rekapitulasi perolehan medali emas, perak, perunggu, dan akumulasi poin penentuan Kontingen Juara Umum Kejuaraan Shorinji Kempo.
                            </p>
                        </div>

                        <div className="flex w-full flex-col gap-2 md:max-w-md">
                            <Combobox
                                ariaLabel="Pilih event hasil juara"
                                options={events.map((event) => ({ value: event.id, label: event.name, sublabel: event.city }))}
                                value={activeEvent?.id || ''}
                                onChange={(eventId) => router.get('/admin/laporan/hasil', { event_id: eventId })}
                                clearable={false}
                            />
                            <Button variant="unstyled" size="none"
                                type="button"
                                onClick={handlePrint}
                                className="min-h-11 justify-center px-4 py-2 text-xs font-semibold bg-[#d4a843] hover:bg-[#b88f34] text-[#0f0d0b] rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-md"
                            >
                                <i className="fa-solid fa-print"></i>
                                <span>Cetak Laporan Klasemen</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 3 Medals Summary Banner */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-[#ede9e1] shadow-xs flex items-center gap-4 dark:border-slate-700 dark:bg-[#171a20]">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl flex-shrink-0 dark:bg-amber-400/15 dark:text-amber-300">
                            <i className="fa-solid fa-medal"></i>
                        </div>
                        <div>
                            <span className="text-[11px] font-medium text-[#7a746e] dark:text-slate-300">Total Medali Emas</span>
                            <p className="text-2xl font-bold text-[#0f0d0b] font-cinzel dark:text-white">{medalStats.gold || 0}</p>
                            <span className="text-[10px] text-amber-700 dark:text-amber-300">Juara I (5 Poin)</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-[#ede9e1] shadow-xs flex items-center gap-4 dark:border-slate-700 dark:bg-[#171a20]">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-xl flex-shrink-0 dark:bg-slate-700 dark:text-slate-200">
                            <i className="fa-solid fa-medal"></i>
                        </div>
                        <div>
                            <span className="text-[11px] font-medium text-[#7a746e] dark:text-slate-300">Total Medali Perak</span>
                            <p className="text-2xl font-bold text-[#0f0d0b] font-cinzel dark:text-white">{medalStats.silver || 0}</p>
                            <span className="text-[10px] text-slate-600 dark:text-slate-300">Juara II (3 Poin)</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-[#ede9e1] shadow-xs flex items-center gap-4 dark:border-slate-700 dark:bg-[#171a20]">
                        <div className="w-12 h-12 rounded-xl bg-amber-900/10 text-amber-800 flex items-center justify-center text-xl flex-shrink-0 dark:bg-orange-400/15 dark:text-orange-300">
                            <i className="fa-solid fa-medal"></i>
                        </div>
                        <div>
                            <span className="text-[11px] font-medium text-[#7a746e] dark:text-slate-300">Total Medali Perunggu</span>
                            <p className="text-2xl font-bold text-[#0f0d0b] font-cinzel dark:text-white">{medalStats.bronze || 0}</p>
                            <span className="text-[10px] text-amber-900 dark:text-orange-300">Juara III (1 Poin)</span>
                        </div>
                    </div>
                </div>

                {/* Klasemen Table */}
                <div className="bg-white rounded-xl border border-[#ede9e1] shadow-xs overflow-hidden dark:border-slate-700 dark:bg-[#171a20]">
                    <div className="p-4 border-b border-[#ede9e1] flex items-center justify-between dark:border-slate-700">
                        <h2 className="font-cinzel text-sm font-bold text-[#0f0d0b] flex items-center gap-2 dark:text-slate-100">
                            <i className="fa-solid fa-trophy text-[#d4a843]"></i>
                            <span>Tabel Klasemen Perolehan Medali Kontingen</span>
                        </h2>
                        <span className="text-xs text-[#7a746e] dark:text-slate-300">
                            Prioritas: Emas &gt; Perak &gt; Perunggu &gt; Total Skor
                        </span>
                    </div>

                    <TableContainer className="custom-scrollbar" ariaLabel="Tabel data">
                        <table className="responsive-data-table whitespace-nowrap w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#ede9e1] bg-[#fbfaf8] text-[11px] font-semibold text-[#7a746e] uppercase tracking-wider dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                                    <th className="py-3 px-4 whitespace-nowrap text-center w-16">Peringkat</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Nama Kontingen / Dojo</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-center">Emas (1st)</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-center">Perak (2nd)</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-center">Perunggu (3rd)</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-center">Total Medali</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-right">Poin Akumulasi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ede9e1] text-xs text-[#0f0d0b] dark:divide-slate-700 dark:text-slate-200">
                                {standings && standings.length > 0 ? (
                                    standings.map((con, index) => {
                                        const rank = index + 1;
                                        const isTop3 = rank <= 3;
                                        const totalMedals = con.gold_count + con.silver_count + con.bronze_count;
                                        const points = (con.gold_count * 5) + (con.silver_count * 3) + (con.bronze_count * 1);

                                        return (
                                            <tr key={con.id} className={`hover:bg-[#f7f4ef]/50 transition-colors dark:hover:bg-[#272d36] ${
                                                rank === 1 ? 'bg-amber-50/30 dark:bg-amber-400/5' : 'dark:bg-[#171a20]'
                                            }`}>
                                                <td className="py-3.5 px-4 whitespace-nowrap text-center">
                                                    {rank === 1 && (
                                                        <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-bold inline-flex items-center justify-center text-xs shadow-xs">
                                                            1
                                                        </span>
                                                    )}
                                                    {rank === 2 && (
                                                        <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-bold inline-flex items-center justify-center text-xs shadow-xs">
                                                            2
                                                        </span>
                                                    )}
                                                    {rank === 3 && (
                                                        <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-bold inline-flex items-center justify-center text-xs shadow-xs">
                                                            3
                                                        </span>
                                                    )}
                                                    {rank > 3 && (
                                                        <span className="font-mono text-[#7a746e] dark:text-slate-300">{rank}</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap font-medium text-[#0f0d0b] dark:text-slate-100">
                                                    <div className="flex items-center gap-2">
                                                        <span>{con.name}</span>
                                                        {rank === 1 && (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:border-amber-500/40 dark:bg-amber-400/15 dark:text-amber-200">
                                                                Juara Umum 1
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap text-center font-bold text-amber-600 dark:text-amber-300">
                                                    {con.gold_count}
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap text-center font-bold text-slate-600 dark:text-slate-300">
                                                    {con.silver_count}
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap text-center font-bold text-amber-800 dark:text-orange-300">
                                                    {con.bronze_count}
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap text-center font-semibold text-[#0f0d0b] dark:text-slate-100">
                                                    {totalMedals}
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap text-right font-mono font-bold text-[#0f0d0b] dark:text-slate-100">
                                                    {points} Pts
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="py-12 text-center text-[#7a746e] dark:text-slate-300">
                                            Belum ada perolehan medali yang dicatat.
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
