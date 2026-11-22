export const monotonicNow = () => performance.now();
export const timerVersion = (timer) => Math.max(0, Number(timer?.version) || 0);

const canonicalTimerFields = (state) => ({
    match_id: state?.match_id ?? null,
    match_status: state?.match_status ?? null,
    call_status: state?.call_status ?? null,
    timer: state?.timer ? {
        status: state.timer.status ?? null,
        started_at_ms: Number(state.timer.started_at_ms) || Date.parse(state.timer.started_at) || null,
        elapsed_ms: Math.max(0, Number(state.timer.elapsed_ms) || Number(state.timer.elapsed_seconds) * 1000 || 0),
        direction: state.timer.direction ?? null,
        duration_ms: Math.max(0, Number(state.timer.duration_ms) || Number(state.timer.duration_seconds) * 1000 || 0),
        run_id: state.timer.run_id ?? null,
        version: timerVersion(state.timer),
        is_finished: Boolean(state.timer.is_finished),
    } : null,
});

export function hasTimerStateConflict(current, incoming) {
    if (!current || !incoming || current.match_id !== incoming.match_id) return false;
    if (timerVersion(current.timer) !== timerVersion(incoming.timer)) return false;
    return JSON.stringify(canonicalTimerFields(current)) !== JSON.stringify(canonicalTimerFields(incoming));
}

// Only request/response samples measure clock offset. A one-way WebSocket
// message has unknown travel time and must never reset the clock.
export function createServerClock(now = monotonicNow, initialServerNowMs = null) {
    let samples = [];
    let targetOffset = null;
    let previousAt = now();
    let previousServerTime = null;
    let sampleCount = 0;

    const seed = (serverNowMs, at = now()) => {
        const ms = Number(serverNowMs);
        if (!Number.isFinite(ms) || ms <= 0) return;
        previousAt = at;
        previousServerTime = ms;
        targetOffset = ms - at;
        clock.synchronized = true;
    };

    const clock = {
        synchronized: false,
        uncertaintyMs: null,
        seed,
        recalibrate() {
            samples = [];
            targetOffset = null;
            sampleCount = 0;
            previousAt = now();
            previousServerTime = null;
            clock.synchronized = false;
            clock.uncertaintyMs = null;
        },
        now() {
            if (targetOffset === null) return null;
            const at = now();
            const delta = Math.max(0, at - previousAt);
            const projected = previousServerTime + delta;
            const correction = Math.max(-delta * 0.05, Math.min(delta * 0.05, at + targetOffset - projected));
            previousServerTime = projected + correction;
            previousAt = at;
            return previousServerTime;
        },
        observe(payload, sentAt, receivedAt = now()) {
            const serverSent = Number(payload.server_now_ms);
            const serverReceived = Number(payload.server_received_at_ms);
            const roundTrip = receivedAt - sentAt;
            const processing = serverSent - serverReceived;
            if (!Number.isFinite(serverSent) || !Number.isFinite(serverReceived)
                || roundTrip < 0 || processing < 0 || processing > roundTrip + 5) return false;
            const networkTime = Math.max(0, roundTrip - processing);
            const offset = serverSent + networkTime / 2 - receivedAt;
            samples = samples.filter((sample) => receivedAt - sample.at < 120000);
            samples.push({ at: receivedAt, networkTime, offset });
            samples.sort((a, b) => a.networkTime - b.networkTime || b.at - a.at);
            samples = samples.slice(0, 8);
            const best = samples[0];
            if (!clock.synchronized || targetOffset === null) {
                previousAt = receivedAt;
                previousServerTime = receivedAt + best.offset;
            } else {
                clock.now();
            }
            targetOffset = best.offset;
            sampleCount += 1;
            clock.synchronized = sampleCount >= 3;
            clock.uncertaintyMs = best.networkTime / 2;
            return true;
        },
    };

    if (initialServerNowMs) {
        seed(initialServerNowMs);
    }

    return clock;
}

export function acceptTimerState(current, incoming, { canonical = false } = {}) {
    if (!incoming || (current?.event_id && incoming.event_id !== current.event_id)) return current;
    if (current?.court_id && incoming.court_id !== current.court_id) return current;
    if (!current) return incoming;

    const sameMatch = current?.match_id === incoming.match_id;
    const currentVersion = timerVersion(current.timer);
    const incomingVersion = timerVersion(incoming.timer);

    if (sameMatch && incomingVersion < currentVersion) return current;
    if (sameMatch && incomingVersion === currentVersion) {
        if (!hasTimerStateConflict(current, incoming)) return current;
        return canonical ? incoming : current;
    }

    const observedAt = (state) => Number(state?.observed_at_ms ?? state?.server_now_ms) || 0;
    if (!sameMatch && observedAt(incoming) <= observedAt(current)) return current;

    return incoming;
}

export function calculateElapsedMilliseconds(timer, serverClock) {
    const stored = Math.max(0, Number(timer?.elapsed_ms) || Number(timer?.elapsed_seconds) * 1000 || 0);
    const startedAt = Number(timer?.started_at_ms) || Date.parse(timer?.started_at);
    if (timer?.status !== 'running' || !Number.isFinite(startedAt)) return stored;
    const serverNow = serverClock?.now ? serverClock.now() : null;
    const currentNow = serverNow !== null ? serverNow : (typeof Date !== 'undefined' ? Date.now() : null);
    if (currentNow === null) return stored;
    return stored + Math.max(0, currentNow - startedAt);
}

export const timerDurationMilliseconds = (timer) => Number(timer?.duration_ms) || Number(timer?.duration_seconds) * 1000 || 120000;

export function displayedTimerSeconds(timer, elapsedMilliseconds) {
    if (timer?.direction === 'down') {
        return Math.max(0, Math.ceil((timerDurationMilliseconds(timer) - elapsedMilliseconds) / 1000));
    }
    return Math.max(0, Math.floor(elapsedMilliseconds / 1000));
}

export function nextTimerTickDelay(timer, elapsedMilliseconds) {
    if (timer?.status !== 'running'
        || (timer.direction === 'down' && elapsedMilliseconds >= timerDurationMilliseconds(timer))) return null;
    const remainingInSecond = 1000 - (elapsedMilliseconds % 1000);
    return Math.max(16, remainingInSecond + 2);
}

export function timerSynchronizationPollDelay({ connected, synchronized, timerStatus, visible = true }) {
    if (!visible) return 30000;
    if (!synchronized) return 300;

    const isRunning = timerStatus === 'running';

    if (!connected) return isRunning ? 1000 : 2000;

    return isRunning ? 2000 : 5000;
}
