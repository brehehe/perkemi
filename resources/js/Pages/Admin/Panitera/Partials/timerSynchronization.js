export const monotonicNow = () => performance.now();
export const timerVersion = (timer) => Math.max(0, Number(timer?.version) || 0);

// Only request/response samples measure clock offset. A one-way WebSocket
// message has unknown travel time and must never reset the clock.
export function createServerClock(now = monotonicNow) {
    let samples = [];
    let targetOffset = null;
    let previousAt = now();
    let previousServerTime = null;
    let sampleCount = 0;
    const clock = {
        synchronized: false,
        uncertaintyMs: null,
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
            if (!clock.synchronized) {
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
    return clock;
}

export function acceptTimerState(current, incoming) {
    if (!incoming || (current?.event_id && incoming.event_id !== current.event_id)) return current;
    const sameMatch = current?.match_id === incoming.match_id;
    if (sameMatch && timerVersion(incoming.timer) < timerVersion(current?.timer)) return current;
    const observedAt = (state) => Number(state?.observed_at_ms ?? state?.server_now_ms) || 0;
    if ((!sameMatch || timerVersion(incoming.timer) === timerVersion(current?.timer))
        && observedAt(incoming) <= observedAt(current)) return current;
    return incoming;
}

export function calculateElapsedMilliseconds(timer, serverClock) {
    const stored = Math.max(0, Number(timer?.elapsed_ms) || Number(timer?.elapsed_seconds) * 1000 || 0);
    const startedAt = Number(timer?.started_at_ms) || Date.parse(timer?.started_at);
    const serverNow = serverClock.now();
    if (timer?.status !== 'running' || !Number.isFinite(startedAt) || serverNow === null) return stored;
    return stored + Math.max(0, serverNow - startedAt);
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
