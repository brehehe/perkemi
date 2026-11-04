<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Laporan Jadwal Pertandingan & Kapasitas Gelanggang - {{ $event->name }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 12mm 10mm 12mm 10mm;
        }
        :root {
            color-scheme: light;
            font-family: DejaVu Sans, Arial, Helvetica, sans-serif;
            color: #111;
        }
        * {
            box-sizing: border-box;
        }
        body {
            margin: 0;
            padding: 0;
            background: {{ !empty($isPdf) ? '#fff' : '#e9e5df' }};
            font-family: DejaVu Sans, Arial, Helvetica, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #111;
        }
        
        .toolbar {
            position: sticky;
            top: 0;
            z-index: 50;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 12px;
            padding: 12px 20px;
            background: #17120f;
            box-shadow: 0 4px 12px rgba(0,0,0,.25);
        }
        .toolbar button, .toolbar a {
            cursor: pointer;
            border: 0;
            border-radius: 8px;
            padding: 9px 18px;
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 13px;
            font-weight: bold;
            text-decoration: none;
            color: #17120f;
            background: #e1b94e;
            transition: all .2s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .toolbar button:hover, .toolbar a:hover {
            background: #d4a843;
        }
        .toolbar .btn-secondary {
            background: #fff;
            color: #17120f;
        }
        .toolbar .btn-secondary:hover {
            background: #f0ebe4;
        }
        .toolbar-info {
            color: #f0c060;
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 12px;
            margin-right: auto;
            font-weight: 600;
        }
        
        .sheet {
            width: {{ !empty($isPdf) ? '100%' : 'min(900px, calc(100% - 32px))' }};
            margin: {{ !empty($isPdf) ? '0' : '24px auto' }};
            padding: {{ !empty($isPdf) ? '0' : '36px 44px' }};
            background: #fff;
            box-shadow: {{ !empty($isPdf) ? 'none' : '0 12px 40px rgba(40, 30, 20, .15)' }};
            border-radius: {{ !empty($isPdf) ? '0' : '4px' }};
        }
        
        .header {
            text-align: center;
            border-bottom: 2px solid #17120f;
            padding-bottom: 10px;
            margin-bottom: 16px;
        }
        .org-title {
            font-size: 13px;
            font-weight: bold;
            letter-spacing: .05em;
            text-transform: uppercase;
            margin: 0;
        }
        .sub-org {
            font-size: 11px;
            font-weight: bold;
            margin: 3px 0 0;
            text-transform: uppercase;
            color: #333;
        }
        .doc-title {
            font-size: 15px;
            font-weight: bold;
            margin: 12px 0 3px;
            text-decoration: underline;
            text-transform: uppercase;
            letter-spacing: .03em;
        }
        .doc-number {
            font-size: 10px;
            color: #444;
            margin: 2px 0 0;
        }
        
        /* Layout Grid via Table for DomPDF compatibility */
        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0 14px;
            font-size: 11px;
        }
        .meta-table td {
            padding: 3px 6px;
            vertical-align: top;
            border: none;
        }
        .meta-label {
            font-weight: bold;
            color: #555;
            width: 130px;
        }
        .meta-value {
            font-weight: 600;
            color: #111;
        }
        
        h3 {
            font-size: 12px;
            font-weight: bold;
            margin: 16px 0 8px;
            text-transform: uppercase;
            letter-spacing: .03em;
            border-left: 3px solid #17120f;
            padding-left: 6px;
            color: #17120f;
            page-break-after: avoid;
        }
        
        .stat-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 6px;
            margin: 6px -6px 12px;
        }
        .stat-table td {
            width: 25%;
            border: 1px solid #dcd4c8;
            padding: 8px 10px;
            border-radius: 4px;
            background: #faf8f5;
            vertical-align: top;
        }
        .stat-table td.highlight {
            background: #eef7f0;
            border-color: #c2e2c8;
        }
        .stat-table strong {
            display: block;
            font-size: 9px;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 3px;
        }
        .stat-table .val {
            font-size: 16px;
            font-weight: bold;
            color: #17120f;
        }
        .stat-table td.highlight .val {
            color: #1e7e34;
        }
        .stat-table .sub {
            font-size: 9px;
            color: #777;
            margin-top: 2px;
        }
        
        .table-data {
            width: 100%;
            border-collapse: collapse;
            margin: 6px 0 14px;
            font-size: 10px;
        }
        .table-data th, .table-data td {
            border: 1px solid #777;
            padding: 5px 6px;
            text-align: left;
        }
        .table-data th {
            background: #f2ece4;
            font-weight: bold;
            text-align: center;
        }
        .table-data td.text-center { text-align: center; }
        .table-data td.text-right { text-align: right; }
        .table-data tr.total-row {
            font-weight: bold;
            background: #fdfaf3;
        }
        
        .badge {
            display: inline-block;
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: bold;
        }
        .badge-success { background: #d4edda; color: #155724; }
        .badge-warning { background: #fff3cd; color: #856404; }
        
        .note-box {
            border: 1px dashed #b8860b;
            background: #fffdf5;
            padding: 8px 12px;
            border-radius: 4px;
            margin: 10px 0 14px;
            font-size: 10px;
            line-height: 1.4;
            color: #634a00;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        .sig-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 24px;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .sig-table td {
            width: 33.33%;
            text-align: center;
            vertical-align: top;
            padding: 0 10px;
            border: none;
        }
        .sig-role {
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
            line-height: 1.3;
            min-height: 28px;
            display: block;
        }
        .sig-line {
            border-bottom: 1px solid #111;
            width: 80%;
            margin: 45px auto 4px;
        }
        .sig-name {
            font-weight: bold;
            font-size: 10px;
            display: block;
        }
        .sig-detail {
            font-size: 9px;
            color: #666;
            display: block;
        }
        
        @media print {
            body { background: #fff; }
            .toolbar { display: none !important; }
            .sheet { width: 100%; margin: 0; padding: 0; box-shadow: none; border-radius: 0; }
            .stat-table, .table-data, .sig-table, .note-box { page-break-inside: avoid; break-inside: avoid; }
        }
    </style>
</head>
<body>
    @if(empty($isPdf))
    <div class="toolbar">
        <span class="toolbar-info">
            {{ $event->name }} &middot; Laporan Jadwal Pertandingan & Kapasitas
        </span>
        <a href="{{ request()->fullUrlWithQuery(['download' => 'pdf']) }}" style="background: #2563eb; color: #fff;">
            <svg style="width:16px;height:16px;vertical-align:middle" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            Download PDF Langsung
        </a>
        <button type="button" onclick="window.print()">
            <svg style="width:16px;height:16px;vertical-align:middle" viewBox="0 0 24 24" fill="currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
            Cetak (Print)
        </button>
        <a href="/admin/pertandingan/drawing?event_id={{ $event->id }}" class="btn-secondary">
            &larr; Kembali ke Drawing
        </a>
    </div>
    @endif

    <div class="sheet">
        <div class="header">
            <p class="org-title">PERSAUDARAAN BELADIRI SHORINJI KEMPO INDONESIA (PB PERKEMI)</p>
            <p class="sub-org">DEWAN WASIT &amp; PANITERA PERTANDINGAN</p>
            <h1 class="doc-title">LAPORAN JADWAL PERTANDINGAN &amp; UTILISASI KAPASITAS GELANGGANG</h1>
            <p class="doc-number">Nomor Dokumen: PERKEMI/JDW/{{ substr($event->id, 0, 8) }}/{{ date('Ymd') }}</p>
        </div>

        <table class="meta-table">
            <tr>
                <td style="width: 50%;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td class="meta-label">Nama Event:</td>
                            <td class="meta-value">{{ $event->name }}</td>
                        </tr>
                        <tr>
                            <td class="meta-label">Lokasi / Venue:</td>
                            <td class="meta-value">{{ $event->venue ?: '-' }} ({{ $event->city ?: 'Jawa Timur' }})</td>
                        </tr>
                    </table>
                </td>
                <td style="width: 50%;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td class="meta-label">Tanggal Laga:</td>
                            <td class="meta-value">{{ $event->start_date?->translatedFormat('d F Y') }} s/d {{ $event->end_date?->translatedFormat('d F Y') }}</td>
                        </tr>
                        <tr>
                            <td class="meta-label">Interval Partai:</td>
                            <td class="meta-value">{{ $capacityStats['match_duration_minutes'] }} Menit (Standar PB PERKEMI)</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- Section 1: Ringkasan Eksekutif -->
        <h3>1. Ringkasan Eksekutif Statistik Keseluruhan</h3>
        <table class="stat-table">
            <tr>
                <td>
                    <strong>Total Kapasitas Slot</strong>
                    <div class="val">{{ $capacityStats['total_capacity_slots'] }}</div>
                    <div class="sub">Slot seluruh sesi &amp; court</div>
                </td>
                <td class="highlight">
                    <strong>Partai Terjadwal</strong>
                    <div class="val">{{ $capacityStats['total_used_slots'] }}</div>
                    <div class="sub">Tuntas 100% terjadwal</div>
                </td>
                <td class="highlight">
                    <strong>Sisa Slot Cadangan</strong>
                    <div class="val">{{ $capacityStats['total_remaining_slots'] }}</div>
                    <div class="sub">Buffer aman tidak terpakai</div>
                </td>
                <td>
                    <strong>Tingkat Utilisasi</strong>
                    <div class="val">{{ $capacityStats['utilization_percent'] }}%</div>
                    <div class="sub">Beban efisien &amp; seimbang</div>
                </td>
            </tr>
        </table>

        <!-- Section 2: Utilisasi & Sisa Slot per Court -->
        <h3>2. Analisis Kapasitas &amp; Sisa Slot per Gelanggang (Court)</h3>
        <table class="table-data">
            <thead>
                <tr>
                    <th style="width: 5%">No</th>
                    <th style="width: 32%">Nama Gelanggang (Court)</th>
                    <th style="width: 14%" class="text-center">Kapasitas Slot</th>
                    <th style="width: 14%" class="text-center">Partai Terjadwal</th>
                    <th style="width: 14%" class="text-center">Sisa Slot Cadangan</th>
                    <th style="width: 10%" class="text-center">% Beban</th>
                    <th style="width: 11%" class="text-center">Status</th>
                </tr>
            </thead>
            <tbody>
                @foreach($capacityStats['courts'] as $index => $court)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td><strong>{{ $court['court_name'] }}</strong></td>
                    <td class="text-center">{{ $court['capacity_slots'] }} Slot</td>
                    <td class="text-center font-bold">{{ $court['used_slots'] }} Partai</td>
                    <td class="text-center font-bold" style="color: #1e7e34">{{ $court['remaining_slots'] }} Slot</td>
                    <td class="text-center">{{ $court['utilization_percent'] }}%</td>
                    <td class="text-center">
                        <span class="badge {{ $court['remaining_slots'] > 0 ? 'badge-success' : 'badge-warning' }}">
                            {{ $court['status_label'] }}
                        </span>
                    </td>
                </tr>
                @endforeach
                <tr class="total-row">
                    <td colspan="2" class="text-center">TOTAL KESELURUHAN</td>
                    <td class="text-center">{{ $capacityStats['total_capacity_slots'] }} Slot</td>
                    <td class="text-center">{{ $capacityStats['total_used_slots'] }} Partai</td>
                    <td class="text-center" style="color: #1e7e34">{{ $capacityStats['total_remaining_slots'] }} Slot</td>
                    <td class="text-center">{{ $capacityStats['utilization_percent'] }}%</td>
                    <td class="text-center"><span class="badge badge-success">Optimal</span></td>
                </tr>
            </tbody>
        </table>

        <!-- Section 3: Estimasi Waktu Akhir Pertandingan per Tanggal -->
        <h3>3. Estimasi Waktu Pertandingan &amp; Akhir Slot per Tanggal</h3>
        <table class="table-data">
            <thead>
                <tr>
                    <th style="width: 20%">Tanggal Laga</th>
                    <th style="width: 14%" class="text-center">Kapasitas</th>
                    <th style="width: 14%" class="text-center">Partai Terjadwal</th>
                    <th style="width: 13%" class="text-center">Sisa Slot</th>
                    <th style="width: 13%" class="text-center">Jam Mulai</th>
                    <th style="width: 13%" class="text-center">Estimasi Selesai</th>
                    <th style="width: 13%" class="text-center">Batas Rundown</th>
                </tr>
            </thead>
            <tbody>
                @foreach($capacityStats['dates'] as $date)
                <tr>
                    <td><strong>{{ $date['date_formatted'] }}</strong></td>
                    <td class="text-center">{{ $date['capacity_slots'] }} Slot</td>
                    <td class="text-center font-bold">{{ $date['used_slots'] }} Partai</td>
                    <td class="text-center font-bold" style="color: #1e7e34">{{ $date['remaining_slots'] }} Slot</td>
                    <td class="text-center">{{ $date['first_match_time'] ?: '-' }}</td>
                    <td class="text-center font-bold" style="color: #0b5ed7">{{ $date['last_match_end'] ? 'pkl ' . $date['last_match_end'] : '-' }}</td>
                    <td class="text-center">{{ $date['rundown_end'] ? 'pkl ' . $date['rundown_end'] : '-' }}</td>
                </tr>
                @if(!empty($date['courts']))
                <tr>
                    <td colspan="7" style="background: #faf8f5; padding: 4px 10px; font-size: 9px; color: #555;">
                        <em>Rincian Court:</em>
                        @foreach($date['courts'] as $c)
                            <span style="margin-right: 12px;">
                                <strong>{{ $c['court_name'] }}:</strong> {{ $c['matches_count'] }} partai
                                @if($c['first_start'])
                                    ({{ $c['first_start'] }} &ndash; {{ $c['last_end'] }})
                                @else
                                    (Kosong / Cadangan)
                                @endif
                            </span>
                        @endforeach
                    </td>
                </tr>
                @endif
                @endforeach
            </tbody>
        </table>

        <!-- Section 4: Rekap Nomor Pertandingan -->
        <h3>4. Alokasi Nomor Pertandingan &amp; Waktu Gelanggang</h3>
        <table class="table-data">
            <thead>
                <tr>
                    <th style="width: 5%">No</th>
                    <th style="width: 35%">Nomor Pertandingan</th>
                    <th style="width: 10%" class="text-center">Jenis</th>
                    <th style="width: 10%" class="text-center">Partai</th>
                    <th style="width: 25%">Gelanggang</th>
                    <th style="width: 15%" class="text-center">Rentang Waktu</th>
                </tr>
            </thead>
            <tbody>
                @foreach($categoriesSummary as $idx => $cat)
                <tr>
                    <td class="text-center">{{ $idx + 1 }}</td>
                    <td><strong>{{ $cat['name'] }}</strong></td>
                    <td class="text-center">{{ $cat['type'] }}</td>
                    <td class="text-center font-bold">{{ $cat['total_matches'] }}</td>
                    <td>{{ $cat['court_names'] }}</td>
                    <td class="text-center" style="font-size: 9px;">{{ $cat['first_match'] }} &ndash; {{ $cat['last_match'] }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <div class="note-box">
            <strong>Catatan Teknis Regulasi:</strong>
            Seluruh nomor Embu dijadwalkan mendahului nomor Randori sesuai tata tertib pertandingan PB PERKEMI.
            Jeda istirahat atlet telah dijamin secara sistematis antar-babak pertandingan, dan partai per kelas dijalankan secara berkesinambungan pada gelanggang yang sama tanpa terputus.
        </div>

        <table class="sig-table">
            <tr>
                <td>
                    <span class="sig-role">Technical Delegate (TD)</span>
                    <div class="sig-line"></div>
                    <span class="sig-name">( .................................................... )</span>
                    <span class="sig-detail">PB PERKEMI Jawa Timur</span>
                </td>
                <td>
                    <span class="sig-role">Ketua Panitia Pelaksana</span>
                    <div class="sig-line"></div>
                    <span class="sig-name">( .................................................... )</span>
                    <span class="sig-detail">POPDA XV Jawa Timur 2026</span>
                </td>
                <td>
                    <span class="sig-role">Panitera Meja Pertandingan</span>
                    <div class="sig-line"></div>
                    <span class="sig-name">( .................................................... )</span>
                    <span class="sig-detail">Bidang Penjadwalan &amp; Court</span>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
