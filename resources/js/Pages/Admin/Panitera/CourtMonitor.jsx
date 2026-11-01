import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ThemeToggle from '@/Components/UI/Elements/ThemeToggle';
import useSynchronizedTimer from './Partials/useSynchronizedTimer';
import useLiveTimer from './Partials/useLiveTimer';
import useTimerBell from './Partials/useTimerBell';
import TimerBellControls from './Partials/TimerBellControls';
import RandoriBracketTree from './Partials/RandoriBracketTree';
import { displayedTimerSeconds, timerVersion } from './Partials/timerSynchronization';

const modes = [
    ['arena', 'Arena', 'fa-tv'],
    ['match', 'Layar Tanding', 'fa-display'],
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
            <div className="rounded-3xl border border-blue-300 dark:border-blue-400/20 bg-blue-50/70 dark:bg-blue-400/10 p-5 md:p-8 shadow-sm">
                <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700 dark:text-blue-300">{match.participant?.kind || 'Tim Embu'}</p>
                    <p className="mt-2 text-2xl font-black leading-tight text-slate-950 dark:text-white md:text-4xl">{match.participant_label || 'Peserta belum ditentukan'}</p>
                </div>
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 p-4 md:p-5 shadow-xs" aria-labelledby="monitor-athletes-title">
                        <div className="flex items-center justify-between gap-3">
                            <h3 id="monitor-athletes-title" className="text-sm font-black uppercase tracking-[.14em] text-amber-800 dark:text-[#f2cd73]">Nama Atlet</h3>
                            <span className="text-xs font-bold text-slate-500 dark:text-white/55">{athletes.length} atlet</span>
                        </div>
                        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                            {athletes.map((athlete, index) => (
                                <li key={athlete.id || `${athlete.name}-${index}`} className="flex min-h-12 items-center gap-3 rounded-xl bg-slate-50 dark:bg-white/[.07] border border-slate-100 dark:border-transparent px-3 py-2">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-sm font-black text-amber-800 dark:text-[#f2cd73]">{index + 1}</span>
                                    <span className="break-words text-base font-bold text-slate-900 dark:text-white md:text-lg">{athlete.name}</span>
                                </li>
                            ))}
                            {athletes.length === 0 && <li className="rounded-xl border border-dashed border-slate-200 dark:border-white/15 p-4 text-sm text-slate-500 dark:text-white/50 sm:col-span-2">Nama atlet belum tersedia.</li>}
                        </ol>
                    </section>
                    <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 p-4 md:p-5 shadow-xs" aria-labelledby="monitor-techniques-title">
                        <div className="flex items-center justify-between gap-3">
                            <h3 id="monitor-techniques-title" className="text-sm font-black uppercase tracking-[.14em] text-blue-800 dark:text-blue-300">Teknik Terdaftar</h3>
                            <span className="text-xs font-bold text-slate-500 dark:text-white/55">{techniques.length} teknik</span>
                        </div>
                        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                            {techniques.map((technique, index) => (
                                <li key={technique.id} className="flex min-h-12 items-center gap-3 rounded-xl bg-slate-50 dark:bg-white/[.07] border border-slate-100 dark:border-transparent px-3 py-2">
                                    <span className="font-mono text-xs font-black text-blue-700 dark:text-blue-300">{String(technique.order || index + 1).padStart(2, '0')}</span>
                                    <span className="break-words text-sm font-semibold text-slate-900 dark:text-white md:text-base">{technique.name}</span>
                                </li>
                            ))}
                            {techniques.length === 0 && <li className="rounded-xl border border-dashed border-slate-200 dark:border-white/15 p-4 text-sm text-slate-500 dark:text-white/50 sm:col-span-2">Teknik belum tercatat saat registrasi.</li>}
                        </ol>
                    </section>
                </div>
            </div>
        );
    }

    const winner = match.result?.winner_corner;

    return (
        <div className="grid overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 md:grid-cols-[1fr_auto_1fr] shadow-xl">
            {/* AKA (MERAH) */}
            <div
                className={`p-6 transition-all md:p-10 corner-aka force-white ${
                    winner === 'aka'
                        ? 'border-4 border-amber-400 bg-red-600 dark:bg-red-700 shadow-2xl'
                        : winner === 'shiro'
                            ? 'bg-red-900/40 opacity-50 grayscale'
                            : 'bg-red-600 dark:bg-red-700'
                }`}
                style={{ backgroundColor: winner === 'shiro' ? '#7f1d1d' : '#dc2626' }}
            >
                <div className="flex items-center justify-between gap-2">
                    <span
                        className="rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-xs"
                        style={{ backgroundColor: 'rgba(69, 10, 10, 0.85)', borderColor: 'rgba(255, 255, 255, 0.3)', color: '#ffffff' }}
                    >
                        AKA · MERAH
                    </span>
                    {winner === 'aka' && (
                        <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md">
                            <i className="fa-solid fa-trophy mr-1 text-xs" /> Pemenang
                        </span>
                    )}
                </div>
                <p className="mt-4 text-2xl font-black leading-tight text-white md:text-4xl drop-shadow-sm" style={{ color: '#ffffff' }}>
                    {match.aka_label || 'Menunggu peserta'}
                </p>
            </div>

            {/* VS DIVIDER */}
            <div className="flex items-center justify-center border-y border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40 px-6 py-3 text-xl font-black text-slate-600 dark:text-white/50 md:border-x md:border-y-0">
                VS
            </div>

            {/* SHIRO (PUTIH) */}
            <div className={`p-6 text-right transition-all md:p-10 corner-shiro ${
                winner === 'shiro'
                    ? 'border-4 border-amber-400 bg-white dark:bg-slate-900 shadow-2xl'
                    : winner === 'aka'
                        ? 'bg-slate-200/50 dark:bg-black/60 opacity-50 grayscale'
                        : 'bg-white dark:bg-slate-900'
            }`}>
                <div className="flex items-center justify-end gap-2">
                    {winner === 'shiro' && (
                        <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md">
                            <i className="fa-solid fa-trophy mr-1 text-xs" /> Pemenang
                        </span>
                    )}
                    <span className="rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950 px-3 py-1 text-xs font-black uppercase tracking-wider shadow-xs force-white">
                        SHIRO · PUTIH
                    </span>
                </div>
                <p className="mt-4 text-2xl font-black leading-tight text-slate-950 dark:text-white md:text-4xl">{match.shiro_label || 'Menunggu peserta'}</p>
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

export default function CourtMonitor({ activeEvent, court, mode = 'arena', monitor, stateUrl, timerStateUrl, backUrl, backLabel }) {
    const [snapshot, setSnapshot] = useState(monitor);
    const [varKey, setVarKey] = useState(0);
    const [varUrlInput, setVarUrlInput] = useState('');
    const [showVarConfig, setShowVarConfig] = useState(false);
    const [showLockedArchive, setShowLockedArchive] = useState(false);
    const varIframeRef = useRef(null);
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

    useEffect(() => {
        if (!window.Echo) return undefined;
        const channel = window.Echo.private(`event-court.${court.id}`);
        channel.listen('.var.updated', refreshSnapshot);
        channel.listen('.embu.score.updated', refreshSnapshot);
        channel.listen('.score.updated', refreshSnapshot);
        channel.listen('.panitera.match-state.updated', refreshSnapshot);
        channel.listen('.embu.judge-score.updated', refreshSnapshot);
        channel.listen('.embu.penalties.updated', refreshSnapshot);
        channel.listen('.randori.score-state.updated', refreshSnapshot);

        let matchChannel = null;
        if (activeMatch?.id) {
            matchChannel = window.Echo.private(`tournament-match.${activeMatch.id}`);
            matchChannel.listen('.embu.judge-score.updated', refreshSnapshot);
            matchChannel.listen('.score.updated', refreshSnapshot);
            matchChannel.listen('.var.updated', refreshSnapshot);
            matchChannel.listen('.panitera.match-state.updated', refreshSnapshot);
        }

        return () => {
            channel.stopListening('.var.updated');
            channel.stopListening('.embu.score.updated');
            channel.stopListening('.score.updated');
            channel.stopListening('.panitera.match-state.updated');
            channel.stopListening('.embu.judge-score.updated');
            channel.stopListening('.embu.penalties.updated');
            channel.stopListening('.randori.score-state.updated');
            if (matchChannel) {
                matchChannel.stopListening('.embu.judge-score.updated');
                matchChannel.stopListening('.score.updated');
                matchChannel.stopListening('.var.updated');
                matchChannel.stopListening('.panitera.match-state.updated');
            }
        };
    }, [court.id, activeMatch?.id, refreshSnapshot]);

    const activeVarUrl = varUrlInput.trim() || activeMatch?.var_stream_url || 'https://var.smart-perkemi.id';

    const handleFullscreenVar = () => {
        if (varIframeRef.current?.requestFullscreen) {
            varIframeRef.current.requestFullscreen();
        }
    };

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
                            <a href={backUrl || `/admin/panitera/scoring?event_id=${encodeURIComponent(activeEvent.id)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/70 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4a843] sm:min-h-10">
                                <i className="fa-solid fa-arrow-left" aria-hidden="true" />{backLabel || (backUrl ? 'Kembali' : 'Panitera')}
                            </a>
                        </div>
                    </div>
                </header>

                <div className="mx-auto mt-5 max-w-[1800px]">
                    {/* VAR Review Overlay on Court Monitor */}
                    {activeMatch?.var_review?.is_under_review && (
                        <div className="mb-5 overflow-hidden rounded-3xl border-2 border-amber-500 bg-amber-500/20 p-5 shadow-2xl backdrop-blur-md animate-pulse">
                            <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
                                <div className="flex items-center gap-4">
                                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-2xl font-black text-black shadow-lg">
                                        <i className="fa-solid fa-video" aria-hidden="true" />
                                    </span>
                                    <div>
                                        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                            <span className="rounded-full bg-rose-600 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-white">
                                                VAR REVIEW IN PROGRESS
                                            </span>
                                            <span className="font-mono text-xs font-bold text-amber-300">
                                                WAKTU PERTANDINGAN DIJEDA
                                            </span>
                                        </div>
                                        <h2 className="mt-1 text-xl font-black uppercase text-white sm:text-2xl">
                                            Pemeriksaan Video Assistant Review
                                        </h2>
                                        <p className="text-sm font-semibold text-amber-200">
                                            Alasan: {activeMatch.var_review.reason || 'Tantangan Video Replay'} · Pengaju: {activeMatch.var_review.corner?.toUpperCase()}
                                        </p>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-amber-500/40 bg-black/60 px-5 py-3 text-center sm:text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Status Putusan</p>
                                    <p className="mt-1 font-mono text-sm font-black text-white">DALAM PENILAIAN WASIT</p>
                                </div>
                            </div>
                        </div>
                    )}

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

                    {mode === 'match' && (
                        activeMatch ? (
                            activeMatch.category_type === 'embu' ? (
                                <div className="space-y-6">
                                    {/* Header & Match Details */}
                                    <section className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151210] p-6 shadow-xl">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="rounded-full bg-amber-500 text-slate-950 px-3.5 py-1 text-xs font-black uppercase tracking-wider shadow-sm">
                                                        EMBU · PARTAI #{activeMatch.sequence}
                                                    </span>
                                                    <span className="rounded-full bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300 px-3 py-1 text-xs font-bold border border-blue-200 dark:border-transparent">
                                                        {activeMatch.round_label}{activeMatch.pool ? ` · Pool ${activeMatch.pool}` : ''}
                                                    </span>
                                                    <span className="rounded-full border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-transparent px-3 py-1 text-xs font-bold text-slate-700 dark:text-white/60">
                                                        {activeMatch.call_status_label}
                                                    </span>
                                                </div>
                                                <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white md:text-4xl tracking-tight">{activeMatch.category_name}</h2>
                                                <p className="mt-1 text-lg font-bold text-amber-700 dark:text-[#f2cd73]">{activeMatch.participant_label || 'Peserta Embu'}</p>
                                            </div>

                                            {/* Digital Timer Block */}
                                            <div className="flex items-center gap-5 rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/50 px-6 py-4 shadow-inner">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[.25em] text-amber-700 dark:text-[#f2cd73]">
                                                        {timerDirection === 'down' ? 'Waktu Sisa' : 'Waktu Berjalan'}
                                                    </p>
                                                    <p className="font-mono text-5xl font-black text-slate-950 dark:text-white sm:text-6xl tracking-tight">
                                                        {timerText}
                                                    </p>
                                                </div>
                                                <div className="border-l-2 border-slate-200 dark:border-white/10 pl-5 text-xs font-bold space-y-1.5">
                                                    <span className={`inline-block rounded-full px-3 py-1 text-[11px] uppercase font-black tracking-wider shadow-sm ${
                                                        activeMatch.timer?.status === 'running'
                                                            ? 'bg-emerald-600 text-white animate-pulse force-white'
                                                            : activeMatch.timer?.status === 'paused'
                                                                ? 'bg-amber-500 text-slate-950'
                                                                : 'bg-slate-200 text-slate-800 dark:bg-white/15 dark:text-white/80'
                                                    }`}>
                                                        {activeMatch.timer?.is_finished ? 'Selesai' : isExpired ? 'Waktu Habis' : activeMatch.timer?.status === 'running' ? 'Berjalan' : activeMatch.timer?.status === 'paused' ? 'Dijeda' : 'Menunggu'}
                                                    </span>
                                                    <p className="text-slate-500 dark:text-white/50 text-[11px]">Durasi: {timerDuration}s</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Scoreboard: 5 Wasit & Juri */}
                                    <section className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151210] p-6 shadow-xl">
                                        <div className="flex items-center justify-between mb-5">
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-wider text-slate-950 dark:text-[#f2cd73] flex items-center gap-2">
                                                    <i className="fa-solid fa-users-viewfinder text-amber-600 dark:text-[#f2cd73]" aria-hidden="true" />
                                                    Hasil Nilai Para Wasit (5 Juri)
                                                </h3>
                                                <p className="text-xs text-slate-600 dark:text-white/50">Skor penguasaan teknik (maks. 60) dan penghayatan ekspresi (maks. 40)</p>
                                            </div>
                                            <span className="rounded-full border border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300 px-3 py-1 text-xs font-bold">
                                                Update Otomatis Real-Time
                                            </span>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                                            {[1, 2, 3, 4, 5].map((judgeNum) => {
                                                const liveScore = activeMatch.judge_scores?.find((s) => s.judge_number === judgeNum);
                                                const verifiedScore = activeMatch.result?.judge_scores?.[judgeNum - 1];
                                                const totalScoreVal = verifiedScore !== undefined
                                                    ? Number(verifiedScore).toFixed(2)
                                                    : liveScore?.total_score ? Number(liveScore.total_score).toFixed(2) : '—';
                                                const isSubmitted = liveScore?.status === 'submitted' || verifiedScore !== undefined;

                                                return (
                                                    <div
                                                        key={judgeNum}
                                                        className={`rounded-2xl border-2 p-4 transition-all shadow-sm ${
                                                            isSubmitted
                                                                ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
                                                                : 'border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/[.04]'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-1">
                                                            <span className="rounded-full bg-amber-100 text-amber-900 dark:bg-[#d4a843]/20 dark:text-[#f2cd73] px-2.5 py-0.5 text-[10px] font-black uppercase">
                                                                Juri {judgeNum} {judgeNum === 1 ? '(Utama)' : ''}
                                                            </span>
                                                            <span className={`text-[10px] font-bold uppercase ${
                                                                isSubmitted ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-300'
                                                            }`}>
                                                                {isSubmitted ? 'Terkirim' : 'Menilai'}
                                                            </span>
                                                        </div>

                                                        <p className="mt-2 text-xs font-bold text-slate-700 dark:text-white/80 truncate">
                                                            {liveScore?.referee_name || `Juri ${judgeNum}`}
                                                        </p>

                                                        <div className="mt-4 text-center">
                                                            <p className="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
                                                                {totalScoreVal}
                                                            </p>
                                                            <p className="mt-1 text-[10px] uppercase font-bold text-slate-500 dark:text-white/40">Total Nilai</p>
                                                        </div>

                                                        <div className="mt-3 grid grid-cols-2 gap-1 border-t border-slate-200 dark:border-white/10 pt-2 text-center text-[11px]">
                                                            <div>
                                                                <span className="block text-slate-500 dark:text-white/50">Teknik</span>
                                                                <span className="font-bold text-slate-900 dark:text-white/90">
                                                                    {liveScore?.technique_subtotal ? Number(liveScore.technique_subtotal).toFixed(1) : '—'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="block text-slate-500 dark:text-white/50">Ekspresi</span>
                                                                <span className="font-bold text-slate-900 dark:text-white/90">
                                                                    {liveScore?.expression_subtotal ? Number(liveScore.expression_subtotal).toFixed(1) : '—'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Rekap Nilai Akhir & Penalti */}
                                        <div className="mt-6 grid gap-4 sm:grid-cols-3">
                                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[.03] p-4 text-center">
                                                <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-white/50">Durasi Penampilan</p>
                                                <p className="mt-2 font-mono text-3xl font-black text-slate-950 dark:text-white">
                                                    {activeMatch.result?.duration_seconds ?? Math.floor(elapsedSeconds)}s
                                                </p>
                                            </div>

                                            <div className="rounded-2xl border-2 border-rose-300 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-4 text-center">
                                                <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Total Denda / Penalti</p>
                                                <p className="mt-2 font-mono text-3xl font-black text-rose-700 dark:text-rose-300">
                                                    -{Number(activeMatch.result?.total_penalty ?? activeMatch.result?.time_penalty ?? 0).toFixed(2)}
                                                </p>
                                            </div>

                                            <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-600 text-white dark:bg-gradient-to-br dark:from-emerald-600/40 dark:to-emerald-950/60 p-4 text-center shadow-xl force-white">
                                                <p className="text-xs font-black uppercase tracking-widest text-emerald-100 dark:text-emerald-300 force-white">NILAI AKHIR RESMI</p>
                                                <p className="mt-2 font-mono text-4xl font-black text-white dark:text-emerald-200 force-white">
                                                    {activeMatch.result?.final_score ? Number(activeMatch.result.final_score).toFixed(2) : 'Menunggu Rekap'}
                                                </p>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            ) : (
                                <div className="grid gap-6 items-start lg:grid-cols-12">
                                    {/* SISI KIRI: VAR STREAM (var.smart-perkemi.id) */}
                                    <section className="flex flex-col rounded-3xl border border-white/10 bg-[#151210] p-5 shadow-2xl lg:col-span-7">
                                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                                            <div className="flex items-center gap-3">
                                                <span className="relative flex h-3 w-3">
                                                    <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
                                                    <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
                                                </span>
                                                <div>
                                                    <h3 className="flex items-center gap-2 text-base font-black uppercase tracking-wider text-white">
                                                        <i className="fa-solid fa-video text-rose-400" aria-hidden="true" />
                                                        Video Assistant Review (VAR)
                                                    </h3>
                                                    <a
                                                        href={activeVarUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="font-mono text-xs text-[#d4a843] hover:underline"
                                                    >
                                                        {activeVarUrl} <i className="fa-solid fa-arrow-up-right-from-square ml-1 text-[10px]" />
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setVarKey((k) => k + 1)}
                                                    title="Muat ulang tayangan VAR"
                                                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-white hover:bg-white/10"
                                                >
                                                    <i className="fa-solid fa-arrows-rotate" aria-hidden="true" />
                                                    Reload
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleFullscreenVar}
                                                    title="Tampilkan VAR Layar Penuh"
                                                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-white hover:bg-white/10"
                                                >
                                                    <i className="fa-solid fa-expand" aria-hidden="true" />
                                                    Layar Penuh
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowVarConfig((prev) => !prev)}
                                                    title="Ubah URL Stream VAR (Lokal / IP Camera)"
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-xs text-white/70 hover:bg-white/10"
                                                >
                                                    <i className="fa-solid fa-gear" aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Optional VAR URL Config Input */}
                                        {showVarConfig && (
                                            <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-2.5">
                                                <input
                                                    type="url"
                                                    value={varUrlInput}
                                                    onChange={(e) => setVarUrlInput(e.target.value)}
                                                    placeholder="Contoh: https://var.smart-perkemi.id atau http://192.168.1.100:8080"
                                                    className="flex-1 rounded-lg border border-white/20 bg-black/60 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-[#d4a843]"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setVarKey((k) => k + 1)}
                                                    className="rounded-lg bg-[#d4a843] px-3 py-1.5 text-xs font-bold text-black"
                                                >
                                                    Terapkan
                                                </button>
                                            </div>
                                        )}

                                        {/* Active VAR Challenge Notification Banner */}
                                        {activeMatch.var_review?.is_under_review && (
                                            <div className="my-3 overflow-hidden rounded-2xl border-2 border-amber-500 bg-amber-500/20 p-4 animate-pulse">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-lg font-black text-black">
                                                        <i className="fa-solid fa-video" />
                                                    </span>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
                                                                VAR REVIEW IN PROGRESS
                                                            </span>
                                                            <span className="text-xs font-black uppercase text-amber-300">
                                                                Sudut {activeMatch.var_review.corner}
                                                            </span>
                                                        </div>
                                                        <p className="mt-0.5 text-xs text-amber-200">
                                                            Alasan: {activeMatch.var_review.reason || 'Permintaan review video'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Embedded Iframe Player */}
                                        <div
                                            ref={varIframeRef}
                                            className="relative mt-4 aspect-video w-full flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/80"
                                        >
                                            <iframe
                                                key={varKey}
                                                src={activeVarUrl}
                                                className="h-full w-full border-0"
                                                allow="autoplay; fullscreen; camera; microphone"
                                                title="VAR Video Assistant Review"
                                                loading="eager"
                                            />
                                        </div>

                                        <p className="mt-3 text-center text-xs text-white/40">
                                            Kamera VAR terhubung langsung ke sistem pertandingan gelanggang.
                                            Jika streaming tidak memuat di dalam frame, klik <a href={activeVarUrl} target="_blank" rel="noreferrer" className="font-bold text-[#d4a843] underline">Buka Tab Penuh (var.smart-perkemi.id)</a>.
                                        </p>
                                    </section>

                                    {/* SISI KANAN: TIMER RANDORI & CORNERS SCOREBOARD */}
                                    <section className="flex flex-col gap-5 lg:col-span-5">
                                        {/* Match Info & Big Timer Card */}
                                        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151210] p-6 text-center shadow-xl">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="rounded-full bg-red-600 text-white font-black px-3.5 py-1 text-xs uppercase tracking-wider shadow-sm force-white">
                                                    RANDORI · PARTAI #{activeMatch.sequence}
                                                </span>
                                                <span className="rounded-full bg-slate-100 dark:bg-white/10 px-3 py-1 text-xs font-bold text-slate-700 dark:text-white/80 border border-slate-200 dark:border-transparent">
                                                    {activeMatch.round_label}
                                                </span>
                                            </div>
                                            <h2 className="mt-3 text-2xl md:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                                                {activeMatch.category_name}
                                            </h2>

                                            {/* Big Timer Box */}
                                            <div className="mt-5 rounded-2xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/50 p-6 shadow-inner">
                                                <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-950 dark:text-[#f2cd73]">
                                                    {timerDirection === 'down' ? 'WAKTU PERTANDINGAN' : 'HITUNG MAJU'}
                                                </p>
                                                <p className={`mt-2 font-mono text-7xl font-black tracking-tight sm:text-8xl lg:text-9xl ${
                                                    isExpired ? 'text-red-600 dark:text-red-500 animate-pulse' : 'text-slate-950 dark:text-white'
                                                }`}>
                                                    {timerText}
                                                </p>
                                                <div className="mt-4 flex items-center justify-center gap-2">
                                                    <span className={`inline-block rounded-full px-4 py-1.5 text-xs uppercase font-black tracking-wider shadow-sm ${
                                                        activeMatch.timer?.is_finished
                                                            ? 'bg-slate-800 text-white dark:bg-slate-700 force-white'
                                                            : isExpired
                                                                ? 'bg-red-600 text-white animate-pulse force-white'
                                                                : activeMatch.timer?.status === 'running'
                                                                    ? 'bg-emerald-600 text-white animate-pulse force-white'
                                                                    : activeMatch.timer?.status === 'paused'
                                                                        ? 'bg-amber-500 text-slate-950 font-black'
                                                                        : 'bg-slate-200 text-slate-900 border border-slate-300 dark:border-white/20 dark:bg-white/15 dark:text-white font-black'
                                                    }`}>
                                                        {activeMatch.timer?.is_finished ? 'Partai Selesai' : isExpired ? 'WAKTU HABIS' : activeMatch.timer?.status === 'running' ? 'WAKTU BERJALAN' : activeMatch.timer?.status === 'paused' ? 'WAKTU DIJEDA' : 'MENUNGGU WASIT'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sudut AKA vs Sudut SHIRO */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {/* SUDUT AKA (MERAH) */}
                                            <div
                                                className={`rounded-3xl border-2 p-6 transition-all shadow-xl corner-aka force-white ${
                                                    activeMatch.result?.winner_corner === 'aka'
                                                        ? 'border-amber-400 bg-red-600 dark:bg-red-700 ring-4 ring-amber-400/50'
                                                        : 'border-red-700 bg-red-600 dark:bg-red-700'
                                                }`}
                                                style={{ backgroundColor: '#dc2626', borderColor: activeMatch.result?.winner_corner === 'aka' ? '#fbbf24' : '#b91c1c' }}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span
                                                        className="rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-sm"
                                                        style={{ backgroundColor: 'rgba(69, 10, 10, 0.85)', borderColor: 'rgba(255, 255, 255, 0.3)', color: '#ffffff' }}
                                                    >
                                                        AKA · MERAH
                                                    </span>
                                                    {activeMatch.result?.winner_corner === 'aka' && (
                                                        <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md">
                                                            <i className="fa-solid fa-trophy mr-1 text-xs" /> Pemenang
                                                        </span>
                                                    )}
                                                </div>
                                                <p
                                                    className="mt-4 text-xl sm:text-2xl font-black leading-snug text-white line-clamp-2 drop-shadow-sm min-h-[3.5rem]"
                                                    style={{ color: '#ffffff' }}
                                                >
                                                    {activeMatch.aka_label || 'Sudut Merah'}
                                                </p>
                                                <div className="mt-4 text-center border-t border-white/20 pt-4">
                                                    <p
                                                        className="font-mono text-7xl sm:text-8xl lg:text-9xl font-black text-white drop-shadow-md"
                                                        style={{ color: '#ffffff' }}
                                                    >
                                                        {activeMatch.result?.aka_total ?? 0}
                                                    </p>
                                                    <p
                                                        className="mt-1 text-xs font-black uppercase tracking-widest text-white/90"
                                                        style={{ color: 'rgba(255, 255, 255, 0.95)' }}
                                                    >
                                                        TOTAL POIN
                                                    </p>
                                                </div>
                                                {(Boolean(activeMatch.aka_breakdown?.waza_ari) || Boolean(activeMatch.aka_breakdown?.yuko)) && (
                                                    <div className="mt-4 flex items-center justify-center gap-2 border-t border-white/20 pt-3 text-xs font-bold text-white">
                                                        {Boolean(activeMatch.aka_breakdown?.waza_ari) && (
                                                             <span
                                                                 className="rounded-lg px-2.5 py-0.5 border"
                                                                 style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)', borderColor: 'rgba(255, 255, 255, 0.3)', color: '#ffffff' }}
                                                             >
                                                                 Waza-ari: {activeMatch.aka_breakdown.waza_ari}
                                                             </span>
                                                        )}
                                                        {Boolean(activeMatch.aka_breakdown?.yuko) && (
                                                             <span
                                                                 className="rounded-lg px-2.5 py-0.5 border"
                                                                 style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)', borderColor: 'rgba(255, 255, 255, 0.3)', color: '#ffffff' }}
                                                             >
                                                                 Yuko: {activeMatch.aka_breakdown.yuko}
                                                             </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* SUDUT SHIRO (PUTIH) */}
                                            <div
                                                className={`rounded-3xl border-2 p-6 transition-all shadow-xl corner-shiro ${
                                                    activeMatch.result?.winner_corner === 'shiro'
                                                        ? 'border-amber-400 bg-white dark:bg-slate-900 ring-4 ring-amber-400/50'
                                                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="rounded-full bg-slate-950 text-white dark:bg-white dark:text-slate-950 border border-slate-700 dark:border-white/30 px-3 py-1 text-xs font-black uppercase tracking-wider shadow-sm">
                                                        SHIRO · PUTIH
                                                    </span>
                                                    {activeMatch.result?.winner_corner === 'shiro' && (
                                                        <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md">
                                                            <i className="fa-solid fa-trophy mr-1 text-xs" /> Pemenang
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-4 text-xl sm:text-2xl font-black leading-snug text-slate-950 dark:text-white line-clamp-2 min-h-[3.5rem]">
                                                    {activeMatch.shiro_label || 'Sudut Putih'}
                                                </p>
                                                <div className="mt-4 text-center border-t border-slate-200 dark:border-white/10 pt-4">
                                                    <p className="font-mono text-7xl sm:text-8xl lg:text-9xl font-black text-slate-950 dark:text-white">
                                                        {activeMatch.result?.shiro_total ?? 0}
                                                    </p>
                                                    <p className="mt-1 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                                                         TOTAL POIN
                                                    </p>
                                                </div>
                                                {(Boolean(activeMatch.shiro_breakdown?.waza_ari) || Boolean(activeMatch.shiro_breakdown?.yuko)) && (
                                                    <div className="mt-4 flex items-center justify-center gap-2 border-t border-slate-200 dark:border-white/10 pt-3 text-xs font-bold text-slate-800 dark:text-slate-200">
                                                        {Boolean(activeMatch.shiro_breakdown?.waza_ari) && (
                                                            <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 border border-slate-200 dark:border-slate-700">Waza-ari: {activeMatch.shiro_breakdown.waza_ari}</span>
                                                        )}
                                                        {Boolean(activeMatch.shiro_breakdown?.yuko) && (
                                                            <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 border border-slate-200 dark:border-slate-700">Yuko: {activeMatch.shiro_breakdown.yuko}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )
                        ) : <EmptyCourt court={court} />
                    )}

                    {mode === 'timer' && (
                        <section className={`flex min-h-[65vh] flex-col items-center justify-center rounded-3xl border-2 p-4 text-center shadow-2xl sm:p-8 ${isExpired ? 'border-red-500 bg-red-600/10' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#151210]'}`}>
                            {activeMatch ? (
                                <>
                                    <p className="text-sm font-black uppercase tracking-[.25em] text-amber-700 dark:text-[#d4a843]">
                                        {timerDirection === 'down' ? 'Hitung Mundur' : 'Hitung Maju'} · {activeMatch.timer.is_finished ? 'Selesai' : isExpired ? 'Waktu Habis' : activeMatch.timer.status === 'running' ? 'Berjalan' : activeMatch.timer.status === 'paused' ? 'Dijeda' : 'Berhenti'}
                                    </p>
                                    <p className={`mt-5 font-mono text-[22vw] font-black leading-none tracking-[-.08em] sm:text-[18vw] lg:text-[14vw] ${isExpired ? 'text-red-600 dark:text-rose-400 animate-pulse' : 'text-slate-950 dark:text-white'}`} aria-live="off">
                                        {timerText}
                                    </p>
                                    <p className="mt-6 text-xl font-black text-slate-950 dark:text-white md:text-3xl">{isExpired ? 'WAKTU HABIS' : activeMatch.category_name}</p>
                                    <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-white/50">Partai #{activeMatch.sequence} · {activeMatch.round_label}</p>
                                </>
                            ) : <EmptyCourt court={court} />}
                        </section>
                    )}

                    {mode === 'result' && (
                        <section className="min-h-[60vh] space-y-6">
                            {snapshot.category_recap ? (
                                <>
                                    {/* Header Nomor Pertandingan & Progres Gelanggang */}
                                    <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151210] p-6 md:p-8 shadow-xl">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider text-white ${
                                                        snapshot.category_recap.type === 'embu' ? 'bg-blue-600' : 'bg-red-600'
                                                    }`}>
                                                        {snapshot.category_recap.type?.toUpperCase()}
                                                    </span>
                                                    <span className="rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 px-3 py-1 text-xs font-black border border-amber-300 dark:border-amber-700">
                                                        <i className="fa-solid fa-location-dot mr-1" /> {court.name}
                                                    </span>
                                                    {snapshot.category_recap.is_locked ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 px-3 py-1 text-xs font-black border border-emerald-300 dark:border-emerald-700">
                                                            <i className="fa-solid fa-lock text-[10px]" /> Terkunci {snapshot.category_recap.locked_at ? `(${snapshot.category_recap.locked_at})` : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white px-3 py-1 text-xs font-bold">
                                                            <i className="fa-regular fa-clock text-[10px]" /> Pertandingan Berjalan
                                                        </span>
                                                    )}
                                                </div>
                                                <h1 className="mt-3 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl md:text-4xl">
                                                    {snapshot.category_recap.name}
                                                </h1>
                                                <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-500 dark:text-white/60">
                                                    Rekapitulasi nilai seluruh partai nomor pertandingan ini pada {court.name}. Terhubung langsung secara real-time via Reverb.
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-4 shrink-0 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">Progres Partai</p>
                                                    <p className="text-2xl font-black text-slate-950 dark:text-white">
                                                        {snapshot.category_recap.completed_matches}/{snapshot.category_recap.total_matches}
                                                    </p>
                                                </div>
                                                <div className="h-10 w-1 bg-slate-200 dark:bg-white/10 rounded-full" />
                                                <div className="text-left">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">Status</p>
                                                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                                                        {snapshot.category_recap.completed_matches === snapshot.category_recap.total_matches && snapshot.category_recap.total_matches > 0
                                                            ? 'Selesai Sempurna'
                                                            : `${snapshot.category_recap.total_matches - snapshot.category_recap.completed_matches} Tersisa`}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Highlight Partai Aktif bila sedang bertanding */}
                                        {activeMatch && (
                                            <div className="mt-5 rounded-2xl border-2 border-blue-400 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-blue-950/40 p-4 text-slate-950 dark:text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-pulse">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-lg shadow-sm">
                                                        <i className="fa-solid fa-play" />
                                                    </span>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="rounded-full bg-blue-600 text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                                                                SEDANG BERTANDING DI COURT
                                                            </span>
                                                            <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                                                                Partai #{activeMatch.sequence} · {activeMatch.round_label}
                                                            </span>
                                                        </div>
                                                        <p className="text-base font-black text-slate-950 dark:text-white mt-0.5">
                                                            {activeMatch.participant_label || `${activeMatch.aka_label} vs ${activeMatch.shiro_label}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="rounded-xl bg-white dark:bg-black/40 border border-blue-200 dark:border-blue-800 px-3 py-1.5 text-xs font-mono font-black text-blue-800 dark:text-blue-300">
                                                    Status: {activeMatch.status_label}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Jika nomor pertandingan telah dikunci, otomatis tutup hasil & tampilkan mode standby */}
                                    {snapshot.category_recap.is_locked && !showLockedArchive ? (
                                        <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border-2 border-emerald-400/40 bg-gradient-to-b from-emerald-500/10 via-white dark:via-black/20 to-emerald-500/5 p-8 text-center shadow-xl">
                                            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600 text-white text-3xl shadow-lg ring-8 ring-emerald-500/20">
                                                <i className="fa-solid fa-lock" />
                                            </span>
                                            <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-4 py-1 text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                                                HASIL PERTANDINGAN TELAH DIKUNCI RESMI
                                            </span>
                                            <h2 className="mt-3 text-3xl sm:text-4xl font-black text-slate-950 dark:text-white">
                                                {snapshot.category_recap.name}
                                            </h2>
                                            <p className="mt-2 max-w-lg text-sm sm:text-base font-semibold text-slate-600 dark:text-white/70">
                                                Seluruh partai nomor pertandingan ini telah selesai dan dikunci pada {snapshot.category_recap.locked_at || 'hari ini'}. Papan monitor ditutup otomatis.
                                            </p>
                                            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                                <div className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 px-4 py-2.5 text-xs font-bold shadow-md">
                                                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                                                    <span>Menunggu nomor pertandingan berikutnya dibuka Panitera...</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowLockedArchive(true)}
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-white/10 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/20 transition shadow-2xs"
                                                >
                                                    <i className="fa-solid fa-eye text-[11px]" />
                                                    Lihat Rekap Nilai Akhir
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {snapshot.category_recap.is_locked && (
                                                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-900 dark:text-emerald-200 shadow-2xs">
                                                    <span className="text-xs font-bold flex items-center gap-2">
                                                        <i className="fa-solid fa-lock text-emerald-700 dark:text-emerald-400" />
                                                        Menampilkan arsip rekap hasil nomor pertandingan yang telah dikunci.
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowLockedArchive(false)}
                                                        className="text-xs font-black underline hover:text-emerald-950 dark:hover:text-white"
                                                    >
                                                        Tutup Kembali (Mode Siaga)
                                                    </button>
                                                </div>
                                            )}

                                            {/* Tabel Rekap Embu */}
                                            {snapshot.category_recap.type === 'embu' ? (
                                        <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151210] shadow-2xl">
                                            <div className="border-b border-slate-200 dark:border-white/10 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                <div>
                                                    <h3 className="text-lg font-black text-slate-950 dark:text-white">
                                                        Papan Rekap Nilai & Klasemen Embu
                                                    </h3>
                                                    <p className="text-xs text-slate-500 dark:text-white/50">
                                                        Urutan tampil dan akumulasi nilai resmi 5 Juri setelah membuang nilai tertinggi dan terendah.
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                                                        Live Reverb Aktif
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-left text-xs">
                                                    <thead className="bg-slate-50 dark:bg-white/5 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-white/60">
                                                        <tr>
                                                            <th className="px-4 py-3.5 text-center">Rank</th>
                                                            <th className="px-4 py-3.5">Partai & Babak</th>
                                                            <th className="px-4 py-3.5">Kontingen & Atlet</th>
                                                            <th className="px-4 py-3.5 text-center">Nilai 5 Juri</th>
                                                            <th className="px-4 py-3.5 text-center">Denda</th>
                                                            <th className="px-4 py-3.5 text-center">Durasi</th>
                                                            <th className="px-4 py-3.5 text-right font-black">Nilai Akhir</th>
                                                            <th className="px-4 py-3.5 text-center">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                        {snapshot.category_recap.matches.map((row) => {
                                                            const isRowActive = row.is_active;
                                                            const isCompleted = row.is_completed;
                                                            const score = row.embu_result;
                                                            const rank = row.rank;

                                                            return (
                                                                <tr
                                                                    key={row.id}
                                                                    className={`transition-colors ${
                                                                        isRowActive
                                                                            ? 'bg-blue-100/60 dark:bg-blue-950/50 border-y-2 border-blue-400'
                                                                            : isCompleted
                                                                                ? 'hover:bg-slate-50 dark:hover:bg-white/[.03]'
                                                                                : 'opacity-70 hover:opacity-100 hover:bg-slate-50 dark:hover:bg-white/[.02]'
                                                                    }`}
                                                                >
                                                                    {/* Rank / Medali */}
                                                                    <td className="px-4 py-4 text-center align-middle">
                                                                        {rank === 1 ? (
                                                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-slate-950 font-black text-sm shadow-md" title="Peringkat 1">
                                                                                🥇
                                                                            </span>
                                                                        ) : rank === 2 ? (
                                                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-300 text-slate-950 font-black text-sm shadow-sm" title="Peringkat 2">
                                                                                🥈
                                                                            </span>
                                                                        ) : rank === 3 ? (
                                                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-700 text-white font-black text-sm shadow-sm" title="Peringkat 3">
                                                                                🥉
                                                                            </span>
                                                                        ) : rank === 'DQ' ? (
                                                                            <span className="inline-flex items-center justify-center rounded-md bg-red-600 text-white px-2 py-0.5 text-[10px] font-black uppercase">
                                                                                DQ
                                                                            </span>
                                                                        ) : rank ? (
                                                                            <span className="font-mono text-sm font-bold text-slate-700 dark:text-white/70">
                                                                                #{rank}
                                                                            </span>
                                                                        ) : isRowActive ? (
                                                                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-black animate-pulse">
                                                                                ▶
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-400 dark:text-white/30 font-mono">-</span>
                                                                        )}
                                                                    </td>

                                                                    {/* Partai & Babak */}
                                                                    <td className="px-4 py-4 align-middle">
                                                                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                                                                            Partai #{row.sequence}
                                                                        </div>
                                                                        <div className="text-[11px] text-slate-500 dark:text-white/50">
                                                                            {row.round_label}
                                                                            {row.scheduled_at && ` · ${row.scheduled_at}`}
                                                                        </div>
                                                                    </td>

                                                                    {/* Peserta & Atlet */}
                                                                    <td className="px-4 py-4 align-middle">
                                                                        <div className="font-black text-slate-950 dark:text-white text-sm">
                                                                            {row.participant_label}
                                                                        </div>
                                                                        {row.athletes?.length > 0 && (
                                                                            <div className="mt-1 flex flex-wrap gap-1 text-[11px] font-semibold text-slate-600 dark:text-white/70">
                                                                                {row.athletes.join(' · ')}
                                                                            </div>
                                                                        )}
                                                                    </td>

                                                                    {/* Nilai 5 Juri */}
                                                                    <td className="px-4 py-4 text-center align-middle">
                                                                        {score?.judge_scores?.length > 0 ? (
                                                                            <div className="flex flex-wrap items-center justify-center gap-1">
                                                                                {score.judge_scores.map((jScore, jIdx) => (
                                                                                    <span
                                                                                        key={jIdx}
                                                                                        className="rounded-md border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-800 dark:text-white"
                                                                                        title={`Juri ${jIdx + 1}: ${Number(jScore).toFixed(2)}`}
                                                                                    >
                                                                                        {Number(jScore).toFixed(1)}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-slate-400 dark:text-white/30 font-mono text-xs">Belum dinilai</span>
                                                                        )}
                                                                    </td>

                                                                    {/* Denda */}
                                                                    <td className="px-4 py-4 text-center align-middle">
                                                                        {score && Number(score.total_penalty || 0) > 0 ? (
                                                                            <span className="inline-flex items-center rounded-md border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 font-mono text-xs font-bold text-rose-700 dark:text-rose-300">
                                                                                -{Number(score.total_penalty).toFixed(1)}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-400 dark:text-white/30 font-mono text-xs">0</span>
                                                                        )}
                                                                    </td>

                                                                    {/* Durasi */}
                                                                    <td className="px-4 py-4 text-center align-middle font-mono text-xs font-bold text-slate-700 dark:text-white/70">
                                                                        {score?.duration_seconds ? formatTimer(score.duration_seconds) : '-'}
                                                                    </td>

                                                                    {/* Nilai Akhir */}
                                                                    <td className="px-4 py-4 text-right align-middle">
                                                                        {score?.is_disqualified ? (
                                                                            <span className="text-red-600 font-bold text-xs uppercase">Diskualifikasi</span>
                                                                        ) : score?.final_score !== undefined && score?.final_score !== null && isCompleted ? (
                                                                            <span className="font-mono text-lg md:text-xl font-black text-emerald-700 dark:text-emerald-400">
                                                                                {Number(score.final_score).toFixed(2)}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-400 dark:text-white/30 font-mono text-sm">-</span>
                                                                        )}
                                                                    </td>

                                                                    {/* Status */}
                                                                    <td className="px-4 py-4 text-center align-middle">
                                                                        {isRowActive ? (
                                                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 text-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider animate-pulse shadow-xs">
                                                                                <span className="h-1.5 w-1.5 rounded-full bg-white" /> SEDANG TAMPIL
                                                                            </span>
                                                                        ) : isCompleted ? (
                                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 text-[10.5px] font-bold border border-emerald-300 dark:border-emerald-700">
                                                                                <i className="fa-solid fa-check text-[9px]" /> Selesai
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60 px-2 py-0.5 text-[10px] font-semibold">
                                                                                {row.status_label}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Bagan Randori Tournament Tree */
                                        <RandoriBracketTree
                                            matches={snapshot.category_recap.matches}
                                            activeEvent={activeEvent}
                                            categoryName={snapshot.category_recap.name}
                                            categoryFormat={snapshot.category_recap.format}
                                            isMonitor={true}
                                            activeMatchId={activeMatch?.id}
                                        />
                                    )}
                                </>
                            )}
                        </>
                    ) : resultMatch?.result ? (
                                /* Fallback Single Result jika category_recap belum terload */
                                <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151210] p-6 md:p-10 shadow-2xl">
                                    <div className="text-center">
                                        <p className="text-xs font-black uppercase tracking-[.18em] text-amber-700 dark:text-[#d4a843] sm:text-sm">Hasil Terverifikasi · Partai #{resultMatch.sequence}</p>
                                        <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl md:text-5xl">{resultMatch.category_name}</h2>
                                        <p className="mt-2 font-semibold text-slate-600 dark:text-white/50">{resultMatch.round_label}</p>
                                    </div>
                                    {resultMatch.category_type === 'embu' ? (
                                        <div className="mx-auto mt-7 max-w-5xl sm:mt-10">
                                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                                                {resultMatch.result.judge_scores.map((score, index) => (
                                                    <div key={`${index}-${score}`} className="rounded-2xl border-2 border-blue-200 dark:border-blue-400/20 bg-blue-50/70 dark:bg-blue-400/10 p-3 text-center sm:p-4 shadow-xs">
                                                        <p className="text-xs font-black text-blue-800 dark:text-blue-300">Juri {index + 1}</p>
                                                        <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">{Number(score).toFixed(2)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                                                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-5 text-center">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-white/45">Durasi</p>
                                                    <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{resultMatch.result.duration_seconds ?? 0}s</p>
                                                </div>
                                                <div className="rounded-2xl border-2 border-rose-300 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-5 text-center">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Total Denda</p>
                                                    <p className="mt-2 text-3xl font-black text-rose-700 dark:text-rose-300">-{Number(resultMatch.result.total_penalty ?? resultMatch.result.time_penalty).toFixed(2)}</p>
                                                </div>
                                                <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-600 text-white dark:bg-emerald-500/20 p-5 text-center shadow-xl force-white">
                                                    <p className="text-xs font-black uppercase tracking-widest text-emerald-100 dark:text-emerald-300 force-white">NILAI AKHIR</p>
                                                    <p className="mt-2 text-4xl font-black text-white dark:text-emerald-300 force-white">{Number(resultMatch.result.final_score).toFixed(2)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 dark:border-white/15 bg-white dark:bg-[#151210] p-8 text-center">
                                    <i className="fa-solid fa-ranking-star text-5xl text-amber-500/40" aria-hidden="true" />
                                    <h2 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">Menunggu Nilai Partai</h2>
                                    <p className="mt-2 text-slate-600 dark:text-white/50 max-w-md">Belum ada pertandingan yang dinilai atau partai yang dibuka pada {court.name}. Layar rekap akan muncul otomatis saat Panitera membuka partai.</p>
                                </div>
                            )}
                        </section>
                    )}

                    {mode === 'officials' && (
                        <section className="min-h-[60vh] rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151210] p-4 shadow-2xl sm:p-6 md:p-10">
                            <div className="text-center">
                                <p className="text-sm font-black uppercase tracking-[.18em] text-amber-700 dark:text-[#d4a843]">Susunan Wasit & Juri</p>
                                <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white md:text-5xl">{court.name}</h2>
                                <p className="mt-2 text-sm font-medium text-slate-600 dark:text-white/50">Diurutkan dari Wasit Utama hingga Juri 5</p>
                            </div>
                            <div className="mx-auto mt-10 grid max-w-7xl gap-4 sm:grid-cols-2 xl:grid-cols-5">
                                {snapshot.staff.map((member) => {
                                    const initials = member.name?.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'WS';
                                    return (
                                        <article key={member.id} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 shadow-xs">
                                            <div className="aspect-[4/3] overflow-hidden bg-slate-200 dark:bg-black/20">
                                                {member.photo_url ? (
                                                    <img src={member.photo_url} alt={`Foto ${member.name}`} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-4xl font-black text-amber-700 dark:text-[#d4a843]">{initials}</div>
                                                )}
                                            </div>
                                            <div className="p-5">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="rounded-full bg-amber-100 dark:bg-[#d4a843]/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-900 dark:text-[#d4a843]">
                                                        Juri {member.judge_number || '—'}
                                                    </span>
                                                    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${
                                                        member.is_present
                                                            ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-300'
                                                            : 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-200'
                                                    }`}>
                                                        {member.is_present ? 'Hadir' : 'Belum Scan'}
                                                    </span>
                                                </div>
                                                <p className="mt-4 text-lg font-black leading-tight text-slate-950 dark:text-white">{member.name}</p>
                                                <p className="mt-2 text-sm font-bold text-amber-700 dark:text-[#d4a843]">{member.role}</p>
                                                {(member.certification || member.region) && (
                                                    <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-white/45">
                                                        {[member.certification, member.region].filter(Boolean).join(' · ')}
                                                    </p>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                                {snapshot.staff.length === 0 && (
                                    <p className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-10 text-center text-slate-500 dark:text-white/45 sm:col-span-2 xl:col-span-5">
                                        Wasit dan Juri belum ditugaskan ke court ini.
                                    </p>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </>
    );
}
