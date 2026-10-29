<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Berita Acara Resmi Pertandingan - {{ $event->name }}</title>
    <style>
        :root { color-scheme: light; font-family: "Times New Roman", Times, serif; color: #111; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #e9e5df; }
        .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: center; gap: 12px; padding: 12px; background: #17120f; box-shadow: 0 4px 12px rgba(0,0,0,.2); }
        .toolbar button, .toolbar a { cursor: pointer; border: 0; border-radius: 8px; padding: 10px 18px; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; text-decoration: none; color: #17120f; background: #e1b94e; transition: background .2s; }
        .toolbar button:hover, .toolbar a:hover { background: #d4a843; }
        .toolbar .btn-secondary { background: #fff; color: #17120f; }
        .sheet { width: min(860px, calc(100% - 32px)); margin: 24px auto; padding: 48px 56px; background: #fff; box-shadow: 0 12px 40px rgba(40, 30, 20, .15); }
        
        .header { text-align: center; border-bottom: 3px double #17120f; padding-bottom: 14px; margin-bottom: 24px; }
        .org-title { font-size: 15px; font-weight: bold; letter-spacing: .08em; text-transform: uppercase; margin: 0; }
        .sub-org { font-size: 13px; font-weight: bold; margin: 3px 0 0; text-transform: uppercase; color: #333; }
        .doc-title { font-size: 18px; font-weight: bold; margin: 16px 0 4px; text-decoration: underline; text-transform: uppercase; letter-spacing: .05em; }
        .doc-number { font-size: 12px; color: #444; font-family: Arial, sans-serif; margin: 0; }
        
        p { margin: 8px 0; font-size: 13px; line-height: 1.6; text-align: justify; }
        h3 { font-size: 13px; font-weight: bold; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: .04em; }
        
        .table-data { width: 100%; border-collapse: collapse; margin: 10px 0 16px; font-size: 12px; font-family: Arial, sans-serif; }
        .table-data th, .table-data td { border: 1px solid #444; padding: 7px 10px; text-align: left; }
        .table-data th { background: #f0ece6; font-weight: bold; text-align: center; }
        .table-data td.text-center { text-align: center; }
        .table-data td.text-right { text-align: right; }
        .table-data tr.top-row { font-weight: bold; background: #fffdf5; }
        
        .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 12px 0 18px; font-family: Arial, sans-serif; font-size: 12px; }
        .summary-box { border: 1px solid #bbb; padding: 10px 14px; border-radius: 6px; background: #faf8f5; }
        .summary-box strong { display: block; font-size: 11px; text-transform: uppercase; color: #777; margin-bottom: 3px; }
        .summary-box span { font-size: 14px; font-weight: bold; color: #111; }
        
        .champions-callout { border: 2px solid #b8860b; background: #fffdf2; padding: 14px 18px; border-radius: 8px; margin: 16px 0; font-family: Arial, sans-serif; }
        .champions-callout h4 { margin: 0 0 8px; font-size: 13px; color: #855e00; text-transform: uppercase; letter-spacing: .05em; }
        .champions-callout ol { margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; }
        
        .signatures { margin-top: 36px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; text-align: center; font-family: Arial, sans-serif; font-size: 12px; }
        .sig-box { min-height: 150px; display: flex; flex-direction: column; justify-content: space-between; }
        .sig-role { font-weight: bold; font-size: 11px; text-transform: uppercase; line-height: 1.4; }
        .sig-line { border-bottom: 1px solid #111; width: 85%; margin: 70px auto 4px; }
        .sig-name { font-weight: bold; font-size: 12px; }
        .sig-detail { font-size: 10px; color: #555; }
        
        @media print {
            @page { size: A4 portrait; margin: 15mm 12mm 15mm 12mm; }
            body { background: #fff; }
            .toolbar { display: none; }
            .sheet { width: 100%; margin: 0; padding: 0; box-shadow: none; }
            .table-data, .champions-callout, .signatures { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <button type="button" onclick="window.print()">
            <i class="fa-solid fa-print"></i> Cetak Dokumen Resmi (A4)
        </button>
        <a href="/admin/laporan?event_id={{ urlencode($event->id) }}" class="btn-secondary">
            Kembali ke Laporan
        </a>
    </div>

    <main class="sheet">
        <header class="header">
            <h1 class="org-title">PERSAUDARAAN SHORINJI KEMPO INDONESIA (PERKEMI)</h1>
            <p class="sub-org">PANITIA PELAKSANA KEJUARAAN & TECHNICAL DELEGATE</p>
            <h2 class="doc-title">BERITA ACARA RESMI PENYELENGGARAAN PERTANDINGAN</h2>
            <p class="doc-number">Nomor: {{ $documentNumber }}</p>
        </header>

        <section>
            <p>
                Pada hari ini <strong>{{ now()->translatedFormat('l') }}</strong>, tanggal <strong>{{ now()->translatedFormat('d F Y') }}</strong>, 
                telah diselesaikan dan ditutup secara resmi seluruh rangkaian pertandingan Kejuaraan Shorinji Kempo 
                <strong>{{ $event->name }}</strong> yang berlangsung di <strong>{{ $event->venue }}, {{ $event->city }}</strong> 
                sejak tanggal {{ $event->start_date?->translatedFormat('d F Y') }} sampai dengan {{ $event->end_date?->translatedFormat('d F Y') }}.
            </p>
            <p>
                Berdasarkan hasil rekapitulasi data dari Meja Panitera, Dewan Wasit, dan Verifikasi Hasil Pertandingan melalui Sistem SMART PERKEMI v2, 
                maka dengan ini dicatatkan Berita Acara resmi sebagai berikut:
            </p>
        </section>

        <section>
            <h3>I. REKAPITULASI TEKNIS & KEPESERTAAN</h3>
            <div class="summary-grid">
                <div class="summary-box">
                    <strong>Gelanggang Pertandingan (Tatami)</strong>
                    <span>{{ $stats['total_courts'] }} Gelanggang Resmi</span>
                </div>
                <div class="summary-box">
                    <strong>Kontingen Daerah / Kota / Dojô</strong>
                    <span>{{ $stats['total_contingents'] }} Kontingen Terdaftar</span>
                </div>
                <div class="summary-box">
                    <strong>Total Kenshi / Atlet Terdaftar</strong>
                    <span>{{ $stats['total_athletes'] }} Kenshi (Putra: {{ $stats['athletes_male'] }}, Putri: {{ $stats['athletes_female'] }})</span>
                </div>
                <div class="summary-box">
                    <strong>Nomor Pertandingan Resmi</strong>
                    <span>{{ $stats['total_categories'] }} Nomor (Embu: {{ $stats['embu_categories'] }}, Randori: {{ $stats['randori_categories'] }})</span>
                </div>
                <div class="summary-box">
                    <strong>Total Partai Dipertandingkan</strong>
                    <span>{{ $stats['total_matches'] }} Partai (Selesai: {{ $stats['completed_matches'] }})</span>
                </div>
                <div class="summary-box">
                    <strong>Pemeriksaan Video Replay (VAR)</strong>
                    <span>{{ $stats['var_reviews_count'] }} Kasus Review Diselesaikan</span>
                </div>
            </div>
        </section>

        <section>
            <h3>II. KLASEMEN PEROLEHAN MEDALI & JUARA UMUM</h3>
            <table class="table-data">
                <thead>
                    <tr>
                        <th style="width: 45px;">Peringkat</th>
                        <th>Kontingen / Daerah</th>
                        <th style="width: 65px;">Emas (1)</th>
                        <th style="width: 65px;">Perak (2)</th>
                        <th style="width: 75px;">Perunggu (3)</th>
                        <th style="width: 80px;">Total Medali</th>
                        <th style="width: 75px;">Total Poin</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse(array_slice($standings, 0, 10) as $index => $row)
                        <tr class="{{ $index < 3 ? 'top-row' : '' }}">
                            <td class="text-center">{{ $row['rank'] }}</td>
                            <td><strong>{{ $row['contingent'] }}</strong></td>
                            <td class="text-center">{{ $row['gold'] }}</td>
                            <td class="text-center">{{ $row['silver'] }}</td>
                            <td class="text-center">{{ $row['bronze'] }}</td>
                            <td class="text-center"><strong>{{ $row['total_medals'] }}</strong></td>
                            <td class="text-center"><strong>{{ $row['total_points'] }}</strong></td>
                            <td>{{ $row['status'] }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="8" class="text-center" style="padding: 16px; color: #777;">
                                Belum ada hasil pertandingan yang selesai dan diverifikasi.
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>

            @if(count($standings) > 0)
                <div class="champions-callout">
                    <h4>PENETAPAN PERAIH JUARA UMUM:</h4>
                    <ol>
                        <li><strong>JUARA UMUM I (Piala Bergilir): {{ $standings[0]['contingent'] }}</strong> — {{ $standings[0]['gold'] }} Emas, {{ $standings[0]['silver'] }} Perak, {{ $standings[0]['bronze'] }} Perunggu (Total Poin: {{ $standings[0]['total_points'] }})</li>
                        @if(isset($standings[1]))
                            <li><strong>JUARA UMUM II: {{ $standings[1]['contingent'] }}</strong> — {{ $standings[1]['gold'] }} Emas, {{ $standings[1]['silver'] }} Perak, {{ $standings[1]['bronze'] }} Perunggu (Total Poin: {{ $standings[1]['total_points'] }})</li>
                        @endif
                        @if(isset($standings[2]))
                            <li><strong>JUARA UMUM III: {{ $standings[2]['contingent'] }}</strong> — {{ $standings[2]['gold'] }} Emas, {{ $standings[2]['silver'] }} Perak, {{ $standings[2]['bronze'] }} Perunggu (Total Poin: {{ $standings[2]['total_points'] }})</li>
                        @endif
                    </ol>
                </div>
            @endif
        </section>

        <section>
            <h3>III. CATATAN KHUSUS & KETERTIBAN PERTANDINGAN</h3>
            <p>
                Seluruh pertandingan telah dilaksanakan dengan berpedoman pada Anggaran Dasar/Anggaran Rumah Tangga (AD/ART) 
                dan Peraturan Pertandingan Resmi Pengurus Besar Persaudaraan Shorinji Kempo Indonesia (PB PERKEMI). 
                Seluruh kendala teknis lapangan, permohonan Video Assistant Review (VAR), serta evaluasi perwasitan 
                telah diselesaikan sesuai prosedur standar operasional dengan mengutamakan sportivitas dan persaudaraan sejati.
            </p>
        </section>

        <footer class="signatures">
            <div class="sig-box">
                <span class="sig-role">Technical Delegate (TD)<br>PB PERKEMI</span>
                <div class="sig-line"></div>
                <div>
                    <div class="sig-name">( .................................................... )</div>
                    <div class="sig-detail">NSP: .......................................</div>
                </div>
            </div>

            <div class="sig-box">
                <span class="sig-role">Ketua Dewan Wasit<br>Chief Referee</span>
                <div class="sig-line"></div>
                <div>
                    <div class="sig-name">( .................................................... )</div>
                    <div class="sig-detail">Lisensi Wasit Nasional</div>
                </div>
            </div>

            <div class="sig-box">
                <span class="sig-role">Ketua Panitia Pelaksana<br>Organizing Committee</span>
                <div class="sig-line"></div>
                <div>
                    <div class="sig-name">( .................................................... )</div>
                    <div class="sig-detail">Panitia Pelaksana Kejuaraan</div>
                </div>
            </div>
        </footer>
    </main>
</body>
</html>
