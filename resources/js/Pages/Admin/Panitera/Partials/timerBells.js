import { timerDurationMilliseconds } from './timerSynchronization.js';

export const TIMER_BELL_URL = '/bel/freesound_community-buzzerwav-14908.mp3';

export function getEmbuThresholds(timer) {
    const isTandoku = Boolean(
        timer?.is_tandoku ||
        timer?.penalty_category?.toLowerCase().includes('tandoku') ||
        timer?.category_name?.toLowerCase().includes('tandoku') ||
        timer?.category_name?.toLowerCase().includes('tunggal')
    );

    // Bel 1 menit (60s = 60000ms) untuk tandoku.
    // Bel 1.5 menit (90s = 90000ms) untuk tandoku, pasangan, dan beregu.
    // Bel menit ke-2 (120s = 120000ms) untuk tandoku, pasangan, dan beregu dihilangkan.
    return isTandoku ? [60000, 90000] : [90000];
}

// The tracker survives snapshots and resumes. Only a new run/reset permits new bells.
export function createTimerBellTracker() {
    let previous = null;
    let played = new Set();

    return (timer, elapsed, matchId, synchronized = true) => {
        const current = { matchId, runId: timer?.run_id, elapsed, status: timer?.status };
        if (!synchronized) {
            if (!previous) previous = current;
            return null;
        }
        const sameRun = previous && previous.matchId === matchId && previous.runId === current.runId;
        const before = previous;
        previous = current;
        if (!sameRun || (timer?.status === 'stopped' && elapsed === 0 && before?.elapsed > 0)) played = new Set();
        if (!timer || timer.is_finished) return null;

        const thresholds = timer.category_type === 'embu' ? getEmbuThresholds(timer) : [timerDurationMilliseconds(timer)];
        // Opening a running match, enabling audio late, and reconnecting must not replay old bells.
        if (!before || !sameRun) {
            thresholds.filter((threshold) => threshold <= elapsed).forEach((threshold) => played.add(threshold));
            if (before && timer.status === 'running' && timer.elapsed_ms === 0 && elapsed < 2000) {
                played.add('start');
                return 'start';
            }
            return null;
        }

        if (timer.status === 'running' && before.status !== 'running' && elapsed < 2000
            && Number(timer.elapsed_ms || 0) === 0 && !played.has('start')) {
            played.add('start');
            return 'start';
        }

        for (const threshold of thresholds) {
            if (elapsed < threshold || played.has(threshold)) continue;
            played.add(threshold);
            if (before.elapsed < threshold && elapsed - threshold < 2000
                && (timer.status === 'running' || before.status === 'running')) return threshold;
        }
        return null;
    };
}
