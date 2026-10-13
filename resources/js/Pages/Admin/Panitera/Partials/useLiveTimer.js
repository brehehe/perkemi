import { useCallback, useEffect, useRef, useState } from 'react';
import { acceptTimerState, createServerClock, monotonicNow } from './timerSynchronization';

export default function useLiveTimer({ initialState, stateUrl, channelName, eventId, courtId, onChange }) {
    const [state, setState] = useState(initialState);
    const stateRef = useRef(initialState);
    const clockRef = useRef(null);
    if (!clockRef.current) clockRef.current = createServerClock();
    const [connected, setConnected] = useState(false);
    const [httpConnected, setHttpConnected] = useState(true);
    const [synchronized, setSynchronized] = useState(false);
    const [syncGeneration, setSyncGeneration] = useState(0);
    const requestRef = useRef(null);
    const scopeRef = useRef(stateUrl);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const expectedMatchId = courtId ? null : initialState.match_id;

    const acceptState = useCallback((incoming) => {
        const current = stateRef.current;
        const next = acceptTimerState(current, incoming);
        if (next === current) return;
        stateRef.current = next;
        setState(next);
        if (next.match_id !== current?.match_id || next.timer?.version !== current?.timer?.version
            || next.match_status !== current?.match_status) onChangeRef.current?.(next, current);
    }, []);

    useEffect(() => {
        if (scopeRef.current !== stateUrl) {
            scopeRef.current = stateUrl;
            stateRef.current = initialState;
            setState(initialState);
        } else {
            acceptState(initialState);
        }
    }, [initialState, stateUrl, acceptState]);

    const refresh = useCallback(async () => {
        if (requestRef.current || !stateUrl) return;
        const controller = new AbortController();
        requestRef.current = controller;
        const timeout = window.setTimeout(() => controller.abort(), 5000);
        const sentAt = monotonicNow();
        try {
            const response = await fetch(stateUrl, {
                headers: { Accept: 'application/json' }, cache: 'no-store', signal: controller.signal,
            });
            if (!response.ok) throw new Error('Sinkronisasi timer gagal.');
            const payload = await response.json();
            const receivedAt = monotonicNow();
            if (controller.signal.aborted) return;
            clockRef.current.observe(payload, sentAt, receivedAt);
            setSynchronized(clockRef.current.synchronized);
            acceptState(payload);
            setHttpConnected(true);
        } catch {
            if (requestRef.current === controller) setHttpConnected(false);
        } finally {
            window.clearTimeout(timeout);
            if (requestRef.current === controller) requestRef.current = null;
        }
    }, [stateUrl, acceptState]);

    const resynchronize = useCallback(() => {
        requestRef.current?.abort();
        requestRef.current = null;
        clockRef.current.recalibrate();
        setSynchronized(false);
        setSyncGeneration((generation) => generation + 1);
    }, []);

    useEffect(() => {
        let cancelled = false;
        let timeout;
        const poll = async () => {
            await refresh();
            if (!cancelled) timeout = window.setTimeout(poll, !clockRef.current.synchronized ? 300 : connected ? 15000 : 1000);
        };
        poll();
        return () => { cancelled = true; window.clearTimeout(timeout); };
    }, [refresh, connected, syncGeneration]);

    useEffect(() => {
        const onVisible = () => { if (document.visibilityState === 'visible') resynchronize(); };
        window.addEventListener('online', resynchronize);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            window.removeEventListener('online', resynchronize);
            document.removeEventListener('visibilitychange', onVisible);
            requestRef.current?.abort();
            requestRef.current = null;
        };
    }, [refresh, resynchronize]);

    useEffect(() => {
        if (!window.Echo || !channelName) return undefined;
        const channel = window.Echo.private(channelName);
        const subscribed = () => { setConnected(true); resynchronize(); };
        const disconnected = () => setConnected(false);
        const handleState = (incoming) => {
            if (incoming.event_id !== eventId || (courtId && incoming.court_id !== courtId)) return;
            if (expectedMatchId && incoming.match_id !== expectedMatchId) return;
            if (courtId && incoming.action === 'release') { refresh(); return; }
            const cleared = courtId && incoming.match_status === 'completed';
            acceptState(cleared ? { ...incoming, match_id: null, timer: null } : incoming);
        };
        const stopConnectionListener = window.Echo.connector?.onConnectionChange?.((status) => {
            if (status !== 'connected') setConnected(false);
            else refresh();
        });
        if (channel.subscription?.subscribed) subscribed();
        channel.subscription?.bind('pusher:subscription_succeeded', subscribed);
        channel.subscription?.bind('pusher:subscription_error', disconnected);
        channel.listen('.panitera.match-state.updated', handleState);
        return () => {
            stopConnectionListener?.();
            channel.stopListening('.panitera.match-state.updated', handleState);
            channel.subscription?.unbind('pusher:subscription_succeeded', subscribed);
            channel.subscription?.unbind('pusher:subscription_error', disconnected);
            window.Echo.leave(channelName);
        };
    }, [acceptState, channelName, courtId, eventId, expectedMatchId, refresh, resynchronize]);

    return { state, acceptState, refresh, serverClock: clockRef.current, connected, httpConnected, synchronized };
}
