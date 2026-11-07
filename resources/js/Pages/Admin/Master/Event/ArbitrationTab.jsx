import React, { useState, useMemo } from 'react';

export default function ArbitrationTab({
    event,
    arbitrationSummary = {},
    arbitrationPersonnel = [],
    arbitrationRoleUsers = [],
    eventReferees = [],
}) {
    const exportUrl = `/admin/master/event/${event.id}/arbitration/export`;

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'arbitrase_role' | 'dewan' | 'wasit' | 'panitera'
    const [presenceFilter, setPresenceFilter] = useState('all'); // 'all' | 'present' | 'absent'

    // Compute counts
    const countTotal = arbitrationPersonnel.length;
    const countArbitraseRole = useMemo(
        () => arbitrationPersonnel.filter((p) => p.category === 'arbitrase_role' || p.is_role_arbitrase).length,
        [arbitrationPersonnel]
    );
    const countDewan = useMemo(
        () => arbitrationPersonnel.filter((p) => p.category === 'dewan').length,
        [arbitrationPersonnel]
    );
    const countWasit = useMemo(
        () => arbitrationPersonnel.filter((p) => p.category === 'wasit').length,
        [arbitrationPersonnel]
    );
    const countPanitera = useMemo(
        () => arbitrationPersonnel.filter((p) => p.category === 'panitera').length,
        [arbitrationPersonnel]
    );
    const countPresent = useMemo(
        () => arbitrationPersonnel.filter((p) => p.is_present).length,
        [arbitrationPersonnel]
    );
    const countAbsent = countTotal - countPresent;

    // Filtered personnel list
    const filteredPersonnel = useMemo(() => {
        return arbitrationPersonnel.filter((person) => {
            // Category filter
            if (selectedCategory !== 'all') {
                if (selectedCategory === 'arbitrase_role') {
                    if (person.category !== 'arbitrase_role' && !person.is_role_arbitrase) {
                        return false;
                    }
                } else if (person.category !== selectedCategory) {
                    return false;
                }
            }

            // Presence filter
            if (presenceFilter === 'present' && !person.is_present) {
                return false;
            }
            if (presenceFilter === 'absent' && person.is_present) {
                return false;
            }

            // Search query filter
            if (searchQuery.trim() !== '') {
                const q = searchQuery.toLowerCase();
                const matchName = person.name?.toLowerCase().includes(q);
                const matchRole = person.role_title?.toLowerCase().includes(q);
                const matchRegion = person.region?.toLowerCase().includes(q);
                const matchDan = person.dan_grade?.toLowerCase().includes(q);
                const matchLicense = person.license_number?.toLowerCase().includes(q);
                const matchCert = person.certification_level?.toLowerCase().includes(q);
                const matchEmail = person.email?.toLowerCase().includes(q);

                if (!matchName && !matchRole && !matchRegion && !matchDan && !matchLicense && !matchCert && !matchEmail) {
                    return false;
                }
            }

            return true;
        });
    }, [arbitrationPersonnel, selectedCategory, presenceFilter, searchQuery]);

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
            title: 'Evaluasi Wasit Anti-Bias',
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

    // Official Arbitrase Role Users
    const roleUsers = arbitrationRoleUsers.length > 0
        ? arbitrationRoleUsers
        : arbitrationPersonnel.filter((p) => p.category === 'arbitrase_role' || p.is_role_arbitrase);

    return (
        <div className="space-y-6">
            {/* ════ STATS SUMMARY CARDS ════ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                    <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Total Korps Arbitrase</p>
                    <p className="mt-1 text-2xl font-black text-zinc-900 dark:text-white">
                        {countTotal} <span className="text-xs font-normal text-zinc-500">Petugas</span>
                    </p>
                </div>
                <div className="rounded-xl border border-amber-300/80 bg-gradient-to-br from-amber-50 to-amber-100/40 p-4 shadow-sm dark:border-amber-600/40 dark:from-amber-950/40 dark:to-zinc-900">
                    <p className="text-[11px] font-bold text-amber-800 dark:text-amber-400">
                        <i className="fa-solid fa-gavel mr-1" /> Role Arbitrase
                    </p>
                    <p className="mt-1 text-2xl font-black text-amber-900 dark:text-amber-200">
                        {countArbitraseRole} <span className="text-xs font-normal text-amber-700 dark:text-amber-300">User</span>
                    </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                    <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Dewan Hakim & Korlap</p>
                    <p className="mt-1 text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        {countDewan} <span className="text-xs font-normal text-zinc-500">Personil</span>
                    </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                    <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Wasit & Juri</p>
                    <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">
                        {countWasit} <span className="text-xs font-normal text-zinc-500">Wasit</span>
                    </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                    <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Panitera Meja</p>
                    <p className="mt-1 text-2xl font-black text-cyan-600 dark:text-cyan-400">
                        {countPanitera} <span className="text-xs font-normal text-zinc-500">Petugas</span>
                    </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                    <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Status Kehadiran</p>
                    <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {countPresent} <span className="text-xs font-normal text-zinc-500">Hadir Presensi</span>
                    </p>
                </div>
            </div>

            {/* ════ SECTION: DEWAN ARBITRASE EVENT (ROLE ARBITRASE RESMI) ════ */}
            <div className="rounded-2xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent p-5 shadow-sm dark:border-amber-500/40 dark:from-amber-950/40">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-extrabold text-amber-800 dark:text-amber-300 border border-amber-400/40">
                            <i className="fa-solid fa-scale-balanced" /> Petugas dengan Role Arbitrase Resmi Event Ini
                        </div>
                        <h3 className="mt-1.5 text-lg font-black text-zinc-900 dark:text-white">
                            Dewan Arbitrase yang Dipilih untuk Event Ini ({roleUsers.length} Petugas)
                        </h3>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300">
                            Daftar user/petugas yang memiliki Role <strong>Arbitrase</strong> di sistem dan telah ditugaskan secara resmi untuk mengawal kepatuhan regulasi, menangani protes, dan memimpin sidang arbitrase kejuaraan ini.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedCategory('arbitrase_role')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-3.5 py-2 text-xs transition shadow-sm cursor-pointer"
                        >
                            <i className="fa-solid fa-filter" />
                            <span>Lihat di Tabel ({roleUsers.length})</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {roleUsers.map((user, idx) => (
                        <div
                            key={user.id || idx}
                            className="relative overflow-hidden rounded-xl border border-amber-300/80 bg-white/90 p-4 shadow-sm backdrop-blur transition hover:border-amber-400 hover:shadow-md dark:border-amber-600/40 dark:bg-zinc-900/80"
                        >
                            <div className="flex items-start gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-base font-black text-slate-950 shadow-sm ring-2 ring-amber-400/40">
                                    {user.avatar_letter || (user.name ? user.name.slice(0, 1).toUpperCase() : 'A')}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-black uppercase text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                                            Role Arbitrase
                                        </span>
                                    </div>
                                    <h4 className="mt-1 text-sm font-extrabold text-zinc-900 dark:text-white truncate" title={user.name}>
                                        {user.name}
                                    </h4>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate font-mono mt-0.5" title={user.email}>
                                        <i className="fa-regular fa-envelope mr-1 text-[10px]" />
                                        {user.email}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-[11px]">
                                <span className="text-zinc-500 dark:text-zinc-400">Hak Akses Event:</span>
                                <span className="font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider text-[10px] bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200/50">
                                    {user.access_role || 'Dewan Arbitrase'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ════ ROSTER ARBITRASE PERTANDINGAN INI ════ */}
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 overflow-hidden">
                {/* Filter and Search header */}
                <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                                Daftar Personil Arbitrase Pertandingan Ini ({filteredPersonnel.length})
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Personil yang memiliki surat penugasan resmi untuk memimpin, mengawasi, dan menilai jalannya pertandingan.
                            </p>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full md:w-80">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
                                <i className="fa-solid fa-magnifying-glass text-xs" />
                            </span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari nama, daerah, Dan, lisensi, email..."
                                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-300 bg-zinc-50/50 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                >
                                    <i className="fa-solid fa-xmark text-xs" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-semibold text-zinc-500 mr-1">Kategori:</span>
                            {[
                                { id: 'all', label: 'Semua Arbitrase', count: countTotal },
                                { id: 'arbitrase_role', label: 'Dewan Arbitrase (Role Arbitrase)', count: countArbitraseRole, isGold: true },
                                { id: 'dewan', label: 'Dewan Hakim & Korlap', count: countDewan },
                                { id: 'wasit', label: 'Wasit & Juri', count: countWasit },
                                { id: 'panitera', label: 'Panitera Meja', count: countPanitera },
                            ].map((btn) => (
                                <button
                                    key={btn.id}
                                    type="button"
                                    onClick={() => setSelectedCategory(btn.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${selectedCategory === btn.id
                                        ? btn.isGold
                                            ? 'bg-amber-500 text-slate-950 font-black shadow-sm ring-2 ring-amber-400/50'
                                            : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                                        }`}
                                >
                                    {btn.label} ({btn.count})
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-zinc-500 mr-1">Kehadiran:</span>
                            {[
                                { id: 'all', label: 'Semua' },
                                { id: 'present', label: `Hadir (${countPresent})` },
                                { id: 'absent', label: `Belum Presensi (${countAbsent})` },
                            ].map((btn) => (
                                <button
                                    key={btn.id}
                                    type="button"
                                    onClick={() => setPresenceFilter(btn.id)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${presenceFilter === btn.id
                                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                                        }`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table of Personnel */}
                {filteredPersonnel.length === 0 ? (
                    <div className="py-16 text-center text-xs text-zinc-500 dark:text-zinc-400">
                        <i className="fa-solid fa-user-slash text-3xl text-zinc-300 dark:text-zinc-700 mb-2" />
                        <p className="font-semibold">Tidak ditemukan petugas arbitrase dengan kriteria pencarian ini.</p>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedCategory('all');
                                setPresenceFilter('all');
                                setSearchQuery('');
                            }}
                            className="mt-2 text-amber-600 hover:underline font-bold"
                        >
                            Reset Seluruh Filter
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                                    <th className="py-3 px-4 w-12 text-center">No</th>
                                    <th className="py-3 px-4">Nama Petugas</th>
                                    <th className="py-3 px-4">Kategori Arbitrase</th>
                                    <th className="py-3 px-4">Posisi / Jabatan</th>
                                    <th className="py-3 px-4 text-center">Tingkatan Dan</th>
                                    <th className="py-3 px-4">Sertifikasi</th>
                                    <th className="py-3 px-4">No. Lisensi / ID</th>
                                    <th className="py-3 px-4">Asal Pengprov / Daerah</th>
                                    <th className="py-3 px-4 text-center">Status Kehadiran</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                                {filteredPersonnel.map((person, index) => {
                                    const isRoleArbitrase = person.category === 'arbitrase_role' || person.is_role_arbitrase;
                                    return (
                                        <tr
                                            key={person.id || index}
                                            className={`transition-colors ${
                                                isRoleArbitrase
                                                    ? 'bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-950/30'
                                                    : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40'
                                            }`}
                                        >
                                            {/* No */}
                                            <td className="py-3 px-4 text-center font-mono font-medium text-zinc-400">
                                                {index + 1}
                                            </td>

                                            {/* Nama Petugas */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black shadow-2xs ${
                                                        isRoleArbitrase
                                                            ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-500/50'
                                                            : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                                    }`}>
                                                        {person.avatar_letter || person.name.slice(0, 1).toUpperCase()}
                                                    </span>
                                                    <div>
                                                        <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                                            <span>{person.name}</span>
                                                            {isRoleArbitrase && (
                                                                <span className="rounded bg-amber-200 px-1.5 py-0.2 text-[9px] font-black text-amber-900 dark:bg-amber-900 dark:text-amber-200" title="User dengan Role Arbitrase Resmi">
                                                                    Role Arbitrase
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2 mt-0.5">
                                                            {person.phone && person.phone !== '-' && (
                                                                <span><i className="fa-solid fa-phone text-[9px] mr-1 text-zinc-400" />{person.phone}</span>
                                                            )}
                                                            {person.email && person.email !== '-' && (
                                                                <span className="font-mono text-[10px]"><i className="fa-regular fa-envelope text-[9px] mr-1 text-zinc-400" />{person.email}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Kategori Arbitrase */}
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                                        isRoleArbitrase
                                                            ? 'bg-amber-100 text-amber-900 border border-amber-300/80 dark:bg-amber-950/80 dark:text-amber-200'
                                                            : person.category === 'dewan'
                                                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                                                            : person.category === 'wasit'
                                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                            : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300'
                                                    }`}
                                                >
                                                    <i
                                                        className={`fa-solid ${
                                                            isRoleArbitrase
                                                                ? 'fa-scale-balanced text-amber-600'
                                                                : person.category === 'dewan'
                                                                ? 'fa-shield-halved'
                                                                : person.category === 'wasit'
                                                                ? 'fa-scale-balanced'
                                                                : 'fa-clipboard-list'
                                                        } text-[10px]`}
                                                    />
                                                    {person.category_label || person.category}
                                                </span>
                                            </td>

                                            {/* Posisi / Jabatan */}
                                            <td className="py-3 px-4 font-semibold text-zinc-800 dark:text-zinc-200">
                                                {person.role_title}
                                            </td>

                                            {/* Tingkatan Dan */}
                                            <td className="py-3 px-4 text-center">
                                                {person.dan_grade && person.dan_grade !== '-' ? (
                                                    <span className="inline-block rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 font-bold text-zinc-800 dark:text-zinc-200 text-[11px]">
                                                        {person.dan_grade}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400">—</span>
                                                )}
                                            </td>

                                            {/* Tingkat Sertifikasi */}
                                            <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                                                {person.certification_level}
                                            </td>

                                            {/* No. Lisensi */}
                                            <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                                                {person.license_number}
                                            </td>

                                            {/* Pengprov / Asal Daerah */}
                                            <td className="py-3 px-4 font-medium text-zinc-800 dark:text-zinc-200">
                                                <span className="inline-flex items-center gap-1">
                                                    <i className="fa-solid fa-location-dot text-zinc-400 text-[10px]" />
                                                    {person.region}
                                                </span>
                                            </td>

                                            {/* Status Kehadiran */}
                                            <td className="py-3 px-4 text-center">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                                        person.is_present
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                    }`}
                                                >
                                                    <i className={`fa-solid ${person.is_present ? 'fa-circle-check' : 'fa-clock'}`} />
                                                    {person.attendance_status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ════ QUICK NAVIGATION FOOTER ════ */}
            <div>
                <div className="mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Modul Pelaksanaan Arbitrase
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickLinks.map((link, idx) => (
                        <a
                            key={idx}
                            href={link.href}
                            className="group relative flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-amber-500/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${link.color} text-lg`}
                                    >
                                        <i className={`fa-solid ${link.icon}`} />
                                    </span>
                                    <i className="fa-solid fa-arrow-up-right-from-square text-xs text-zinc-400 group-hover:text-amber-500 transition-colors" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-zinc-900 group-hover:text-amber-600 dark:text-zinc-100 dark:group-hover:text-amber-400 transition-colors">
                                        {link.title}
                                    </h4>
                                    <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                        {link.desc}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-bold text-amber-600 group-hover:translate-x-0.5 transition-transform dark:text-amber-400">
                                <span>Buka Modul</span>
                                <i className="fa-solid fa-chevron-right text-[10px]" />
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
