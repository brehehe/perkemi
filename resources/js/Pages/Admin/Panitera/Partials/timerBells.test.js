import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimerBellTracker } from './timerBells.js';
import { nextTimerTickDelay } from './timerSynchronization.js';

const stopped = { status: 'stopped', elapsed_ms: 0, run_id: null, duration_ms: 120000, direction: 'up', category_type: 'embu' };
const running = { ...stopped, status: 'running', run_id: 1 };

test('Embu rings at start, 90 and 120 seconds only, and the clock keeps ticking after two minutes', () => {
    const observe = createTimerBellTracker();
    assert.equal(observe(stopped, 0, 'embu'), null);
    assert.equal(observe(running, 25, 'embu'), 'start');
    assert.equal(observe({ ...running }, 30, 'embu'), null);
    assert.equal(observe(running, 89999, 'embu'), null);
    assert.equal(observe(running, 90002, 'embu'), 90000);
    assert.equal(observe(running, 90002, 'embu'), null);
    assert.equal(observe(running, 120002, 'embu'), 120000);
    assert.equal(observe(running, 150000, 'embu'), null);
    assert.equal(nextTimerTickDelay(running, 150000), 1002);
});

test('Randori rings at start and zero, stops ticking at zero and rings again for the next run', () => {
    const observe = createTimerBellTracker();
    const idle = { ...stopped, direction: 'down', category_type: 'randori' };
    const countdown = { ...idle, status: 'running', run_id: 1 };
    observe(idle, 0, 'randori');
    assert.equal(observe(countdown, 20, 'randori'), 'start');
    assert.equal(observe(countdown, 90000, 'randori'), null);
    assert.equal(observe(countdown, 120010, 'randori'), 120000);
    assert.equal(nextTimerTickDelay(countdown, 120010), null);
    assert.equal(observe(countdown, 121000, 'randori'), null);
    assert.equal(observe({ ...countdown, run_id: 2 }, 15, 'randori'), 'start');
    assert.equal(observe({ ...countdown, run_id: 2 }, 120001, 'randori'), 120000);
});

test('pause and resume preserve checkpoints and do not replay the start bell', () => {
    const observe = createTimerBellTracker();
    observe(stopped, 0, 'embu');
    observe(running, 20, 'embu');
    assert.equal(observe(running, 90001, 'embu'), 90000);
    assert.equal(observe({ ...running, status: 'paused', elapsed_ms: 91000 }, 91000, 'embu'), null);
    assert.equal(observe({ ...running, elapsed_ms: 91000 }, 91000, 'embu'), null);
    assert.equal(observe({ ...running, elapsed_ms: 91000 }, 120002, 'embu'), 120000);
    assert.equal(observe({ ...running, is_finished: true, status: 'stopped', elapsed_ms: 125000 }, 125000, 'embu'), null);
});

test('loading a running match or reconnecting late does not replay historical bells', () => {
    const observe = createTimerBellTracker();
    assert.equal(observe(running, 90050, 'embu'), null);
    assert.equal(observe(running, 90500, 'embu'), null);
    assert.equal(observe(running, 110000, 'embu', false), null);
    assert.equal(observe(running, 150000, 'embu'), null);
    assert.equal(observe(running, 0, 'other-match'), 'start');
    const refresh = createTimerBellTracker();
    assert.equal(refresh(running, 10, 'embu'), null);
});

test('a late pause just before a checkpoint does not ring it twice after resume', () => {
    const observe = createTimerBellTracker();
    observe(stopped, 0, 'embu');
    observe(running, 10, 'embu');
    assert.equal(observe(running, 90020, 'embu'), 90000);
    assert.equal(observe({ ...running, status: 'paused', elapsed_ms: 89990 }, 89990, 'embu'), null);
    assert.equal(observe({ ...running, elapsed_ms: 89990 }, 90030, 'embu'), null);
});

test('start during initial calibration rings once after the clock is ready', () => {
    const observe = createTimerBellTracker();
    observe(stopped, 0, 'embu', false);
    assert.equal(observe(running, 0, 'embu', false), null);
    assert.equal(observe(running, 400, 'embu', true), 'start');
    assert.equal(observe(running, 410, 'embu', true), null);
});

test('reset allows new bells and stopped timers never schedule a display tick', () => {
    const observe = createTimerBellTracker();
    observe(stopped, 0, 'embu');
    observe(running, 10, 'embu');
    observe(running, 90001, 'embu');
    assert.equal(observe({ ...stopped, run_id: 1 }, 0, 'embu'), null);
    assert.equal(observe({ ...running, run_id: 3 }, 20, 'embu'), 'start');
    assert.equal(observe({ ...running, run_id: 3 }, 90001, 'embu'), 90000);
    assert.equal(nextTimerTickDelay(stopped, 0), null);
    assert.equal(nextTimerTickDelay({ ...running, status: 'paused' }, 650), null);
    assert.equal(nextTimerTickDelay(running, 400), 602);
});
