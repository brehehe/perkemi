import test from 'node:test';
import assert from 'node:assert/strict';
import {
    activeScoreBreakdown,
    competitorCardState,
    embuAthletes,
    embuJudgePresentation,
    embuJudgeSlots,
    embuParticipantLayout,
    formatEmbuScore,
    formatTimer,
    monitorFocusPresentation,
    participantInitials,
    timerStatusLabel,
} from './courtMonitorPresentation.js';

test('court monitor focus controls always expose a clear way back', () => {
    assert.deepEqual(monitorFocusPresentation(false, false), {
        controlsLabel: 'Sembunyikan kontrol',
        controlsIcon: 'fa-eye-slash',
        fullscreenLabel: 'Layar penuh',
        fullscreenIcon: 'fa-expand',
    });
    assert.deepEqual(monitorFocusPresentation(true, true), {
        controlsLabel: 'Tampilkan kontrol',
        controlsIcon: 'fa-eye',
        fullscreenLabel: 'Keluar layar penuh',
        fullscreenIcon: 'fa-compress',
    });
});

test('court monitor timer presentation is stable for invalid and valid values', () => {
    assert.equal(formatTimer(120), '02:00');
    assert.equal(formatTimer(106.9), '01:46');
    assert.equal(formatTimer(-1), '00:00');
    assert.equal(formatTimer(undefined), '00:00');
});

test('timer status prioritizes final and expired states', () => {
    assert.equal(timerStatusLabel({ status: 'running', is_finished: true }), 'Partai selesai');
    assert.equal(timerStatusLabel({ status: 'running' }, true), 'Waktu habis');
    assert.equal(timerStatusLabel({ status: 'paused' }), 'Waktu dijeda');
    assert.equal(timerStatusLabel({ status: 'stopped' }), 'Menunggu wasit');
});

test('participant initials and score breakdown use real match data only', () => {
    assert.equal(participantInitials('Indah Ramadhani'), 'IR');
    assert.equal(participantInitials('', 'AKA'), 'AKA');
    assert.deepEqual(activeScoreBreakdown({ ippon: 1, waza_ari: 0, yuko: 2 }), [
        { key: 'ippon', label: 'Ippon', value: 1 },
        { key: 'yuko', label: 'Yuko', value: 2 },
    ]);
});

test('a decided match keeps both competitor cards visible in their official colors', () => {
    assert.deepEqual(competitorCardState('aka', 'shiro'), {
        isWinner: false,
        isDecided: true,
        shouldDim: false,
    });
    assert.equal(competitorCardState('shiro', 'shiro').isWinner, true);
});

test('Embu athlete information only includes registered athletes with names', () => {
    assert.deepEqual(embuAthletes({
        participant: {
            athletes: [
                { id: 'athlete-1', name: 'Rendy Purnomo', photo_url: '/athletes/athlete-1/photo' },
                { id: 'athlete-2', name: '' },
                { id: 'athlete-3', name: 'Reza Ardiansyah' },
            ],
        },
    }).map((athlete) => athlete.name), ['Rendy Purnomo', 'Reza Ardiansyah']);
    assert.equal(embuAthletes({
        participant: { athletes: [{ id: 'athlete-1', name: 'Rendy Purnomo', photo_url: '/athletes/athlete-1/photo' }] },
    })[0].photo_url, '/athletes/athlete-1/photo');
    assert.deepEqual(embuAthletes({ participant: null }), []);
});

test('Embu participant layout uses one full card or a maximum two-column grid', () => {
    assert.deepEqual(embuParticipantLayout(1), {
        usesTwoColumns: false,
        fullWidthFinalIndex: null,
    });
    assert.deepEqual(embuParticipantLayout(2), {
        usesTwoColumns: true,
        fullWidthFinalIndex: null,
    });
    assert.deepEqual(embuParticipantLayout(3), {
        usesTwoColumns: true,
        fullWidthFinalIndex: 2,
    });
    assert.deepEqual(embuParticipantLayout(4), {
        usesTwoColumns: true,
        fullWidthFinalIndex: null,
    });
});

test('Embu judge slots always preserve the official five-judge order', () => {
    const slots = embuJudgeSlots([
        { judge_number: 3, referee_name: 'Juri Tiga', total_score: 87 },
        { judge_number: 1, referee_name: 'Juri Satu', total_score: 86 },
    ]);

    assert.deepEqual(slots.map((judge) => judge.judge_number), [1, 2, 3, 4, 5]);
    assert.equal(slots[0].referee_name, 'Juri Satu');
    assert.equal(slots[1].status, 'waiting');
    assert.equal(slots[2].referee_name, 'Juri Tiga');
});

test('Embu judge presentation distinguishes trimmed, middle, submitted, and waiting scores', () => {
    assert.deepEqual(embuJudgePresentation({ total_score: 86, is_trimmed_min: true }), {
        hasScore: true,
        tone: 'trimmed',
        statusLabel: 'Dicoret · terendah',
    });
    assert.equal(embuJudgePresentation({ total_score: 89, is_middle: true }).tone, 'middle');
    assert.equal(embuJudgePresentation({ total_score: 88, status: 'submitted' }).statusLabel, 'Nilai terkirim');
    assert.equal(embuJudgePresentation({ total_score: 0, completed_items: 6 }).statusLabel, '6/10 aspek terisi');
});

test('Embu score formatter removes trailing zeroes without losing meaningful precision', () => {
    assert.equal(formatEmbuScore(86), '86');
    assert.equal(formatEmbuScore('87.5'), '87.5');
    assert.equal(formatEmbuScore('87.25'), '87.25');
    assert.equal(formatEmbuScore('262.00'), '262');
    assert.equal(formatEmbuScore(0), '0');
    assert.equal(formatEmbuScore(null), '–');
    assert.equal(formatEmbuScore('invalid'), '–');
});
