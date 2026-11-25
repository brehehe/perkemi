import { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import Modal from '@/Components/UI/Overlays/Modal';

export default function EventSwitcherModal({
    isOpen = false,
    onClose,
    events = [],
    currentEventId = null,
    isFullAdmin = false,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [switchingEventId, setSwitchingEventId] = useState(null);

    const safeEvents = Array.isArray(events) ? events : [];

    // Filter events based on search query
    const filteredEvents = useMemo(() => {
        if (!searchQuery.trim()) return safeEvents;
        const query = searchQuery.toLowerCase();
        return safeEvents.filter((ev) => (
            ev.name?.toLowerCase().includes(query)
            || ev.city?.toLowerCase().includes(query)
            || ev.assignment_label?.toLowerCase().includes(query)
            || ev.status_label?.toLowerCase().includes(query)
        ));
    }, [safeEvents, searchQuery]);

    // Grouping
    const { assignedEvents = [], otherEvents = [] } = useMemo(() => {
        const assigned = [];
        const others = [];

        filteredEvents.forEach((ev) => {
            const isAssigned = (ev.assignment_label && ev.assignment_label !== 'Buka Pendaftaran' && ev.assignment_label !== 'Event Aktif') || ev.id === currentEventId;
            if (isAssigned) {
                assigned.push(ev);
            } else {
                others.push(ev);
            }
        });

        return { assignedEvents: assigned, otherEvents: others };
    }, [filteredEvents, currentEventId]);

    const handleSelectEvent = (event) => {
        if (event.id === currentEventId) {
            onClose();
            return;
        }

        setSwitchingEventId(event.id);
        const currentTarget = window.location.pathname + window.location.search;
        router.visit(`/admin/event/${event.id}/enter?target=${encodeURIComponent(currentTarget)}`, {
            onFinish: () => {
                setSwitchingEventId(null);
                onClose();
            },
        });
    };

    const handleExitToGlobal = () => {
        if (!currentEventId) {
            onClose();
            return;
        }

        setSwitchingEventId('global');
        router.post('/admin/tenant/exit', {}, {
            onFinish: () => {
                setSwitchingEventId(null);
                onClose();
            },
        });
    };

    const getStatusBadge = (status, statusLabel) => {
        switch (status) {
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80 whitespace-nowrap">
                        <i className="fa-solid fa-circle-check text-[9px] text-emerald-600 dark:text-emerald-400" />
                        <span>{statusLabel || 'Selesai'}</span>
                    </span>
                );
            case 'ongoing':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/80 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>{statusLabel || 'Sedang Berlangsung'}</span>
                    </span>
                );
            case 'open_registration':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/80 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>{statusLabel || 'Pendaftaran Buka'}</span>
                    </span>
                );
            case 'closed':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/80 whitespace-nowrap">
                        <i className="fa-solid fa-lock text-[8.5px] text-rose-500" />
                        <span>{statusLabel || 'Pendaftaran Ditutup'}</span>
                    </span>
                );
            case 'draft':
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 whitespace-nowrap">
                        <i className="fa-solid fa-clock text-[8.5px] text-slate-400" />
                        <span>{statusLabel || 'Akan Datang'}</span>
                    </span>
                );
        }
    };

    const getStatusIconClass = (status, isCurrent) => {
        if (isCurrent) {
            return 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900';
        }
        switch (status) {
            case 'completed':
                return 'bg-emerald-100/70 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50';
            case 'ongoing':
                return 'bg-amber-100/70 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/50';
            case 'open_registration':
                return 'bg-blue-100/70 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50';
            case 'closed':
                return 'bg-rose-100/70 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50';
            case 'draft':
            default:
                return 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400';
        }
    };

    const renderEventRow = (ev) => {
        const isCurrent = ev.id === currentEventId;
        const isSwitching = switchingEventId === ev.id;

        return (
            <div
                key={ev.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectEvent(ev)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectEvent(ev);
                    }
                }}
                className={`group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer select-none ${isCurrent
                    ? 'border-stone-900 bg-stone-50 dark:border-stone-600 dark:bg-stone-800/80 ring-1 ring-stone-900/10 dark:ring-stone-500/20'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800/60 hover:border-stone-300 dark:hover:border-stone-700'
                    }`}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold transition-colors ${getStatusIconClass(ev.status, isCurrent)}`}
                    >
                        <i className="fa-solid fa-trophy text-[11px]" />
                    </span>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-medium text-stone-900 dark:text-stone-100 group-hover:text-[#c0392b] dark:group-hover:text-stone-50 transition-colors truncate">
                                {ev.name}
                            </span>
                            {getStatusBadge(ev.status, ev.status_label)}
                        </div>

                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                            {ev.city && <span>{ev.city}</span>}
                            {ev.city && ev.start_date && <span className="text-stone-300 dark:text-stone-600">·</span>}
                            {ev.start_date && (
                                <span>
                                    {ev.start_date}
                                    {ev.end_date ? ` – ${ev.end_date}` : ''}
                                </span>
                            )}
                            {ev.assignment_label && ev.assignment_label !== 'Buka Pendaftaran' && (
                                <>
                                    <span className="text-stone-300 dark:text-stone-600">·</span>
                                    <span className="font-medium text-stone-700 dark:text-stone-300">
                                        {ev.assignment_label}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="shrink-0 flex items-center pl-3">
                    {isCurrent ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-200/80 dark:bg-stone-700 text-stone-900 dark:text-stone-100">
                            <i className="fa-solid fa-check text-[10px]" />
                            <span>Aktif</span>
                        </span>
                    ) : isSwitching ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                            <i className="fa-solid fa-spinner fa-spin text-xs" />
                            <span>Membuka...</span>
                        </span>
                    ) : (
                        <i className="fa-solid fa-arrow-right text-xs text-stone-300 dark:text-stone-600 group-hover:text-stone-800 dark:group-hover:text-stone-200 group-hover:translate-x-0.5 transition-all" />
                    )}
                </div>
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="xl"
            title="Pilih Event"
            subtitle="Pilih kejuaraan untuk mengalihkan ruang kerja."
        >
            <div className="space-y-3.5">
                {/* Search Bar */}
                {safeEvents.length > 2 && (
                    <div className="relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 dark:text-stone-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari kejuaraan atau kota..."
                            className="w-full pl-9 pr-9 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:bg-white dark:focus:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-stone-900 dark:focus:border-stone-100 transition-colors"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                                aria-label="Hapus pencarian"
                            >
                                <i className="fa-solid fa-xmark" />
                            </button>
                        )}
                    </div>
                )}

                {/* Global Admin Mode (Full Admins only) */}
                {isFullAdmin && (
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={handleExitToGlobal}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleExitToGlobal();
                            }
                        }}
                        className={`group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer select-none ${!currentEventId
                            ? 'border-stone-900 bg-stone-50 dark:border-stone-600 dark:bg-stone-800/80 ring-1 ring-stone-900/10 dark:ring-stone-500/20'
                            : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800/60 hover:border-stone-300 dark:hover:border-stone-700'
                            }`}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold transition-colors ${!currentEventId
                                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 group-hover:bg-stone-200 dark:group-hover:bg-stone-700'
                                    }`}
                            >
                                <i className="fa-solid fa-layer-group text-[11px]" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-xs sm:text-sm font-medium text-stone-900 dark:text-stone-100 group-hover:text-[#c0392b] dark:group-hover:text-stone-50 transition-colors truncate">
                                    Mode Admin Global (Semua Event)
                                </h4>
                                <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                                    Kelola master data pusat, pengguna, dan direktori kejuaraan.
                                </p>
                            </div>
                        </div>

                        <div className="shrink-0 flex items-center pl-3">
                            {!currentEventId ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-200/80 dark:bg-stone-700 text-stone-900 dark:text-stone-100">
                                    <i className="fa-solid fa-check text-[10px]" />
                                    <span>Aktif</span>
                                </span>
                            ) : switchingEventId === 'global' ? (
                                <span className="inline-flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                                    <i className="fa-solid fa-spinner fa-spin text-xs" />
                                    <span>Membuka...</span>
                                </span>
                            ) : (
                                <i className="fa-solid fa-arrow-right text-xs text-stone-300 dark:text-stone-600 group-hover:text-stone-800 dark:group-hover:text-stone-200 group-hover:translate-x-0.5 transition-all" />
                            )}
                        </div>
                    </div>
                )}

                {/* Event List */}
                <div className="max-h-[52vh] overflow-y-auto space-y-3.5 pr-0.5 custom-scrollbar">
                    {/* Assigned / Current Events */}
                    {assignedEvents.length > 0 && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between px-0.5 pt-1">
                                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                                    {isFullAdmin ? 'Event Terkait' : 'Event yang Diikuti / Ditugaskan'}
                                </span>
                                <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                                    {assignedEvents.length}
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                {assignedEvents.map(renderEventRow)}
                            </div>
                        </div>
                    )}

                    {/* Other Events */}
                    {otherEvents.length > 0 && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between px-0.5 pt-1">
                                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                                    {isFullAdmin ? 'Event Lainnya' : 'Kejuaraan Terbuka Lainnya'}
                                </span>
                                <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                                    {otherEvents.length}
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                {otherEvents.map(renderEventRow)}
                            </div>
                        </div>
                    )}

                    {filteredEvents.length === 0 && (
                        <div className="py-8 text-center text-stone-400 dark:text-stone-500">
                            <i className="fa-solid fa-magnifying-glass text-lg mb-2 opacity-50" />
                            <p className="text-xs">Tidak ada event yang cocok dengan &ldquo;{searchQuery}&rdquo;</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Subtle Footer with Keyboard Hint */}
            <div className="px-4 sm:px-5 py-2.5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/60 flex items-center justify-between text-[11px] text-stone-400 dark:text-stone-500">
                <span>{filteredEvents.length} kejuaraan ditemukan</span>
                <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[10px] font-mono shadow-2xs">ESC</kbd>
                    <span>tutup</span>
                </span>
            </div>
        </Modal>
    );
}
