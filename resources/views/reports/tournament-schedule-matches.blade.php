<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Jadwal Pertandingan Resmi - {{ $event->name }}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 10mm 8mm 10mm 8mm;
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
            font-size: 10px;
            line-height: 1.35;
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
            padding: 10px 20px;
            background: #17120f;
            box-shadow: 0 4px 12px rgba(0,0,0,.25);
        }
        .toolbar button, .toolbar a {
            cursor: pointer;
            border: 0;
            border-radius: 8px;
            padding: 8px 16px;
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 12px;
            font-weight: bold;
            text-decoration: none;
            color: #17120f;
            background: #e1b94e;
            transition: all .2s;
            display: inline-flex;
            align-items: center;
            gap: 6px;
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
            width: {{ !empty($isPdf) ? '100%' : 'min(1150px, calc(100% - 32px))' }};
            margin: {{ !empty($isPdf) ? '0' : '20px auto' }};
            padding: {{ !empty($isPdf) ? '0' : '28px 36px' }};
            background: #fff;
            box-shadow: {{ !empty($isPdf) ? 'none' : '0 12px 40px rgba(40, 30, 20, .15)' }};
            border-radius: {{ !empty($isPdf) ? '0' : '4px' }};
        }
        
        .header {
            text-align: center;
            border-bottom: 2px solid #17120f;
            padding-bottom: 8px;
            margin-bottom: 12px;
        }
        .org-title {
            font-size: 13px;
            font-weight: bold;
            letter-spacing: .06em;
            text-transform: uppercase;
            margin: 0;
        }
        .sub-org {
            font-size: 10px;
            font-weight: bold;
            margin: 2px 0 0;
            text-transform: uppercase;
            color: #444;
        }
        .doc-title {
            font-size: 15px;
            font-weight: bold;
            margin: 8px 0 2px;
            text-decoration: underline;
            text-transform: uppercase;
            letter-spacing: .04em;
        }
        .doc-number {
            font-size: 9px;
            color: #444;
            margin: 2px 0 0;
        }
        
        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0 10px;
            font-size: 10px;
        }
        .meta-table td {
            padding: 2px 4px;
            vertical-align: top;
            border: none;
        }
        .meta-label {
            font-weight: bold;
            color: #555;
            width: 120px;
        }
        .meta-value {
            font-weight: 600;
            color: #111;
        }
        
        .table-schedule {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0 14px;
            font-size: 9.5px;
        }
        .table-schedule thead {
            display: table-header-group;
        }
        .table-schedule th, .table-schedule td {
            border: 1px solid #666;
            padding: 4px 5px;
            text-align: left;
            vertical-align: middle;
        }
        .table-schedule th {
            background: #ede6dc;
            font-weight: bold;
            text-align: center;
            font-size: 9.5px;
            text-transform: uppercase;
        }
        .table-schedule tr {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .table-schedule tr:nth-child(even) {
            background: #faf8f5;
        }
        .table-schedule tr.session-header {
            background: #3a2e24 !important;
            color: #fff;
            font-weight: bold;
            font-size: 10px;
        }
        .table-schedule tr.session-header td {
            border-color: #3a2e24;
            padding: 5px 8px;
            color: #f7eed8;
        }
        
        .text-center { text-align: center !important; }
        .text-right { text-align: right !important; }
        
        .badge-court {
            display: inline-block;
            padding: 1px 4px;
            border-radius: 3px;
            background: #e2e8f0;
            color: #1e293b;
            font-weight: bold;
            font-size: 8.5px;
            white-space: nowrap;
        }
        .badge-type {
            display: inline-block;
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 8.5px;
            font-weight: bold;
            white-space: nowrap;
        }
        .badge-embu {
            background: #fef3c7;
            color: #92400e;
        }
        .badge-randori {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .corner-aka {
            color: #b91c1c;
            font-weight: bold;
        }
        .corner-shiro {
            color: #1d4ed8;
            font-weight: bold;
        }
        .athlete-sub {
            font-size: 8.5px;
            color: #555;
            display: block;
            margin-top: 1px;
            font-weight: normal;
        }
        
        .sig-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
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
            font-size: 9.5px;
            text-transform: uppercase;
            line-height: 1.3;
            min-height: 26px;
            display: block;
        }
        .sig-line {
            border-bottom: 1px solid #111;
            width: 80%;
            margin: 40px auto 3px;
        }
        .sig-name {
            font-weight: bold;
            font-size: 9.5px;
            display: block;
        }
        .sig-detail {
            font-size: 8.5px;
            color: #666;
            display: block;
        }
        
        @media print {
            body { background: #fff; }
            .toolbar { display: none !important; }
            .sheet { width: 100%; margin: 0; padding: 0; box-shadow: none; border-radius: 0; }
            .table-schedule, .sig-table { page-break-inside: auto; }
            .table-schedule tr, .sig-table td { page-break-inside: avoid; break-inside: avoid; }
        }
    </style>
</head>
<body>
    @if(empty($isPdf))
    <div class="toolbar">
        <span class="toolbar-info">
            {{ $event->name }} &middot; Jadwal Pertandingan Resmi (Order of Play)
        </span>
        <a href="{{ request()->fullUrlWithQuery(['download' => 'pdf']) }}" style="background: #2563eb; color: #fff;">
            <svg style="width:14px;height:14px;vertical-align:middle" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            Download PDF Jadwal
        </a>
        <button type="button" onclick="window.print()">
            <svg style="width:14px;height:14px;vertical-align:middle" viewBox="0 0 24 24" fill="currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
            Cetak (Print)
        </button>
        <a href="/admin/pertandingan/jadwal?event_id={{ $event->id }}" class="btn-secondary">
            &larr; Kembali ke Jadwal
        </a>
    </div>
    @endif

    <div class="sheet">
        <div class="header">
            <p class="org-title">PERSAUDARAAN BELADIRI SHORINJI KEMPO INDONESIA (PB PERKEMI)</p>
            <p class="sub-org">DEWAN WASIT &amp; PANITERA PERTANDINGAN</p>
            <h1 class="doc-title">JADWAL PERTANDINGAN RESMI (ORDER OF PLAY)</h1>
            <p class="doc-number">Nomor Dokumen: PERKEMI/OOP/{{ substr($event->id, 0, 8) }}/{{ date('Ymd') }}</p>
        </div>

        <table class="meta-table">
            <tr>
                <td style="width: 50%;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td class="meta-label">Nama Kejuaraan:</td>
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
                            <td class="meta-label">Tanggal Pelaksanaan:</td>
                            <td class="meta-value">{{ $event->start_date?->translatedFormat('d F Y') }} s/d {{ $event->end_date?->translatedFormat('d F Y') }}</td>
                        </tr>
                        <tr>
                            <td class="meta-label">Total Partai Terjadwal:</td>
                            <td class="meta-value">{{ $matches->count() }} Partai (Interval: {{ $event->match_duration_minutes ?? 7 }} Menit)</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <table class="table-schedule">
            <thead>
                <tr>
                    <th style="width: 4%">No</th>
                    <th style="width: 6%">Partai</th>
                    <th style="width: 9%">Waktu</th>
                    <th style="width: 13%">Gelanggang</th>
                    <th style="width: 6%">Jenis</th>
                    <th style="width: 18%">Nomor Pertandingan</th>
                    <th style="width: 10%">Babak</th>
                    <th style="width: 17%"><span class="corner-aka">&#9632; Sudut Merah (Aka)</span></th>
                    <th style="width: 17%"><span class="corner-shiro">&#9632; Sudut Biru (Shiro)</span></th>
                </tr>
            </thead>
            <tbody>
                @php
                    $currentSessionKey = null;
                    $counter = 0;
                @endphp
                @forelse($matches as $m)
                    @php
                        $sessionKey = ($m->scheduled_start_at ? $m->scheduled_start_at->translatedFormat('l, d F Y') : 'Jadwal') . ' · ' . ($m->rundown?->name ?? 'Sesi Pertandingan');
                    @endphp

                    @if($sessionKey !== $currentSessionKey)
                        @php $currentSessionKey = $sessionKey; @endphp
                        <tr class="session-header">
                            <td colspan="9">
                                &#128197; {{ $sessionKey }}
                            </td>
                        </tr>
                    @endif

                    @php
                        $counter++;
                        $isEmbu = $m->matchCategory?->type === 'embu';
                        
                        // Red participant details
                        $redContingent = $m->redEntry?->athlete?->contingent?->name;
                        $redAthlete = $m->redEntry?->athlete?->name;
                        $embuLabel = $m->participant_label;
                        $embuMembers = is_array($m->metadata['members'] ?? null) ? implode(', ', $m->metadata['members']) : null;
                        
                        // Blue participant details
                        $blueContingent = $m->blueEntry?->athlete?->contingent?->name;
                        $blueAthlete = $m->blueEntry?->athlete?->name;
                    @endphp
                    <tr>
                        <td class="text-center">{{ $counter }}</td>
                        <td class="text-center font-bold">#{{ $m->match_sequence }}</td>
                        <td class="text-center" style="font-weight: 600;">
                            {{ $m->scheduled_start_at?->format('H:i') }} &ndash; {{ $m->scheduled_end_at?->format('H:i') }}
                        </td>
                        <td>
                            <span class="badge-court">{{ $m->court?->name ?? 'Court' }}</span>
                        </td>
                        <td class="text-center">
                            <span class="badge-type {{ $isEmbu ? 'badge-embu' : 'badge-randori' }}">
                                {{ strtoupper($m->matchCategory?->type ?? 'EMBU') }}
                            </span>
                        </td>
                        <td>
                            <strong>{{ $m->matchCategory?->name ?? '-' }}</strong>
                        </td>
                        <td>{{ $m->round_label }}</td>
                        
                        <!-- Aka Corner -->
                        <td>
                            @if($isEmbu)
                                <strong class="corner-aka">{{ $embuLabel ?: ($redContingent ?: 'Peserta Embu') }}</strong>
                                @if($embuMembers)
                                    <span class="athlete-sub">{{ $embuMembers }}</span>
                                @elseif($redAthlete)
                                    <span class="athlete-sub">{{ $redAthlete }}</span>
                                @endif
                            @else
                                <strong class="corner-aka">{{ $redContingent ?: 'Menunggu Kontingen' }}</strong>
                                @if($redAthlete)
                                    <span class="athlete-sub">{{ $redAthlete }}</span>
                                @endif
                            @endif
                        </td>

                        <!-- Shiro Corner -->
                        <td>
                            @if($isEmbu)
                                <span style="color: #888; font-style: italic;">(Penampilan Tunggal / Berpasangan / Beregu)</span>
                            @else
                                <strong class="corner-shiro">{{ $blueContingent ?: 'Menunggu Kontingen' }}</strong>
                                @if($blueAthlete)
                                    <span class="athlete-sub">{{ $blueAthlete }}</span>
                                @endif
                            @endif
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="9" class="text-center" style="padding: 24px; color: #777;">
                            Belum ada partai pertandingan yang dijadwalkan pada event ini.
                        </td>
                    </tr>
                @endforelse
            </tbody>
        </table>

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

