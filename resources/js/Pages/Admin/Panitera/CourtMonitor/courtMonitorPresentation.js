export const monitorModes = [
    ['arena', 'Arena', 'fa-tv'],
    ['match', 'Layar Tanding', 'fa-display'],
    ['timer', 'Timer', 'fa-stopwatch'],
    ['result', 'Hasil', 'fa-ranking-star'],
    ['officials', 'Ofisial', 'fa-user-shield'],
];

export function formatTimer(totalSeconds) {
    const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));

    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function timerStatusLabel(timer, isExpired = false) {
    if (timer?.is_finished) return 'Partai selesai';
    if (isExpired) return 'Waktu habis';
    if (timer?.status === 'running') return 'Waktu berjalan';
    if (timer?.status === 'paused') return 'Waktu dijeda';

    return 'Menunggu wasit';
}

export function participantInitials(name, fallback = 'KS') {
    const initials = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');

    return initials || fallback;
}

export function activeScoreBreakdown(breakdown = {}) {
    const labels = {
        ippon: 'Ippon',
        waza_ari: 'Waza-ari',
        yuko: 'Yuko',
        yusei: 'Yusei',
        mujoken: 'Mujoken',
        batsu_5: 'Batsu 5',
        batsu_10: 'Batsu 10',
    };

    return Object.entries(breakdown)
        .filter(([, value]) => Number(value) > 0)
        .map(([key, value]) => ({ key, label: labels[key] || key.replaceAll('_', ' '), value: Number(value) }));
}

export function competitorCardState(corner, winnerCorner) {
    return {
        isWinner: winnerCorner === corner,
        isDecided: winnerCorner === 'aka' || winnerCorner === 'shiro',
        shouldDim: false,
    };
}

export function embuAthletes(match) {
    if (!Array.isArray(match?.participant?.athletes)) return [];

    return match.participant.athletes.filter((athlete) => athlete?.name);
}

export function embuParticipantLayout(athleteCount) {
    const count = Math.max(0, Number(athleteCount) || 0);

    return {
        usesTwoColumns: count > 1,
        fullWidthFinalIndex: count === 3 ? 2 : null,
    };
}
