<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $dataset['title'] }} - {{ $event->name }}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 10mm 10mm 15mm 10mm;
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: DejaVu Sans, Arial, Helvetica, sans-serif;
            font-size: 9px;
            line-height: 1.35;
            color: #17120f;
            background: #fff;
            margin: 0;
            padding: 0;
        }

        /* Kop Surat Resmi PB PERKEMI */
        .kop-surat {
            border-bottom: 2.5px solid #17120f;
            padding-bottom: 8px;
            margin-bottom: 12px;
            text-align: center;
        }
        .org-header {
            font-size: 13px;
            font-weight: bold;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #17120f;
            margin: 0 0 2px 0;
        }
        .org-sub {
            font-size: 10px;
            font-weight: bold;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: #555;
            margin: 0 0 4px 0;
        }
        .event-info {
            font-size: 9px;
            color: #444;
            margin: 0;
        }

        /* Judul Laporan */
        .report-header {
            margin-bottom: 12px;
            display: table;
            width: 100%;
        }
        .report-title-cell {
            display: table-cell;
            vertical-align: middle;
            text-align: left;
        }
        .report-title {
            font-size: 14px;
            font-weight: bold;
            color: #17120f;
            text-transform: uppercase;
            margin: 0 0 2px 0;
        }
        .report-desc {
            font-size: 8.5px;
            color: #666;
            margin: 0;
        }
        .report-meta-cell {
            display: table-cell;
            vertical-align: middle;
            text-align: right;
            font-size: 8px;
            color: #666;
        }

        /* Summary KPI Cards */
        .summary-bar {
            margin-bottom: 12px;
            display: table;
            width: 100%;
            border-collapse: separate;
            border-spacing: 6px 0;
        }
        .summary-box {
            display: table-cell;
            background: #faf8f5;
            border: 1px solid #e5ded4;
            border-radius: 4px;
            padding: 6px 10px;
            text-align: center;
        }
        .summary-label {
            font-size: 7.5px;
            font-weight: bold;
            text-transform: uppercase;
            color: #756d65;
            margin-bottom: 2px;
        }
        .summary-val {
            font-size: 13px;
            font-weight: bold;
            color: #17120f;
        }

        /* Tabel Data Utama */
        table.data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5px;
        }
        table.data-table thead {
            display: table-header-group;
        }
        table.data-table tr {
            page-break-inside: avoid;
        }
        table.data-table th {
            background: #17120f;
            color: #ffffff;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 8px;
            letter-spacing: 0.03em;
            padding: 6px 8px;
            border: 1px solid #17120f;
            text-align: left;
        }
        table.data-table th.text-center {
            text-align: center;
        }
        table.data-table td {
            padding: 5px 8px;
            border: 1px solid #d9d0c5;
            vertical-align: top;
            color: #26211d;
        }
        table.data-table tr:nth-child(even) td {
            background-color: #faf8f5;
        }
        table.data-table td.text-center {
            text-align: center;
        }
        table.data-table td.text-right {
            text-align: right;
        }

        .gold-badge {
            color: #946c00;
            font-weight: bold;
        }
        .silver-badge {
            color: #555555;
            font-weight: bold;
        }
        .bronze-badge {
            color: #a05a00;
            font-weight: bold;
        }

        /* Signatures Section */
        .signatures-container {
            margin-top: 24px;
            page-break-inside: avoid;
            display: table;
            width: 100%;
        }
        .sig-col {
            display: table-cell;
            width: 33.33%;
            text-align: center;
            vertical-align: top;
            padding: 0 15px;
        }
        .sig-role {
            font-size: 8.5px;
            font-weight: bold;
            text-transform: uppercase;
            color: #333;
            margin-bottom: 50px;
        }
        .sig-name {
            font-size: 9px;
            font-weight: bold;
            text-decoration: underline;
            color: #111;
        }
        .sig-sub {
            font-size: 7.5px;
            color: #666;
        }

        /* Page Footer */
        .footer-note {
            margin-top: 15px;
            font-size: 7.5px;
            color: #888;
            text-align: right;
            border-top: 1px solid #e0d8cc;
            padding-top: 4px;
        }
    </style>
</head>
<body>

    {{-- KOP SURAT RESMI PB PERKEMI --}}
    <div class="kop-surat">
        <h1 class="org-header">PERSAUDARAAN BELADIRI SHORINJI KEMPO INDONESIA (PB. PERKEMI)</h1>
        <p class="org-sub">PANITIA PELAKSANA KEJUARAAN & DEWAN PERWASITAN NASIONAL</p>
        <p class="event-info">
            <strong>{{ $event->name }}</strong> · {{ $event->venue }}, {{ $event->city }} ·
            Tanggal: {{ $event->start_date?->format('d/m/Y') ?? '—' }} s/d {{ $event->end_date?->format('d/m/Y') ?? '—' }}
        </p>
    </div>

    {{-- HEADER LAPORAN --}}
    <div class="report-header">
        <div class="report-title-cell">
            <h2 class="report-title">{{ $dataset['title'] }}</h2>
            <p class="report-desc">{{ $dataset['description'] }}</p>
        </div>
        <div class="report-meta-cell">
            <strong>Nomor Dokumen:</strong> {{ $documentNumber }}<br>
            <strong>Waktu Ekspor:</strong> {{ $printedAt }} WIB
        </div>
    </div>

    {{-- SUMMARY KPI BAR --}}
    @if(!empty($dataset['summary']) && is_array($dataset['summary']) && count($dataset['summary']) > 0)
        <div class="summary-bar">
            @foreach($dataset['summary'] as $sum)
                <div class="summary-box">
                    <div class="summary-label">{{ $sum['label'] }}</div>
                    <div class="summary-val">{{ is_numeric($sum['value']) ? number_format($sum['value']) : $sum['value'] }}</div>
                </div>
            @endforeach
        </div>
    @endif

    {{-- TABEL DATA --}}
    @if(!empty($dataset['rows']) && count($dataset['rows']) > 0)
        <table class="data-table">
            <thead>
                <tr>
                    <th class="text-center" style="width: 30px;">No.</th>
                    @foreach($dataset['columns'] as $col)
                        <th>{{ $col['label'] }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @foreach($dataset['rows'] as $index => $row)
                    <tr>
                        <td class="text-center" style="font-weight: bold; color: #8a631c;">{{ $index + 1 }}</td>
                        @foreach($dataset['columns'] as $col)
                            @php
                                $val = $row[$col['key']] ?? null;
                            @endphp
                            <td>
                                @if(is_array($val) && isset($val['athlete_label']))
                                    <div style="font-weight: bold; color: #17120f;">
                                        {{ $val['athlete_label'] }}
                                    </div>
                                    @if(!empty($val['contingent']) && $val['contingent'] !== '-')
                                        <div style="font-size: 7.5px; color: #666;">
                                            {{ $val['contingent'] }}
                                        </div>
                                    @endif
                                @elseif(is_bool($val))
                                    {{ $val ? 'Ya' : 'Tidak' }}
                                @elseif($val === null || $val === '' || $val === '-')
                                    <span style="color: #999;">—</span>
                                @else
                                    {{ $val }}
                                @endif
                            </td>
                        @endforeach
                    </tr>
                @endforeach
            </tbody>
        </table>
    @else
        <div style="padding: 30px; text-align: center; border: 1px dashed #ccc; background: #fafafa; color: #777;">
            Belum ada data rekaman pertandingan untuk laporan ini.
        </div>
    @endif

    {{-- TANDA TANGAN RESMI PENGESAHAN LAPORAN --}}
    <div class="signatures-container">
        <div class="sig-col">
            <div class="sig-role">Dewan Wasit / Chief Judge</div>
            <div class="sig-name">( .................................................. )</div>
            <div class="sig-sub">Lisensi PB PERKEMI</div>
        </div>
        <div class="sig-col">
            <div class="sig-role">Ketua Panitia Pelaksana</div>
            <div class="sig-name">( .................................................. )</div>
            <div class="sig-sub">Panitia Pelaksana {{ $event->name }}</div>
        </div>
        <div class="sig-col">
            <div class="sig-role">Technical Delegate (TD)</div>
            <div class="sig-name">( .................................................. )</div>
            <div class="sig-sub">Pengurus Besar PERKEMI</div>
        </div>
    </div>

    <div class="footer-note">
        Dokumen resmi diterbitkan melalui Sistem Digital SMART PERKEMI — Dicetak pada: {{ $printedAt }} WIB · Halaman arsip kejuaraan
    </div>

</body>
</html>

