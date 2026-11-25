import { Head, Link } from '@inertiajs/react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ThemeToggle from '@/Components/UI/Elements/ThemeToggle';
import TimerBellControls from './Partials/TimerBellControls';
import useLiveTimer from './Partials/useLiveTimer';
import useSynchronizedTimer from './Partials/useSynchronizedTimer';
import useTimerBell from './Partials/useTimerBell';
import { acceptTimerState, displayedTimerSeconds, timerVersion } from './Partials/timerSynchronization';
import { formatTimer, monitorFocusPresentation, monitorModes } from './CourtMonitor/courtMonitorPresentation';

const ArenaMode = lazy(() => import('./CourtMonitor/Arena'));
const MatchMode = lazy(() => import('./CourtMonitor/Match'));
const TimerMode = lazy(() => import('./CourtMonitor/Timer'));
const ResultMode = lazy(() => import('./CourtMonitor/Result'));
const OfficialsMode = lazy(() => import('./CourtMonitor/Officials'));
const VarPanel = lazy(() => import('./CourtMonitor/Match/VarPanel'));

const modeComponents = {
    arena: ArenaMode,
    match: MatchMode,
    timer: TimerMode,
    result: ResultMode,
    officials: OfficialsMode,
};

function ModeLoading() {
    return (
        <div className="flex min-h-full items-center justify-center rounded-2xl border border-stone-200 bg-white dark:border-white/10 dark:bg-[#151210]" role="status">
            <span className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-white/60">
                <i className="fa-solid fa-hourglass-half" aria-hidden="true" /> Memuat tampilan court...
            </span>
        </div>
    );
}

function HeaderMeta({ icon, title, detail }) {
    return (
        <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-stone-200 bg-[#f7f4ee] px-3 py-2 dark:border-white/10 dark:bg-white/5">
            <i className={`fa-solid ${icon} shrink-0 text-base text-slate-600 dark:text-white/55`} aria-hidden="true" />
            <div className="min-w-0">
                <p className="line-clamp-2 text-xs font-black leading-tight text-[#071126] dark:text-white sm:text-sm">{title}</p>
                <p className="truncate text-[10px] font-semibold text-slate-600 dark:text-white/45 sm:text-xs">{detail}</p>
            </div>
        </div>
    );
}

function MonitorHeader({
    activeEvent,
    court,
    activeMatch,
    mode,
    monitorUrl,
    synchronizationLabel,
    synchronizationClass,
    backUrl,
    backLabel,
    bell,
    isVarActive,
    onToggleVar,
    isFullscreen,
    onHideControls,
    onToggleFullscreen,
}) {
    const categoryTitle = activeMatch?.category_name || 'Menunggu kategori';
    const matchDetail = activeMatch ? `Partai #${activeMatch.sequence}` : 'Belum ada partai';
    const roundTitle = activeMatch?.round_label || 'Menunggu babak';
    const roundDetail = activeMatch?.pool ? `Pool ${activeMatch.pool}` : activeMatch?.category_type || 'Court monitor';

    const focusPresentation = monitorFocusPresentation(false, isFullscreen);

    return (
        <header className="shrink-0 border-b border-stone-200 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.05)] backdrop-blur dark:border-white/10 dark:bg-[#100e0d]/95">
            <div className="w-full px-3 py-2.5 sm:px-4 lg:px-5 2xl:px-6">
                <div className="grid gap-3 xl:grid-cols-[minmax(250px,.72fr)_minmax(0,1.45fr)] xl:items-center">
                    <div className="min-w-0">
                        <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300 sm:text-xs">{activeEvent.name || 'Turnamen Kempo'}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-black tracking-[-0.04em] text-[#071126] dark:text-white sm:text-3xl">{court.name}</h1>
                            <span className={`inline-flex min-h-7 items-center gap-2 rounded-full border px-2.5 text-[10px] font-black sm:text-xs ${synchronizationClass}`}>
                                <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" /> {synchronizationLabel}
                            </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-600 dark:text-white/45">{court.location || court.area || 'Monitor pertandingan resmi'}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                        <HeaderMeta icon="fa-trophy" title={activeMatch?.category_type || 'Pertandingan'} detail={matchDetail} />
                        <HeaderMeta icon="fa-users" title={categoryTitle} detail={activeMatch?.category_class || activeMatch?.weight_class || 'Kategori aktif'} />
                        <HeaderMeta icon="fa-layer-group" title={roundTitle} detail={roundDetail} />
                    </div>
                </div>

                <div className="mt-2 flex flex-col gap-2 border-t border-stone-200 pt-2 dark:border-white/10 xl:flex-row xl:items-center xl:justify-between">
                    <nav className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Mode court monitor">
                        {monitorModes.map(([value, label, icon]) => (
                            <Link
                                key={value}
                                href={monitorUrl(value)}
                                preserveScroll
                                aria-current={mode === value ? 'page' : undefined}
                                className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-black transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 sm:text-xs xl:min-h-9 ${mode === value
                                    ? 'border-[#071126] bg-[#071126] text-white dark:border-amber-400 dark:bg-amber-400 dark:text-[#071126]'
                                    : 'border-stone-200 bg-[#f7f4ee] text-slate-700 hover:border-amber-500 hover:text-amber-800 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:text-amber-300'}`}
                            >
                                <i className={`fa-solid ${icon}`} aria-hidden="true" /> {label}
                            </Link>
                        ))}
                    </nav>
                    <div className="flex flex-wrap items-center gap-2">
                        <TimerBellControls bell={bell} />
                        {mode === 'match' && (
                            <button type="button" aria-pressed={isVarActive} onClick={() => onToggleVar()} className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-black active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 sm:text-xs xl:min-h-9 ${isVarActive ? 'border-red-600 bg-red-600 text-white' : 'border-stone-300 bg-white text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-white'}`}>
                                <i className="fa-solid fa-video" aria-hidden="true" /> VAR
                            </button>
                        )}
                        <button type="button" onClick={onHideControls} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 text-[10px] font-black text-slate-700 hover:bg-stone-100 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:border-white/15 dark:bg-white/5 dark:text-white sm:text-xs xl:min-h-9">
                            <i className={`fa-solid ${focusPresentation.controlsIcon}`} aria-hidden="true" /> {focusPresentation.controlsLabel}
                        </button>
                        <button type="button" onClick={onToggleFullscreen} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 text-[10px] font-black text-slate-700 hover:bg-stone-100 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:border-white/15 dark:bg-white/5 dark:text-white sm:text-xs xl:min-h-9">
                            <i className={`fa-solid ${focusPresentation.fullscreenIcon}`} aria-hidden="true" /> {focusPresentation.fullscreenLabel}
                        </button>
                        <ThemeToggle className="active:translate-y-px xl:min-h-9 xl:min-w-9 xl:rounded-lg" />
                        {backUrl && (
                            <Link href={backUrl} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 text-[10px] font-black text-slate-700 hover:bg-stone-100 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:border-white/15 dark:bg-white/5 dark:text-white sm:text-xs xl:min-h-9">
                                <i className="fa-solid fa-arrow-left" aria-hidden="true" /> {backLabel || 'Kembali'}
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

function FocusModeBar({ court, activeMatch, isFullscreen, onShowControls, onToggleFullscreen }) {
    const presentation = monitorFocusPresentation(true, isFullscreen);

    return (
        <div className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#100e0d]/95 sm:px-4" aria-label="Kontrol mode fokus">
            <p className="min-w-0 truncate text-xs font-black text-slate-700 dark:text-white/65">
                {court.name} <span className="text-slate-400" aria-hidden="true">·</span> {activeMatch?.category_name || 'Court monitor'}
            </p>
            <div className="flex items-center gap-2">
                <button type="button" onClick={onShowControls} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 text-[10px] font-black text-slate-700 hover:bg-stone-100 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:border-white/15 dark:bg-white/5 dark:text-white sm:text-xs">
                    <i className={`fa-solid ${presentation.controlsIcon}`} aria-hidden="true" /> {presentation.controlsLabel}
                </button>
                {isFullscreen && (
                    <button type="button" onClick={onToggleFullscreen} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 text-[10px] font-black text-slate-700 hover:bg-stone-100 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:border-white/15 dark:bg-white/5 dark:text-white sm:text-xs">
                        <i className={`fa-solid ${presentation.fullscreenIcon}`} aria-hidden="true" /> {presentation.fullscreenLabel}
                    </button>
                )}
            </div>
        </div>
    );
}

function VarReviewBanner({ match }) {
    if (!match?.var_review?.is_under_review) return null;

    return (
        <div className="border-b border-amber-300 bg-amber-100 px-4 py-3 text-center text-sm font-black text-amber-950" role="status">
            <i className="fa-solid fa-video mr-2" aria-hidden="true" /> Review VAR aktif: {match.var_review.reason || 'Pemeriksaan video pertandingan'}
        </div>
    );
}

export default function CourtMonitor({ activeEvent, court, mode = 'arena', monitor, stateUrl, timerStateUrl, backUrl, backLabel }) {
    const [snapshot, setSnapshot] = useState(monitor);
    const [snapshotError, setSnapshotError] = useState('');
    const [varKey, setVarKey] = useState(0);
    const [varUrlInput, setVarUrlInput] = useState('');
    const [isVarActive, setIsVarActive] = useState(() => Boolean(monitor?.is_var_enabled ?? court?.is_var_enabled ?? true));
    const [showVarConfig, setShowVarConfig] = useState(false);
    const [showLockedArchive, setShowLockedArchive] = useState(false);
    const [savingVarUrl, setSavingVarUrl] = useState(false);
    const [varSaveMessage, setVarSaveMessage] = useState('');
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const monitorRootRef = useRef(null);
    const monitorWasFullscreenRef = useRef(false);
    const varIframeRef = useRef(null);
    const refreshController = useRef(null);
    const bellRef = useRef(null);

    useEffect(() => {
        const synchronizeFullscreenState = () => {
            const monitorIsFullscreen = document.fullscreenElement === monitorRootRef.current;

            setIsFullscreen(monitorIsFullscreen);

            if (monitorWasFullscreenRef.current && !monitorIsFullscreen) {
                setIsFocusMode(false);
            }

            monitorWasFullscreenRef.current = monitorIsFullscreen;
        };

        document.addEventListener('fullscreenchange', synchronizeFullscreenState);

        return () => document.removeEventListener('fullscreenchange', synchronizeFullscreenState);
    }, []);

    const toggleMonitorFullscreen = async () => {
        if (document.fullscreenElement === monitorRootRef.current) {
            try {
                await document.exitFullscreen?.();
            } catch {
                setIsFullscreen(false);
            }

            return;
        }

        setIsFocusMode(true);

        try {
            await monitorRootRef.current.requestFullscreen();
        } catch {
            setIsFocusMode(false);
        }
    };

    useEffect(() => {
        if (snapshot?.is_var_enabled !== undefined) setIsVarActive(Boolean(snapshot.is_var_enabled));
    }, [snapshot?.is_var_enabled]);

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

                return isOlderState ? current : nextSnapshot;
            });
            setSnapshotError('');
        } catch (error) {
            if (error.name !== 'AbortError') setSnapshotError('Data pendukung belum tersambung. Timer resmi tetap mencoba sinkronisasi.');
        } finally {
            if (refreshController.current === controller) refreshController.current = null;
        }
    }, [stateUrl]);

    const initialTimerState = useMemo(() => ({
        event_id: activeEvent.id,
        court_id: court.id,
        match_id: monitor.active_match?.id ?? null,
        match_status: monitor.active_match?.status,
        call_status: monitor.active_match?.call_status,
        timer: monitor.active_match?.timer,
        server_now_ms: monitor.server_now_ms,
    }), [activeEvent.id, court.id, monitor]);

    const liveTimer = useLiveTimer({
        initialState: initialTimerState,
        stateUrl: timerStateUrl,
        channelName: `event-court.${court.id}`,
        eventId: activeEvent.id,
        courtId: court.id,
        onChange: (next, previous) => {
            if (next.action === 'finish' || (next.timer?.is_finished && !previous?.timer?.is_finished)) {
                bellRef.current?.playClosingBell?.();
            }
            if (next.match_id !== previous?.match_id || next.timer?.is_finished
                || !['start', 'pause', 'reset_timer', 'configure_timer'].includes(next.action)) {
                refreshSnapshot();
            }
        },
    });

    const { connected: realtimeConnected, httpConnected } = liveTimer;
    const snapshotTimerState = snapshot.active_match ? {
        event_id: activeEvent.id,
        court_id: court.id,
        match_id: snapshot.active_match.id,
        match_status: snapshot.active_match.status,
        call_status: snapshot.active_match.call_status,
        timer: snapshot.active_match.timer,
        server_now_ms: snapshot.server_now_ms,
    } : null;
    const selectedTimerState = liveTimer.state?.match_id === snapshotTimerState?.match_id
        ? acceptTimerState(liveTimer.state, snapshotTimerState, { canonical: true })
        : snapshotTimerState;
    const activeMatch = snapshot.active_match ? {
        ...snapshot.active_match,
        ...(selectedTimerState ? {
            status: selectedTimerState.match_status,
            call_status: selectedTimerState.call_status,
            timer: selectedTimerState.timer,
        } : {}),
    } : null;

    useEffect(() => () => refreshController.current?.abort(), []);

    useEffect(() => {
        let cancelled = false;
        let timeoutId;
        const poll = async () => {
            await refreshSnapshot();
            if (!cancelled) {
                const delay = (!realtimeConnected || liveTimer.state?.timer?.status === 'running') ? 4000 : 10000;
                timeoutId = window.setTimeout(poll, delay);
            }
        };
        timeoutId = window.setTimeout(poll, (!realtimeConnected || liveTimer.state?.timer?.status === 'running') ? 4000 : 10000);

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [refreshSnapshot, realtimeConnected, liveTimer.state?.timer?.status]);

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
        const courtChannel = window.Echo.private(`event-court.${court.id}`);
        const events = ['.var.review.updated', '.embu.score.updated', '.score.updated', '.embu.judge-score.updated', '.embu.penalties.updated', '.randori.score-state.updated'];
        events.forEach((event) => courtChannel.listen(event, refreshSnapshot));

        const currentMatchId = activeMatch?.id || snapshot.active_match?.id;
        const matchChannel = currentMatchId ? window.Echo.private(`tournament-match.${currentMatchId}`) : null;
        events.filter((event) => event !== '.embu.score.updated').forEach((event) => matchChannel?.listen(event, refreshSnapshot));

        return () => {
            events.forEach((event) => courtChannel.stopListening(event, refreshSnapshot));
            events.filter((event) => event !== '.embu.score.updated').forEach((event) => matchChannel?.stopListening(event, refreshSnapshot));
        };
    }, [court.id, activeMatch?.id, snapshot.active_match?.id, refreshSnapshot]);

    const updateCourtVar = async ({ enabled = isVarActive, url = varUrlInput.trim() || court?.var_url || null } = {}) => {
        const eventId = court?.event_id || activeEvent.id;
        const response = await fetch(`/admin/panitera/scoring/courts/${court.id}/var-url?event_id=${encodeURIComponent(eventId)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            body: JSON.stringify({ event_id: eventId, is_var_enabled: enabled, var_url: url }),
        });
        if (!response.ok) throw new Error('Pengaturan VAR gagal disimpan.');

        return response.json();
    };

    const toggleVarStatus = async (enabled) => {
        const nextValue = enabled ?? !isVarActive;
        setIsVarActive(nextValue);
        try {
            await updateCourtVar({ enabled: nextValue });
        } catch {
            setIsVarActive(!nextValue);
            setVarSaveMessage('Status VAR gagal disimpan.');
        }
    };

    const saveCourtVarUrl = async () => {
        setSavingVarUrl(true);
        setVarSaveMessage('');
        try {
            const data = await updateCourtVar({ url: varUrlInput.trim() || null });
            if (data.success) {
                setVarSaveMessage('URL VAR tersimpan.');
                setVarKey((key) => key + 1);
            }
        } catch {
            setVarSaveMessage('URL VAR gagal disimpan.');
        } finally {
            setSavingVarUrl(false);
        }
    };

    const timer = liveTimer.state?.timer;
    const elapsedMilliseconds = useSynchronizedTimer(timer, liveTimer.serverClock, liveTimer.state?.match_id);
    const bell = useTimerBell({ timer, elapsedMilliseconds, matchId: liveTimer.state?.match_id, synchronized: liveTimer.synchronized });
    bellRef.current = bell;

    const displayMatch = activeMatch || snapshot.last_result;
    const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
    const isResultSaved = Boolean(displayMatch?.is_result_saved || displayMatch?.result?.is_saved || displayMatch?.result?.status === 'verified');
    const timerDirection = displayMatch?.timer?.direction || 'up';
    const timerDuration = Number(displayMatch?.timer?.duration_seconds) || 120;
    const timerText = formatTimer(displayedTimerSeconds(displayMatch?.timer, elapsedMilliseconds));
    const isExpired = timerDirection === 'down' && elapsedSeconds >= timerDuration;
    const resultMatch = activeMatch?.result ? activeMatch : snapshot.last_result;
    const ActiveMode = modeComponents[mode] || MatchMode;
    const activeVarUrl = varUrlInput.trim() || court?.var_url || activeMatch?.var_stream_url || '';
    const monitorUrl = (targetMode) => `/admin/panitera/scoring/monitors/${court.id}?event_id=${encodeURIComponent(activeEvent.id)}&mode=${targetMode}`;
    const synchronizationLabel = realtimeConnected ? 'Real-time aktif' : httpConnected ? 'Sinkronisasi cadangan' : 'Menghubungkan ulang';
    const synchronizationClass = realtimeConnected
        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300'
        : httpConnected
            ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200'
            : 'border-red-300 bg-red-50 text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300';

    const modeProps = {
        arena: { activeMatch, snapshot, timerText, court },
        match: {
            match: displayMatch,
            court,
            timerText,
            timerDirection,
            timerDuration,
            isExpired,
            isResultSaved,
            akaTotal: displayMatch?.aka_total ?? displayMatch?.result?.aka_total ?? 0,
            shiroTotal: displayMatch?.shiro_total ?? displayMatch?.result?.shiro_total ?? 0,
            akaBreakdown: displayMatch?.aka_breakdown || displayMatch?.result?.aka_breakdown || {},
            shiroBreakdown: displayMatch?.shiro_breakdown || displayMatch?.result?.shiro_breakdown || {},
            winnerCorner: displayMatch?.result?.winner_corner ?? null,
            varPanel: isVarActive ? (
                <Suspense fallback={<ModeLoading />}>
                    <VarPanel
                        match={activeMatch}
                        activeVarUrl={activeVarUrl}
                        varKey={varKey}
                        iframeRef={varIframeRef}
                        showConfig={showVarConfig}
                        varUrlInput={varUrlInput}
                        savingVarUrl={savingVarUrl}
                        saveMessage={varSaveMessage}
                        onClose={() => toggleVarStatus(false)}
                        onReload={() => setVarKey((key) => key + 1)}
                        onFullscreen={() => varIframeRef.current?.requestFullscreen?.()}
                        onToggleConfig={() => setShowVarConfig((current) => !current)}
                        onUrlChange={setVarUrlInput}
                        onSave={saveCourtVarUrl}
                    />
                </Suspense>
            ) : null,
        },
        timer: { match: displayMatch, court, timerText, isExpired, timerDirection },
        result: {
            snapshot,
            court,
            activeEvent,
            activeMatch,
            resultMatch,
            showLockedArchive,
            onToggleLockedArchive: () => setShowLockedArchive((current) => !current),
        },
        officials: { staff: snapshot.staff, court },
    };

    return (
        <>
            <Head title={`${court.name} · Court Monitor`} />
            <div ref={monitorRootRef} className="flex min-h-dvh flex-col bg-[#f3f0e9] text-[#071126] dark:bg-[#090807] dark:text-white lg:h-dvh lg:overflow-hidden">
                {isFocusMode ? (
                    <FocusModeBar
                        court={court}
                        activeMatch={activeMatch}
                        isFullscreen={isFullscreen}
                        onShowControls={() => setIsFocusMode(false)}
                        onToggleFullscreen={toggleMonitorFullscreen}
                    />
                ) : (
                    <MonitorHeader
                        activeEvent={activeEvent}
                        court={court}
                        activeMatch={activeMatch}
                        mode={mode}
                        monitorUrl={monitorUrl}
                        synchronizationLabel={synchronizationLabel}
                        synchronizationClass={synchronizationClass}
                        backUrl={backUrl}
                        backLabel={backLabel}
                        bell={bell}
                        isVarActive={isVarActive}
                        onToggleVar={toggleVarStatus}
                        isFullscreen={isFullscreen}
                        onHideControls={() => setIsFocusMode(true)}
                        onToggleFullscreen={toggleMonitorFullscreen}
                    />
                )}
                <VarReviewBanner match={activeMatch} />
                <main className={`flex min-h-0 w-full flex-1 flex-col overflow-y-auto ${isFocusMode ? 'px-2 py-2 sm:px-3 lg:px-4 lg:py-3' : 'px-3 py-3 sm:px-4 lg:px-5 lg:py-4 2xl:px-6'}`}>
                    {snapshotError && (
                        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 sm:flex-row sm:items-center sm:justify-between" role="alert">
                            <span>{snapshotError}</span>
                            <button type="button" onClick={refreshSnapshot} className="min-h-11 cursor-pointer rounded-lg border border-amber-700 px-3 font-black active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">Coba lagi</button>
                        </div>
                    )}
                    <div className="min-h-0 flex-1">
                        <Suspense fallback={<ModeLoading />}>
                            <ActiveMode {...(modeProps[mode] || modeProps.match)} />
                        </Suspense>
                    </div>
                </main>
            </div>
        </>
    );
}
