import React, { useState, useMemo } from 'react';
import { Button, Input, Combobox } from '@/Components/UI';

export default function ArbitrationTab({
    event,
    arbitrators = [],
    eventArbitrators = [],
    arbitratorOptions = [],
    arbitratorRoleOptions = [],
    arbitratorAssignmentForm,
    submitArbitratorAssignment,
    openCreateArbitratorModal,
    openEditArbitratorModal,
    removeEventArbitrator,
    openTransferModal,
    arbitratorSearch = '',
    setArbitratorSearch = () => {},
    arbitrationSummary = {},
    arbitrationPersonnel = [],
    arbitrationRoleUsers = [],
    eventReferees = [],
}) {
    const [showAllPersonnel, setShowAllPersonnel] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [presenceFilter, setPresenceFilter] = useState('all');

    // Filtered event arbitrators for this specific event
    const filteredEventArbitrators = useMemo(() => {
        if (!arbitratorSearch) return eventArbitrators;
        const q = arbitratorSearch.toLowerCase();
        return eventArbitrators.filter((arbitrator) => {
            return (
                arbitrator.name?.toLowerCase().includes(q) ||
                arbitrator.dan_grade?.toLowerCase().includes(q) ||
                arbitrator.certification_level?.toLowerCase().includes(q) ||
                arbitrator.region?.toLowerCase().includes(q) ||
                arbitrator.license_number?.toLowerCase().includes(q) ||
                arbitrator.email?.toLowerCase().includes(q) ||
                arbitrator.phone?.toLowerCase().includes(q) ||
                arbitrator.notes?.toLowerCase().includes(q) ||
                arbitrator.role?.toLowerCase().includes(q)
            );
        });
    }, [eventArbitrators, arbitratorSearch]);

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
                } else if (person.category !== selectedCategory) {
                    return false;
                }
            }

            if (presenceFilter === 'present' && !person.is_present) return false;
            if (presenceFilter === 'absent' && person.is_present) return false;

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

    return (
        <div className="space-y-6">
            {/* ══════════════════════════════════════════════════════════════════
                UTAMA: PENUGASAN ARBITRASE EVENT (FORMAT IDENTIK KOORDINATOR & WASIT)
            ══════════════════════════════════════════════════════════════════ */}
            <div className="overflow-hidden rounded-2xl border border-[#ede9e1] bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                {/* Header Card */}
                <div className="flex flex-col gap-4 border-b border-[#ede9e1] p-5 md:flex-row md:items-center md:justify-between dark:border-slate-800">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                                <i className="fa-solid fa-gavel text-sm" />
                            </span>
                            <h3 className="text-base font-bold text-[#0f0d0b] dark:text-white">Penugasan Arbitrase</h3>
                        </div>
                        <p className="mt-1 text-xs text-[#706860] dark:text-slate-400">
                            Pilih personil arbitrase dari master data untuk event ini atau edit langsung data arbitrase. Dapat dialihkan ke Wasit & Juri maupun Koordinator Lapangan.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            onClick={openCreateArbitratorModal}
                            className="bg-[#141210] text-amber-400 hover:bg-black"
                        >
                            <i className="fa-solid fa-user-plus mr-2" />
                            Tambah Arbitrase Baru
                        </Button>
                    </div>
                </div>

                {/* Form Penugasan dari Master */}
                {arbitratorAssignmentForm && (
                    <div className="border-b border-[#ede9e1] bg-[#fcfbf9] p-5 dark:border-slate-800 dark:bg-slate-950/40">
                        <form onSubmit={submitArbitratorAssignment} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px_auto] md:items-end">
                            <Combobox
                                label="Pilih dari Master Data Arbitrase"
                                value={arbitratorAssignmentForm.data.arbitrator_id}
                                onChange={(value) => arbitratorAssignmentForm.setData('arbitrator_id', value)}
                                options={arbitratorOptions}
                                placeholder="Cari nama arbitrase..."
                                searchPlaceholder="Cari arbitrase..."
                                error={arbitratorAssignmentForm.errors?.arbitrator_id}
                            />
                            <Combobox
                                label="Peran di Event"
                                value={arbitratorAssignmentForm.data.role}
                                onChange={(value) => arbitratorAssignmentForm.setData('role', value)}
                                options={arbitratorRoleOptions}
                                clearable={false}
                                error={arbitratorAssignmentForm.errors?.role}
                            />
                            <Button
                                type="submit"
                                loading={arbitratorAssignmentForm.processing}
                                disabled={!arbitratorAssignmentForm.data.arbitrator_id}
                            >
                                <i className="fa-solid fa-plus mr-2" />
                                Tugaskan
                            </Button>
                        </form>
                    </div>
                )}

                {/* Counter & Search Bar */}
                {eventArbitrators.length > 0 && (
                    <div className="flex items-center justify-between border-b border-[#ede9e1] bg-[#fbfaf8] px-5 py-3 dark:border-slate-800 dark:bg-slate-950/30">
                        <p className="text-xs font-semibold text-[#706860] dark:text-slate-400">
                            Total Ditugaskan:{' '}
                            <span className="font-bold text-[#0f0d0b] dark:text-white">
                                {eventArbitrators.length} Personil Arbitrase
                            </span>
                        </p>
                        <div className="w-full max-w-xs">
                            <Input
                                placeholder="Cari arbitrase event..."
                                value={arbitratorSearch}
                                onChange={(e) => setArbitratorSearch(e.target.value)}
                                iconLeft={<i className="fa-solid fa-magnifying-glass text-[#a89f91]" />}
                                containerClassName="text-xs"
                            />
                        </div>
                    </div>
                )}

                {/* List Personil Arbitrase */}
                {(() => {
                    if (!eventArbitrators.length) {
                        return (
                            <div className="p-8 text-center">
                                <i className="fa-solid fa-gavel text-3xl text-[#d8d0c7]" />
                                <p className="mt-3 font-semibold text-[#141210] dark:text-white">
                                    Belum ada personil arbitrase yang ditugaskan
                                </p>
                                <p className="mt-1 text-sm text-[#706860] dark:text-slate-400">
                                    Pilih dari master data arbitrase di atas atau klik "Tambah Arbitrase Baru".
                                </p>
                            </div>
                        );
                    }

                    if (!filteredEventArbitrators.length) {
                        return (
                            <div className="p-8 text-center">
                                <i className="fa-solid fa-magnifying-glass text-2xl text-[#d8d0c7]" />
                                <p className="mt-2 text-sm font-semibold text-[#141210] dark:text-white">
                                    Tidak ada arbitrase yang cocok dengan pencarian "{arbitratorSearch}"
                                </p>
                            </div>
                        );
                    }

                    return (
                        <div className="divide-y divide-[#ede9e1] dark:divide-slate-800">
                            {filteredEventArbitrators.map((arbitrator) => (
                                <div
                                    key={arbitrator.id}
                                    className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-zinc-50/50 dark:hover:bg-slate-800/40"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 ring-1 ring-amber-400/30">
                                            <i className="fa-solid fa-gavel text-sm" />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="truncate font-semibold text-[#141210] dark:text-white">
                                                    {arbitrator.name}
                                                </p>
                                                {arbitrator.gender && (
                                                    <span
                                                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                                            arbitrator.gender === 'female'
                                                                ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300'
                                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                                        }`}
                                                    >
                                                        {arbitrator.gender === 'female' ? '♀ Perempuan' : '♂ Laki-laki'}
                                                    </span>
                                                )}
                                                {arbitrator.dan_grade && (
                                                    <span className="rounded bg-[#f4ece1] px-1.5 py-0.5 text-[10px] font-bold text-[#5c5248] dark:bg-slate-800 dark:text-slate-300">
                                                        {arbitrator.dan_grade}
                                                    </span>
                                                )}
                                                {arbitrator.license_number && (
                                                    <span className="rounded bg-[#f4ece1] px-1.5 py-0.5 text-[10px] font-bold text-[#5c5248] dark:bg-slate-800 dark:text-slate-300">
                                                        Lisensi: {arbitrator.license_number}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-0.5 text-xs text-[#706860] dark:text-slate-400">
                                                {[arbitrator.certification_level, arbitrator.region, arbitrator.phone]
                                                    .filter(Boolean)
                                                    .join(' · ') || 'Profil arbitrase'}
                                            </p>
                                            {(arbitrator.email || arbitrator.notes) && (
                                                <p className="mt-0.5 text-xs text-[#8c827a] dark:text-slate-500">
                                                    {[
                                                        arbitrator.email ? `Email: ${arbitrator.email}` : null,
                                                        arbitrator.notes ? `Catatan: ${arbitrator.notes}` : null,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-300/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700/40">
                                            {arbitratorRoleOptions.find((option) => option.value === arbitrator.role)?.label || arbitrator.role}
                                        </span>
                                        <Button
                                            variant="unstyled"
                                            size="none"
                                            type="button"
                                            onClick={() => openTransferModal('arbitrator', arbitrator)}
                                            className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                                            aria-label={`Alihkan penugasan ${arbitrator.name}`}
                                            title="Alihkan Penugasan (Wasit & Juri / Koordinator Lapangan)"
                                        >
                                            <i className="fa-solid fa-right-left" />
                                        </Button>
                                        <Button
                                            variant="unstyled"
                                            size="none"
                                            type="button"
                                            onClick={() => openEditArbitratorModal(arbitrator)}
                                            className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                            aria-label={`Edit ${arbitrator.name}`}
                                            title="Edit data arbitrase langsung"
                                        >
                                            <i className="fa-solid fa-pen-to-square" />
                                        </Button>
                                        <Button
                                            variant="unstyled"
                                            size="none"
                                            type="button"
                                            onClick={() => removeEventArbitrator(arbitrator)}
                                            className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                            aria-label={`Hapus ${arbitrator.name} dari event`}
                                            title="Hapus arbitrase dari event"
                                        >
                                            <i className="fa-solid fa-trash" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                MODUL PELAKSANAAN ARBITRASE (QUICK ACTION CARDS)
            ══════════════════════════════════════════════════════════════════ */}
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

            {/* ══════════════════════════════════════════════════════════════════
                ROSTER KORPS LENGKAP & STATUS PRESENSI (DIAGNOSTIK / COLLAPSIBLE)
            ══════════════════════════════════════════════════════════════════ */}
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 overflow-hidden">
                <button
                    type="button"
                    onClick={() => setShowAllPersonnel(!showAllPersonnel)}
                    className="w-full flex items-center justify-between p-5 text-left transition hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                >
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                            <i className="fa-solid fa-users-gear text-sm" />
                        </span>
                        <div>
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                                Rekapitulasi Roster Gabungan & Presensi Petugas ({countTotal} Personil)
                            </h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Tinjau presensi dan status hadir dewan arbitrase, wasit, dan panitera untuk event ini.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <i className="fa-solid fa-circle-check" /> {countPresent} Hadir
                        </span>
                        <i className={`fa-solid fa-chevron-down text-xs text-zinc-400 transition-transform duration-200 ${showAllPersonnel ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                {showAllPersonnel && (
                    <div className="border-t border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
                        {/* Search and filters for roster */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                                {[
                                    { id: 'all', label: 'Semua', count: countTotal },
                                    { id: 'arbitrase_role', label: 'Dewan Arbitrase', count: arbitrationRoleUsers.length || eventArbitrators.length },
                                    { id: 'wasit', label: 'Wasit & Juri', count: eventReferees.length },
                                ].map((btn) => (
                                    <button
                                        key={btn.id}
                                        type="button"
                                        onClick={() => setSelectedCategory(btn.id)}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                                            selectedCategory === btn.id
                                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                                        }`}
                                    >
                                        {btn.label} ({btn.count})
                                    </button>
                                ))}
                            </div>

                            <div className="relative w-full md:w-72">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
                                    <i className="fa-solid fa-magnifying-glass text-xs" />
                                </span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari di roster..."
                                    className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-zinc-300 bg-zinc-50/50 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
                                />
                            </div>
                        </div>

                        {/* Roster table */}
                        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                                        <th className="py-2.5 px-4 w-12 text-center">No</th>
                                        <th className="py-2.5 px-4">Nama Petugas</th>
                                        <th className="py-2.5 px-4">Peran / Jabatan</th>
                                        <th className="py-2.5 px-4 text-center">Dan</th>
                                        <th className="py-2.5 px-4">Daerah</th>
                                        <th className="py-2.5 px-4 text-center">Status Presensi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                                    {filteredPersonnel.map((person, idx) => (
                                        <tr key={person.id || idx} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                                            <td className="py-2.5 px-4 text-center font-mono text-zinc-400">{idx + 1}</td>
                                            <td className="py-2.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                                                {person.name}
                                            </td>
                                            <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">{person.role_title}</td>
                                            <td className="py-2.5 px-4 text-center font-semibold text-zinc-800 dark:text-zinc-200">
                                                {person.dan_grade || '—'}
                                            </td>
                                            <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">{person.region || '—'}</td>
                                            <td className="py-2.5 px-4 text-center">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
