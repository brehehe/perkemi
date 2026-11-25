import React, { useState, useMemo } from 'react';
import { Button } from '@/Components/UI';

export default function OfficialsRosterTab({
    event,
    arbitrationSummary = {},
    arbitrationPersonnel = [],
    arbitrationRoleUsers = [],
    eventReferees = [],
    eventArbitrators = [],
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [presenceFilter, setPresenceFilter] = useState('all');

    // Quick links to arbitration workflow modules
    const quickLinks = [
        {
            title: 'Monitoring Live Court & Scoring',
            desc: 'Pantau live status arena, verifikasi skor partai panitera, dan status tanda tangan wasit.',
            href: `/admin/arbitrase/scoring?event_id=${event.id}`,
            icon: 'fa-desktop',
            color: 'from-amber-500/20 to-orange-500/20 text-amber-500',
        },
        {
            title: 'Evaluasi Wasit Anti-Bias & Peringkat',
            desc: 'Analisis deviasi skor, indeks bias kontingen asal wasit, dan standar deviasi penilaian juri.',
            href: `/admin/arbitrase/evaluasi?event_id=${event.id}`,
            icon: 'fa-chart-line',
            color: 'from-indigo-500/20 to-purple-500/20 text-indigo-500',
        },
        {
            title: 'Penugasan & Rotasi Tatami',
            desc: 'Pengaturan komposisi wasit tengah, dewan hakim, juri 1-5, dan rotasi otomatis per arena.',
            href: `/admin/arbitrase/referees?event_id=${event.id}`,
            icon: 'fa-user-shield',
            color: 'from-blue-500/20 to-cyan-500/20 text-blue-500',
        },
        {
            title: 'Pusat Laporan & Hasil Kejuaraan',
            desc: 'Buka modul laporan resmi, rekapitulasi per nomor, klasemen medali kontingen, dan generator PDF.',
            href: `/admin/laporan?event_id=${event.id}`,
            icon: 'fa-file-invoice',
            color: 'from-emerald-500/20 to-teal-500/20 text-emerald-500',
        },
    ];

    // Compute counts for the full roster view
    const countTotal = arbitrationPersonnel.length;
    const countPresent = useMemo(
        () => arbitrationPersonnel.filter((p) => p.is_present).length,
        [arbitrationPersonnel]
    );
    const countAbsent = countTotal - countPresent;

    // Filtered personnel list for diagnostic/roster view
    const filteredPersonnel = useMemo(() => {
        return arbitrationPersonnel.filter((person) => {
            if (selectedCategory !== 'all') {
                if (selectedCategory === 'arbitrase_role') {
                    if (person.category !== 'arbitrase_role' && !person.is_role_arbitrase) return false;
                } else if (selectedCategory === 'wasit') {
                    if (person.category !== 'wasit') return false;
                } else if (selectedCategory === 'panitera') {
                    if (person.category !== 'panitera') return false;
                } else if (selectedCategory === 'dewan') {
                    if (person.category !== 'dewan' && person.category !== 'field_coordinator') return false;
                } else if (person.category !== selectedCategory) {
                    return false;
                }
            }

            if (presenceFilter === 'present' && !person.is_present) return false;
            if (presenceFilter === 'absent' && person.is_present) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (
                    person.name?.toLowerCase().includes(q) ||
                    person.role_title?.toLowerCase().includes(q) ||
                    person.dan_grade?.toLowerCase().includes(q) ||
                    person.region?.toLowerCase().includes(q) ||
                    person.license_number?.toLowerCase().includes(q) ||
                    person.email?.toLowerCase().includes(q)
                );
            }

            return true;
        });
    }, [arbitrationPersonnel, selectedCategory, presenceFilter, searchQuery]);

    const countArbitrators = useMemo(
        () => arbitrationPersonnel.filter((p) => p.category === 'arbitrase_role' || p.is_role_arbitrase).length,
        [arbitrationPersonnel]
    );
    const countReferees = useMemo(
        () => arbitrationPersonnel.filter((p) => p.category === 'wasit').length,
        [arbitrationPersonnel]
    );
    const countClerks = useMemo(
        () => arbitrationPersonnel.filter((p) => p.category === 'panitera').length,
        [arbitrationPersonnel]
    );
    const countCoordinators = useMemo(
        () => arbitrationPersonnel.filter((p) => p.category === 'dewan' || p.category === 'field_coordinator').length,
        [arbitrationPersonnel]
    );

    return (
        <div className="space-y-6">
            {/* ══════════════════════════════════════════════════════════════════
                MODUL PELAKSANAAN & OPERASIONAL (QUICK ACTION CARDS)
            ══════════════════════════════════════════════════════════════════ */}
            <div>
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Modul Pelaksanaan Arbitrase & Operasional
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Pusat kendali operasional, evaluasi wasit, rotasi tatami, dan laporan kejuaraan.
                        </p>
                    </div>
                    <a
                        href={`/admin/master/event/arbitration/export?event_id=${event.id}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 shadow-2xs transition-colors dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                        <i className="fa-solid fa-file-excel text-emerald-600" />
                        <span>Ekspor Excel Roster & Presensi</span>
                    </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickLinks.map((link, idx) => (
                        <a
                            key={idx}
                            href={link.href}
                            className="group relative flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-[#c0392b]/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${link.color} text-lg`}
                                    >
                                        <i className={`fa-solid ${link.icon}`} />
                                    </span>
                                    <i className="fa-solid fa-arrow-up-right-from-square text-xs text-zinc-400 group-hover:text-[#c0392b] transition-colors" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-zinc-900 group-hover:text-[#c0392b] dark:text-zinc-100 dark:group-hover:text-amber-400 transition-colors">
                                        {link.title}
                                    </h4>
                                    <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                        {link.desc}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-bold text-[#c0392b] group-hover:translate-x-0.5 transition-transform dark:text-amber-400">
                                <span>Buka Modul</span>
                                <i className="fa-solid fa-chevron-right text-[10px]" />
                            </div>
                        </a>
                    ))}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                ROSTER KORPS LENGKAP & STATUS PRESENSI
            ══════════════════════════════════════════════════════════════════ */}
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 overflow-hidden">
                <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/80">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                                <i className="fa-solid fa-clipboard-user text-base" />
                            </span>
                            <div>
                                <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                                    Rekapitulasi Roster Gabungan & Presensi Petugas ({countTotal} Personil)
                                </h4>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Daftar lengkap presensi dan status penugasan personil Dewan Arbitrase, Wasit & Juri, Panitera Meja, dan Koordinator Lapangan.
                                </p>
                            </div>
                        </div>

                        {/* Presence Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
                                <i className="fa-solid fa-circle-check text-emerald-500" />
                                <span>{countPresent} Hadir / Bertugas</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
                                <i className="fa-solid fa-clock text-amber-500" />
                                <span>{countAbsent} Belum Konfirmasi</span>
                            </span>
                        </div>
                    </div>

                    {/* Filter and search bar */}
                    <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
                        {/* Category filter pills */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {[
                                { id: 'all', label: 'Semua', count: countTotal },
                                { id: 'arbitrase_role', label: 'Dewan Arbitrase', count: countArbitrators },
                                { id: 'wasit', label: 'Wasit & Juri', count: countReferees },
                                { id: 'panitera', label: 'Panitera', count: countClerks },
                                { id: 'dewan', label: 'Korlap & Hakim', count: countCoordinators },
                            ].map((btn) => (
                                <button
                                    key={btn.id}
                                    type="button"
                                    onClick={() => setSelectedCategory(btn.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        selectedCategory === btn.id
                                            ? 'bg-zinc-900 text-white shadow-2xs dark:bg-white dark:text-zinc-900'
                                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                                    }`}
                                >
                                    {btn.label} ({btn.count})
                                </button>
                            ))}
                        </div>

                        {/* Search input and status filter */}
                        <div className="flex items-center gap-2">
                            <select
                                value={presenceFilter}
                                onChange={(e) => setPresenceFilter(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-xl border border-zinc-300 bg-white text-zinc-700 focus:border-[#c0392b] focus:ring-1 focus:ring-[#c0392b] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                            >
                                <option value="all">Semua Presensi</option>
                                <option value="present">Sudah Hadir</option>
                                <option value="absent">Belum Hadir</option>
                            </select>

                            <div className="relative w-full md:w-64">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
                                    <i className="fa-solid fa-magnifying-glass text-xs" />
                                </span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari nama, daerah, lisensi..."
                                    className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-zinc-300 bg-zinc-50/50 focus:bg-white focus:border-[#c0392b] focus:ring-1 focus:ring-[#c0392b] dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Roster table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                                <th className="py-3 px-4 w-12 text-center">No</th>
                                <th className="py-3 px-4">Nama Petugas</th>
                                <th className="py-3 px-4">Peran / Kategori</th>
                                <th className="py-3 px-4 text-center">Tingkat Dan</th>
                                <th className="py-3 px-4">Daerah / Asal</th>
                                <th className="py-3 px-4">No. Lisensi</th>
                                <th className="py-3 px-4 text-center">Status Presensi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                            {filteredPersonnel.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-zinc-400 dark:text-zinc-500">
                                        <i className="fa-solid fa-user-slash text-2xl mb-2 opacity-50 block" />
                                        <span>Tidak ada personil yang cocok dengan kriteria filter.</span>
                                    </td>
                                </tr>
                            ) : (
                                filteredPersonnel.map((person, idx) => (
                                    <tr key={person.id || idx} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                                        <td className="py-3 px-4 text-center font-mono text-zinc-400">{idx + 1}</td>
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-zinc-900 dark:text-zinc-100">
                                                {person.name}
                                            </div>
                                            {person.email && person.email !== '-' && (
                                                <div className="text-[11px] text-zinc-400 truncate max-w-xs">
                                                    {person.email}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                                {person.role_title}
                                            </span>
                                            {person.category_label && (
                                                <div className="text-[10px] text-zinc-400">
                                                    {person.category_label}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                                            {person.dan_grade || '—'}
                                        </td>
                                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{person.region || '—'}</td>
                                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                            {person.license_number || '—'}
                                        </td>
                                        <td className="py-3 px-4 text-center whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${
                                                    person.is_present
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                                }`}
                                            >
                                                <i className={`fa-solid ${person.is_present ? 'fa-circle-check' : 'fa-clock'}`} />
                                                {person.attendance_status || (person.is_present ? 'Bertugas' : 'Belum Hadir')}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
