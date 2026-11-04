import Combobox from '@/Components/UI/Forms/Combobox';
import Modal from '@/Components/UI/Overlays/Modal';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const timeToMinutes = (time) => {
    const [hours, minutes] = String(time || '00:00').split(':').map(Number);

    return (hours * 60) + minutes;
};

const minutesToTime = (minutes) => {
    const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
    const hours = Math.floor(normalizedMinutes / 60);
    const remainder = normalizedMinutes % 60;

    return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

const sessionSlots = (session, duration) => {
    const start = timeToMinutes(session.start_time);
    const end = timeToMinutes(session.end_time);
    const slots = [];

    for (let cursor = start; cursor + duration <= end; cursor += duration) {
        slots.push(minutesToTime(cursor));
    }

    return slots;
};

const slotKey = (sessionId, startTime, courtId) => `${sessionId}:${startTime}:${courtId}`;

const normalizeErrors = (errors) => Object.values(errors || {})
    .flatMap((message) => Array.isArray(message) ? message : [message])
    .filter(Boolean);

function EmptyState({ icon, title, description }) {
    return (
        <section className="rounded-2xl border border-dashed border-[#d9cfc3] bg-white px-5 py-10 text-center shadow-sm sm:px-6 sm:py-16">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f7f4ef] text-xl text-[#9a6b20]">
                <i className={`fa-solid ${icon}`} />
            </span>
            <h2 className="mt-4 text-lg font-bold text-[#17120f]">{title}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#746b63]">{description}</p>
        </section>
    );
}

function MatchCard({
    match,
    canManage,
    isSelected,
    isProcessing,
    onSelect,
    onUnschedule,
    onDragStart,
    onDragEnd,
    onCategoryDragStart,
    onCategoryDragEnd,
    onOpenMoveCategoryModal,
}) {
    const isEmbu = match.category_type === 'embu';
    const isCompleted = match.status === 'completed';
    const isExactClash = match.clash_type === 'exact';
    const isTightClash = match.clash_type === 'tight';
    const canMoveThisMatch = canManage && !isProcessing && !isCompleted;

    const redDisplay = match.red_athlete || match.red_label || 'Menunggu lawan';
    const blueDisplay = match.blue_athlete || match.blue_label || 'Menunggu lawan';

    return (
        <article
            draggable={canMoveThisMatch}
            onDragStart={(event) => canMoveThisMatch && onDragStart(event, match)}
            onDragEnd={onDragEnd}
            className={`group rounded-xl border p-3 shadow-sm transition ${
                isSelected
                    ? 'border-[#c0392b] bg-[#fff5f2] ring-2 ring-[#c0392b]/15'
                    : isCompleted
                        ? 'border-emerald-300 bg-emerald-50/60 shadow-2xs'
                        : isExactClash
                            ? 'border-2 border-rose-500 bg-rose-50/90 ring-2 ring-rose-500/20 shadow-md'
                            : isTightClash
                                ? 'border-2 border-amber-400 bg-amber-50/80 ring-2 ring-amber-400/20 shadow-md'
                                : isEmbu
                                    ? 'border-blue-200 bg-blue-50/70 hover:border-blue-300'
                                    : 'border-rose-200 bg-rose-50/70 hover:border-rose-300'
            } ${canMoveThisMatch ? 'cursor-grab active:cursor-grabbing' : ''} ${isProcessing ? 'opacity-60' : ''}`}
        >
            <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            isCompleted
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isExactClash
                                    ? 'bg-rose-600 text-white'
                                    : isTightClash
                                        ? 'bg-amber-500 text-white'
                                        : isEmbu
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-rose-100 text-rose-700'
                        }`}>
                            {isCompleted ? 'Selesai' : isEmbu ? 'Embu' : 'Randori'}
                        </span>
                        <span className="text-[11px] font-semibold text-[#8c827a]">Partai #{match.sequence}</span>
                    </div>

                    <div className="mt-1.5 flex items-start justify-between gap-1.5">
                        <h3 className="text-sm font-bold leading-snug text-[#17120f]">{match.category_name}</h3>
                        {canManage && !isCompleted && onOpenMoveCategoryModal && (
                            <button
                                type="button"
                                draggable
                                onDragStart={(e) => {
                                    e.stopPropagation();
                                    onCategoryDragStart?.(e, match.category_id, match.category_name);
                                }}
                                onDragEnd={onCategoryDragEnd}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenMoveCategoryModal(match.category_id);
                                }}
                                title="Tarik atau klik untuk memindahkan seluruh nomor pertandingan ini ke gelanggang (court) lain"
                                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#d4a843]/60 bg-[#fffaf0] px-1.5 py-0.5 text-[10px] font-bold text-[#8b651e] transition hover:bg-[#fff3d5] hover:border-[#d4a843] cursor-grab active:cursor-grabbing"
                            >
                                <i className="fa-solid fa-arrows-split-up-and-left text-[9px]" />
                                <span>Pindah Court</span>
                            </button>
                        )}
                    </div>

                    <p className="mt-0.5 text-xs font-semibold text-[#746b63]">{match.round_label}</p>
                </div>
                {canManage && (
                    isCompleted ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" title="Partai sudah selesai · Hasil & Nilai Terkunci">
                            <i className="fa-solid fa-lock text-[11px]" />
                        </span>
                    ) : (
                        <i className={`fa-solid ${isProcessing ? 'fa-spinner animate-spin' : 'fa-grip-vertical'} mt-1 text-[#9b9188] cursor-grab`} aria-hidden="true" title="Geser untuk memindahkan jadwal partai ini saja" />
                    )
                )}
            </div>

            {/* Banner Peringatan Bentrok Waktu (MERAH) atau Jeda Mepet (KUNING) */}
            {isExactClash && (
                <div className="mt-2 rounded-lg border border-rose-300 bg-rose-100/95 p-1.5 text-[11px] text-rose-950">
                    <div className="flex items-center gap-1 font-bold text-rose-800">
                        <i className="fa-solid fa-triangle-exclamation text-rose-600 text-[10px]" />
                        <span>BENTROK WAKTU SAMA</span>
                    </div>
                    <p className="mt-0.5 text-[10px] leading-tight font-medium text-rose-900">
                        {match.clash_summary}
                    </p>
                </div>
            )}

            {isTightClash && (
                <div className="mt-2 rounded-lg border border-amber-300 bg-amber-100/95 p-1.5 text-[11px] text-amber-950">
                    <div className="flex items-center gap-1 font-bold text-amber-900">
                        <i className="fa-solid fa-clock-rotate-left text-amber-700 text-[10px]" />
                        <span>JEDA MEPET (BUTUH SPACE)</span>
                    </div>
                    <p className="mt-0.5 text-[10px] leading-tight font-medium text-amber-950">
                        {match.clash_summary}
                    </p>
                </div>
            )}

            {/* Rincian Atlet & Kontingen */}
            {isEmbu ? (
                <div className="mt-2 rounded-lg border border-black/5 bg-white/90 p-2 text-xs">
                    <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-[#17120f]">
                        <span className="flex items-center gap-1.5 truncate text-[#9a6b20]">
                            <i className="fa-solid fa-flag text-[10px]" />
                            <span className="text-[#17120f]">{match.contingent_name || 'Kontingen'}</span>
                        </span>
                        {match.participant_label && (
                            <span className="text-[10px] font-medium text-[#746b63] shrink-0">
                                {match.participant_label}
                            </span>
                        )}
                    </div>
                    {match.athlete_names && match.athlete_names.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                            {match.athlete_names.map((name, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded bg-[#f4ece1] px-1.5 py-0.5 text-[10px] font-semibold text-[#4f4740]"
                                >
                                    <i className="fa-solid fa-user text-[9px] text-[#8c827a]" />
                                    <span>{name}</span>
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-1 text-[11px] text-[#746b63] italic truncate">
                            {match.participant || 'Menunggu peserta'}
                        </p>
                    )}
                </div>
            ) : (
                <div className="mt-2 space-y-1.5 text-xs">
                    {/* AKA */}
                    <div className="rounded-lg border border-rose-200 bg-white/90 p-1.5">
                        <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-rose-800">
                            <span className="inline-flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                                AKA
                            </span>
                            <span className="truncate max-w-[120px] text-rose-700/80 font-normal">
                                {match.aka_contingent || match.red_contingent || '-'}
                            </span>
                        </div>
                        <p className="mt-0.5 font-bold text-[#17120f] text-[11px] truncate">
                            {redDisplay}
                        </p>
                    </div>

                    {/* SHIRO */}
                    <div className="rounded-lg border border-slate-200 bg-white/90 p-1.5">
                        <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-slate-700">
                            <span className="inline-flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                SHIRO
                            </span>
                            <span className="truncate max-w-[120px] text-slate-600 font-normal">
                                {match.shiro_contingent || match.blue_contingent || '-'}
                            </span>
                        </div>
                        <p className="mt-0.5 font-bold text-[#17120f] text-[11px] truncate">
                            {blueDisplay}
                        </p>
                    </div>
                </div>
            )}

            <div className="mt-2 flex items-center justify-between border-t border-black/5 pt-2 text-[11px] font-semibold text-[#746b63]">
                <span>{match.scheduled_start}–{match.scheduled_end}</span>
                <span>{match.court}</span>
            </div>
            {canManage && (
                <div className="mt-2 flex items-center gap-1.5">
                    {isCompleted ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-100/60 rounded-lg px-2.5 py-1.5 w-full justify-center">
                            <i className="fa-solid fa-shield-check text-xs" />
                            <span>Hasil Selesai · Nilai Permanen</span>
                        </div>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => onSelect(match.id)}
                                disabled={isProcessing}
                                aria-pressed={isSelected}
                                className="min-h-9 flex-1 rounded-lg border border-black/10 bg-white/80 px-2 py-1.5 text-xs font-bold text-[#5f574f] transition hover:border-[#c0392b]/40 hover:text-[#a93226] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c0392b] disabled:cursor-wait"
                            >
                                {isSelected ? 'Batalkan' : 'Pilih partai'}
                            </button>
                            {onUnschedule && (
                                <button
                                    type="button"
                                    onClick={() => onUnschedule(match.id)}
                                    disabled={isProcessing}
                                    title="Lepas dari jadwal (kembalikan ke antrean belum terjadwal)"
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50/80 text-rose-700 transition hover:bg-rose-100 hover:text-rose-900"
                                >
                                    <i className="fa-solid fa-arrow-rotate-left text-xs" />
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}
        </article>
    );
}

export default function Schedule({
    activeEvent = null,
    events = [],
    courts = [],
    sessions = [],
    categories = [],
    matches = [],
    unscheduledMatches = [],
    conflictSummary = {},
    settings = null,
    summary = {},
    drawingsPublished = false,
    scheduleIsLocked = false,
    canManageSchedule = false,
}) {
    const { flash = {} } = usePage().props;
    const [selectedMatchId, setSelectedMatchId] = useState(null);
    const [draggedMatchId, setDraggedMatchId] = useState(null);
    const [draggedCategory, setDraggedCategory] = useState(null);
    const [moveCategoryModal, setMoveCategoryModal] = useState({ isOpen: false, categoryId: null });
    const [modalTargetCourtId, setModalTargetCourtId] = useState('');
    const [modalPlacementMode, setModalPlacementMode] = useState('auto');
    const [processingCategoryId, setProcessingCategoryId] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);
    const [processingMatchId, setProcessingMatchId] = useState(null);
    const [clientErrors, setClientErrors] = useState([]);
    const [showUnscheduledPanel, setShowUnscheduledPanel] = useState(false);
    const [filterClashOnly, setFilterClashOnly] = useState(false);
    const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
    const duration = Math.max(1, Number(settings?.match_duration_minutes || 10));
    const eventQuery = activeEvent?.id ? `?event_id=${encodeURIComponent(activeEvent.id)}` : '';
    const matchesBySlot = useMemo(() => new Map(matches.map((match) => [
        slotKey(match.session_id, match.scheduled_start, match.court_id),
        match,
    ])), [matches]);
    const matchesById = useMemo(() => {
        const map = new Map(matches.map((match) => [match.id, match]));
        unscheduledMatches.forEach((m) => map.set(m.id, m));
        return map;
    }, [matches, unscheduledMatches]);
    const selectedMatch = selectedMatchId ? matchesById.get(selectedMatchId) : null;
    const processingMatch = processingMatchId ? matchesById.get(processingMatchId) : null;
    const gridTemplateColumns = `90px repeat(${Math.max(courts.length, 1)}, minmax(260px, 1fr))`;

    const selectedCategoryInModal = useMemo(() => {
        if (!moveCategoryModal.categoryId) return categories[0] || null;
        return categories.find((c) => c.id === moveCategoryModal.categoryId) || null;
    }, [categories, moveCategoryModal.categoryId]);

    const openMoveCategoryModal = (categoryId = null) => {
        const targetCat = categoryId
            ? categories.find((c) => c.id === categoryId)
            : (categories[0] || null);

        const initialTargetCourt = courts.find((c) => c.id !== targetCat?.primary_court_id)?.id || courts[0]?.id || '';
        setModalTargetCourtId(initialTargetCourt);
        setModalPlacementMode('auto');
        setMoveCategoryModal({ isOpen: true, categoryId: targetCat?.id || null });
    };

    const moveCategoryCourt = (categoryId, targetCourtId, options = {}) => {
        if (!canManageSchedule || processingCategoryId || !categoryId || !targetCourtId) {
            return;
        }

        setClientErrors([]);
        setProcessingCategoryId(categoryId);

        router.post(`/admin/pertandingan/jadwal/categories/${categoryId}/move-court`, {
            event_id: activeEvent.id,
            event_court_id: targetCourtId,
            target_rundown_id: options.target_rundown_id || null,
            target_start_time: options.target_start_time || null,
            placement_mode: options.placement_mode || 'auto',
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setMoveCategoryModal({ isOpen: false, categoryId: null });
                setDraggedCategory(null);
                setDropTarget(null);
            },
            onError: (errors) => setClientErrors(normalizeErrors(errors)),
            onFinish: () => {
                setProcessingCategoryId(null);
                setDraggedCategory(null);
                setDropTarget(null);
            },
        });
    };

    const handleCategoryDragStart = (event, categoryId, categoryName) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/perkemi-category', categoryId);
        event.dataTransfer.setData('text/plain', `category:${categoryId}`);
        setDraggedCategory({ id: categoryId, name: categoryName });
        setSelectedMatchId(null);
        setDraggedMatchId(null);
    };

    const handleCategoryDragEnd = () => {
        setDraggedCategory(null);
        setDropTarget(null);
    };

    const handleGenerateSchedule = () => {
        if (!canManageSchedule || isGeneratingSchedule || !activeEvent?.id) {
            return;
        }

        if (!window.confirm('Susun ulang seluruh jadwal pertandingan secara otomatis ke court dan sesi pertandingan yang tersedia?')) {
            return;
        }

        setClientErrors([]);
        setIsGeneratingSchedule(true);
        router.post('/admin/pertandingan/jadwal/generate', {
            event_id: activeEvent.id,
        }, {
            preserveScroll: true,
            onError: (errors) => setClientErrors(normalizeErrors(errors)),
            onFinish: () => setIsGeneratingSchedule(false),
        });
    };

    const unscheduleMatch = (matchId) => {
        if (!canManageSchedule || processingMatchId) return;
        setClientErrors([]);
        router.delete(`/admin/pertandingan/jadwal/matches/${matchId}`, {
            data: { event_id: activeEvent.id },
            preserveScroll: true,
            onStart: () => setProcessingMatchId(matchId),
            onSuccess: () => {
                setSelectedMatchId(null);
                setDraggedMatchId(null);
                setDropTarget(null);
            },
            onError: (errors) => setClientErrors(normalizeErrors(errors)),
            onFinish: () => setProcessingMatchId(null),
        });
    };

    const moveMatch = (matchId, session, court, startTime, swapWithMatchId = null) => {
        const match = matchesById.get(matchId);

        if (!match || !canManageSchedule || processingMatchId) {
            return;
        }

        if (match.status === 'completed') {
            setClientErrors(['Partai yang sudah selesai dipertandingkan tidak dapat dipindahkan demi integritas rekam hasil.']);
            return;
        }

        if (swapWithMatchId) {
            const swapTarget = matchesById.get(swapWithMatchId);
            if (swapTarget?.status === 'completed') {
                setClientErrors(['Partai tujuan pertukaran sudah selesai dipertandingkan dan tidak dapat ditukar.']);
                return;
            }
        }

        if (match.session_id === session.id && match.court_id === court.id && match.scheduled_start === startTime) {
            setSelectedMatchId(null);
            setDropTarget(null);
            return;
        }

        setClientErrors([]);
        router.put(`/admin/pertandingan/jadwal/matches/${match.id}`, {
            event_id: activeEvent.id,
            event_court_id: court.id,
            rundown_id: session.id,
            start_time: startTime,
            swap_with_match_id: swapWithMatchId,
        }, {
            preserveScroll: true,
            onStart: () => setProcessingMatchId(match.id),
            onSuccess: () => setSelectedMatchId(null),
            onError: (errors) => setClientErrors(normalizeErrors(errors)),
            onFinish: () => {
                setProcessingMatchId(null);
                setDraggedMatchId(null);
                setDropTarget(null);
            },
        });
    };

    const handleDragStart = (event, match) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', match.id);
        setDraggedMatchId(match.id);
        setSelectedMatchId(match.id);
        setDraggedCategory(null);
    };

    const handleDrop = (event, session, court, startTime, swapWithMatchId = null) => {
        event.preventDefault();
        event.stopPropagation();

        const categoryId = event.dataTransfer.getData('text/perkemi-category') || draggedCategory?.id;
        if (categoryId) {
            moveCategoryCourt(categoryId, court.id, {
                target_rundown_id: session.id,
                target_start_time: startTime,
                placement_mode: 'at_slot',
            });
            return;
        }

        const matchId = event.dataTransfer.getData('text/plain') || draggedMatchId || selectedMatchId;
        if (matchId && !matchId.startsWith('category:')) {
            moveMatch(matchId, session, court, startTime, swapWithMatchId);
        }
    };

    return (
        <AdminLayout title="Jadwal Pertandingan">
            <Head title="Jadwal Pertandingan | Smart Perkemi" />

            <div className="space-y-5 font-sans text-[#17120f]">
                <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f0d0b] via-[#211b16] to-[#0f0d0b] p-5 text-white shadow-xl md:p-6">
                    <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#d4a843]/15 blur-3xl" />
                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-[.14em] text-[#e1b94e]">Jadwal per event</p>
                            <h1 className="mt-1.5 text-2xl font-bold leading-tight tracking-tight md:text-3xl">Papan Jadwal Pertandingan</h1>
                            <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-white/70">
                                Geser satu kartu untuk memindahkan satu partai. Jatuhkan ke kartu lain untuk menukar dua partai; kartu lainnya tetap pada jadwal semula.
                            </p>
                        </div>
                        <Combobox
                            label="Event dipilih"
                            labelClassName="text-white/60"
                            containerClassName="w-full xl:w-96"
                            value={activeEvent?.id || ''}
                            onChange={(value) => router.get('/admin/pertandingan/jadwal', { event_id: value }, { preserveState: false })}
                            clearable={false}
                            options={events.map((event) => ({ value: event.id, label: event.name, sublabel: event.option_description }))}
                        />
                    </div>
                </section>

                {!activeEvent ? (
                    <EmptyState icon="fa-calendar-xmark" title="Event belum dipilih" description="Pilih event untuk melihat dan mengatur jadwal pertandingan." />
                ) : (
                    <>
                        {flash.success && clientErrors.length === 0 && (
                            <div aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                                <div className="flex items-start gap-3">
                                    <i className="fa-solid fa-circle-check mt-0.5" aria-hidden="true" />
                                    <p className="font-semibold">{flash.success}</p>
                                </div>
                            </div>
                        )}

                        {clientErrors.length > 0 && (
                            <div role="alert" className="fixed right-4 top-20 z-50 w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 shadow-xl">
                                <div className="flex items-start gap-3">
                                    <i className="fa-solid fa-circle-exclamation mt-0.5 text-rose-600" aria-hidden="true" />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold">Partai belum dapat dipindahkan</p>
                                        <ul className="mt-1 space-y-1 leading-relaxed">
                                            {clientErrors.map((message) => <li key={message}>{message}</li>)}
                                        </ul>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setClientErrors([])}
                                        aria-label="Tutup pesan kesalahan"
                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-rose-700 transition hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 sm:h-9 sm:w-9"
                                    >
                                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {drawingsPublished && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-sky-50/80 to-blue-50/90 p-4 text-sm text-blue-950 shadow-2xs">
                                <div className="flex items-start gap-3 min-w-0">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-800">
                                        <i className="fa-solid fa-calendar-check text-xs" />
                                    </span>
                                    <div>
                                        <p className="font-bold text-[#17120f] flex items-center gap-2 flex-wrap">
                                            <span>Penyesuaian Jadwal Hari-H Siap Digunakan</span>
                                            <span className="rounded-full bg-blue-100 border border-blue-300 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                                                Bagan Dipublikasikan
                                            </span>
                                        </p>
                                        <p className="mt-1 text-xs leading-relaxed text-[#40566d]">
                                            Anda bebas memindahkan jam atau court untuk partai yang <strong>belum selesai</strong>.
                                            Seluruh rekap nilai, hasil penilaian wasit, dan pemenang yang sudah ada <strong>tetap aman dan tidak akan berubah/ter-reset</strong>.
                                            Partai yang sudah selesai otomatis dikunci demi integritas rekam hasil pertandingan.
                                        </p>
                                    </div>
                                </div>
                                <div className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                                    <i className="fa-solid fa-shield-check text-emerald-600" />
                                    Nilai Pertandingan Terproteksi
                                </div>
                            </div>
                        )}

                        {conflictSummary?.has_clashes && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-sm text-amber-950 shadow-sm">
                                <div className="flex items-start gap-3 min-w-0">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900 font-bold">
                                        <i className="fa-solid fa-triangle-exclamation text-base" />
                                    </span>
                                    <div>
                                        <p className="font-bold text-sm sm:text-base text-[#17120f] flex items-center gap-2 flex-wrap">
                                            <span>Peringatan Jadwal: Terdeteksi Atlet yang Sama di Waktu Berdekatan</span>
                                            {conflictSummary.exact_clashes_count > 0 && (
                                                <span className="rounded-full bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                                                    🔴 {conflictSummary.exact_clashes_count} Bentrok Waktu Sama
                                                </span>
                                            )}
                                            {conflictSummary.tight_clashes_count > 0 && (
                                                <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                                                    🟡 {conflictSummary.tight_clashes_count} Jeda Mepet (Butuh Space)
                                                </span>
                                            )}
                                        </p>
                                        <p className="mt-1 text-xs leading-relaxed text-[#746b63]">
                                            Nama kontingen dan atlet kini ditampilkan langsung pada setiap kartu partai. Kartu <strong>merah</strong> menandakan waktu bersamaan di gelanggang lain, dan kartu <strong>kuning</strong> menandakan jeda istirahat mepet (≤ 30 menit).
                                            Tarik kartu ke slot waktu kosong atau klik &quot;Pilih partai&quot; lalu klik slot kosong untuk memberikan ruang jeda istirahat yang aman bagi atlet.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                                    <button
                                        type="button"
                                        onClick={() => setFilterClashOnly(!filterClashOnly)}
                                        className={`rounded-xl px-3.5 py-2 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                            filterClashOnly
                                                ? 'bg-[#17120f] text-[#f0c060]'
                                                : 'border border-amber-400 bg-white text-amber-900 hover:bg-amber-100'
                                        }`}
                                    >
                                        <i className="fa-solid fa-filter text-[10px]" />
                                        {filterClashOnly ? 'Tampilkan Semua' : `Sorot Bentrok/Mepet (${(conflictSummary.exact_clashes_count || 0) + (conflictSummary.tight_clashes_count || 0)})`}
                                    </button>
                                </div>
                            </div>
                        )}

                        {scheduleIsLocked && (
                            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                <i className="fa-solid fa-lock mt-0.5" />
                                <div>
                                    <p className="font-bold">Jadwal sedang dikunci</p>
                                    <p className="mt-1 leading-relaxed text-amber-800">Kembalikan drawing ke tahap penyusunan sebelum memindahkan partai.</p>
                                </div>
                            </div>
                        )}

                        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                ['Partai terjadwal', summary.scheduled_matches || 0, 'fa-calendar-check', 'text-emerald-600'],
                                ['Belum terjadwal', summary.unscheduled_matches || 0, 'fa-calendar-xmark', 'text-amber-600'],
                                ['Nomor pertandingan', summary.categories || 0, 'fa-list-ol', 'text-blue-600'],
                                ['Court aktif', summary.courts || 0, 'fa-vector-square', 'text-[#c0392b]'],
                            ].map(([label, value, icon, color]) => (
                                <div key={label} className="rounded-xl border border-[#e8e1d8] bg-white p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-[#746b63]">{label}</p>
                                        <i className={`fa-solid ${icon} ${color}`} />
                                    </div>
                                    <p className="mt-2 text-3xl font-bold leading-none">{value}</p>
                                </div>
                            ))}
                        </section>

                        <section className="flex flex-col gap-4 rounded-xl border border-[#e8e1d8] bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-sm font-bold uppercase tracking-wide text-[#9a6b20]">{activeEvent.name}</p>
                                <p className="mt-1.5 text-sm leading-relaxed text-[#746b63]">
                                    Slot {duration} menit · jeda atlet minimal {settings?.minimum_rest_minutes || 0} menit. Pemindahan hanya berlaku untuk satu partai yang dipilih.
                                </p>
                                {selectedMatch && (
                                    <p className="mt-2 text-sm font-semibold text-[#a93226]">
                                        Partai dipilih: {selectedMatch.category_name} #{selectedMatch.sequence}. Pilih slot kosong untuk memindahkan atau partai lain untuk menukar.
                                    </p>
                                )}
                            </div>
                            <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
                                {canManageSchedule && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleGenerateSchedule}
                                            disabled={isGeneratingSchedule}
                                            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#17120f] px-3.5 py-2.5 text-sm font-bold text-[#f0c060] shadow-sm hover:bg-black transition disabled:opacity-50 cursor-pointer"
                                            title="Susun ulang alokasi seluruh partai ke gelanggang dan sesi secara otomatis"
                                        >
                                            <i className={`fa-solid ${isGeneratingSchedule ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} mr-1.5`} />
                                            {isGeneratingSchedule ? 'Menyusun Jadwal...' : 'Generate Jadwal'}
                                        </button>
                                        {categories.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => openMoveCategoryModal()}
                                                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#d4a843] bg-[#fffaf0] px-3.5 py-2.5 text-sm font-bold text-[#8b651e] hover:bg-[#fff3d5] shadow-2xs transition cursor-pointer"
                                            >
                                                <i className="fa-solid fa-arrows-split-up-and-left mr-1.5" />Pindah Nomor Pertandingan
                                            </button>
                                        )}
                                    </>
                                )}
                                <Link href={`/admin/pertandingan/drawing${eventQuery}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#ded5ca] px-3.5 py-2.5 text-sm font-semibold text-[#5f574f] hover:bg-[#f7f4ef]">
                                    <i className="fa-solid fa-diagram-project mr-1.5" />Lihat Drawing
                                </Link>
                                <a
                                    href={`/admin/pertandingan/jadwal/pdf${eventQuery}`}
                                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-800 shadow-2xs transition cursor-pointer"
                                    title="Download dokumen resmi PDF jadwal pertandingan (Order of Play)"
                                >
                                    <i className="fa-solid fa-file-pdf mr-1.5" />Download PDF Jadwal
                                </a>
                                <a href={`/admin/pertandingan/jadwal/export${eventQuery}`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                                    <i className="fa-solid fa-file-excel mr-1.5" />Download Excel
                                </a>
                            </div>
                        </section>

                        {draggedCategory && (
                            <div className="sticky top-4 z-40 flex items-center justify-between gap-3 rounded-2xl border-2 border-[#d4a843] bg-gradient-to-r from-[#fff9ea] to-[#fff3d5] p-3.5 shadow-xl animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#d4a843] text-white font-bold animate-pulse">
                                        <i className="fa-solid fa-arrows-split-up-and-left text-sm" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-[#8b651e] uppercase tracking-wide">
                                            Sedang Menggeser Nomor Pertandingan
                                        </p>
                                        <p className="text-sm font-bold text-[#17120f] truncate">
                                            {draggedCategory.name}
                                        </p>
                                        <p className="text-[11px] text-[#746b63]">
                                            Lepaskan pada <strong>Header Gelanggang</strong> tujuan untuk otomatis menyesuaikan jadwal, atau lepaskan pada <strong>Slot Jam</strong> tertentu.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCategoryDragEnd}
                                    className="shrink-0 rounded-xl border border-[#d4a843]/60 bg-white px-3 py-1.5 text-xs font-bold text-[#8b651e] hover:bg-[#fef8eb] shadow-xs"
                                >
                                    Batalkan
                                </button>
                            </div>
                        )}

                        {categories && categories.length > 0 && (
                            <section className="rounded-2xl border border-[#e8e1d8] bg-white p-4 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#d4a843]/20 text-[#8b651e] font-bold text-xs">
                                            <i className="fa-solid fa-layer-group" />
                                        </span>
                                        <div>
                                            <h3 className="text-xs sm:text-sm font-bold text-[#17120f]">
                                                Daftar Nomor Pertandingan ({categories.length})
                                            </h3>
                                            <p className="text-[11px] text-[#746b63]">
                                                Tarik nomor pertandingan ke header court tujuan untuk memindahkan seluruh partainya sekaligus secara otomatis.
                                            </p>
                                        </div>
                                    </div>
                                    {canManageSchedule && (
                                        <button
                                            type="button"
                                            onClick={() => openMoveCategoryModal()}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#d4a843] bg-[#fffaf0] px-3 py-1.5 text-xs font-bold text-[#8b651e] hover:bg-[#fff3d5] shadow-2xs self-start sm:self-auto"
                                        >
                                            <i className="fa-solid fa-arrows-split-up-and-left text-xs" />
                                            <span>Pindah Nomor Pertandingan</span>
                                        </button>
                                    )}
                                </div>

                                <div className="mt-3 flex gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
                                    {categories.map((cat) => {
                                        const isEmbu = cat.type === 'embu';
                                        const isDraggingThis = draggedCategory?.id === cat.id;
                                        return (
                                            <div
                                                key={cat.id}
                                                draggable={canManageSchedule}
                                                onDragStart={(e) => canManageSchedule && handleCategoryDragStart(e, cat.id, cat.name)}
                                                onDragEnd={handleCategoryDragEnd}
                                                onClick={() => canManageSchedule && openMoveCategoryModal(cat.id)}
                                                className={`group shrink-0 rounded-xl border px-3 py-2 text-xs transition select-none ${
                                                    isDraggingThis
                                                        ? 'border-[#c0392b] bg-[#fff5f2] ring-2 ring-[#c0392b]/20 shadow-md'
                                                        : isEmbu
                                                            ? 'border-blue-200 bg-blue-50/60 hover:border-blue-300 hover:bg-blue-50'
                                                            : 'border-rose-200 bg-rose-50/60 hover:border-rose-300 hover:bg-rose-50'
                                                } ${canManageSchedule ? 'cursor-grab active:cursor-grabbing hover:shadow-2xs' : ''}`}
                                                title={canManageSchedule ? 'Tarik ke header gelanggang lain, atau klik untuk memilih opsi pindah' : cat.name}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`h-2 w-2 rounded-full ${isEmbu ? 'bg-blue-500' : 'bg-rose-500'}`} />
                                                    <span className="font-bold text-[#17120f] max-w-48 truncate">{cat.name}</span>
                                                    {canManageSchedule && (
                                                        <i className="fa-solid fa-grip-vertical text-[10px] text-gray-400 opacity-60 group-hover:opacity-100 ml-0.5" />
                                                    )}
                                                </div>
                                                <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-semibold text-gray-500">
                                                    <span>{cat.total_count} partai</span>
                                                    {cat.courts?.length > 0 && (
                                                        <span className="rounded bg-black/5 px-1.5 py-0.5 text-gray-700 truncate max-w-28">
                                                            {cat.courts.join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {selectedMatch && canManageSchedule && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-rose-300 bg-rose-50/80 p-4 shadow-sm">
                                <div className="flex items-start gap-2.5">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-700 font-bold">
                                        <i className="fa-solid fa-hand-pointer text-sm" />
                                    </span>
                                    <div>
                                        <p className="text-xs font-bold text-rose-950">
                                            Partai Terpilih: #{selectedMatch.sequence} {selectedMatch.category_name} ({selectedMatch.round_label})
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-rose-800">
                                            Klik slot kosong pada tabel untuk memindahkan, klik partai lain untuk menukar, atau klik tombol di sebelah kanan untuk melepas dari jadwal.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {selectedMatch.scheduled_start && (
                                        <button
                                            type="button"
                                            onClick={() => unscheduleMatch(selectedMatch.id)}
                                            disabled={Boolean(processingMatchId)}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-400 bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 disabled:opacity-50"
                                        >
                                            <i className="fa-solid fa-arrow-rotate-left text-[11px]" />
                                            <span>Lepas dari Jadwal (Unschedule)</span>
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMatchId(null)}
                                        className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                    >
                                        Batal
                                    </button>
                                </div>
                            </div>
                        )}

                        {unscheduledMatches.length > 0 && (
                            <section className="rounded-2xl border border-amber-300 bg-amber-50/60 p-4 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-800 font-bold">
                                            <i className="fa-solid fa-calendar-xmark text-sm" />
                                        </span>
                                        <div>
                                            <h3 className="text-xs sm:text-sm font-bold text-amber-950">
                                                Antrean Belum Terjadwal ({unscheduledMatches.length} Partai)
                                            </h3>
                                            <p className="text-[11px] text-amber-800">
                                                Partai yang dilepas atau belum memiliki slot. Pilih partai di bawah, lalu klik slot kosong pada tabel.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowUnscheduledPanel(!showUnscheduledPanel)}
                                        className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 shadow-2xs"
                                    >
                                        <span>{showUnscheduledPanel ? 'Tutup Antrean' : 'Buka Antrean (' + unscheduledMatches.length + ')'}</span>
                                        <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${showUnscheduledPanel ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>

                                {showUnscheduledPanel && (
                                    <div className="mt-4 grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 max-h-72 overflow-y-auto p-1">
                                        {unscheduledMatches.map((m) => {
                                            const isSel = selectedMatchId === m.id;
                                            return (
                                                <div
                                                    key={m.id}
                                                    className={`flex flex-col justify-between rounded-xl border p-3 transition ${isSel ? 'border-[#c0392b] bg-[#fff5f2] ring-2 ring-[#c0392b]/20 shadow-xs' : 'border-amber-200 bg-white hover:border-amber-300'}`}
                                                >
                                                    <div>
                                                        <div className="flex items-center justify-between text-[10px] font-bold">
                                                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">Partai #{m.sequence}</span>
                                                            <span className="uppercase text-gray-500">{m.category_type}</span>
                                                        </div>
                                                        <p className="mt-1 font-bold text-xs text-[#17120f]">{m.category_name}</p>
                                                        <p className="text-[11px] text-gray-600">{m.round_label}</p>
                                                        {m.contingent_name && (
                                                            <p className="mt-1 text-[11px] font-semibold text-[#8b651e] flex items-center gap-1">
                                                                <i className="fa-solid fa-flag text-[9px]" />
                                                                <span className="truncate">{m.contingent_name}</span>
                                                            </p>
                                                        )}
                                                        {m.athlete_name ? (
                                                            <p className="text-[11px] text-[#4f4740] flex items-center gap-1">
                                                                <i className="fa-solid fa-user text-[9px] text-[#8c827a]" />
                                                                <span className="truncate">{m.athlete_name}</span>
                                                            </p>
                                                        ) : (
                                                            <p className="mt-1 text-[11px] text-gray-700 italic truncate">{m.participant || 'Menunggu kenshi'}</p>
                                                        )}
                                                    </div>
                                                    {canManageSchedule && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedMatchId(isSel ? null : m.id)}
                                                            className={`mt-2.5 w-full rounded-lg py-1.5 text-xs font-bold transition ${isSel ? 'bg-[#c0392b] text-white' : 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'}`}
                                                        >
                                                            {isSel ? 'Batalkan Pilihan' : 'Pilih untuk Dijadwalkan'}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        )}

                        {courts.length === 0 || sessions.length === 0 ? (
                            <EmptyState
                                icon="fa-calendar-plus"
                                title="Court atau sesi belum tersedia"
                                description="Tambahkan court aktif dan rundown yang ditandai sebagai sesi pertandingan pada Detail Event."
                            />
                        ) : matches.length === 0 ? (
                            <div className="rounded-2xl border border-[#ded5ca] bg-white p-8 text-center space-y-4 shadow-sm">
                                <EmptyState
                                    icon="fa-wand-magic-sparkles"
                                    title="Jadwal belum digenerate"
                                    description="Partai pertandingan belum teralokasi ke court dan sesi pertandingan. Anda dapat menyusun jadwal otomatis sekarang."
                                />
                                {canManageSchedule && (
                                    <div className="flex justify-center pt-2">
                                        <button
                                            type="button"
                                            onClick={handleGenerateSchedule}
                                            disabled={isGeneratingSchedule}
                                            className="inline-flex items-center gap-2 rounded-xl bg-[#17120f] px-5 py-3 text-sm font-bold text-[#f0c060] shadow-md hover:bg-black transition cursor-pointer disabled:opacity-50"
                                        >
                                            <i className={`fa-solid ${isGeneratingSchedule ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`} />
                                            {isGeneratingSchedule ? 'Menyusun Jadwal...' : 'Generate Jadwal Otomatis Sekarang'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {sessions.map((session) => {
                                    const slots = sessionSlots(session, duration);

                                    return (
                                        <section key={session.id} className="overflow-hidden rounded-2xl border border-[#e8e1d8] bg-white shadow-sm">
                                            <div className="flex flex-col gap-2 border-b border-[#e8e1d8] bg-[#f8f6f2] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <h2 className="font-bold text-[#17120f]">{session.name}</h2>
                                                    <p className="mt-0.5 text-xs text-[#746b63]">{session.date_formatted} · {session.start_time}–{session.end_time}</p>
                                                </div>
                                                <span className="w-fit rounded-full border border-[#ded5ca] bg-white px-3 py-1 text-xs font-semibold text-[#746b63]">{slots.length} slot per court</span>
                                            </div>

                                            <p className="border-b border-[#e8e1d8] bg-blue-50 px-4 py-2 text-[11px] font-medium leading-relaxed text-blue-800 lg:hidden">
                                                <i className="fa-solid fa-hand-pointer mr-1.5" aria-hidden="true" />Geser tabel ke samping. Pada layar sentuh, pilih satu partai lalu tekan slot atau partai tujuan.
                                            </p>
                                            <div className="overflow-x-auto overscroll-x-contain" tabIndex="0" role="region" aria-label={`Papan jadwal ${session.name}`}>
                                                <div className="min-w-max" style={{ width: `max(100%, ${90 + (courts.length * 260)}px)` }}>
                                                    <div className="grid border-b border-[#e8e1d8] bg-white" style={{ gridTemplateColumns }}>
                                                        <div className="sticky left-0 z-20 flex items-center justify-center border-r border-[#e8e1d8] bg-white px-3 py-3 text-xs font-bold uppercase tracking-wide text-[#8c827a]">Waktu</div>
                                                        {courts.map((court) => {
                                                            const isCourtHeaderDropTarget = dropTarget === `court-header:${court.id}`;
                                                            return (
                                                                <div
                                                                    key={court.id}
                                                                    onDragOver={(event) => {
                                                                        if (!canManageSchedule || !draggedCategory) return;
                                                                        event.preventDefault();
                                                                        event.dataTransfer.dropEffect = 'move';
                                                                        setDropTarget(`court-header:${court.id}`);
                                                                    }}
                                                                    onDragLeave={() => {
                                                                        if (dropTarget === `court-header:${court.id}`) setDropTarget(null);
                                                                    }}
                                                                    onDrop={(event) => {
                                                                        event.preventDefault();
                                                                        event.stopPropagation();
                                                                        const categoryId = event.dataTransfer.getData('text/perkemi-category') || draggedCategory?.id;
                                                                        if (categoryId) {
                                                                            moveCategoryCourt(categoryId, court.id, { placement_mode: 'auto' });
                                                                        }
                                                                    }}
                                                                    className={`border-r border-[#e8e1d8] px-4 py-3 text-center text-sm font-bold last:border-r-0 transition ${
                                                                        isCourtHeaderDropTarget
                                                                            ? 'bg-amber-100 text-[#8b651e] ring-2 ring-inset ring-[#d4a843]'
                                                                            : draggedCategory
                                                                                ? 'bg-amber-50/80 border-dashed border-amber-300 text-amber-900 cursor-pointer animate-pulse'
                                                                                : ''
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <i className="fa-solid fa-vector-square mr-2 text-[#d4a843]" />
                                                                        <span>{court.name}</span>
                                                                    </div>
                                                                    {draggedCategory && (
                                                                        <p className="mt-1 text-[11px] font-semibold text-amber-800">
                                                                            {isCourtHeaderDropTarget ? '✓ Lepas untuk pindah ke sini' : '↓ Lepas di sini'}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {slots.map((startTime) => (
                                                        <div key={`${session.id}:${startTime}`} className="grid border-b border-[#eee8e0] last:border-b-0" style={{ gridTemplateColumns }}>
                                                            <div className="sticky left-0 z-10 flex min-h-32 flex-col items-center justify-center border-r border-[#e8e1d8] bg-[#fbfaf8] px-2 py-3">
                                                                <span className="text-sm font-bold text-[#17120f]">{startTime}</span>
                                                                <span className="mt-1 text-[10px] font-semibold text-[#9b9188]">{minutesToTime(timeToMinutes(startTime) + duration)}</span>
                                                            </div>
                                                            {courts.map((court) => {
                                                                const key = slotKey(session.id, startTime, court.id);
                                                                const match = matchesBySlot.get(key);
                                                                const isActiveDropTarget = dropTarget === key;

                                                                if (match) {
                                                                    const canSwapWithSelected = canManageSchedule
                                                                        && selectedMatch
                                                                        && selectedMatch.id !== match.id;

                                                                    return (
                                                                        <div
                                                                            key={court.id}
                                                                            onDragOver={(event) => {
                                                                                if (!canManageSchedule) return;
                                                                                if (!draggedCategory && selectedMatch?.id === match.id) return;

                                                                                event.preventDefault();
                                                                                event.dataTransfer.dropEffect = 'move';
                                                                                setDropTarget(key);
                                                                            }}
                                                                            onDrop={(event) => handleDrop(event, session, court, startTime, match.id)}
                                                                            className={`relative min-h-32 border-r border-[#eee8e0] p-2.5 transition last:border-r-0 ${
                                                                                filterClashOnly && match.clash_type === 'none' ? 'opacity-30 grayscale-[50%]' : ''
                                                                            } ${isActiveDropTarget ? 'bg-amber-50 ring-2 ring-inset ring-[#d4a843]' : ''}`}
                                                                        >
                                                                            {isActiveDropTarget && draggedCategory && (
                                                                                <div className="pointer-events-none absolute inset-x-2 top-2 z-20 flex items-center justify-center gap-1.5 rounded-lg bg-[#8b651e] px-2 py-1.5 text-center text-[11px] font-bold text-white shadow-md" aria-live="polite">
                                                                                    <i className="fa-solid fa-arrow-down" aria-hidden="true" />
                                                                                    Mulai di {court.name}, {startTime}
                                                                                </div>
                                                                            )}
                                                                            {isActiveDropTarget && !draggedCategory && selectedMatch?.id !== match.id && (
                                                                                <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex items-center justify-center gap-1.5 rounded-lg bg-[#8b651e] px-2 py-1.5 text-center text-[11px] font-bold text-white shadow-sm" aria-live="polite">
                                                                                    <i className="fa-solid fa-right-left" aria-hidden="true" />
                                                                                    Lepaskan untuk menukar partai
                                                                                </div>
                                                                            )}
                                                                            <MatchCard
                                                                                match={match}
                                                                                canManage={canManageSchedule}
                                                                                isSelected={selectedMatch?.id === match.id}
                                                                                isProcessing={processingMatch?.id === match.id || processingCategoryId === match.category_id}
                                                                                onSelect={(matchId) => setSelectedMatchId((current) => current === matchId ? null : matchId)}
                                                                                onUnschedule={unscheduleMatch}
                                                                                onDragStart={handleDragStart}
                                                                                onDragEnd={() => {
                                                                                    setDraggedMatchId(null);
                                                                                    setDropTarget(null);
                                                                                }}
                                                                                onCategoryDragStart={handleCategoryDragStart}
                                                                                onCategoryDragEnd={handleCategoryDragEnd}
                                                                                onOpenMoveCategoryModal={openMoveCategoryModal}
                                                                            />
                                                                            {canSwapWithSelected && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => moveMatch(selectedMatch.id, session, court, startTime, match.id)}
                                                                                    disabled={Boolean(processingMatchId)}
                                                                                    className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#d4a843] bg-[#fffaf0] px-3 py-2 text-xs font-bold text-[#8b651e] transition hover:bg-[#fff3d5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c0392b] disabled:cursor-wait disabled:opacity-60 sm:min-h-10"
                                                                                >
                                                                                    <i className="fa-solid fa-right-left" aria-hidden="true" />
                                                                                    Tukar dengan partai terpilih
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                }

                                                                return (
                                                                    <div
                                                                        key={court.id}
                                                                        onDragOver={(event) => {
                                                                            if (!canManageSchedule) {
                                                                                return;
                                                                            }

                                                                            event.preventDefault();
                                                                            event.dataTransfer.dropEffect = 'move';
                                                                            setDropTarget(key);
                                                                        }}
                                                                        onDrop={(event) => handleDrop(event, session, court, startTime)}
                                                                        className={`relative min-h-32 border-r border-[#eee8e0] p-2.5 transition last:border-r-0 ${isActiveDropTarget ? 'bg-amber-50' : ''}`}
                                                                    >
                                                                        {isActiveDropTarget && draggedCategory && (
                                                                            <div className="pointer-events-none absolute inset-x-2 top-2 z-20 flex items-center justify-center gap-1.5 rounded-lg bg-[#8b651e] px-2 py-1.5 text-center text-[11px] font-bold text-white shadow-md" aria-live="polite">
                                                                                <i className="fa-solid fa-arrow-down" aria-hidden="true" />
                                                                                Mulai di {court.name}, {startTime}
                                                                            </div>
                                                                        )}
                                                                        {selectedMatch && canManageSchedule ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => moveMatch(selectedMatch.id, session, court, startTime)}
                                                                                disabled={Boolean(processingMatchId)}
                                                                                className="flex h-full min-h-27 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#d4a843] bg-[#fffaf0] px-3 text-center text-xs font-bold text-[#8b651e] transition hover:bg-[#fff3d5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c0392b] disabled:cursor-wait disabled:opacity-60"
                                                                            >
                                                                                <i className="fa-solid fa-arrow-down mb-2 text-sm" />
                                                                                Pindahkan partai ke {court.name}, {startTime}
                                                                            </button>
                                                                        ) : (
                                                                            <div className="flex h-full min-h-27 items-center justify-center rounded-xl border border-dashed border-[#ddd5cc] text-xs font-medium text-[#b0a79e]">
                                                                                {draggedCategory ? `Tarik ke sini untuk mulai pukul ${startTime}` : 'Slot kosong'}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal Pindah Nomor Pertandingan */}
            <Modal
                isOpen={moveCategoryModal.isOpen}
                onClose={() => setMoveCategoryModal({ isOpen: false, categoryId: null })}
                title="Pindahkan Nomor Pertandingan ke Gelanggang Lain"
                subtitle="Seluruh partai dalam nomor pertandingan ini akan dipindahkan ke gelanggang tujuan dan jadwalnya disesuaikan secara otomatis."
                size="lg"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            Pilih Nomor Pertandingan
                        </label>
                        <select
                            value={selectedCategoryInModal?.id || ''}
                            onChange={(e) => {
                                const catId = e.target.value;
                                const cat = categories.find((c) => c.id === catId);
                                const initialTargetCourt = courts.find((c) => c.id !== cat?.primary_court_id)?.id || courts[0]?.id || '';
                                setModalTargetCourtId(initialTargetCourt);
                                setMoveCategoryModal(prev => ({ ...prev, categoryId: catId }));
                            }}
                            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-[#c0392b] focus:ring-[#c0392b]"
                        >
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name} ({cat.type === 'embu' ? 'Embu' : 'Randori'} · {cat.total_count} partai)
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedCategoryInModal && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 space-y-1.5">
                            <div className="flex items-center justify-between font-bold">
                                <span className="text-sm text-[#17120f]">{selectedCategoryInModal.name}</span>
                                <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[10px] uppercase font-bold text-amber-900">
                                    {selectedCategoryInModal.type}
                                </span>
                            </div>
                            <p className="text-amber-800">
                                Total: <strong>{selectedCategoryInModal.total_count} partai</strong> ({selectedCategoryInModal.scheduled_count} terjadwal, {selectedCategoryInModal.unscheduled_count} antrean belum terjadwal).
                            </p>
                            {selectedCategoryInModal.courts?.length > 0 && (
                                <p className="text-amber-700 text-[11px]">
                                    Saat ini berada di: <strong>{selectedCategoryInModal.courts.join(', ')}</strong>
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            Gelanggang (Court) Tujuan
                        </label>
                        <select
                            value={modalTargetCourtId}
                            onChange={(e) => setModalTargetCourtId(e.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-[#c0392b] focus:ring-[#c0392b]"
                        >
                            {courts.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} {selectedCategoryInModal?.primary_court_id === c.id ? '(Gelanggang Saat Ini)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                            Mode Penempatan Jadwal
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="radio"
                                    name="modalPlacementMode"
                                    value="auto"
                                    checked={modalPlacementMode === 'auto'}
                                    onChange={() => setModalPlacementMode('auto')}
                                    className="mt-0.5 text-[#c0392b] focus:ring-[#c0392b]"
                                />
                                <div className="text-xs">
                                    <p className="font-bold text-slate-900">Otomatis (Cari slot kosong pertama) — Rekomendasi</p>
                                    <p className="text-slate-600 mt-0.5">Sistem mencari slot berurutan paling awal yang tersedia tanpa bentrok jadwal atau jeda istirahat atlet.</p>
                                </div>
                            </label>
                            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="radio"
                                    name="modalPlacementMode"
                                    value="append"
                                    checked={modalPlacementMode === 'append'}
                                    onChange={() => setModalPlacementMode('append')}
                                    className="mt-0.5 text-[#c0392b] focus:ring-[#c0392b]"
                                />
                                <div className="text-xs">
                                    <p className="font-bold text-slate-900">Setelah partai terakhir di gelanggang tujuan</p>
                                    <p className="text-slate-600 mt-0.5">Menyambung langsung setelah pertandingan terakhir yang telah dijadwalkan pada gelanggang tujuan.</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 border-t border-slate-100 pt-4">
                    <button
                        type="button"
                        onClick={() => setMoveCategoryModal({ isOpen: false, categoryId: null })}
                        className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        disabled={!selectedCategoryInModal || !modalTargetCourtId || Boolean(processingCategoryId)}
                        onClick={() => {
                            moveCategoryCourt(selectedCategoryInModal.id, modalTargetCourtId, {
                                placement_mode: modalPlacementMode,
                            });
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#c0392b] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#a93226] disabled:opacity-50 shadow-sm"
                    >
                        {processingCategoryId ? (
                            <>
                                <i className="fa-solid fa-spinner animate-spin" />
                                <span>Menyesuaikan Jadwal...</span>
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-arrows-split-up-and-left" />
                                <span>Pindahkan & Sesuaikan Jadwal Otomatis</span>
                            </>
                        )}
                    </button>
                </div>
            </Modal>
        </AdminLayout>
    );
}
