import Combobox from '@/Components/UI/Forms/Combobox';
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

function MatchCard({ match, canManage, isSelected, isProcessing, onSelect, onDragStart, onDragEnd }) {
    const isEmbu = match.category_type === 'embu';

    return (
        <article
            draggable={canManage && !isProcessing}
            onDragStart={(event) => onDragStart(event, match)}
            onDragEnd={onDragEnd}
            className={`group rounded-xl border p-3 shadow-sm transition ${
                isSelected
                    ? 'border-[#c0392b] bg-[#fff5f2] ring-2 ring-[#c0392b]/15'
                    : isEmbu
                        ? 'border-blue-200 bg-blue-50/70 hover:border-blue-300'
                        : 'border-rose-200 bg-rose-50/70 hover:border-rose-300'
            } ${canManage ? 'cursor-grab active:cursor-grabbing' : ''} ${isProcessing ? 'opacity-60' : ''}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isEmbu ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                            {isEmbu ? 'Embu' : 'Randori'}
                        </span>
                        <span className="text-[11px] font-semibold text-[#8c827a]">Partai #{match.sequence}</span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-bold leading-snug text-[#17120f]">{match.category_name}</h3>
                    <p className="mt-1 text-xs font-semibold text-[#746b63]">{match.round_label}</p>
                </div>
                {canManage && (
                    <i className={`fa-solid ${isProcessing ? 'fa-spinner animate-spin' : 'fa-grip-vertical'} mt-1 text-[#9b9188]`} aria-hidden="true" />
                )}
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#5f574f]">{match.participant || 'Menunggu peserta'}</p>
            <div className="mt-2 flex items-center justify-between border-t border-black/5 pt-2 text-[11px] font-semibold text-[#746b63]">
                <span>{match.scheduled_start}–{match.scheduled_end}</span>
                <span>{match.court}</span>
            </div>
            {canManage && (
                <div className="mt-2 flex items-center gap-1.5">
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
    matches = [],
    unscheduledMatches = [],
    settings = null,
    summary = {},
    scheduleIsLocked = false,
    canManageSchedule = false,
}) {
    const { flash = {} } = usePage().props;
    const [selectedMatchId, setSelectedMatchId] = useState(null);
    const [draggedMatchId, setDraggedMatchId] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);
    const [processingMatchId, setProcessingMatchId] = useState(null);
    const [clientErrors, setClientErrors] = useState([]);
    const [showUnscheduledPanel, setShowUnscheduledPanel] = useState(false);
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
    };

    const handleDrop = (event, session, court, startTime, swapWithMatchId = null) => {
        event.preventDefault();
        event.stopPropagation();
        const matchId = event.dataTransfer.getData('text/plain') || draggedMatchId || selectedMatchId;

        if (matchId) {
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
                                <Link href={`/admin/pertandingan/drawing${eventQuery}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#ded5ca] px-3.5 py-2.5 text-sm font-semibold text-[#5f574f] hover:bg-[#f7f4ef]">
                                    <i className="fa-solid fa-diagram-project mr-1.5" />Lihat Drawing
                                </Link>
                                <a href={`/admin/pertandingan/jadwal/export${eventQuery}`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                                    <i className="fa-solid fa-file-excel mr-1.5" />Download Excel
                                </a>
                            </div>
                        </section>

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
                                                        <p className="mt-1 text-[11px] text-gray-700 italic truncate">{m.participant || 'Menunggu kenshi'}</p>
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
                            <EmptyState
                                icon="fa-wand-magic-sparkles"
                                title="Jadwal belum digenerate"
                                description="Buka Drawing & Bagan TM lalu generate drawing agar partai masuk ke papan jadwal event ini."
                            />
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
                                                        {courts.map((court) => (
                                                            <div key={court.id} className="border-r border-[#e8e1d8] px-4 py-3 text-center text-sm font-bold last:border-r-0">
                                                                <i className="fa-solid fa-vector-square mr-2 text-[#d4a843]" />{court.name}
                                                            </div>
                                                        ))}
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
                                                                                if (!canManageSchedule || selectedMatch?.id === match.id) {
                                                                                    return;
                                                                                }

                                                                                event.preventDefault();
                                                                                event.dataTransfer.dropEffect = 'move';
                                                                                setDropTarget(key);
                                                                            }}
                                                                            onDrop={(event) => handleDrop(event, session, court, startTime, match.id)}
                                                                            className={`relative min-h-32 border-r border-[#eee8e0] p-2.5 transition last:border-r-0 ${isActiveDropTarget ? 'bg-amber-50 ring-2 ring-inset ring-[#d4a843]' : ''}`}
                                                                        >
                                                                            {isActiveDropTarget && selectedMatch?.id !== match.id && (
                                                                                <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex items-center justify-center gap-1.5 rounded-lg bg-[#8b651e] px-2 py-1.5 text-center text-[11px] font-bold text-white shadow-sm" aria-live="polite">
                                                                                    <i className="fa-solid fa-right-left" aria-hidden="true" />
                                                                                    Lepaskan untuk menukar partai
                                                                                </div>
                                                                            )}
                                                                            <MatchCard
                                                                                match={match}
                                                                                canManage={canManageSchedule}
                                                                                isSelected={selectedMatch?.id === match.id}
                                                                                isProcessing={processingMatch?.id === match.id}
                                                                                onSelect={(matchId) => setSelectedMatchId((current) => current === matchId ? null : matchId)}
                                                                                onUnschedule={unscheduleMatch}
                                                                                onDragStart={handleDragStart}
                                                                                onDragEnd={() => {
                                                                                    setDraggedMatchId(null);
                                                                                    setDropTarget(null);
                                                                                }}
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
                                                                        className={`min-h-32 border-r border-[#eee8e0] p-2.5 transition last:border-r-0 ${isActiveDropTarget ? 'bg-amber-50' : ''}`}
                                                                    >
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
                                                                                Slot kosong
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
        </AdminLayout>
    );
}
