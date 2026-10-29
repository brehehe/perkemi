import React from 'react';
import { Head, Link } from '@inertiajs/react';

export default function WeighInReport({
    event,
    category = null,
    entries = [],
    stats = {},
    printed_at = '',
    printed_by = '',
}) {
    return (
        <div className="min-h-screen bg-slate-100 p-4 sm:p-8 print:bg-white print:p-0">
            <Head title={`Berita Acara Penimbangan Badan · ${event?.name || 'PERKEMI'}`} />

            {/* Action Bar (Screen only) */}
            <div className="mx-auto max-w-4xl mb-6 flex items-center justify-between print:hidden">
                <Link
                    href={`/admin/pertandingan/timbang-badan${category ? `?category_id=${category.id}` : ''}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition-all"
                >
                    <i className="fa-solid fa-arrow-left" />
                    <span>Kembali ke Stasiun Penimbangan</span>
                </Link>

                <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#c0392b] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#a93226] transition-all"
                >
                    <i className="fa-solid fa-print text-sm" />
                    <span>Cetak Dokumen / Simpan PDF</span>
                </button>
            </div>

            {/* Document Sheet */}
            <div className="mx-auto max-w-4xl bg-white p-8 sm:p-12 shadow-md print:shadow-none print:p-6 text-slate-900 border border-slate-200 print:border-none font-serif">
                {/* Official Header / Kop */}
                <div className="border-b-2 border-slate-900 pb-4 text-center">
                    <p className="text-sm font-bold tracking-widest uppercase font-sans text-slate-600">
                        PERSAUDARAAN BELADIRI KEMPO INDONESIA (PERKEMI)
                    </p>
                    <h1 className="mt-1 text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950 font-sans">
                        BERITA ACARA RESMI PENIMBANGAN BADAN ATLET RANDORI
                    </h1>
                    <p className="mt-1 text-sm font-bold uppercase tracking-wide text-[#c0392b] font-sans">
                        {event?.name} {event?.city ? `— ${event.city}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 font-sans">
                        Periode: {event?.date_label || '-'}
                    </p>
                </div>

                {/* Subheader Details */}
                <div className="mt-6 grid grid-cols-2 gap-4 text-xs font-sans border-b border-slate-200 pb-4">
                    <div>
                        <p><span className="font-bold text-slate-700">Nomor Tanding:</span> {category?.name || 'Semua Kelas Berat Randori'}</p>
                        {category && (
                            <p className="mt-1">
                                <span className="font-bold text-slate-700">Rentang Kelas Berat:</span>{' '}
                                <span className="font-mono font-bold">
                                    {category.min_weight ? `${category.min_weight} kg` : '0 kg'} s/d {category.max_weight ? `${category.max_weight} kg` : 'Bebas'}
                                </span>
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        <p><span className="font-bold text-slate-700">Waktu Cetak:</span> {printed_at}</p>
                        <p className="mt-1"><span className="font-bold text-slate-700">Dicetak Oleh:</span> {printed_by}</p>
                    </div>
                </div>

                {/* Summary Box */}
                <div className="mt-4 rounded-lg bg-slate-50 p-3.5 border border-slate-200 text-xs font-sans">
                    <p className="font-bold uppercase tracking-wide text-slate-800 text-[11px] mb-2">
                        Rekapitulasi Hasil Penimbangan
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                        <div className="p-2 bg-white rounded border border-slate-200">
                            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total Atlet</span>
                            <span className="text-base font-black text-slate-800">{stats.total || 0}</span>
                        </div>
                        <div className="p-2 bg-white rounded border border-slate-200">
                            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Sudah Ditimbang</span>
                            <span className="text-base font-black text-blue-700">{stats.weighed || 0}</span>
                        </div>
                        <div className="p-2 bg-white rounded border border-slate-200">
                            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Sah / Lolos</span>
                            <span className="text-base font-black text-emerald-700">{stats.passed || 0}</span>
                        </div>
                        <div className="p-2 bg-white rounded border border-slate-200">
                            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Overweight</span>
                            <span className="text-base font-black text-red-700">{stats.overweight || 0}</span>
                        </div>
                        <div className="p-2 bg-white rounded border border-slate-200">
                            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Underweight</span>
                            <span className="text-base font-black text-amber-700">{stats.underweight || 0}</span>
                        </div>
                        <div className="p-2 bg-white rounded border border-slate-200">
                            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Belum Timbang</span>
                            <span className="text-base font-black text-slate-600">{stats.pending || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Table Data */}
                <div className="mt-6">
                    <table className="w-full border-collapse border border-slate-300 text-xs font-sans">
                        <thead>
                            <tr className="bg-slate-100 text-[10px] uppercase font-bold tracking-wider text-slate-700 text-center">
                                <th className="border border-slate-300 px-2 py-2 w-10">No</th>
                                <th className="border border-slate-300 px-3 py-2 text-left">Nama Kenshi</th>
                                <th className="border border-slate-300 px-3 py-2 text-left">Kontingen</th>
                                <th className="border border-slate-300 px-2 py-2 w-20">Tingkat</th>
                                <th className="border border-slate-300 px-2 py-2 text-left">Kelas Tanding</th>
                                <th className="border border-slate-300 px-2 py-2 w-20 text-center">Batas (kg)</th>
                                <th className="border border-slate-300 px-2 py-2 w-20 text-center">Aktual (kg)</th>
                                <th className="border border-slate-300 px-3 py-2 w-28 text-center">Hasil</th>
                                <th className="border border-slate-300 px-3 py-2 text-left">Catatan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {entries.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="border border-slate-300 px-4 py-8 text-center text-slate-500 italic">
                                        Tidak ada data kenshi randori.
                                    </td>
                                </tr>
                            ) : (
                                entries.map((entry, index) => (
                                    <tr key={entry.id} className="text-slate-800">
                                        <td className="border border-slate-300 px-2 py-1.5 text-center font-medium">
                                            {index + 1}
                                        </td>
                                        <td className="border border-slate-300 px-3 py-1.5 font-bold">
                                            {entry.name}
                                        </td>
                                        <td className="border border-slate-300 px-3 py-1.5">
                                            {entry.contingent_name}
                                        </td>
                                        <td className="border border-slate-300 px-2 py-1.5 text-center">
                                            {entry.kyu_dan}
                                        </td>
                                        <td className="border border-slate-300 px-2 py-1.5 text-slate-600">
                                            {entry.category_name}
                                        </td>
                                        <td className="border border-slate-300 px-2 py-1.5 text-center font-mono">
                                            {entry.min_weight ? `${entry.min_weight}` : '0'}-{entry.max_weight ? `${entry.max_weight}` : '∞'}
                                        </td>
                                        <td className="border border-slate-300 px-2 py-1.5 text-center font-mono font-bold">
                                            {entry.actual_weight !== null ? `${Number(entry.actual_weight).toFixed(2)}` : '-'}
                                        </td>
                                        <td className="border border-slate-300 px-3 py-1.5 text-center font-bold">
                                            {entry.weigh_in_status === 'passed' && (
                                                <span className="text-emerald-700">SAH / LOLOS</span>
                                            )}
                                            {entry.weigh_in_status === 'overweight' && (
                                                <span className="text-red-700">OVERWEIGHT</span>
                                            )}
                                            {entry.weigh_in_status === 'underweight' && (
                                                <span className="text-amber-700">UNDERWEIGHT</span>
                                            )}
                                            {(!entry.weigh_in_status || entry.weigh_in_status === 'pending') && (
                                                <span className="text-slate-400">BELUM TIMBANG</span>
                                            )}
                                        </td>
                                        <td className="border border-slate-300 px-3 py-1.5 text-[11px] text-slate-600">
                                            {entry.weigh_in_notes || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Signatures Block */}
                <div className="mt-12 pt-4 font-sans text-xs break-inside-avoid">
                    <p className="text-right text-slate-600 mb-8">
                        {event?.city || 'Tempat Pertandingan'}, {printed_at.split(' ')[0] || 'Hari-H'}
                    </p>

                    <div className="grid grid-cols-3 gap-6 text-center">
                        <div>
                            <p className="font-bold text-slate-800">Wasit Timbang / Petugas</p>
                            <div className="h-20" />
                            <p className="font-bold underline text-slate-900">( ............................................ )</p>
                            <p className="text-[11px] text-slate-500">Petugas Penimbangan Hari-H</p>
                        </div>

                        <div>
                            <p className="font-bold text-slate-800">Ketua Dewan Wasit</p>
                            <div className="h-20" />
                            <p className="font-bold underline text-slate-900">( ............................................ )</p>
                            <p className="text-[11px] text-slate-500">Dewan Wasit Pertandingan</p>
                        </div>

                        <div>
                            <p className="font-bold text-slate-800">Delegasi Teknis (TD)</p>
                            <div className="h-20" />
                            <p className="font-bold underline text-slate-900">( ............................................ )</p>
                            <p className="text-[11px] text-slate-500">Pengurus Besar PERKEMI</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
