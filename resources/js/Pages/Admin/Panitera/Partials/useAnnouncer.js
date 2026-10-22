import { useCallback, useEffect, useState } from 'react';
import {
    getOfficialCallText,
    getParticipantCallText,
    playBeepAndSpeak,
    stopAnnouncer,
} from './announcer';

export default function useAnnouncer({ match } = {}) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeText, setActiveText] = useState('');

    const initialOfficialCalls = match?.call_status === 'officials_called' || match?.call_status === 'participants_called' ? 1 : 0;
    const initialParticipantCalls = match?.call_status === 'participants_called' ? 1 : 0;

    const [officialCallCount, setOfficialCallCount] = useState(initialOfficialCalls);
    const [participantCallCount, setParticipantCallCount] = useState(initialParticipantCalls);

    // Sync call counts if match changes or loads with existing status
    useEffect(() => {
        if (match?.call_status === 'participants_called') {
            setParticipantCallCount((prev) => Math.max(prev, 1));
            setOfficialCallCount((prev) => Math.max(prev, 1));
        } else if (match?.call_status === 'officials_called') {
            setOfficialCallCount((prev) => Math.max(prev, 1));
        }
    }, [match?.id, match?.call_status]);

    useEffect(() => {
        const handleState = (event) => {
            setIsPlaying(Boolean(event.detail?.isPlaying));
            setActiveText(event.detail?.text || '');
        };

        window.addEventListener('announcer-state-changed', handleState);
        return () => {
            window.removeEventListener('announcer-state-changed', handleState);
        };
    }, []);

    const callOfficials = useCallback((targetMatch = match) => {
        const nextCount = officialCallCount + 1;
        setOfficialCallCount(nextCount);
        const text = getOfficialCallText(targetMatch, nextCount);
        playBeepAndSpeak(text);
        return { text, callNumber: nextCount };
    }, [match, officialCallCount]);

    const callParticipants = useCallback((targetMatch = match) => {
        const nextCount = participantCallCount + 1;
        setParticipantCallCount(nextCount);
        const text = getParticipantCallText(targetMatch, nextCount);
        playBeepAndSpeak(text);
        return { text, callNumber: nextCount };
    }, [match, participantCallCount]);

    const speakCustom = useCallback((text) => {
        if (text) {
            playBeepAndSpeak(text);
        }
    }, []);

    const stop = useCallback(() => {
        stopAnnouncer();
    }, []);

    return {
        isPlaying,
        activeText,
        officialCallCount,
        participantCallCount,
        callOfficials,
        callParticipants,
        speakCustom,
        stop,
    };
}
