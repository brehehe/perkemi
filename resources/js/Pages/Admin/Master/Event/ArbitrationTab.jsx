import React, { useMemo } from 'react';
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
    setArbitratorSearch = () => { },
}) {
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
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 transition-colors hover:bg-zinc-50/70 dark:hover:bg-slate-800/40"
                                >
                                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50 shadow-2xs mt-0.5 sm:mt-0">
                                            <i className="fa-solid fa-gavel text-sm" />
                                        </span>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <h4 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white leading-tight">
                                                {arbitrator.name}
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                                                {[arbitrator.dan_grade, arbitrator.certification_level, arbitrator.region].filter(Boolean).length > 0 && (
                                                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                                        {[arbitrator.dan_grade, arbitrator.certification_level, arbitrator.region].filter(Boolean).join(' · ')}
                                                    </span>
                                                )}
                                                {(arbitrator.license_number || arbitrator.email || arbitrator.phone || arbitrator.notes) && (
                                                    <span className="text-zinc-500 dark:text-zinc-500">
                                                        {[
                                                            arbitrator.license_number ? `Lisensi: ${arbitrator.license_number}` : null,
                                                            arbitrator.email,
                                                            arbitrator.phone,
                                                            arbitrator.notes ? `Catatan: ${arbitrator.notes}` : null,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 whitespace-nowrap shrink-0">
                                            {arbitratorRoleOptions.find((option) => option.value === arbitrator.role)?.label || arbitrator.role}
                                        </span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {openTransferModal && (
                                                <button
                                                    type="button"
                                                    onClick={() => openTransferModal('arbitrator', arbitrator)}
                                                    className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-2xs transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 cursor-pointer"
                                                    title="Alihkan Penugasan (Wasit & Juri / Koordinator Lapangan)"
                                                    aria-label={`Alihkan penugasan ${arbitrator.name}`}
                                                >
                                                    <i className="fa-solid fa-right-left text-xs" />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => openEditArbitratorModal(arbitrator)}
                                                className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-2xs transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-amber-950/40 dark:hover:text-amber-400 cursor-pointer"
                                                title="Edit data arbitrase langsung"
                                                aria-label={`Edit ${arbitrator.name}`}
                                            >
                                                <i className="fa-solid fa-pen-to-square text-xs" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeEventArbitrator(arbitrator)}
                                                className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-2xs transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-red-950/40 dark:hover:text-red-400 cursor-pointer"
                                                title="Hapus arbitrase dari event"
                                                aria-label={`Hapus ${arbitrator.name} dari event`}
                                            >
                                                <i className="fa-solid fa-trash text-xs" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
