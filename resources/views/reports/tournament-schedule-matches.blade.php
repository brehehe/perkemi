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
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            gap: 10px;
            padding: 10px 16px;
            background: #17120f;
            box-shadow: 0 4px 12px rgba(0,0,0,.25);
        }
        .toolbar select {
            padding: 7px 12px;
            border-radius: 8px;
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 11px;
            font-weight: 600;
            background: #fff;
            color: #17120f;
            border: 1px solid #d4a843;
            cursor: pointer;
            outline: none;
        }
        .toolbar button, .toolbar a {
            cursor: pointer;
            border: 0;
            border-radius: 8px;
            padding: 7px 14px;
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 11px;
            font-weight: bold;
            text-decoration: none;
            color: #17120f;
            background: #e1b94e;
            transition: all .2s;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
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
        .doc-court-badge {
            display: inline-block;
            background: #17120f;
            color: #f0c060;
            padding: 3px 12px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 11px;
            margin-top: 4px;
            text-transform: uppercase;
            letter-spacing: .05em;
        }
        .doc-number {
            font-size: 9px;
            color: #444;
            margin: 3px 0 0;
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
            margin: 6px 0 14px;
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
        
        .section-type-banner {
            margin: 10px 0 4px;
            padding: 4px 8px;
            font-size: 10px;
            font-weight: bold;
            border-radius: 2px;
            text-transform: uppercase;
            letter-spacing: .04em;
            page-break-after: avoid;
            break-after: avoid;
        }
        .banner-embu {
            background: #fef3c7;
            border-left: 4px solid #d97706;
            color: #92400e;
        }
        .banner-randori {
            background: #fee2e2;
            border-left: 4px solid #dc2626;
            color: #991b1b;
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
            color: #4b5563;
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

        <!-- Gelanggang Filter Selector -->
        <select onchange="window.location.href=this.value" title="Filter Gelanggang (Court)">
            <option value="{{ request()->fullUrlWithQuery(['court_id' => null]) }}">
                &#9873; Semua Gelanggang (Lengkap)
            </option>
            @foreach(($courts ?? []) as $court)
                <option value="{{ request()->fullUrlWithQuery(['court_id' => $court->id]) }}" {{ ($courtId ?? null) == $court->id ? 'selected' : '' }}>
                    Gelanggang: {{ $court->name }}
                </option>
            @endforeach
        </select>

        <!-- Format / Mode Selector -->
        <select onchange="window.location.href=this.value" title="Pemisahan Tampilan Jadwal">
            <option value="{{ request()->fullUrlWithQuery(['type' => null, 'mode' => 'separated']) }}" {{ empty($selectedType) && ($viewMode ?? 'separated') === 'separated' ? 'selected' : '' }}>
                Tabel Terpisah: Embu &amp; Randori
            </option>
            <option value="{{ request()->fullUrlWithQuery(['type' => null, 'mode' => 'mixed']) }}" {{ empty($selectedType) && ($viewMode ?? '') === 'mixed' ? 'selected' : '' }}>
                Campur Sesuai Waktu (Kronologis)
            </option>
            <option value="{{ request()->fullUrlWithQuery(['type' => 'embu', 'mode' => 'separated']) }}" {{ ($selectedType ?? '') === 'embu' ? 'selected' : '' }}>
                Khusus Nomor Embu Saja
            </option>
            <option value="{{ request()->fullUrlWithQuery(['type' => 'randori', 'mode' => 'separated']) }}" {{ ($selectedType ?? '') === 'randori' ? 'selected' : '' }}>
                Khusus Nomor Randori Saja
            </option>
        </select>

        <a href="{{ request()->fullUrlWithQuery(['download' => 'pdf', 'format' => null]) }}" style="background: #be123c; color: #fff;">
            <svg style="width:14px;height:14px;vertical-align:middle" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            Download PDF
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
            @if(!empty($selectedCourt))
                <div class="doc-court-badge">&#9873; {{ $selectedCourt->name }}</div>
            @endif
            @if(!empty($selectedType))
                <div style="font-size: 11px; font-weight: bold; color: #78350f; margin-top: 3px;">
                    KHUSUS NOMOR PERTANDINGAN {{ strtoupper($selectedType) }}
                </div>
            @endif
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
                        @if(!empty($selectedCourt))
                        <tr>
                            <td class="meta-label">Gelanggang / Court:</td>
                            <td class="meta-value" style="color: #be123c; font-weight: bold;">{{ $selectedCourt->name }}</td>
                        </tr>
                        @endif
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
                        @if(!empty($selectedType))
                        <tr>
                            <td class="meta-label">Filter Kategori:</td>
                            <td class="meta-value">{{ strtoupper($selectedType) }}</td>
                        </tr>
                        @endif
                    </table>
                </td>
            </tr>
        </table>

        @php
            $isSeparatedMode = ($viewMode ?? 'separated') === 'separated';
            $sessions = $matches->groupBy(function ($m) {
                return ($m->scheduled_start_at ? $m->scheduled_start_at->translatedFormat('l, d F Y') : 'Jadwal') . ' · ' . ($m->rundown?->name ?? 'Sesi Pertandingan');
            });
            $globalCounter = 0;
        @endphp

        @if($matches->isEmpty())
            <div style="border: 1px dashed #999; padding: 24px; text-align: center; color: #777; margin: 16px 0;">
                Belum ada partai pertandingan yang dijadwalkan pada kriteria ini.
            </div>
        @else
            @foreach($sessions as $sessionTitle => $sessionMatches)
                <div style="background: #3a2e24; color: #f7eed8; font-weight: bold; font-size: 10.5px; padding: 6px 10px; margin-top: 12px; margin-bottom: 6px; border-radius: 2px;">
                    &#128197; {{ $sessionTitle }}
                </div>

                @if($isSeparatedMode && empty($selectedType))
                    {{-- SEPARATED MODE: Group matches into Embu and Randori separate sub-tables --}}
                    @php
                        $embuMatches = $sessionMatches->filter(fn($m) => $m->matchCategory?->type === 'embu');
                        $randoriMatches = $sessionMatches->filter(fn($m) => $m->matchCategory?->type !== 'embu');
                    @endphp

                    {{-- 1. TABEL EMBU --}}
                    @if($embuMatches->isNotEmpty())
                        <div class="section-type-banner banner-embu">
                            Jadwal Nomor Embu (Tampilan Tunggal / Berpasangan / Beregu) &mdash; {{ $embuMatches->count() }} Partai
                        </div>
                        <table class="table-schedule">
                            <thead>
                                <tr>
                                    <th style="width: 4%">No</th>
                                    <th style="width: 6%">Partai</th>
                                    <th style="width: 10%">Waktu</th>
                                    <th style="width: 14%">Gelanggang</th>
                                    <th style="width: 26%">Nomor Pertandingan</th>
                                    <th style="width: 10%">Babak</th>
                                    <th style="width: 30%">Kontingen, Tim &amp; Susunan Atlet (Peserta Embu)</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($embuMatches as $m)
                                    @php
                                        $globalCounter++;
                                        $redContingent = $m->redEntry?->athlete?->contingent?->name;
                                        $redAthlete = $m->redEntry?->athlete?->name;
                                        $embuLabel = $m->participant_label;
                                        $embuMembers = is_array($m->metadata['members'] ?? null) ? implode(', ', $m->metadata['members']) : null;
                                    @endphp
                                    <tr>
                                        <td class="text-center">{{ $globalCounter }}</td>
                                        <td class="text-center font-bold">#{{ $m->match_sequence }}</td>
                                        <td class="text-center" style="font-weight: 600;">
                                            {{ $m->scheduled_start_at?->format('H:i') }} &ndash; {{ $m->scheduled_end_at?->format('H:i') }}
                                        </td>
                                        <td>
                                            <span class="badge-court">{{ $m->court?->name ?? 'Court' }}</span>
                                        </td>
                                        <td>
                                            <strong>{{ $m->matchCategory?->name ?? '-' }}</strong>
                                        </td>
                                        <td class="text-center">{{ $m->round_label }}</td>
                                        <td>
                                            <strong style="color: #17120f; font-size: 10px;">{{ $embuLabel ?: ($redContingent ?: 'Peserta Embu') }}</strong>
                                            @if($embuMembers)
                                                <span class="athlete-sub">{{ $embuMembers }}</span>
                                            @elseif($redAthlete)
                                                <span class="athlete-sub">{{ $redAthlete }}</span>
                                            @endif
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    @endif

                    {{-- 2. TABEL RANDORI --}}
                    @if($randoriMatches->isNotEmpty())
                        <div class="section-type-banner banner-randori">
                            Jadwal Nomor Randori (Tarung Bebas / Sparring) &mdash; {{ $randoriMatches->count() }} Partai
                        </div>
                        <table class="table-schedule">
                            <thead>
                                <tr>
                                    <th style="width: 4%">No</th>
                                    <th style="width: 6%">Partai</th>
                                    <th style="width: 10%">Waktu</th>
                                    <th style="width: 14%">Gelanggang</th>
                                    <th style="width: 22%">Nomor Pertandingan</th>
                                    <th style="width: 10%">Babak</th>
                                    <th style="width: 17%"><span class="corner-aka">&#9632; Sudut Merah (Aka)</span></th>
                                    <th style="width: 17%"><span class="corner-shiro">&#9632; Sudut Biru (Shiro)</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($randoriMatches as $m)
                                    @php
                                        $globalCounter++;
                                        $redContingent = $m->redEntry?->athlete?->contingent?->name;
                                        $redAthlete = $m->redEntry?->athlete?->name;
                                        $blueContingent = $m->blueEntry?->athlete?->contingent?->name;
                                        $blueAthlete = $m->blueEntry?->athlete?->name;
                                    @endphp
                                    <tr>
                                        <td class="text-center">{{ $globalCounter }}</td>
                                        <td class="text-center font-bold">#{{ $m->match_sequence }}</td>
                                        <td class="text-center" style="font-weight: 600;">
                                            {{ $m->scheduled_start_at?->format('H:i') }} &ndash; {{ $m->scheduled_end_at?->format('H:i') }}
                                        </td>
                                        <td>
                                            <span class="badge-court">{{ $m->court?->name ?? 'Court' }}</span>
                                        </td>
                                        <td>
                                            <strong>{{ $m->matchCategory?->name ?? '-' }}</strong>
                                        </td>
                                        <td class="text-center">{{ $m->round_label }}</td>
                                        <td>
                                            <strong class="corner-aka">{{ $redContingent ?: 'Menunggu Kontingen' }}</strong>
                                            @if($redAthlete)
                                                <span class="athlete-sub">{{ $redAthlete }}</span>
                                            @endif
                                        </td>
                                        <td>
                                            <strong class="corner-shiro">{{ $blueContingent ?: 'Menunggu Kontingen' }}</strong>
                                            @if($blueAthlete)
                                                <span class="athlete-sub">{{ $blueAthlete }}</span>
                                            @endif
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    @endif

                @else
                    {{-- SINGLE TABLE (Chronological or Filtered Single Type) --}}
                    @php
                        $isAllEmbu = $sessionMatches->every(fn($m) => $m->matchCategory?->type === 'embu');
                    @endphp

                    @if($isAllEmbu)
                        {{-- All matches in this view are Embu: Use dedicated Embu columns without Aka/Shiro --}}
                        <table class="table-schedule">
                            <thead>
                                <tr>
                                    <th style="width: 4%">No</th>
                                    <th style="width: 6%">Partai</th>
                                    <th style="width: 10%">Waktu</th>
                                    <th style="width: 14%">Gelanggang</th>
                                    <th style="width: 26%">Nomor Pertandingan</th>
                                    <th style="width: 10%">Babak</th>
                                    <th style="width: 30%">Kontingen, Tim &amp; Susunan Atlet (Peserta Embu)</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($sessionMatches as $m)
                                    @php
                                        $globalCounter++;
                                        $redContingent = $m->redEntry?->athlete?->contingent?->name;
                                        $redAthlete = $m->redEntry?->athlete?->name;
                                        $embuLabel = $m->participant_label;
                                        $embuMembers = is_array($m->metadata['members'] ?? null) ? implode(', ', $m->metadata['members']) : null;
                                    @endphp
                                    <tr>
                                        <td class="text-center">{{ $globalCounter }}</td>
                                        <td class="text-center font-bold">#{{ $m->match_sequence }}</td>
                                        <td class="text-center" style="font-weight: 600;">
                                            {{ $m->scheduled_start_at?->format('H:i') }} &ndash; {{ $m->scheduled_end_at?->format('H:i') }}
                                        </td>
                                        <td>
                                            <span class="badge-court">{{ $m->court?->name ?? 'Court' }}</span>
                                        </td>
                                        <td>
                                            <strong>{{ $m->matchCategory?->name ?? '-' }}</strong>
                                        </td>
                                        <td class="text-center">{{ $m->round_label }}</td>
                                        <td>
                                            <strong style="color: #17120f; font-size: 10px;">{{ $embuLabel ?: ($redContingent ?: 'Peserta Embu') }}</strong>
                                            @if($embuMembers)
                                                <span class="athlete-sub">{{ $embuMembers }}</span>
                                            @elseif($redAthlete)
                                                <span class="athlete-sub">{{ $redAthlete }}</span>
                                            @endif
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    @else
                        {{-- Mixed Chronological table: Embu rows merge columns 8 and 9 (colspan=2) --}}
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
                                    <th style="width: 17%"><span class="corner-aka">&#9632; Sudut Merah (Aka)</span><br><span style="font-size: 8px; color: #555; font-weight: normal;">(Peserta Embu)</span></th>
                                    <th style="width: 17%"><span class="corner-shiro">&#9632; Sudut Biru (Shiro)</span><br><span style="font-size: 8px; color: #555; font-weight: normal;">(Khusus Randori)</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($sessionMatches as $m)
                                    @php
                                        $globalCounter++;
                                        $isEmbu = $m->matchCategory?->type === 'embu';
                                        $redContingent = $m->redEntry?->athlete?->contingent?->name;
                                        $redAthlete = $m->redEntry?->athlete?->name;
                                        $embuLabel = $m->participant_label;
                                        $embuMembers = is_array($m->metadata['members'] ?? null) ? implode(', ', $m->metadata['members']) : null;
                                        $blueContingent = $m->blueEntry?->athlete?->contingent?->name;
                                        $blueAthlete = $m->blueEntry?->athlete?->name;
                                    @endphp
                                    <tr>
                                        <td class="text-center">{{ $globalCounter }}</td>
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
                                        <td class="text-center">{{ $m->round_label }}</td>

                                        @if($isEmbu)
                                            {{-- Embu: Single cell spanning both corner columns (NO red/blue split!) --}}
                                            <td colspan="2" style="background: #fffdf9;">
                                                <strong style="color: #17120f; font-size: 10px;">{{ $embuLabel ?: ($redContingent ?: 'Peserta Embu') }}</strong>
                                                @if($embuMembers)
                                                    <span class="athlete-sub">{{ $embuMembers }}</span>
                                                @elseif($redAthlete)
                                                    <span class="athlete-sub">{{ $redAthlete }}</span>
                                                @endif
                                            </td>
                                        @else
                                            {{-- Randori: Two corners --}}
                                            <td>
                                                <strong class="corner-aka">{{ $redContingent ?: 'Menunggu Kontingen' }}</strong>
                                                @if($redAthlete)
                                                    <span class="athlete-sub">{{ $redAthlete }}</span>
                                                @endif
                                            </td>
                                            <td>
                                                <strong class="corner-shiro">{{ $blueContingent ?: 'Menunggu Kontingen' }}</strong>
                                                @if($blueAthlete)
                                                    <span class="athlete-sub">{{ $blueAthlete }}</span>
                                                @endif
                                            </td>
                                        @endif
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    @endif
                @endif
            @endforeach
        @endif

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
