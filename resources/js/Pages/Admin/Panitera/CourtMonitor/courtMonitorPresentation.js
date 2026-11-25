export const monitorModes = [
    ['arena', 'Arena', 'fa-tv'],
    ['match', 'Layar Tanding', 'fa-display'],
    ['timer', 'Timer', 'fa-stopwatch'],
    ['result', 'Hasil', 'fa-ranking-star'],
    ['officials', 'Ofisial', 'fa-user-shield'],
];

export function monitorFocusPresentation(isFocusMode, isFullscreen) {
    return {
        controlsLabel: isFocusMode ? 'Tampilkan kontrol' : 'Sembunyikan kontrol',
        controlsIcon: isFocusMode ? 'fa-eye' : 'fa-eye-slash',
        fullscreenLabel: isFullscreen ? 'Keluar layar penuh' : 'Layar penuh',
        fullscreenIcon: isFullscreen ? 'fa-compress' : 'fa-expand',
    };
}

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

export function formatEmbuScore(value, fallback = '–') {
    if (value === null || value === undefined || value === '') return fallback;

    const score = Number(value);

    if (!Number.isFinite(score)) return fallback;

    return score.toFixed(2).replace(/\.?0+$/, '');
}

export function embuJudgeSlots(judges = []) {
    const judgesByNumber = new Map(
        judges.map((judge) => [Number(judge.judge_number), judge]),
    );

    return Array.from({ length: 5 }, (_, index) => {
        const judgeNumber = index + 1;

        return judgesByNumber.get(judgeNumber) || {
            judge_number: judgeNumber,
            referee_name: `Juri ${judgeNumber}`,
            technique_subtotal: null,
            expression_subtotal: null,
            total_score: null,
            completed_items: 0,
            status: 'waiting',
            is_signed: false,
            is_trimmed_min: false,
            is_trimmed_max: false,
            is_middle: false,
        };
    });
}

export function embuJudgePresentation(judge = {}) {
    const hasScore = Number(judge.total_score) > 0;
    const isTrimmed = hasScore && Boolean(judge.is_trimmed_min || judge.is_trimmed_max);
    const isMiddle = hasScore && Boolean(judge.is_middle);

    if (isTrimmed) {
        return {
            hasScore,
            tone: 'trimmed',
            statusLabel: judge.is_trimmed_min ? 'Dicoret · terendah' : 'Dicoret · tertinggi',
        };
    }

    if (isMiddle) {
        return {
            hasScore,
            tone: 'middle',
            statusLabel: 'Dihitung · wasit tengah',
        };
    }

    if (hasScore) {
        return {
            hasScore,
            tone: 'submitted',
            statusLabel: judge.status === 'submitted' ? 'Nilai terkirim' : 'Nilai tersimpan',
        };
    }

    return {
        hasScore,
        tone: 'waiting',
        statusLabel: judge.completed_items > 0 ? `${judge.completed_items}/10 aspek terisi` : 'Menunggu nilai',
    };
}
