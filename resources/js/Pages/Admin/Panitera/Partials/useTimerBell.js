import { useCallback, useEffect, useRef, useState } from 'react';
import { createTimerBellTracker, TIMER_BELL_URL } from './timerBells';

export default function useTimerBell({ timer, elapsedMilliseconds, matchId, synchronized }) {
    const [enabled, setEnabled] = useState(false);
    const [error, setError] = useState('');
    const contextRef = useRef(null);
    const bufferRef = useRef(null);
    const loadingRef = useRef(null);
    const readyRef = useRef(null);
    const enabledRef = useRef(false);
    const mutedRef = useRef(false);
    const sourceRef = useRef(null);
    const trackerRef = useRef(null);
    if (!trackerRef.current) trackerRef.current = createTimerBellTracker();

    const enable = useCallback(async () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) throw new Error('Audio tidak didukung');
            const context = contextRef.current || new AudioContext();
            contextRef.current = context;
            // Resume is invoked inside the user's gesture, before any network work.
            const resumed = context.resume();
            if (!loadingRef.current) {
                loadingRef.current = fetch(TIMER_BELL_URL)
                    .then((response) => {
                        if (!response.ok) throw new Error('File bel tidak tersedia');
                        return response.arrayBuffer();
                    })
                    .then((data) => context.decodeAudioData(data))
                    .then((buffer) => { bufferRef.current = buffer; });
            }
            await Promise.all([resumed, loadingRef.current]);
            if (contextRef.current !== context || context.state !== 'running' || mutedRef.current) return false;
            enabledRef.current = true;
            setEnabled(true);
            setError('');
            return true;
        } catch {
            loadingRef.current = null;
            enabledRef.current = false;
            setEnabled(false);
            setError('Suara belum aktif. Tekan Aktifkan Bel untuk mencoba kembali.');
            return false;
        }
    }, []);

    const play = useCallback(() => {
        const context = contextRef.current;
        if (!enabledRef.current || !bufferRef.current) return;
        if (context?.state !== 'running') {
            enabledRef.current = false;
            setEnabled(false);
            setError('Tekan Aktifkan Bel setelah perangkat kembali aktif.');
            return;
        }
        sourceRef.current?.stop();
        const source = context.createBufferSource();
        source.buffer = bufferRef.current;
        source.connect(context.destination);
        source.onended = () => {
            source.disconnect();
            if (sourceRef.current === source) sourceRef.current = null;
        };
        sourceRef.current = source;
        source.start();
    }, []);

    const prepareForStart = useCallback(() => {
        if (!mutedRef.current) {
            readyRef.current = enable();
            return readyRef.current;
        }
        return Promise.resolve(false);
    }, [enable]);

    const toggle = useCallback(async () => {
        if (enabledRef.current) {
            mutedRef.current = true;
            enabledRef.current = false;
            sourceRef.current?.stop();
            setEnabled(false);
        } else {
            mutedRef.current = false;
            await enable();
        }
    }, [enable]);

    const test = useCallback(async () => {
        mutedRef.current = false;
        if (await enable()) play();
    }, [enable, play]);

    const playClosingBell = useCallback(async () => {
        try {
            if (!mutedRef.current) {
                await enable();
            }
        } catch {
            // Audio enable failed, will fall back below
        }

        if (enabledRef.current && bufferRef.current && contextRef.current?.state === 'running') {
            play();
            setTimeout(() => {
                if (contextRef.current?.state === 'running') {
                    play();
                } else if (typeof window !== 'undefined' && window.playBuzzer) {
                    window.playBuzzer(TIMER_BELL_URL);
                }
            }, 800);
        } else {
            if (typeof window !== 'undefined' && window.playBuzzerDouble) {
                window.playBuzzerDouble(TIMER_BELL_URL);
            } else {
                try {
                    const audio = new Audio(TIMER_BELL_URL);
                    audio.play().then(() => {
                        setTimeout(() => {
                            try {
                                new Audio(TIMER_BELL_URL).play().catch(() => {});
                            } catch {}
                        }, 800);
                    }).catch(() => {});
                } catch {}
            }
        }
    }, [enable, play]);

    useEffect(() => {
        const cue = trackerRef.current(timer, elapsedMilliseconds, matchId, synchronized);
        if (cue !== null) {
            // Loading the small MP3 never delays the official start command.
            const detectedAt = performance.now();
            Promise.resolve(readyRef.current || loadingRef.current).then(() => {
                if (performance.now() - detectedAt < 2000) play();
            }).catch(() => {});
        }
    }, [timer, elapsedMilliseconds, matchId, synchronized, play]);

    useEffect(() => () => {
        sourceRef.current?.stop();
        contextRef.current?.close();
        contextRef.current = null;
        bufferRef.current = null;
        loadingRef.current = null;
        readyRef.current = null;
        enabledRef.current = false;
    }, []);

    return { enabled, error, toggle, test, prepareForStart, play, playClosingBell };
}
