import test from 'node:test';
import assert from 'node:assert/strict';
import {
    activeScoreBreakdown,
    competitorCardState,
    embuAthletes,
    embuParticipantLayout,
    formatTimer,
    participantInitials,
    timerStatusLabel,
} from './courtMonitorPresentation.js';

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
