import { useCallback, useEffect, useState } from 'react';

export const monotonicNow = () => (
    typeof performance !== 'undefined' ? performance.now() : Date.now()
);

export const createServerClock = ({ serverNow, serverNowMs, receivedAt = monotonicNow(), roundTripMs = 0 }) => {
    const parsedServerNow = Number(serverNowMs) || new Date(serverNow).getTime();

    return {
        serverNowMs: parsedServerNow + Math.max(0, Number(roundTripMs) || 0) / 2,
        receivedAt,
    };
};

export const timerVersion = (timer) => Math.max(0, Number(timer?.version) || 0);

const storedElapsedMilliseconds = (timer) => {
    const milliseconds = Math.max(0, Number(timer?.elapsed_ms) || 0);

    if (milliseconds === 0 && Number(timer?.elapsed_seconds) > 0) {
        return Number(timer.elapsed_seconds) * 1000;
    }

    return milliseconds;
};

const startedAtMilliseconds = (timer) => (
    Number(timer?.started_at_ms) || (timer?.started_at ? new Date(timer.started_at).getTime() : 0)
);

export const calculateElapsedMilliseconds = (timer, serverClock, currentPerformance = monotonicNow()) => {
    const stored = storedElapsedMilliseconds(timer);
    const startedAt = startedAtMilliseconds(timer);

    if (timer?.status !== 'running' || !startedAt || !Number.isFinite(serverClock?.serverNowMs)) {
        return stored;
    }

    const estimatedServerNow = serverClock.serverNowMs + Math.max(0, currentPerformance - serverClock.receivedAt);

    return stored + Math.max(0, estimatedServerNow - startedAt);
};

export default function useSynchronizedTimer(timer, serverClock) {
    const calculateElapsed = useCallback(
        (currentPerformance = monotonicNow()) => calculateElapsedMilliseconds(timer, serverClock, currentPerformance),
        [serverClock, timer],
    );
    const [elapsedMilliseconds, setElapsedMilliseconds] = useState(() => calculateElapsed());

    useEffect(() => {
        setElapsedMilliseconds(calculateElapsed());

        if (timer?.status !== 'running') return undefined;

        let animationFrameId;
        let lastRenderedTenth = -1;

        const renderTimer = (currentPerformance) => {
            const nextElapsed = calculateElapsed(currentPerformance);
            const currentTenth = Math.floor(nextElapsed / 100);

            if (currentTenth !== lastRenderedTenth) {
                lastRenderedTenth = currentTenth;
                setElapsedMilliseconds(nextElapsed);
            }

            animationFrameId = window.requestAnimationFrame(renderTimer);
        };

        animationFrameId = window.requestAnimationFrame(renderTimer);

        return () => window.cancelAnimationFrame(animationFrameId);
    }, [calculateElapsed, timer?.status]);

    return elapsedMilliseconds;
}
