<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bagan Pertandingan - {{ $event->name }}</title>
    <style>
        @page { size: A4 landscape; margin: 9mm; }
        * { box-sizing: border-box; }
        body { margin: 0; background: {{ $isPdf ? '#fff' : '#e9e5df' }}; color: #17120f; font: 10px/1.35 DejaVu Sans, Arial, sans-serif; }
        .toolbar { position: sticky; top: 0; z-index: 10; padding: 11px; text-align: center; background: #17120f; }
        .toolbar a, .toolbar button { display: inline-block; margin: 0 4px; padding: 8px 14px; border: 0; border-radius: 6px; background: #e1b94e; color: #17120f; font-weight: bold; text-decoration: none; cursor: pointer; }
        .document { width: {{ $isPdf ? '100%' : 'min(1120px, calc(100% - 32px))' }}; margin: {{ $isPdf ? '0' : '22px auto' }}; background: #fff; box-shadow: {{ $isPdf ? 'none' : '0 12px 36px rgba(35, 25, 15, .18)' }}; }
        .category { page-break-after: always; padding: {{ $isPdf ? '0' : '28px' }}; }
        .category:last-child { page-break-after: auto; }
        .header { padding-bottom: 8px; border-bottom: 2px solid #17120f; text-align: center; }
        .header h1 { margin: 0; font-size: 17px; text-transform: uppercase; letter-spacing: .04em; }
        .header h2 { margin: 4px 0 0; font-size: 14px; color: #8c241c; }
        .meta { width: 100%; margin: 8px 0 10px; border-collapse: collapse; }
        .meta td { padding: 4px 7px; border: 1px solid #d9d0c5; background: #faf8f5; }
        .meta strong { color: #6c6258; }
        .bracket { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 7px 0; }
        .bracket th { padding: 5px; border-radius: 4px; background: #17120f; color: #f0c060; text-align: center; }
        .bracket td { vertical-align: middle; }
        .round-section { margin: 0 0 10px; page-break-inside: auto; }
        .round-heading { padding: 5px 8px; border-radius: 4px; background: #17120f; color: #f0c060; font-weight: bold; text-align: center; page-break-after: avoid; }
        .round-grid { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 6px 0; }
        .round-grid thead { display: table-header-group; }
        .round-grid tr { page-break-inside: avoid; }
        .round-grid td { width: 33.333%; vertical-align: top; }
        .match-card { margin: 6px 0; border: 1px solid #b9aea2; border-radius: 4px; page-break-inside: avoid; }
        .match-title { padding: 3px 5px; background: #f2ede6; font-size: 8px; font-weight: bold; color: #665d55; }
        .corner { padding: 4px 5px; border-top: 1px solid #ddd5cc; font-weight: bold; }
        .corner small { display: block; margin-top: 1px; color: #746b63; font-weight: normal; }
        .aka { border-left: 3px solid #b3261e; }
        .shiro { border-left: 3px solid #a7a7a7; }
        .schedule { padding: 3px 5px; border-top: 1px solid #ddd5cc; color: #746b63; font-size: 8px; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 5px 6px; border: 1px solid #777; vertical-align: top; }
        .data-table th { background: #eee7de; text-align: center; }
        .center { text-align: center; }
        .muted { color: #746b63; font-size: 8px; }
        .empty { padding: 24px; border: 1px dashed #b9aea2; text-align: center; color: #746b63; }
        .footer { margin-top: 8px; text-align: right; color: #746b63; font-size: 8px; }
        @media print {
            body { background: #fff; }
            .toolbar { display: none; }
            .document { width: 100%; margin: 0; box-shadow: none; }
            .category { padding: 0; }
        }
    </style>
</head>
<body>
    @unless($isPdf)
        <div class="toolbar">
            <a href="{{ request()->fullUrlWithQuery(['format' => null]) }}">Download PDF</a>
            <button type="button" onclick="window.print()">Cetak</button>
            <a href="{{ route('admin.pertandingan.drawing', ['event_id' => $event->id, 'category' => request('category')]) }}">Kembali ke Drawing</a>
        </div>
    @endunless

    <main class="document">
        @foreach($drawings as $drawing)
            <section class="category">
                <header class="header">
                    <h1>Bagan & Nomor Pertandingan</h1>
                    <h2>{{ $drawing['category_name'] }}</h2>
                    <div>{{ $event->name }} &middot; {{ $event->venue }}{{ $event->city ? ', '.$event->city : '' }}</div>
                </header>

                <table class="meta">
                    <tr>
                        <td><strong>Jenis:</strong> {{ ucfirst($drawing['category_type']) }}</td>
                        <td><strong>Format:</strong> {{ $drawing['format_label'] }}</td>
                        <td><strong>Peserta/Tim:</strong> {{ $drawing['participant_count'] }}</td>
                        <td><strong>Kontingen:</strong> {{ $drawing['contingent_count'] }}</td>
                    </tr>
                </table>

                @if($drawing['matches']->isEmpty())
                    <div class="empty">Bagan belum memiliki partai atau nomor tampil.</div>
                @elseif($drawing['category_type'] === 'randori' && $drawing['format'] !== 'round_robin')
                    @if($drawing['matches']->count() <= 12)
                        <table class="bracket" data-testid="randori-bracket">
                            <thead>
                                <tr>
                                    @foreach($drawing['rounds'] as $roundLabel => $roundMatches)
                                        <th>{{ $roundLabel }}</th>
                                    @endforeach
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    @foreach($drawing['rounds'] as $roundMatches)
                                        <td>
                                            @foreach($roundMatches as $match)
                                                <div class="match-card">
                                                    <div class="match-title">Partai #{{ $match['sequence'] }}{{ $match['is_bye'] ? ' · BYE' : '' }}</div>
                                                    <div class="corner aka">
                                                        AKA &middot; {{ $match['red_label'] }}
                                                        @if($match['red_contingent'])<small>{{ $match['red_contingent'] }}</small>@endif
                                                    </div>
                                                    <div class="corner shiro">
                                                        SHIRO &middot; {{ $match['blue_label'] }}
                                                        @if($match['blue_contingent'])<small>{{ $match['blue_contingent'] }}</small>@endif
                                                    </div>
                                                    <div class="schedule">{{ $match['scheduled_at'] ?: 'Belum dijadwalkan' }}{{ $match['court'] ? ' · '.$match['court'] : '' }}</div>
                                                </div>
                                            @endforeach
                                        </td>
                                    @endforeach
                                </tr>
                            </tbody>
                        </table>
                    @else
                        <div data-testid="randori-bracket" class="large-bracket">
                            @foreach($drawing['rounds'] as $roundLabel => $roundMatches)
                                <section class="round-section">
                                    <table class="round-grid">
                                        <thead>
                                            <tr>
                                                <th colspan="3" class="round-heading">{{ $roundLabel }}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @foreach($roundMatches->chunk(3) as $matchRow)
                                                <tr>
                                                    @foreach($matchRow as $match)
                                                        <td>
                                                            <div class="match-card">
                                                                <div class="match-title">Partai #{{ $match['sequence'] }}{{ $match['is_bye'] ? ' · BYE' : '' }}</div>
                                                                <div class="corner aka">
                                                                    AKA &middot; {{ $match['red_label'] }}
                                                                    @if($match['red_contingent'])<small>{{ $match['red_contingent'] }}</small>@endif
                                                                </div>
                                                                <div class="corner shiro">
                                                                    SHIRO &middot; {{ $match['blue_label'] }}
                                                                    @if($match['blue_contingent'])<small>{{ $match['blue_contingent'] }}</small>@endif
                                                                </div>
                                                                <div class="schedule">{{ $match['scheduled_at'] ?: 'Belum dijadwalkan' }}{{ $match['court'] ? ' · '.$match['court'] : '' }}</div>
                                                            </div>
                                                        </td>
                                                    @endforeach
                                                    @for($emptyCell = $matchRow->count(); $emptyCell < 3; $emptyCell++)
                                                        <td></td>
                                                    @endfor
                                                </tr>
                                            @endforeach
                                        </tbody>
                                    </table>
                                </section>
                            @endforeach
                        </div>
                    @endif
                @else
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width: 7%">No.</th>
                                <th style="width: 13%">Babak / Pool</th>
                                @if($drawing['category_type'] === 'embu')
                                    <th>Peserta / Tim</th>
                                    <th>Anggota</th>
                                @else
                                    <th>AKA</th>
                                    <th>SHIRO</th>
                                @endif
                                <th style="width: 20%">Jadwal</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($drawing['matches'] as $match)
                                <tr>
                                    <td class="center">{{ $drawing['category_type'] === 'embu' ? ($match['position'] ?: $match['sequence']) : $match['sequence'] }}</td>
                                    <td>{{ $match['pool'] ? 'Pool '.$match['pool'] : $match['round_label'] }}</td>
                                    @if($drawing['category_type'] === 'embu')
                                        <td>
                                            <strong>{{ $match['participant_label'] ?: 'Menunggu peserta' }}</strong>
                                            @if($match['participant_contingent'])<div class="muted">{{ $match['participant_contingent'] }}</div>@endif
                                        </td>
                                        <td>{{ collect($match['members'])->implode(', ') ?: '—' }}</td>
                                    @else
                                        <td><strong>{{ $match['red_label'] }}</strong>@if($match['red_contingent'])<div class="muted">{{ $match['red_contingent'] }}</div>@endif</td>
                                        <td><strong>{{ $match['blue_label'] }}</strong>@if($match['blue_contingent'])<div class="muted">{{ $match['blue_contingent'] }}</div>@endif</td>
                                    @endif
                                    <td>{{ $match['scheduled_at'] ?: 'Belum dijadwalkan' }}{{ $match['court'] ? ' · '.$match['court'] : '' }}</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                @endif

                <div class="footer">Dicetak {{ now()->translatedFormat('d F Y, H:i') }} WIB &middot; Smart Perkemi</div>
            </section>
        @endforeach
    </main>
</body>
</html>
