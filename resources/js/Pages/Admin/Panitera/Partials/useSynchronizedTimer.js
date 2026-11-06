import { useEffect, useState } from 'react';
import { calculateElapsedMilliseconds, nextTimerTickDelay } from './timerSynchronization';

export default function useSynchronizedTimer(timer, serverClock, matchId) {
    const [sample, setSample] = useState(() => ({ timer, matchId, elapsed: calculateElapsedMilliseconds(timer, serverClock) }));

    useEffect(() => {
        let timeout;
        let isCancelled = false;

        const tick = () => {
            if (isCancelled) return;
            const next = calculateElapsedMilliseconds(timer, serverClock);
            setSample({ timer, matchId, elapsed: next });
            const delay = nextTimerTickDelay(timer, next);
            if (delay !== null) {
                const safeDelay = Math.min(delay, 250);
                timeout = window.setTimeout(tick, safeDelay);
            }
        };

        tick();

        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                tick();
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            isCancelled = true;
            window.clearTimeout(timeout);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [timer, serverClock, matchId]);

    // A new run must never render the elapsed time from the previous run, even for one render.
    return timer?.status === 'running' && sample.timer === timer && sample.matchId === matchId
        ? sample.elapsed : calculateElapsedMilliseconds(timer, serverClock);
}
