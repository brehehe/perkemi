<?php

namespace App\Services\Arbitration;

use App\Models\EmbuJudgeScore;
use App\Models\Event;
use App\Models\RandoriScore;
use App\Models\RefereeAttendance;
use App\Models\Rundown;
use App\Models\TournamentMatch;
use App\Services\Reports\ReportDatasetBuilder;
use App\Services\Reports\ReportWorkbook;
use Illuminate\Support\Str;

class ArbitrationExportService
{
    public function __construct(
        protected ReportWorkbook $reportWorkbook,
        protected ReportDatasetBuilder $datasetBuilder,
    ) {}

    public function filename(Event $event): string
    {
        return 'laporan-lengkap-arbitrase-'.Str::slug($event->name).'-'.now()->format('Ymd_His').'.xlsx';
    }

    /**
     * Generate a multi-sheet XLSX workbook covering all tab menus & arbitration for the event:
     * 1. Dewan Arbitrase (Roster petugas dengan Role Arbitrase & Dewan Hakim)
     * 2. Wasit & Juri (Roster Wasit & Juri pertandingan resmi)
     * 3. History Kehadiran (Log presensi wasit)
     * 4. History Penilaian (Lembar skor juri Embu & Randori)
     * 5. Jadwal Pertandingan
     * 6. Hasil Juara Resmi
     * 7. Kelompok Umur
     * 8. Lapangan (Court)
     * 9. Nomer Pertandingan
     * 10. Sesi & Rundown
     * 11. Panitera & Korlap
     * 12. Informasi Event
     */
    public function export(Event $event): string
    {
        $sheets = [
            $this->buildArbitrationPersonnelSheet($event),
            $this->buildRefereesSheet($event),
            $this->buildAttendanceSheet($event),
            $this->buildScoresSheet($event),
            $this->buildScheduleSheet($event),
            $this->buildChampionsSheet($event),
            $this->buildAgeCategoriesSheet($event),
            $this->buildCourtsSheet($event),
            $this->buildMatchCategoriesSheet($event),
            $this->buildRundownsSheet($event),
            $this->buildClerksAndCoordinatorsSheet($event),
            $this->buildInfoSheet($event),
        ];

        return $this->reportWorkbook->buildMultiSheet("Laporan Lengkap & Arbitrase - {$event->name}", $sheets);
    }

    /**
     * Sheet 1: Dewan Arbitrase Pertandingan (Role Arbitrase & Dewan Hakim)
     *
     * @return array{sheet_name: string, title: string, subtitle: string, headers: list<string>, rows: list<list<int|float|string|null>>}
     */
    protected function buildArbitrationPersonnelSheet(Event $event): array
    {
        $event->loadMissing(['fieldCoordinators']);

        $rows = [];
        $counter = 1;

        // 1. Petugas dengan ROLE ARBITRASE yang dipilih untuk event ini
        $arbitrationUsers = $event->users()
            ->whereHas('roles', fn ($q) => $q->where('name', 'Arbitrase'))
            ->get();

        foreach ($arbitrationUsers as $user) {
            $rows[] = [
                $counter++,
                $user->name,
                'Dewan Arbitrase (Role Arbitrase)',
                'Dewan Arbitrase Event',
                '-',
                'Dewan Arbitrase Resmi',
                'ARB-'.substr($user->id, 0, 8),
                'Pengurus Arbitrase Event',
                $user->email,
                'Ditugaskan (Role Arbitrase)',
            ];
        }

        // 2. Dewan Hakim & Pengawas Pertandingan (Field Coordinators)
        foreach ($event->fieldCoordinators as $fc) {
            $roleTitle = match (strtolower((string) $fc->pivot->assignment_area)) {
                'chief' => 'Dewan Hakim / Koordinator Utama',
                'court' => 'Pengawas Lapangan (Tatami)',
                default => 'Dewan Pengawas / Korlap',
            };

            $contact = trim(($fc->phone ?: '').' '.($fc->email ?: ''));

            $rows[] = [
                $counter++,
                $fc->name,
                'Dewan Hakim & Pengawas',
                $roleTitle,
                '-',
                'Pengawas Pertandingan',
                $fc->coordinator_number ?: '-',
                $fc->region ?: '-',
                $contact ?: ($fc->notes ?: '-'),
                'Bertugas',
            ];
        }

        return [
            'sheet_name' => 'Dewan Arbitrase',
            'title' => 'DEWAN ARBITRASE & PENGAWAS RESMI PERTANDINGAN',
            'subtitle' => 'Event: '.$event->name.' | Total Dewan Arbitrase & Pengawas: '.count($rows),
            'headers' => [
                'No',
                'Nama Petugas',
                'Kategori',
                'Posisi / Jabatan Arbitrase',
                'Tingkatan Dan',
                'Sertifikasi Resmi',
                'No. Lisensi / ID',
                'Pengprov / Daerah Asal',
                'Kontak / Email',
                'Status Penugasan',
            ],
            'rows' => $rows,
        ];
    }

    /**
     * Sheet 2: Wasit & Juri Pertandingan Resmi
     *
     * @return array{sheet_name: string, title: string, subtitle: string, headers: list<string>, rows: list<list<int|float|string|null>>}
     */
    protected function buildRefereesSheet(Event $event): array
    {
        $event->loadMissing(['referees']);

        $presentRefereeIds = RefereeAttendance::whereBelongsTo($event)
            ->where('is_present', true)
            ->pluck('referee_id')
            ->unique()
            ->flip();

        $rows = [];
        $counter = 1;

        foreach ($event->referees as $ref) {
            $isPresent = isset($presentRefereeIds[$ref->id]);

            $roleTitle = match (strtolower((string) $ref->pivot->role)) {
                'chief_referee' => 'Wasit Kepala (Chief Referee)',
                'chief_judge' => 'Ketua Juri',
                'deputy_chief' => 'Wakil Wasit Kepala',
                'arbitration' => 'Dewan Arbitrase Wasit',
                default => 'Wasit & Juri Pertandingan',
            };

            $contact = trim(($ref->phone ?: '').' '.($ref->email ?: ''));

            $rows[] = [
                $counter++,
                $ref->name,
                $roleTitle,
                $ref->dan_grade ?: '-',
                $ref->certification_level ?: '-',
                $ref->license_number ?: '-',
                $ref->region ?: '-',
                $contact ?: '-',
                $isPresent ? 'Hadir Presensi' : 'Belum Presensi',
            ];
        }

        return [
            'sheet_name' => 'Wasit & Juri',
            'title' => 'ROSTER WASIT & JURI PERTANDINGAN RESMI',
            'subtitle' => 'Event: '.$event->name.' | Total Wasit & Juri: '.count($rows),
            'headers' => [
                'No',
                'Nama Wasit / Juri',
                'Posisi / Penugasan',
                'Tingkatan Dan',
                'Sertifikasi Wasit',
                'No. Lisensi',
                'Pengprov Asal',
                'Kontak Person',
                'Status Kehadiran Event',
            ],
            'rows' => $rows,
        ];
    }

    /**
     * Sheet 3: History Kehadiran (Log Presensi Wasit)
     *
     * @return array{sheet_name: string, title: string, subtitle: string, headers: list<string>, rows: list<list<int|float|string|null>>}
     */
    protected function buildAttendanceSheet(Event $event): array
    {
        $attendances = RefereeAttendance::query()
            ->whereBelongsTo($event)
            ->with(['referee:id,name,dan_grade,license_number,region'])
            ->orderByDesc('attendance_date')
            ->orderByDesc('checked_in_at')
            ->get();

        $rows = [];
        foreach ($attendances as $index => $att) {
            $timeFormatted = $att->checked_in_at ? $att->checked_in_at->format('H:i:s').' WIB' : '-';
            $methodFormatted = match (strtolower((string) $att->method)) {
                'qr' => 'QR Code Scanner',
                'manual' => 'Input Manual Panitia',
                default => $att->method ?: ($att->is_present ? 'Presensi Mandiri' : '-'),
            };

            $rows[] = [
                $index + 1,
                $att->referee?->name ?? 'Wasit #'.$att->referee_id,
                $att->referee?->dan_grade ?? '-',
                $att->referee?->license_number ?? '-',
                $att->referee?->region ?? '-',
                $att->attendance_date?->format('d/m/Y') ?? '-',
                $timeFormatted,
                $methodFormatted,
                $att->is_present ? 'HADIR' : 'TIDAK HADIR',
                $att->notes ?: '-',
            ];
        }

        return [
            'sheet_name' => 'History Kehadiran',
            'title' => 'LOG & RIWAYAT PRESENSI WASIT PERTANDINGAN',
            'subtitle' => 'Event: '.$event->name.' | Total Catatan Presensi: '.count($rows),
            'headers' => [
                'No',
                'Nama Wasit',
                'Tingkatan Dan',
                'No. Lisensi',
                'Pengprov',
                'Tanggal Pertandingan',
                'Waktu Check-in',
                'Metode Presensi',
                'Status Kehadiran',
                'Keterangan / Catatan',
            ],
            'rows' => $rows,
        ];
    }

    /**
     * Sheet 4: History Penilaian (Embu & Randori)
     *
     * @return array{sheet_name: string, title: string, subtitle: string, headers: list<string>, rows: list<list<int|float|string|null>>}
     */
    protected function buildScoresSheet(Event $event): array
    {
        $embuScores = EmbuJudgeScore::query()
            ->whereBelongsTo($event)
            ->with([
                'referee:id,name',
                'court:id,name',
                'tournamentMatch.matchCategory:id,name',
            ])
            ->orderBy('tournament_match_id')
            ->orderBy('judge_number')
            ->get();

        $randoriScores = RandoriScore::query()
            ->whereBelongsTo($event)
            ->with([
                'tournamentMatch.matchCategory:id,name',
                'tournamentMatch.court:id,name',
            ])
            ->latest('updated_at')
            ->get();

        $rows = [];
        $counter = 1;

        // 1. Embu Scores
        foreach ($embuScores as $score) {
            $match = $score->tournamentMatch;
            $judgeLabel = $score->judge_number ? 'Juri '.$score->judge_number : 'Wasit';
            $signatureLabel = ! empty($score->signature) ? 'Tertanda Digital' : 'Belum TTD';
            $timeFormatted = $score->updated_at ? $score->updated_at->translatedFormat('d/m/Y H:i') : '-';

            $rows[] = [
                $counter++,
                '#'.($match?->match_sequence ?? '-'),
                'EMBU',
                $match?->matchCategory?->name ?? '-',
                $score->court?->name ?? ($match?->court?->name ?? '-'),
                $score->referee?->name ?? 'Juri #'.$score->referee_id,
                $judgeLabel,
                $match?->participant_label ?? '-',
                (float) $score->technique_subtotal,
                (float) $score->expression_subtotal,
                (float) $score->violation_penalty,
                (float) $score->total_score,
                $signatureLabel,
                $timeFormatted,
                ucfirst((string) ($score->status ?: 'Tersimpan')),
            ];
        }

        // 2. Randori Scores
        foreach ($randoriScores as $score) {
            $match = $score->tournamentMatch;
            $akaLabel = $match?->red_label ?? 'AKA';
            $shiroLabel = $match?->blue_label ?? 'SHIRO';
            $participants = "AKA: {$akaLabel} vs SHIRO: {$shiroLabel}";

            $signaturesCount = is_array($score->signatures) ? count($score->signatures) : 0;
            $signatureLabel = $signaturesCount > 0 ? "Tertanda Digital ({$signaturesCount})" : '-';

            $winnerLabel = match (strtolower((string) $score->winner_corner)) {
                'aka', 'red' => "Pemenang: AKA ({$akaLabel})",
                'shiro', 'blue', 'white' => "Pemenang: SHIRO ({$shiroLabel})",
                'draw' => 'Hasil Seri / Draw',
                default => $score->winner_corner ? "Pemenang: {$score->winner_corner}" : '-',
            };

            $timeFormatted = $score->verified_at
                ? $score->verified_at->translatedFormat('d/m/Y H:i')
                : ($score->updated_at ? $score->updated_at->translatedFormat('d/m/Y H:i') : '-');

            $rows[] = [
                $counter++,
                '#'.($match?->match_sequence ?? '-'),
                'RANDORI',
                $match?->matchCategory?->name ?? '-',
                $match?->court?->name ?? '-',
                $score->verified_by ?? 'Wasit Tatami & Dewan Juri',
                'Dewan Juri / Wasit',
                $participants,
                (float) ($score->aka_total ?? 0),
                (float) ($score->shiro_total ?? 0),
                0,
                $winnerLabel,
                $signatureLabel,
                $timeFormatted,
                ucfirst((string) ($score->status ?: 'Tervalidasi')),
            ];
        }

        return [
            'sheet_name' => 'History Penilaian',
            'title' => 'LOG & RIWAYAT PENILAIAN JURI / WASIT',
            'subtitle' => 'Event: '.$event->name.' | Total Log Nilai: '.count($rows),
            'headers' => [
                'No',
                'Partai',
                'Jenis',
                'Nomor Pertandingan',
                'Arena / Lapangan',
                'Wasit / Juri',
                'Peran Wasit',
                'Kontingen / Atlet',
                'Skor Teknik / AKA',
                'Skor Penghayatan / SHIRO',
                'Potongan / Denda',
                'Nilai Akhir / Pemenang',
                'Tanda Tangan',
                'Waktu Penilaian',
                'Status',
            ],
            'rows' => $rows,
        ];
    }

    /**
     * Sheet 5: Jadwal Pertandingan
     *
     * @return array{sheet_name: string, title: string, subtitle: string, headers: list<string>, rows: list<list<int|float|string|null>>}
     */
    protected function buildScheduleSheet(Event $event): array
    {
        $matches = TournamentMatch::query()
            ->whereBelongsTo($event)
            ->with(['court:id,name', 'matchCategory:id,name,type'])
            ->orderBy('scheduled_start_at')
            ->orderBy('match_sequence')
            ->get();

        $rows = [];
        foreach ($matches as $index => $match) {
            $type = strtoupper((string) ($match->matchCategory?->type ?? '-'));
            $participant = $type === 'EMBU'
                ? ($match->participant_label ?: '-')
                : 'AKA: '.($match->red_label ?: 'AKA').' vs SHIRO: '.($match->blue_label ?: 'SHIRO');

            $timeFormatted = $match->scheduled_start_at
                ? $match->scheduled_start_at->translatedFormat('d M Y, H:i')
                : '-';

            $rows[] = [
                $index + 1,
                '#'.($match->match_sequence ?? ($index + 1)),
                $match->matchCategory?->name ?? '-',
                $type,
                $match->round_label ?: '-',
                $match->pool ? 'Pool '.$match->pool : '-',
                $match->court?->name ?? 'Belum Ditentukan',
                $participant,
                $timeFormatted,
                ucfirst((string) ($match->status ?: 'ready')),
            ];
        }

        return [
            'sheet_name' => 'Jadwal Pertandingan',
            'title' => 'JADWAL RESMI SELURUH PARTAI PERTANDINGAN',
            'subtitle' => 'Event: '.$event->name.' | Total Partai: '.count($rows),
            'headers' => [
                'No',
                'Nomor Partai',
                'Nomor Pertandingan',
                'Jenis',
                'Babak',
                'Pool',
                'Arena / Gelanggang',
                'Peserta / Sudut',
                'Jadwal Mulai',
                'Status Partai',
            ],
            'rows' => $rows,
        ];
    }

    /**
     * Sheet 6: Hasil Juara
     *
     * @return array{sheet_name: string, title: string, subtitle: string, headers: list<string>, rows: list<list<int|float|string|null>>}
     */
    protected function buildChampionsSheet(Event $event): array
    {
        $dataset = $this->datasetBuilder->build($event, 'champions');
        $dataRows = $dataset['rows'] ?? [];

        $rows = [];
        foreach ($dataRows as $index => $row) {
            $rows[] = [
                $index + 1,
                $row['category'] ?? '-',
                $row['type'] ?? '-',
                $this->formatChampion($row['champion_1'] ?? null),
                $this->formatChampion($row['champion_2'] ?? null),
                $this->formatChampion($row['champion_3_a'] ?? null),
                $this->formatChampion($row['champion_3_b'] ?? null),
                $row['classification'] ?? '-',
                $row['confirmed_at'] ?? '-',
            ];
        }

        return [
            'sheet_name' => 'Hasil Juara',
            'title' => 'DAFTAR JUARA RESMI & KEPUTUSAN MEDALI',
            'subtitle' => 'Event: '.$event->name.' | Total Nomor Dipertandingkan: '.count($rows),
            'headers' => [
                'No',
                'Nomor Pertandingan',
                'Jenis',
                'Juara 1 (Emas)',
                'Juara 2 (Perak)',
                'Juara 3 Bersama (Perunggu A)',
                'Juara 3 Bersama (Perunggu B)',
                'Klasifikasi',
                'Dikonfirmasi Pada',
            ],
            'rows' => $rows,
        ];
    }

    /**
     * Sheet 7: Kelompok Umur
     *
     * @return array{sheet_name: string, title: string, subtitle: string, headers: list<string>, rows: list<list<int|float|string|null>>}
     */
    protected function buildAgeCategoriesSheet(Event $event): array
    {
        $event->loadMissing(['ageCategories']);

        $rows = [];
        foreach ($event->ageCategories as $index => $age) {
            $rows[] = [
                $index + 1,
                $age->name,
                $age->code ?: '-',
                $age->min_age ? "{$age->min_age} Tahun" : '-',
                $age->max_age ? "{$age->max_age} Tahun" : '-',
                $age->pivot->order ?? ($index + 1),
                $age->description ?: '-',
            ];
        }

        return [
            'sheet_name' => 'Kelompok Umur',
            'title' => 'MASTER KELOMPOK UMUR EVENT',
            'subtitle' => 'Event: '.$event->name.' | Total: '.count($rows),
            'headers' => ['No', 'Nama Kelompok Umur', 'Kode', 'Usia Minimal', 'Usia Maksimal', 'Urutan', 'Keterangan'],
            'rows' => $rows,
        ];
    }

    /**
     * Sheet 8: Lapangan / Court
     *
     * @return array{sheet_name: string, title: string, subtitle: string, headers: list<string>, rows: list<list<int|float|string|null>>}
     */
    protected function buildCourtsSheet(Event $event): array
    {
        $event->loadMissing(['courts']);

        $rows = [];
        foreach ($event->courts as $index => $court) {
            $rows[] = [
                $index + 1,
                $court->name,
                $court->code ?: '-',
                $court->order ?: ($index + 1),
                $court->is_active ? 'Aktif' : 'Nonaktif',
                $court->description ?: '-',
            ];
        }

        return [
            'sheet_name' => 'Lapangan (Court)',
            'title' => 'MASTER ARENA / GELANGGANG (COURT)',
            'subtitle' => 'Event: '.$event->name.' | Total Court: '.count($rows),
            'headers' => ['No', 'Nama Court', 'Kode', 'Urutan', 'Status', 'Keterangan'],
            'rows' => $rows,
        ];
    }

    /**
     * Sheet 9: Nomer Pertandingan
     *
     * @return array{sheet_name: string, title: string, subtitle: string, headers: list<string>, rows: list<list<int|float|string|null>>}
     */
    protected function buildMatchCategoriesSheet(Event $event): array
    {
        $event->loadMissing(['matchCategories.ageCategory', 'matchCategories.weightClass']);

        $rows = [];
        foreach ($event->matchCategories as $index => $mc) {
            $gender = match (strtolower((string) $mc->gender)) {
                'male' => 'Putra',
                'female' => 'Putri',
                'mixed' => 'Campuran',
                default => $mc->gender ?: '-',
            };

            $rows[] = [
                $index + 1,
                $mc->name,
                strtoupper((string) $mc->type),
                $gender,
                $mc->ageCategory?->name ?? '-',
                $mc->weightClass?->name ?? '-',
                $mc->capacity ?: 'Tidak Terbatas',
                $mc->order ?: ($index + 1),
                $mc->is_active ? 'Aktif' : 'Nonaktif',
            ];
        }

        return [
            'sheet_name' => 'Nomer Pertandingan',
            'title' => 'MASTER NOMOR PERTANDINGAN',
            'subtitle' => 'Event: '.$event->name.' | Total Nomor: '.count($rows),
            'headers' => [
                'No',
                'Nama Nomor Pertandingan',
                'Jenis Tanding',
                'Gender',
                'Kelompok Umur',
                'Tingkatan Kyu/Dan',
                'Kapasitas Peserta',
                'Urutan',
                'Status',
            ],
            'rows' => $rows,
        ];
    }

    /**
     * Sheet 10: Sesi & Rundown Pertandingan
     *
     * @return array{sheet_name: string, title: string, subtitle: string, headers: list<string>, rows: list<list<int|float|string|null>>}
     */
    protected function buildRundownsSheet(Event $event): array
    {
        $rundowns = Rundown::query()
            ->whereBelongsTo($event)
            ->with(['court:id,name', 'matchCategory:id,name'])
            ->orderBy('day')
            ->orderBy('start_time')
            ->get();

        $rows = [];
        foreach ($rundowns as $index => $rd) {
            $timeRange = ($rd->start_time ?: '-').' s/d '.($rd->end_time ?: '-');

            $rows[] = [
                $index + 1,
                $rd->day ? 'Hari ke-'.$rd->day : '-',
                $rd->name ?: 'Sesi Pertandingan',
                $timeRange,
                $rd->court?->name ?? 'Semua Court',
                $rd->matchCategory?->name ?? 'Seluruh Nomor',
                $rd->description ?: '-',
                ucfirst((string) ($rd->status ?: 'Tersedia')),
            ];
        }

        return [
            'sheet_name' => 'Sesi & Rundown',
            'title' => 'SESI DAN RUNDOWN JADWAL PERTANDINGAN',
            'subtitle' => 'Event: '.$event->name.' | Total Sesi Rundown: '.count($rows),
            'headers' => [
                'No',
                'Hari',
                'Nama Sesi / Kegiatan',
                'Waktu Pelaksanaan',
                'Gelanggang (Court)',
                'Nomor Pertandingan',
                'Keterangan',
                'Status',
            ],
            'rows' => $rows,
        ];
    }

    /**
     * Sheet 11: Panitera & Koordinator Lapangan
     *
     * @return array{sheet_name: string, title: string, subtitle: string, headers: list<string>, rows: list<list<int|float|string|null>>}
     */
    protected function buildClerksAndCoordinatorsSheet(Event $event): array
    {
        $event->loadMissing(['clerks', 'fieldCoordinators']);

        $rows = [];
        $counter = 1;

        // Panitera
        foreach ($event->clerks as $clerk) {
            $rows[] = [
                $counter++,
                $clerk->name,
                'Panitera Meja',
                $clerk->pivot->role ?: 'Panitera Meja',
                $clerk->employee_number ?: '-',
                $clerk->certification ?: '-',
                $clerk->region ?: '-',
                $clerk->notes ?: '-',
            ];
        }

        // Koordinator Lapangan
        foreach ($event->fieldCoordinators as $fc) {
            $rows[] = [
                $counter++,
                $fc->name,
                'Koordinator Lapangan',
                $fc->pivot->assignment_area ?: 'Korlap',
                $fc->coordinator_number ?: '-',
                'Pengawas Tatami',
                $fc->region ?: '-',
                trim(($fc->phone ?: '').' '.($fc->notes ?: '-')),
            ];
        }

        return [
            'sheet_name' => 'Panitera & Korlap',
            'title' => 'PANITERA MEJA & KOORDINATOR LAPANGAN',
            'subtitle' => 'Event: '.$event->name.' | Total Petugas: '.count($rows),
            'headers' => [
                'No',
                'Nama Petugas',
                'Kategori',
                'Peran / Tugas',
                'Nomor Pegawai / ID',
                'Sertifikasi / Bidang',
                'Asal Wilayah',
                'Kontak / Keterangan',
            ],
            'rows' => $rows,
        ];
    }

    /**
     * Sheet 12: Informasi Event
     *
     * @return array{sheet_name: string, title: string, subtitle: string, headers: list<string>, rows: list<list<int|float|string|null>>}
     */
    protected function buildInfoSheet(Event $event): array
    {
        $rows = [
            [1, 'Nama Kejuaraan / Event', $event->name],
            [2, 'Edisi Kejuaraan', $event->edition ?: '-'],
            [3, 'Kota Penyelenggara', $event->city ?: '-'],
            [4, 'Lokasi / Venue', $event->venue ?: '-'],
            [5, 'Tanggal Mulai', $event->start_date ? $event->start_date->translatedFormat('d F Y') : '-'],
            [6, 'Tanggal Selesai', $event->end_date ? $event->end_date->translatedFormat('d F Y') : '-'],
            [7, 'Status Kejuaraan', $event->is_active ? 'Aktif Berlangsung' : 'Arsip / Tidak Aktif'],
            [8, 'Penyelenggara / Perkemi', 'Pengurus Besar / Pengprov Persaudaraan Shorinji Kempo Indonesia'],
            [9, 'Tanggal Generate Laporan', now()->translatedFormat('d F Y, H:i:s').' WIB'],
        ];

        return [
            'sheet_name' => 'Informasi Event',
            'title' => 'INFORMASI KEJUARAAN & METADATA RESMI',
            'subtitle' => 'Dokumen ini dibuat otomatis oleh Sistem Smart Perkemi',
            'headers' => ['No', 'Parameter / Informasi', 'Detail Informasi'],
            'rows' => $rows,
        ];
    }

    /**
     * @param  array{athlete_label?: string, contingent?: string}|null  $champion
     */
    protected function formatChampion(?array $champion): string
    {
        if (! $champion || empty($champion['athlete_label']) || $champion['athlete_label'] === '-') {
            return '-';
        }

        $label = $champion['athlete_label'];
        if (! empty($champion['contingent']) && $champion['contingent'] !== '-') {
            $label .= ' ('.$champion['contingent'].')';
        }

        return $label;
    }
}
