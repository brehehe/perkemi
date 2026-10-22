import test from 'node:test';
import assert from 'node:assert/strict';
import {
    formatAnnouncerText,
    getOfficialCallText,
    getParticipantCallText,
} from './announcer.js';

test('formatAnnouncerText converts to lowercase, trims, and cleans spacing', () => {
    assert.equal(formatAnnouncerText('Halo.. Dunia--Kempo!'), 'halo. . dunia kempo!');
    assert.equal(formatAnnouncerText('Panggilan, Court 1.'), 'panggilan, court 1.');
    assert.equal(formatAnnouncerText(''), '');
    assert.equal(formatAnnouncerText(null), '');
});

test('getOfficialCallText generates official announcement sentences', () => {
    const match = {
        category_name: 'Embu Pasangan Kyu Kenshi Putra',
        sequence: 5,
        court: 'Court 1',
    };

    const firstCall = getOfficialCallText(match, 1);
    assert.ok(firstCall.includes('Panggilan kepada para wasit dan ofisial pertandingan'));
    assert.ok(firstCall.includes('Embu Pasangan Kyu Kenshi Putra'));
    assert.ok(firstCall.includes('partai nomor 5'));
    assert.ok(firstCall.includes('Court 1'));

    const repeatCall = getOfficialCallText(match, 3);
    assert.ok(repeatCall.includes('Panggilan ke 3 kepada para wasit dan ofisial pertandingan'));
    assert.ok(repeatCall.includes('Court 1'));
});

test('getParticipantCallText generates Embu and Randori announcement sentences', () => {
    const embuMatch = {
        category_type: 'embu',
        category_name: 'Embu Pasangan Yudansha',
        sequence: 2,
        court: 'Court 2',
        participant_label: 'Budi Santoso & Ahmad Yani (Kota Bandung)',
    };

    const embuCall1 = getParticipantCallText(embuMatch, 1);
    assert.ok(embuCall1.includes('Panggilan kepada peserta Budi Santoso & Ahmad Yani (Kota Bandung)'));
    assert.ok(embuCall1.includes('Embu Pasangan Yudansha'));
    assert.ok(embuCall1.includes('Court 2'));

    const embuCall2 = getParticipantCallText(embuMatch, 2);
    assert.ok(embuCall2.includes('Panggilan ke 2 kepada peserta Budi Santoso & Ahmad Yani (Kota Bandung)'));

    const randoriMatch = {
        category_type: 'randori',
        category_name: 'Randori Kelas 60kg Putra',
        sequence: 7,
        court: 'Court 1',
        aka_label: 'Sudut Merah (Jawa Barat)',
        shiro_label: 'Sudut Putih (DKI Jakarta)',
    };

    const randoriCall1 = getParticipantCallText(randoriMatch, 1);
    assert.ok(randoriCall1.includes('Panggilan kepada peserta Randori'));
    assert.ok(randoriCall1.includes('sudut merah Sudut Merah (Jawa Barat)'));
    assert.ok(randoriCall1.includes('sudut putih Sudut Putih (DKI Jakarta)'));

    const randoriCall3 = getParticipantCallText(randoriMatch, 3);
    assert.ok(randoriCall3.includes('Panggilan ke 3 kepada peserta Randori'));
});
