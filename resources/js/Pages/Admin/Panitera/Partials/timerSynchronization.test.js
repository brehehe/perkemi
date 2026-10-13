import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptTimerState, calculateElapsedMilliseconds, createServerClock, displayedTimerSeconds } from './timerSynchronization.js';

const epoch = 1790000000000;
const running = { status: 'running', started_at_ms: epoch, elapsed_ms: 0, direction: 'down', duration_ms: 120000, version: 2 };

function device(bootOffset = 0) {
    let at = bootOffset;
    const clock = createServerClock(() => at);
    return {
        clock,
        setTime: (time) => { at = bootOffset + time; },
        sample(start, uplink, processing, downlink) {
            at = bootOffset + start + uplink + processing + downlink;
            clock.observe({ server_received_at_ms: epoch + start + uplink, server_now_ms: epoch + start + uplink + processing }, bootOffset + start, at);
        },
        read(timer = running) { return displayedTimerSeconds(timer, calculateElapsedMilliseconds(timer, clock)); },
    };
}

test('three devices with different monotonic origins and server processing delays show the same countdown', () => {
    const devices = [device(100), device(850000), device(32)];
    for (const [i, client] of devices.entries()) {
        for (let sample = 0; sample < 3; sample++) client.sample(sample * 1000, 10 + i * 10, 25 + i * 200, 10 + i * 10);
        assert.equal(client.clock.synchronized, true);
        client.setTime(17300);
    }
    assert.deepEqual(devices.map((client) => client.read()), [103, 103, 103]);
});

test('late samples and delayed duplicate broadcasts never rewind 00:57 to 00:59', () => {
    const client = device();
    for (let i = 0; i < 3; i++) client.sample(i * 100, 5, 5, 5);
    client.setTime(63500);
    assert.equal(client.read(), 57);
    client.sample(63500, 5, 10, 2200);
    assert.equal(client.read(), 55);
    const state = { event_id: 'event', match_id: 'match', timer: running, server_now_ms: epoch + 500 };
    const delayed = acceptTimerState(state, { ...state, server_now_ms: epoch + 100 });
    assert.equal(delayed, state);
    assert.equal(client.read(delayed.timer), 55);
});

test('clock correction after old samples expire slews without ever running backwards', () => {
    const client = device();
    for (let i = 0; i < 3; i++) client.sample(i * 100, 5, 5, 5);
    client.setTime(130000);
    let previous = client.clock.now();
    client.sample(130000, 5, 10, 2000);
    for (let i = 0; i < 200; i++) {
        client.setTime(132015 + i * 50);
        const current = client.clock.now();
        assert.ok(current >= previous);
        previous = current;
    }
});

test('pause uses the same authoritative milliseconds on all devices regardless of arrival delay', () => {
    const clients = [device(), device(50000), device(400)];
    clients.forEach((client, i) => {
        for (let sample = 0; sample < 3; sample++) client.sample(sample * 100, 5, 5, 5);
        client.setTime(37650 + i * 600);
    });
    const paused = { ...running, status: 'paused', started_at_ms: null, elapsed_ms: 37650, version: 3 };
    assert.deepEqual(clients.map((client) => client.read(paused)), [83, 83, 83]);
    clients.forEach((client) => client.setTime(45000));
    assert.deepEqual(clients.map((client) => client.read(paused)), [83, 83, 83]);
    const resumed = { ...paused, status: 'running', started_at_ms: epoch + 45000, version: 4 };
    clients.forEach((client) => client.setTime(50500));
    assert.deepEqual(clients.map((client) => client.read(resumed)), [77, 77, 77]);
});

test('old snapshots cannot undo a pause, reset, or switch to another match', () => {
    const current = { event_id: 'event', match_id: 'new', timer: { ...running, version: 5 }, server_now_ms: epoch + 2000 };
    assert.equal(acceptTimerState(current, { ...current, timer: { ...running, version: 4 }, server_now_ms: epoch + 3000 }), current);
    assert.equal(acceptTimerState(current, { ...current, match_id: 'old', observed_at_ms: epoch + 1000, server_now_ms: epoch + 4000 }), current);
    assert.equal(acceptTimerState(current, { ...current, event_id: 'other', server_now_ms: epoch + 5000 }), current);
    const reset = { ...current, timer: { ...running, status: 'stopped', elapsed_ms: 0, version: 6 }, server_now_ms: epoch + 3000 };
    assert.equal(acceptTimerState(current, reset), reset);
});

test('reset, direction and expiration use the same display calculation', () => {
    const client = device();
    const reset = { ...running, status: 'stopped', elapsed_ms: 0, version: 8 };
    assert.equal(client.read(reset), 120);
    assert.equal(client.read({ ...reset, direction: 'up' }), 0);
    assert.equal(displayedTimerSeconds(running, 120001), 0);
    assert.equal(displayedTimerSeconds({ ...running, direction: 'up' }, 120001), 120);
    assert.equal(displayedTimerSeconds(running, 119999), 1);
    assert.equal(displayedTimerSeconds(running, 120000), 0);
});

test('first calibration uses the best of three samples before exposing a running clock', () => {
    const client = device();
    client.sample(0, 1000, 5, 5);
    assert.equal(client.clock.synchronized, false);
    client.sample(1100, 5, 5, 5);
    client.sample(1300, 5, 5, 5);
    client.setTime(63500);
    assert.equal(client.clock.synchronized, true);
    assert.equal(client.read(), 57);
});

test('returning from device sleep discards the pre-sleep clock calibration', () => {
    let localTime = 0;
    const clock = createServerClock(() => localTime);
    for (let i = 0; i < 3; i++) {
        localTime = i * 100 + 20;
        clock.observe({ server_received_at_ms: epoch + i * 100 + 10, server_now_ms: epoch + i * 100 + 10 }, i * 100, localTime);
    }
    clock.recalibrate();
    assert.equal(clock.synchronized, false);
    for (let i = 0; i < 3; i++) {
        const sentAt = 300 + i * 100;
        localTime = sentAt + 20;
        clock.observe({ server_received_at_ms: epoch + 60000 + sentAt + 10, server_now_ms: epoch + 60000 + sentAt + 10 }, sentAt, localTime);
    }
    assert.equal(clock.synchronized, true);
    assert.equal(clock.now(), epoch + 60520);
});
