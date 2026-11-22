import test from 'node:test';
import assert from 'node:assert/strict';
import { listenForPaniteraTimerState, PANITERA_TIMER_EVENT } from './timerChannel.js';

test('timer subscription removes only its own callback', () => {
    const calls = [];
    const channel = {
        listen: (...argumentsList) => calls.push(['listen', ...argumentsList]),
        stopListening: (...argumentsList) => calls.push(['stopListening', ...argumentsList]),
    };
    const handler = () => {};

    const stopListening = listenForPaniteraTimerState(channel, handler);
    stopListening();

    assert.deepEqual(calls, [
        ['listen', PANITERA_TIMER_EVENT, handler],
        ['stopListening', PANITERA_TIMER_EVENT, handler],
    ]);
});
