import { useEffect, useState } from 'react';
import { calculateElapsedMilliseconds, nextTimerTickDelay } from './timerSynchronization';

export default function useSynchronizedTimer(timer, serverClock, matchId) {
    const [sample, setSample] = useState(() => ({ timer, matchId, elapsed: calculateElapsedMilliseconds(timer, serverClock) }));

    useEffect(() => {
        let timeout;
        const tick = () => {
            const next = calculateElapsedMilliseconds(timer, serverClock);
            setSample({ timer, matchId, elapsed: next });
            const delay = nextTimerTickDelay(timer, next);
            if (delay !== null) timeout = window.setTimeout(tick, delay);
        };
        // Wake only at the next displayed second, using the server clock each time.
        tick();
        return () => window.clearTimeout(timeout);
    }, [timer, serverClock, matchId]);

    // A new run must never render the elapsed time from the previous run, even for one render.
    return timer?.status === 'running' && sample.timer === timer && sample.matchId === matchId
        ? sample.elapsed : calculateElapsedMilliseconds(timer, serverClock);
}
