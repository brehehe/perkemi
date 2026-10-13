<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Lembar Nilai {{ ucfirst($type) }} - {{ $event->name }}</title>
    <style>
        :root { color-scheme: light; font-family: Arial, Helvetica, sans-serif; color: #17120f; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #f5f1eb; }
        .toolbar { position: sticky; top: 0; z-index: 2; display: flex; justify-content: center; gap: 10px; padding: 12px; background: #17120f; }
        .toolbar button { cursor: pointer; border: 0; border-radius: 9px; padding: 10px 16px; font-weight: 700; color: #17120f; background: #e1b94e; }
        .sheet { width: min(1040px, calc(100% - 28px)); margin: 24px auto; padding: 32px; background: white; box-shadow: 0 12px 40px rgba(40, 30, 20, .12); }
        .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #17120f; padding-bottom: 18px; }
        .eyebrow { color: #9a6c18; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
        h1 { margin: 8px 0 4px; font-size: 26px; }
        h2 { margin: 22px 0 10px; font-size: 16px; }
        p { margin: 4px 0; line-height: 1.5; }
        .muted { color: #746d66; font-size: 12px; }
        .score-total { min-width: 130px; border: 1px solid #ded4c8; border-radius: 12px; padding: 14px; text-align: center; }
        .score-total strong { display: block; margin-top: 4px; color: #bb3025; font-size: 32px; }
        .meta, .stats, .signatures { display: grid; gap: 10px; }
        .meta { grid-template-columns: repeat(4, 1fr); margin-top: 18px; }
        .stats { grid-template-columns: repeat(3, 1fr); margin-top: 18px; }
        .signatures { grid-template-columns: repeat(3, 1fr); }
        .box { border: 1px solid #e5ded4; border-radius: 10px; padding: 12px; background: #fcfbf9; }
        .label { color: #82786f; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
        .value { margin-top: 5px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
        th, td { border: 1px solid #ded6cc; padding: 9px; text-align: left; vertical-align: top; }
        th { background: #17120f; color: white; }
        .signature { min-height: 160px; text-align: center; }
        .signature img { display: block; width: 100%; height: 95px; margin-top: 8px; object-fit: contain; }
        .signature-name { margin-top: 6px; font-size: 12px; font-weight: 700; }
        .list { margin: 6px 0 0; padding-left: 18px; font-size: 12px; line-height: 1.6; }
        @media (max-width: 760px) { .sheet { width: 100%; margin: 0; padding: 20px; } .header { flex-direction: column; } .meta, .stats, .signatures { grid-template-columns: 1fr; } }
        @media print { @page { size: A4 landscape; margin: 10mm; } body { background: white; } .toolbar { display: none; } .sheet { width: 100%; margin: 0; padding: 0; box-shadow: none; } .box, .signature { break-inside: avoid; } }
    </style>
</head>
<body>
    <div class="toolbar"><button type="button" onclick="window.print()">Cetak / Simpan PDF</button></div>
    <main class="sheet">
        <header class="header">
            <div>
                <div class="eyebrow">SMART PERKEMI · Laporan Resmi {{ strtoupper($type) }}</div>
                <h1>{{ $score['category_name'] ?: 'Nomor Pertandingan' }}</h1>
                <p>{{ $event->name }}</p>
                <p class="muted">Partai #{{ $score['sequence'] ?: '-' }} · {{ $score['round_label'] ?: '-' }} · {{ $score['court'] ?: 'Court belum dicatat' }} · {{ $score['scheduled_at'] ?: '-' }}</p>
            </div>
            <div class="score-total">
                <span class="label">Status</span>
                <strong>{{ $type === 'embu' ? $score['total_score'] : $score['aka_total'].' - '.$score['shiro_total'] }}</strong>
                <span class="muted">{{ $score['status_label'] }}</span>
            </div>
        </header>

        @if ($type === 'embu')
            <section class="meta">
                <div class="box"><div class="label">Kontingen</div><div class="value">{{ $score['participant_details']['contingent_name'] ?: $score['participant'] ?: '-' }}</div></div>
                <div class="box"><div class="label">Jenis Peserta</div><div class="value">{{ $score['participant_details']['kind'] }}</div></div>
                <div class="box"><div class="label">Wasit / Juri</div><div class="value">{{ $score['referee_name'] }}</div><p class="muted">Juri {{ $score['judge_number'] }} · {{ $score['role_label'] }}</p></div>
                <div class="box"><div class="label">Waktu Pengiriman</div><div class="value">{{ $score['submitted_at'] ?: $score['updated_at'] }}</div></div>
            </section>
            <section class="stats">
                <div class="box"><div class="label">Teknik</div><div class="value">{{ $score['technique_subtotal'] }}</div></div>
                <div class="box"><div class="label">Ekspresi</div><div class="value">{{ $score['expression_subtotal'] }}</div></div>
                <div class="box"><div class="label">Aspek Terisi</div><div class="value">{{ $score['completed_items'] }}/10</div></div>
            </section>
            <h2>Atlet & Teknik Terdaftar</h2>
            <div class="meta">
                <div class="box" style="grid-column: span 2"><div class="label">Nama Atlet</div><ol class="list">@forelse ($score['participant_details']['athletes'] as $athlete)<li>{{ $athlete['name'] }}</li>@empty<li>Belum tercatat</li>@endforelse</ol></div>
                <div class="box" style="grid-column: span 2"><div class="label">Komposisi Teknik</div><ol class="list">@forelse ($score['participant_details']['techniques'] as $technique)<li>{{ $technique['name'] }}</li>@empty<li>Belum tercatat</li>@endforelse</ol></div>
            </div>
            <h2>Rincian 10 Aspek</h2>
            <table><thead><tr><th>No.</th><th>Aspek</th><th>Nilai</th></tr></thead><tbody>@foreach ($score['aspect_labels'] as $key => $label)<tr><td>{{ $loop->iteration }}</td><td>{{ $label }}</td><td>{{ data_get($score['aspect_scores'], $key, '-') }}</td></tr>@endforeach</tbody></table>
            <h2>Tanda Tangan Wasit</h2>
            <div class="signature box">@if ($score['signature'])<img src="{{ $score['signature'] }}" alt="Tanda tangan {{ $score['referee_name'] }}">@else<p class="muted">Belum ada tanda tangan.</p>@endif<div class="signature-name">{{ $score['referee_name'] }}</div></div>
        @else
            <section class="meta">
                <div class="box" style="grid-column: span 2"><div class="label">AKA / Merah</div><div class="value">{{ $score['aka_label'] }}</div></div>
                <div class="box" style="grid-column: span 2"><div class="label">SHIRO / Putih</div><div class="value">{{ $score['shiro_label'] }}</div></div>
            </section>
            <h2>Rincian Nilai Randori</h2>
            <table><thead><tr><th>Sudut</th><th>Mujoken Kachi</th><th>Ippon</th><th>Waza-ari</th><th>Yusei Kachi</th><th>Batsu -5</th><th>Batsu -10</th><th>Total</th></tr></thead><tbody>
                <tr><td>AKA</td><td>{{ data_get($score['aka_breakdown'], 'mujoken', 0) }}</td><td>{{ data_get($score['aka_breakdown'], 'ippon', 0) }}</td><td>{{ data_get($score['aka_breakdown'], 'waza_ari', 0) }}</td><td>{{ data_get($score['aka_breakdown'], 'yusei', 0) }}</td><td>{{ data_get($score['aka_breakdown'], 'batsu_5', 0) }}</td><td>{{ data_get($score['aka_breakdown'], 'batsu_10', 0) }}</td><td>{{ $score['aka_total'] }}</td></tr>
                <tr><td>SHIRO</td><td>{{ data_get($score['shiro_breakdown'], 'mujoken', 0) }}</td><td>{{ data_get($score['shiro_breakdown'], 'ippon', 0) }}</td><td>{{ data_get($score['shiro_breakdown'], 'waza_ari', 0) }}</td><td>{{ data_get($score['shiro_breakdown'], 'yusei', 0) }}</td><td>{{ data_get($score['shiro_breakdown'], 'batsu_5', 0) }}</td><td>{{ data_get($score['shiro_breakdown'], 'batsu_10', 0) }}</td><td>{{ $score['shiro_total'] }}</td></tr>
            </tbody></table>
            <div class="box" style="margin-top: 14px"><div class="label">Pemenang</div><div class="value">{{ $score['winner_label'] }}</div></div>
            <h2>Pengesahan 6 Pihak</h2>
            <section class="signatures">@foreach ($score['signatures'] as $signature)<div class="signature box"><div class="label">{{ $signature['label'] }}</div>@if ($signature['signature'])<img src="{{ $signature['signature'] }}" alt="Tanda tangan {{ $signature['label'] }}">@else<p class="muted">Belum ditandatangani.</p>@endif<div class="signature-name">{{ $signature['name'] ?: 'Nama tidak dicatat' }}</div></div>@endforeach</section>
        @endif

        @if ($score['notes'])<section class="box" style="margin-top: 18px"><div class="label">Catatan</div><p>{{ $score['notes'] }}</p></section>@endif
    </main>
</body>
</html>
