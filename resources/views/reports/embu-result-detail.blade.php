<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Rekap Nilai Embu - {{ $event->name }}</title>
    <style>
        :root { color-scheme: light; font-family: Arial, Helvetica, sans-serif; color: #17120f; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #f5f1eb; }
        .toolbar { position: sticky; top: 0; z-index: 2; display: flex; justify-content: center; padding: 12px; background: #17120f; }
        .toolbar button { cursor: pointer; border: 0; border-radius: 9px; padding: 10px 16px; font-weight: 700; color: #17120f; background: #e1b94e; }
        .sheet { width: min(1120px, calc(100% - 28px)); margin: 24px auto; padding: 32px; background: #fff; box-shadow: 0 12px 40px rgba(40, 30, 20, .12); }
        .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #17120f; padding-bottom: 18px; }
        .eyebrow { color: #9a6c18; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
        h1 { margin: 8px 0 4px; font-size: 26px; }
        h2 { margin: 22px 0 10px; font-size: 16px; }
        p { margin: 4px 0; line-height: 1.5; }
        .muted { color: #746d66; font-size: 12px; }
        .final-score { min-width: 150px; border: 1px solid #ded4c8; border-radius: 12px; padding: 14px; text-align: center; }
        .final-score strong { display: block; margin-top: 4px; color: #bb3025; font-size: 34px; }
        .meta, .stats, .participant-grid, .signatures { display: grid; gap: 10px; }
        .meta { grid-template-columns: repeat(4, 1fr); margin-top: 18px; }
        .stats { grid-template-columns: repeat(4, 1fr); margin-top: 10px; }
        .participant-grid { grid-template-columns: repeat(2, 1fr); }
        .signatures { grid-template-columns: repeat(3, 1fr); }
        .box { border: 1px solid #e5ded4; border-radius: 10px; padding: 12px; background: #fcfbf9; }
        .label { color: #82786f; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
        .value { margin-top: 5px; font-weight: 700; }
        .list { margin: 6px 0 0; padding-left: 18px; font-size: 12px; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
        th, td { border: 1px solid #ded6cc; padding: 9px; text-align: left; vertical-align: top; }
        th { background: #17120f; color: #fff; }
        .aspect-matrix th:not(:nth-child(2)), .aspect-matrix td:not(:nth-child(2)) { text-align: center; }
        .aspect-matrix th small { display: block; max-width: 120px; margin: 4px auto 0; color: #d8d0c7; font-size: 9px; font-weight: 500; line-height: 1.3; }
        .aspect-group { color: #9a6c18; font-size: 10px; font-weight: 800; }
        .aspect-value { font-size: 15px; font-weight: 800; }
        .signature { min-height: 175px; text-align: center; }
        .signature img { display: block; width: 100%; height: 96px; margin-top: 8px; object-fit: contain; }
        .signature-name { margin-top: 7px; font-size: 12px; font-weight: 700; }
        .status { display: inline-block; margin-top: 7px; border-radius: 999px; padding: 4px 9px; color: #086348; background: #daf5ea; font-size: 10px; font-weight: 800; text-transform: uppercase; }
        @media (max-width: 760px) {
            .sheet { width: 100%; margin: 0; padding: 20px; }
            .header { flex-direction: column; }
            .meta, .stats, .participant-grid, .signatures { grid-template-columns: 1fr; }
        }
        @media print {
            @page { size: A4 landscape; margin: 10mm; }
            body { background: #fff; }
            .toolbar { display: none; }
            .sheet { width: 100%; margin: 0; padding: 0; box-shadow: none; }
            .box, .signature, tr { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <button type="button" onclick="window.print()">Cetak / Simpan PDF</button>
    </div>

    <main class="sheet">
        <header class="header">
            <div>
                <div class="eyebrow">SMART PERKEMI · Rekap Resmi Embu</div>
                <h1>{{ $score['category_name'] ?: 'Nomor Pertandingan Embu' }}</h1>
                <p>{{ $event->name }}</p>
                <p class="muted">Partai #{{ $score['sequence'] ?: '-' }} · {{ $score['round_label'] ?: '-' }} · {{ $score['court'] ?: 'Court belum dicatat' }} · {{ $score['scheduled_at'] ?: '-' }}</p>
                <span class="status">{{ $score['status_label'] }}</span>
            </div>
            <div class="final-score">
                <span class="label">Nilai Akhir</span>
                <strong>{{ $score['final_score'] }}</strong>
                <span class="muted">Skor tengah dikurangi denda</span>
            </div>
        </header>

        <section class="meta">
            <div class="box"><div class="label">Peserta / Tim</div><div class="value">{{ $score['participant_details']['contingent_name'] ?: $score['participant'] ?: '-' }}</div></div>
            <div class="box"><div class="label">Jenis Peserta</div><div class="value">{{ $score['participant_details']['kind'] }}</div></div>
            <div class="box"><div class="label">Pool</div><div class="value">{{ $score['pool'] ?: '-' }}</div></div>
            <div class="box"><div class="label">Verifikasi</div><div class="value">{{ $score['verified_by'] ?: 'Belum dicatat' }}</div><p class="muted">{{ $score['verified_at'] ?: '-' }}</p></div>
        </section>

        <section class="stats">
            <div class="box"><div class="label">Durasi</div><div class="value">{{ $score['duration'] }}</div></div>
            <div class="box"><div class="label">Nilai Juri</div><div class="value">{{ collect($score['judge_scores'])->implode(' · ') ?: '-' }}</div></div>
            <div class="box"><div class="label">Skor Tengah</div><div class="value">{{ $score['middle_score'] }}</div></div>
            <div class="box"><div class="label">Denda Waktu</div><div class="value">{{ $score['time_penalty'] }}</div></div>
        </section>

        <h2>Atlet & Teknik Terdaftar</h2>
        <section class="participant-grid">
            <div class="box">
                <div class="label">Nama Atlet</div>
                <ol class="list">
                    @forelse ($score['participant_details']['athletes'] as $athlete)
                        <li>{{ $athlete['name'] }}</li>
                    @empty
                        <li>Belum tercatat</li>
                    @endforelse
                </ol>
            </div>
            <div class="box">
                <div class="label">Komposisi Teknik</div>
                <ol class="list">
                    @forelse ($score['participant_details']['techniques'] as $technique)
                        <li>{{ $technique['name'] }}</li>
                    @empty
                        <li>Belum tercatat</li>
                    @endforelse
                </ol>
            </div>
        </section>

        <h2>Rincian Nilai Juri</h2>
        <table>
            <thead>
                <tr><th>Juri</th><th>Wasit</th><th>Posisi</th><th>Teknik</th><th>Ekspresi</th><th>Total</th><th>Status</th></tr>
            </thead>
            <tbody>
                @forelse ($score['judges'] as $judge)
                    <tr>
                        <td>Juri {{ $judge['judge_number'] }}</td>
                        <td>{{ $judge['referee_name'] }}</td>
                        <td>{{ $judge['role_label'] }}</td>
                        <td>{{ $judge['technique_subtotal'] }}</td>
                        <td>{{ $judge['expression_subtotal'] }}</td>
                        <td>{{ $judge['total_score'] }}</td>
                        <td>{{ $judge['status_label'] }}</td>
                    </tr>
                @empty
                    <tr><td colspan="7">Rincian penilaian per Juri belum tersedia.</td></tr>
                @endforelse
            </tbody>
        </table>

        <h2>Rincian 10 Aspek Penilaian Embu</h2>
        @php($aspectLabels = data_get($score, 'judges.0.aspect_labels', []))
        @if (count($aspectLabels) && count($score['judges']))
            <table class="aspect-matrix">
                <thead>
                    <tr>
                        <th>No.</th>
                        <th>Unsur Penilaian</th>
                        @foreach ($score['judges'] as $judge)
                            <th>
                                Juri {{ $judge['judge_number'] }}
                                <small>{{ $judge['referee_name'] }}</small>
                            </th>
                        @endforeach
                    </tr>
                </thead>
                <tbody>
                    @foreach ($aspectLabels as $key => $label)
                        <tr>
                            <td>{{ $loop->iteration }}</td>
                            <td>
                                @php([$group, $description] = array_pad(explode(' · ', $label, 2), 2, $label))
                                <span class="aspect-group">{{ $group }}</span><br>
                                {{ $description }}
                            </td>
                            @foreach ($score['judges'] as $judge)
                                <td class="aspect-value">{{ data_get($judge, 'aspect_scores.'.$key, '-') }}</td>
                            @endforeach
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <div class="box"><p class="muted">Rincian 10 aspek belum tersedia karena belum ada nilai Juri yang tersimpan.</p></div>
        @endif

        <h2>Tanda Tangan Juri</h2>
        <section class="signatures">
            @forelse ($score['judges'] as $judge)
                <div class="signature box">
                    <div class="label">Juri {{ $judge['judge_number'] }} · {{ $judge['role_label'] }}</div>
                    @if ($judge['signature'])
                        <img src="{{ $judge['signature'] }}" alt="Tanda tangan {{ $judge['referee_name'] }}">
                    @else
                        <p class="muted">Tanda tangan belum tersedia.</p>
                    @endif
                    <div class="signature-name">{{ $judge['referee_name'] }}</div>
                </div>
            @empty
                <div class="signature box"><p class="muted">Belum ada data tanda tangan Juri.</p></div>
            @endforelse
        </section>

        @if ($score['notes'])
            <section class="box" style="margin-top: 18px"><div class="label">Catatan</div><p>{{ $score['notes'] }}</p></section>
        @endif
    </main>
</body>
</html>
