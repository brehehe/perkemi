import { useEffect, useState } from 'react';
import { calculateElapsedMilliseconds } from './timerSynchronization';

export default function useSynchronizedTimer(timer, serverClock, matchId) {
    const [elapsedMilliseconds, setElapsedMilliseconds] = useState(() => calculateElapsedMilliseconds(timer, serverClock));

    useEffect(() => {
        setElapsedMilliseconds(calculateElapsedMilliseconds(timer, serverClock));
        if (timer?.status !== 'running') return undefined;
        // React updates once per displayed second; there are no server ticks.
        const interval = window.setInterval(() => {
            const next = calculateElapsedMilliseconds(timer, serverClock);
            setElapsedMilliseconds((previous) => Math.floor(previous / 1000) === Math.floor(next / 1000) ? previous : next);
        }, 50);
        return () => window.clearInterval(interval);
    }, [timer, serverClock, matchId]);

    return timer?.status === 'running' ? elapsedMilliseconds : calculateElapsedMilliseconds(timer, serverClock);
}
