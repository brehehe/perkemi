import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ThemeToggle from '@/Components/UI/Elements/ThemeToggle';
import useSynchronizedTimer from './Partials/useSynchronizedTimer';
import useLiveTimer from './Partials/useLiveTimer';
import useTimerBell from './Partials/useTimerBell';
import TimerBellControls from './Partials/TimerBellControls';
import { displayedTimerSeconds, timerVersion } from './Partials/timerSynchronization';

const modes = [
    ['arena', 'Arena', 'fa-tv'],
    ['timer', 'Timer', 'fa-stopwatch'],
    ['result', 'Hasil', 'fa-ranking-star'],
    ['officials', 'Ofisial', 'fa-user-shield'],
];

const formatTimer = (totalSeconds) => {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

function ParticipantDisplay({ match }) {
    if (match.category_type === 'embu') {
        const athletes = match.participant?.athletes || [];
        const techniques = match.participant?.techniques || [];

        return (
            <div className="rounded-3xl border border-blue-400/20 bg-blue-400/10 p-5 md:p-8">
                <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-300">{match.participant?.kind || 'Tim Embu'}</p>
                    <p className="mt-3 text-2xl font-black leading-tight md:text-4xl">{match.participant_label || 'Peserta belum ditentukan'}</p>
                </div>
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <section className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5" aria-labelledby="monitor-athletes-title">
                        <div className="flex items-center justify-between gap-3">
                            <h3 id="monitor-athletes-title" className="text-sm font-black uppercase tracking-[.14em] text-[#f2cd73]">Nama Atlet</h3>
                            <span className="text-xs font-bold text-white/55">{athletes.length} atlet</span>
                        </div>
                        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                            {athletes.map((athlete, index) => (
                                <li key={athlete.id || `${athlete.name}-${index}`} className="flex min-h-12 items-center gap-3 rounded-xl bg-white/[.07] px-3 py-2">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d4a843]/20 text-sm font-black text-[#f2cd73]">{index + 1}</span>
                                    <span className="break-words text-base font-bold md:text-lg">{athlete.name}</span>
                                </li>
                            ))}
                            {athletes.length === 0 && <li className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/50 sm:col-span-2">Nama atlet belum tersedia.</li>}
                        </ol>
                    </section>
                    <section className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5" aria-labelledby="monitor-techniques-title">
                        <div className="flex items-center justify-between gap-3">
                            <h3 id="monitor-techniques-title" className="text-sm font-black uppercase tracking-[.14em] text-blue-300">Teknik Terdaftar</h3>
                            <span className="text-xs font-bold text-white/55">{techniques.length} teknik</span>
                        </div>
                        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                            {techniques.map((technique, index) => (
                                <li key={technique.id} className="flex min-h-12 items-center gap-3 rounded-xl bg-white/[.07] px-3 py-2">
                                    <span className="font-mono text-xs font-black text-blue-300">{String(technique.order || index + 1).padStart(2, '0')}</span>
                                    <span className="break-words text-sm font-semibold md:text-base">{technique.name}</span>
                                </li>
                            ))}
                            {techniques.length === 0 && <li className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/50 sm:col-span-2">Teknik belum tercatat saat registrasi.</li>}
                        </ol>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className="grid overflow-hidden rounded-3xl border border-white/10 md:grid-cols-[1fr_auto_1fr]">
            <div className="bg-rose-600/20 p-6 md:p-10">
                <p className="text-xs font-bold uppercase tracking-[.18em] text-rose-300">AKA · Merah</p>
                <p className="mt-4 text-2xl font-black leading-tight md:text-4xl">{match.aka_label || 'Menunggu pemenang'}</p>
            </div>
            <div className="flex items-center justify-center border-y border-white/10 bg-black/20 px-6 py-3 text-xl font-black text-white/40 md:border-x md:border-y-0">VS</div>
            <div className="bg-white/5 p-6 text-right md:p-10">
                <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-300">SHIRO · Putih</p>
                <p className="mt-4 text-2xl font-black leading-tight md:text-4xl">{match.shiro_label || 'Menunggu pemenang'}</p>
            </div>
        </div>
    );
}

function EmptyCourt({ court }) {
    return (
        <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[.03] p-5 text-center sm:p-8">
            <i className="fa-solid fa-hourglass-start text-5xl text-[#d4a843]" aria-hidden="true" />
            <h2 className="mt-6 text-3xl font-black">Menunggu Panggilan</h2>
            <p className="mt-2 max-w-xl text-white/55">Belum ada partai aktif di {court.name}. Layar akan diperbarui otomatis saat Panitera memanggil ofisial atau peserta.</p>
        </div>
    );
}

export default function CourtMonitor({ activeEvent, court, mode = 'arena', monitor, stateUrl, timerStateUrl }) {
    const [snapshot, setSnapshot] = useState(monitor);
    const refreshController = useRef(null);

    const refreshSnapshot = useCallback(async () => {
        refreshController.current?.abort();
        const controller = new AbortController();
        refreshController.current = controller;

        try {
            const response = await fetch(stateUrl, {
                headers: { Accept: 'application/json' },
                cache: 'no-store',
                signal: controller.signal,
            });

            if (!response.ok) throw new Error('Monitor tidak dapat diperbarui.');
            const nextSnapshot = await response.json();

            setSnapshot((current) => {
                const isSameMatch = nextSnapshot.active_match?.id === current.active_match?.id;
                const isOlderState = isSameMatch
                    && timerVersion(nextSnapshot.active_match?.timer) < timerVersion(current.active_match?.timer);

                if (isOlderState) return current;
                return nextSnapshot;
            });
        } catch (error) {
            // Timer synchronization has its own lightweight connection and retry.
        } finally {
            if (refreshController.current === controller) refreshController.current = null;
        }
    }, [stateUrl]);

    const initialTimerState = useMemo(() => ({
        event_id: activeEvent.id, court_id: court.id, match_id: monitor.active_match?.id ?? null,
        match_status: monitor.active_match?.status, call_status: monitor.active_match?.call_status,
        timer: monitor.active_match?.timer, server_now_ms: monitor.server_now_ms,
    }), [activeEvent.id, court.id, monitor]);
    const bellRef = useRef(null);
    const liveTimer = useLiveTimer({
        initialState: initialTimerState, stateUrl: timerStateUrl,
        channelName: `event-court.${court.id}`, eventId: activeEvent.id, courtId: court.id,
        onChange: (next, previous) => {
            if (next.action === 'finish' || (next.timer?.is_finished && !previous?.timer?.is_finished)) {
                bellRef.current?.playClosingBell?.();
            }
            if (next.match_id !== previous?.match_id || next.timer?.is_finished
                || !['start', 'pause', 'reset_timer', 'configure_timer'].includes(next.action)) refreshSnapshot();
        },
    });
    const { connected: realtimeConnected, httpConnected } = liveTimer;
    const activeMatch = snapshot.active_match?.id === liveTimer.state?.match_id ? {
        ...snapshot.active_match,
        status: liveTimer.state.match_status,
        call_status: liveTimer.state.call_status,
        timer: liveTimer.state.timer,
    } : null;

    useEffect(() => () => refreshController.current?.abort(), []);

    useEffect(() => {
        let cancelled = false;
        let timeoutId;
        const interval = 30000;

        const poll = async () => {
            await refreshSnapshot();
            if (!cancelled) timeoutId = window.setTimeout(poll, interval);
        };

        timeoutId = window.setTimeout(poll, interval);

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [refreshSnapshot]);

    useEffect(() => {
        const resynchronize = () => {
            if (document.visibilityState === 'visible') refreshSnapshot();
        };

        window.addEventListener('online', resynchronize);
        document.addEventListener('visibilitychange', resynchronize);

        return () => {
            window.removeEventListener('online', resynchronize);
            document.removeEventListener('visibilitychange', resynchronize);
        };
    }, [refreshSnapshot]);

    const timer = liveTimer.state?.timer;
    const elapsedMilliseconds = useSynchronizedTimer(timer, liveTimer.serverClock, liveTimer.state?.match_id);
    const bell = useTimerBell({ timer, elapsedMilliseconds, matchId: liveTimer.state?.match_id, synchronized: liveTimer.synchronized });
    bellRef.current = bell;
    const elapsedSeconds = useMemo(() => Math.floor(elapsedMilliseconds / 1000), [elapsedMilliseconds]);

    const timerDirection = activeMatch?.timer.direction || 'up';
    const timerDuration = Number(activeMatch?.timer.duration_seconds) || 120;
    const displayedSeconds = displayedTimerSeconds(activeMatch?.timer, elapsedMilliseconds);
    const timerText = activeMatch?.timer.status === 'running' && !liveTimer.synchronized ? '--:--' : formatTimer(displayedSeconds);
    const isExpired = timerDirection === 'down' && elapsedSeconds >= timerDuration;
    const resultMatch = activeMatch?.result ? activeMatch : snapshot.last_result;
    const monitorUrl = (targetMode) => `/admin/panitera/scoring/monitors/${court.id}?event_id=${encodeURIComponent(activeEvent.id)}&mode=${targetMode}`;
    const synchronizationLabel = !liveTimer.synchronized ? 'Menyinkronkan jam server…' : realtimeConnected
        ? 'Real-time Reverb'
        : httpConnected
            ? 'Sinkronisasi cadangan'
            : 'Menghubungkan ulang';
    const synchronizationClass = realtimeConnected
        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
        : httpConnected
            ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
            : 'border-rose-400/30 bg-rose-400/10 text-rose-300';

    return (
        <>
            <Head title={`${court.name} · Monitor ${mode} | Smart Perkemi`} />
            <main className="court-monitor min-h-dvh bg-[#090807] px-3 py-3 text-white sm:px-6 sm:py-5 lg:px-8">
                <header className="mx-auto max-w-[1800px] rounded-2xl border border-white/10 bg-[#151210] p-4 shadow-2xl">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#d4a843]">{activeEvent.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-3">
                                <h1 className="text-2xl font-black md:text-3xl">{court.name}</h1>
                                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${synchronizationClass}`} role="status">
                                    <span className={`h-2 w-2 rounded-full ${realtimeConnected ? 'bg-emerald-400' : httpConnected ? 'bg-amber-400' : 'bg-rose-400'}`} />
                                    {synchronizationLabel}
                                </span>
                            </div>
                            <p className="mt-1 text-sm text-white/50">{court.location || activeEvent.venue || activeEvent.city}</p>
                        </div>
                        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center xl:w-auto">
                            <nav className="col-span-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Mode monitor">
                                {modes.map(([key, label, icon]) => (
                                    <a key={key} href={monitorUrl(key)} aria-current={mode === key ? 'page' : undefined} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4a843] sm:min-h-10 ${mode === key ? 'bg-[#d4a843] text-black' : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}>
                                        <i className={`fa-solid ${icon}`} aria-hidden="true" />{label}
                                    </a>
                                ))}
                            </nav>
                            <button type="button" onClick={() => document.documentElement.requestFullscreen?.()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/70 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4a843] sm:min-h-10">
                                <i className="fa-solid fa-expand" aria-hidden="true" />Layar Penuh
                            </button>
                            <ThemeToggle className="border-white/10 bg-white/5 text-white/70 shadow-none hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10" />
                            <TimerBellControls bell={bell} />
                            <a href={`/admin/panitera/scoring?event_id=${encodeURIComponent(activeEvent.id)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/70 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4a843] sm:min-h-10">
                                <i className="fa-solid fa-arrow-left" aria-hidden="true" />Panitera
                            </a>
                        </div>
                    </div>
                </header>

                <div className="mx-auto mt-5 max-w-[1800px]">
                    {mode === 'arena' && (
                        activeMatch ? (
                            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                                <section className="rounded-3xl border border-white/10 bg-[#151210] p-4 shadow-2xl sm:p-5 md:p-8">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div><p className="text-sm font-bold uppercase tracking-[.16em] text-[#d4a843]">{activeMatch.category_type} · Partai #{activeMatch.sequence}</p><h2 className="mt-2 text-2xl font-black md:text-4xl">{activeMatch.category_name}</h2><p className="mt-2 text-white/55">{activeMatch.round_label}{activeMatch.pool ? ` · Pool ${activeMatch.pool}` : ''}</p></div>
                                        <div className="rounded-2xl border border-[#d4a843]/30 bg-[#d4a843]/10 px-4 py-3 text-right"><p className="text-xs font-bold text-[#e8c66b]">{activeMatch.call_status_label}</p><p className="mt-1 font-mono text-3xl font-black">{timerText}</p></div>
                                    </div>
                                    <div className="mt-8"><ParticipantDisplay match={activeMatch} /></div>
                                </section>
                                <aside className="rounded-3xl border border-white/10 bg-[#151210] p-5">
                                    <div className="flex items-center justify-between"><h2 className="font-bold">Antrean Berikutnya</h2><span className="text-xs text-white/45">{snapshot.progress.completed}/{snapshot.progress.total} selesai</span></div>
                                    <div className="mt-4 space-y-3">{snapshot.queue.map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-xs font-bold text-[#d4a843]">{item.scheduled_at || '—'} · Partai #{item.sequence}</p><p className="mt-1 text-sm font-bold">{item.category_name}</p><p className="mt-1 text-xs text-white/45">{item.round_label}</p></div>)}{snapshot.queue.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-white/45">Tidak ada antrean berikutnya.</p>}</div>
                                </aside>
                            </div>
                        ) : <EmptyCourt court={court} />
                    )}

                    {mode === 'timer' && (
                        <section className={`flex min-h-[65vh] flex-col items-center justify-center rounded-3xl border p-4 text-center shadow-2xl sm:p-8 ${isExpired ? 'border-rose-500/50 bg-rose-950/40' : 'border-white/10 bg-[#151210]'}`}>
                            {activeMatch ? <><p className="text-sm font-bold uppercase tracking-[.22em] text-[#d4a843]">{timerDirection === 'down' ? 'Hitung Mundur' : 'Hitung Maju'} · {activeMatch.timer.is_finished ? 'Selesai' : isExpired ? 'Waktu Habis' : activeMatch.timer.status === 'running' ? 'Berjalan' : activeMatch.timer.status === 'paused' ? 'Dijeda' : 'Berhenti'}</p><p className={`mt-5 font-mono text-[22vw] font-black leading-none tracking-[-.08em] sm:text-[18vw] lg:text-[14vw] ${isExpired ? 'text-rose-400' : 'text-white'}`} aria-live="off">{timerText}</p><p className="mt-6 text-xl font-bold md:text-2xl">{isExpired ? 'WAKTU HABIS' : activeMatch.category_name}</p><p className="mt-2 text-sm text-white/50">Partai #{activeMatch.sequence} · {activeMatch.round_label}</p></> : <EmptyCourt court={court} />}
                        </section>
                    )}

                    {mode === 'result' && (
                        <section className="min-h-[60vh] rounded-3xl border border-white/10 bg-[#151210] p-4 shadow-2xl sm:p-6 md:p-10">
                            {resultMatch?.result ? <><div className="text-center"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#d4a843] sm:text-sm sm:tracking-[.18em]">Hasil Terverifikasi · Partai #{resultMatch.sequence}</p><h2 className="mt-3 text-2xl font-black sm:text-3xl md:text-5xl">{resultMatch.category_name}</h2><p className="mt-2 text-white/50">{resultMatch.round_label}</p></div>{resultMatch.category_type === 'embu' ? <div className="mx-auto mt-7 max-w-5xl sm:mt-10"><div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{resultMatch.result.judge_scores.map((score, index) => <div key={`${index}-${score}`} className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-3 text-center sm:p-4"><p className="text-xs text-blue-300">Juri {index + 1}</p><p className="mt-2 text-2xl font-black sm:text-3xl">{Number(score).toFixed(2)}</p></div>)}</div>{resultMatch.result.is_disqualified && <div className="mt-5 rounded-2xl border border-rose-400/40 bg-rose-500/15 p-4 text-center font-black text-rose-200">DISKUALIFIKASI · {resultMatch.result.disqualification_reason}</div>}<div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/5 p-5 text-center"><p className="text-xs text-white/45">Durasi</p><p className="mt-2 text-3xl font-black">{resultMatch.result.duration_seconds ?? 0}s</p></div><div className="rounded-2xl bg-rose-500/10 p-5 text-center"><p className="text-xs text-rose-300">Total Denda</p><p className="mt-2 text-3xl font-black text-rose-300">-{Number(resultMatch.result.total_penalty ?? resultMatch.result.time_penalty).toFixed(2)}</p></div><div className="rounded-2xl bg-emerald-500/10 p-5 text-center"><p className="text-xs text-emerald-300">Nilai Akhir</p><p className="mt-2 text-4xl font-black text-emerald-300">{Number(resultMatch.result.final_score).toFixed(2)}</p></div></div></div> : <div className="mx-auto mt-7 grid max-w-5xl overflow-hidden rounded-3xl border border-white/10 sm:mt-10 md:grid-cols-[1fr_auto_1fr]"><div className={resultMatch.result.winner_corner === 'aka' ? 'bg-emerald-500/15 p-5 sm:p-8' : 'bg-rose-500/10 p-5 sm:p-8'}><p className="text-xs font-bold text-rose-300">AKA · MERAH</p><p className="mt-3 text-xl font-black sm:text-2xl">{resultMatch.aka_label}</p><p className="mt-6 text-6xl font-black sm:text-7xl">{resultMatch.result.aka_total}</p></div><div className="flex items-center justify-center border-y border-white/10 px-6 py-4 text-2xl font-black text-white/35 md:border-x md:border-y-0">VS</div><div className={`${resultMatch.result.winner_corner === 'shiro' ? 'bg-emerald-500/15' : 'bg-white/5'} p-5 text-right sm:p-8`}><p className="text-xs font-bold text-slate-300">SHIRO · PUTIH</p><p className="mt-3 text-xl font-black sm:text-2xl">{resultMatch.shiro_label}</p><p className="mt-6 text-6xl font-black sm:text-7xl">{resultMatch.result.shiro_total}</p></div></div>}</> : <div className="flex min-h-[50vh] flex-col items-center justify-center text-center"><i className="fa-solid fa-ranking-star text-5xl text-white/20" aria-hidden="true" /><h2 className="mt-5 text-2xl font-black">Belum Ada Hasil</h2><p className="mt-2 text-white/50">Hasil terbaru pada court ini akan tampil otomatis setelah diverifikasi.</p></div>}
                        </section>
                    )}

                    {mode === 'officials' && (
                        <section className="min-h-[60vh] rounded-3xl border border-white/10 bg-[#151210] p-4 shadow-2xl sm:p-6 md:p-10">
                            <div className="text-center"><p className="text-sm font-bold uppercase tracking-[.18em] text-[#d4a843]">Susunan Wasit & Juri</p><h2 className="mt-3 text-3xl font-black md:text-5xl">{court.name}</h2><p className="mt-3 text-sm text-white/50">Diurutkan dari Wasit Utama hingga Juri 5</p></div>
                            <div className="mx-auto mt-10 grid max-w-7xl gap-4 sm:grid-cols-2 xl:grid-cols-5">{snapshot.staff.map((member) => {
                                const initials = member.name?.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'WS';
                                return <article key={member.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"><div className="aspect-[4/3] overflow-hidden bg-black/20">{member.photo_url ? <img src={member.photo_url} alt={`Foto ${member.name}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-4xl font-black text-[#d4a843]">{initials}</div>}</div><div className="p-5"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#d4a843]/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#d4a843]">Juri {member.judge_number || '—'}</span><span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${member.is_present ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-300' : 'border-amber-400/30 bg-amber-400/15 text-amber-200'}`}>{member.is_present ? 'Hadir' : 'Belum Scan'}</span></div><p className="mt-4 text-lg font-black leading-tight">{member.name}</p><p className="mt-2 text-sm font-bold text-[#d4a843]">{member.role}</p>{(member.certification || member.region) && <p className="mt-2 text-xs leading-5 text-white/45">{[member.certification, member.region].filter(Boolean).join(' · ')}</p>}</div></article>;
                            })}{snapshot.staff.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-white/45 sm:col-span-2 xl:col-span-5">Wasit dan Juri belum ditugaskan ke court ini.</p>}</div>
                        </section>
                    )}
                </div>
            </main>
        </>
    );
}
