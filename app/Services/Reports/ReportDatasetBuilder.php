<?php

namespace App\Services\Reports;

use App\Models\EmbuJudgeScore;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\RandoriScore;
use App\Models\TournamentResult;
use Illuminate\Support\Collection;

class ReportDatasetBuilder
{
    /** @var array<string, array{title: string, description: string, icon: string}> */
    public const Reports = [
        'champions' => ['title' => 'Hasil Juara', 'description' => 'Susunan juara resmi per nomor pertandingan dan kontingen.', 'icon' => 'fa-trophy'],
        'all-scores' => ['title' => 'Skor Menyeluruh', 'description' => 'Gabungan hasil akhir seluruh partai Embu dan Randori.', 'icon' => 'fa-chart-line'],
        'embu-recap' => ['title' => 'Rekap Embu', 'description' => 'Nilai akhir, durasi, denda, dan skor tengah setiap partai Embu.', 'icon' => 'fa-ranking-star'],
        'randori-recap' => ['title' => 'Rekap Randori', 'description' => 'Hasil AKA-SHIRO, pemenang, dan status pengesahan Randori.', 'icon' => 'fa-hand-fist'],
        'referee-scores' => ['title' => 'Penilaian Wasit', 'description' => 'Rincian nilai 10 aspek Embu yang dikirim setiap Wasit.', 'icon' => 'fa-user-shield'],
        'referee-analysis' => ['title' => 'Analisis Per Wasit', 'description' => 'Jumlah penilaian, rata-rata, rentang nilai, dan kelengkapan tanda tangan.', 'icon' => 'fa-chart-column'],
        'embu-summary' => ['title' => 'Rekapitulasi Embu', 'description' => 'Matriks lima nilai Juri, nilai tengah, denda waktu, dan nilai akhir.', 'icon' => 'fa-table-list'],
        'scoring-summary' => ['title' => 'Rekap Penilaian', 'description' => 'Ringkasan kelengkapan dan status seluruh sumber penilaian.', 'icon' => 'fa-clipboard-check'],
    ];

    public function __construct(private ScoreReportFormatter $scoreFormatter) {}

    /** @return array<string, mixed> */
    public function build(Event $event, string $report): array
    {
        $report = array_key_exists($report, self::Reports) ? $report : 'champions';

        return match ($report) {
            'all-scores' => $this->allScores($event, $report),
            'embu-recap' => $this->embuRecap($event, $report),
            'randori-recap' => $this->randoriRecap($event, $report),
            'referee-scores' => $this->refereeScores($event, $report),
            'referee-analysis' => $this->refereeAnalysis($event, $report),
            'embu-summary' => $this->embuSummary($event, $report),
            'scoring-summary' => $this->scoringSummary($event, $report),
            default => $this->champions($event, $report),
        };
    }

    /** @return array<string, mixed> */
    private function champions(Event $event, string $report): array
    {
        $rows = TournamentResult::query()->whereBelongsTo($event)
            ->with(['matchCategory:id,name,type', 'contingent:id,name,city', 'athlete:id,name,kyu_dan'])
            ->orderBy('event_match_category_id')->orderBy('rank')->get()
            ->map(fn (TournamentResult $result): array => [
                'category' => $result->matchCategory?->name ?? $result->match_category ?? '-',
                'type' => ucfirst((string) ($result->matchCategory?->type ?? '-')),
                'rank' => $this->rankLabel((int) $result->rank->value),
                'participant' => $result->athlete?->name ?? $result->participant_key ?? '-',
                'contingent' => $result->contingent?->name ?? $result->contingent_name,
                'classification' => $result->is_exhibition ? 'Ekshibisi' : 'Non-ekshibisi',
                'confirmed_at' => $result->updated_at?->translatedFormat('d M Y, H:i'),
            ]);

        return $this->dataset($report, [
            ['key' => 'category', 'label' => 'Nomor Pertandingan'], ['key' => 'type', 'label' => 'Jenis'], ['key' => 'rank', 'label' => 'Posisi Juara'], ['key' => 'participant', 'label' => 'Atlet / Tim'], ['key' => 'contingent', 'label' => 'Kontingen'], ['key' => 'classification', 'label' => 'Klasifikasi'], ['key' => 'confirmed_at', 'label' => 'Dikonfirmasi'],
        ], $rows, [['label' => 'Total posisi juara', 'value' => $rows->count()], ['label' => 'Nomor pertandingan', 'value' => $rows->pluck('category')->unique()->count()], ['label' => 'Kontingen peraih juara', 'value' => $rows->pluck('contingent')->filter()->unique()->count()]]);
    }

    /** @return array<string, mixed> */
    private function allScores(Event $event, string $report): array
    {
        $embu = EmbuScore::query()->whereBelongsTo($event)->where('status', 'verified')->with($this->embuResultRelations())->get()->map(fn (EmbuScore $score): array => [
            'type' => 'Embu', 'category' => $score->tournamentMatch?->matchCategory?->name, 'match' => $this->matchLabel($score->tournamentMatch), 'participant' => $score->tournamentMatch?->participant_label, 'score' => (float) $score->final_score, 'winner' => '-', 'status' => 'Verified', 'updated_at' => $score->updated_at?->translatedFormat('d M Y, H:i:s'), 'print_url' => $this->embuPrintUrl($event, $score), '_sort' => $score->updated_at?->timestamp,
        ]);
        $randori = RandoriScore::query()->whereBelongsTo($event)->where('status', 'verified')->with($this->randoriRelations())->get()->map(function (RandoriScore $score) use ($event): array {
            $item = $this->scoreFormatter->randori($score, $event);

            return ['type' => 'Randori', 'category' => $item['category_name'], 'match' => 'Partai #'.$item['sequence'].' · '.$item['round_label'], 'participant' => $item['aka_label'].' vs '.$item['shiro_label'], 'score' => $item['aka_total'].' - '.$item['shiro_total'], 'winner' => $item['winner_label'], 'status' => 'Verified', 'updated_at' => $item['updated_at'], 'print_url' => $this->randoriPrintUrl($event, $score), '_sort' => $score->updated_at?->timestamp];
        });
        $rows = $embu->concat($randori)->sortByDesc('_sort')->map(fn (array $row): array => collect($row)->except('_sort')->all())->values();

        return $this->dataset($report, [['key' => 'type', 'label' => 'Jenis'], ['key' => 'category', 'label' => 'Nomor Pertandingan'], ['key' => 'match', 'label' => 'Partai'], ['key' => 'participant', 'label' => 'Peserta / Lawan'], ['key' => 'score', 'label' => 'Nilai'], ['key' => 'winner', 'label' => 'Pemenang'], ['key' => 'status', 'label' => 'Status'], ['key' => 'updated_at', 'label' => 'Diperbarui']], $rows, [['label' => 'Total hasil', 'value' => $rows->count()], ['label' => 'Hasil Embu', 'value' => $embu->count()], ['label' => 'Hasil Randori', 'value' => $randori->count()]]);
    }

    /** @return array<string, mixed> */
    private function embuRecap(Event $event, string $report): array
    {
        $rows = EmbuScore::query()->whereBelongsTo($event)->with($this->embuResultRelations())->latest('updated_at')->get()->map(fn (EmbuScore $score): array => [
            'category' => $score->tournamentMatch?->matchCategory?->name, 'match' => $this->matchLabel($score->tournamentMatch), 'participant' => $score->tournamentMatch?->participant_label, 'court' => $score->tournamentMatch?->court?->name, 'duration' => $this->durationLabel($score->duration_seconds), 'middle_score' => (float) $score->middle_score, 'penalty' => $score->effectiveTotalPenalty(), 'final_score' => (float) $score->final_score, 'status' => $score->is_disqualified ? 'Diskualifikasi' : $this->scoreStatusLabel($score->status), 'print_url' => $this->embuPrintUrl($event, $score),
        ]);

        return $this->dataset($report, [['key' => 'category', 'label' => 'Nomor Pertandingan'], ['key' => 'match', 'label' => 'Partai'], ['key' => 'participant', 'label' => 'Peserta'], ['key' => 'court', 'label' => 'Court'], ['key' => 'duration', 'label' => 'Durasi'], ['key' => 'middle_score', 'label' => 'Skor Tengah'], ['key' => 'penalty', 'label' => 'Total Denda'], ['key' => 'final_score', 'label' => 'Nilai Akhir'], ['key' => 'status', 'label' => 'Status']], $rows, [['label' => 'Partai tercatat', 'value' => $rows->count()], ['label' => 'Sudah diverifikasi', 'value' => $rows->where('status', 'Verified')->count()], ['label' => 'Kena denda', 'value' => $rows->where('penalty', '>', 0)->count()]]);
    }

    /** @return array<string, mixed> */
    private function randoriRecap(Event $event, string $report): array
    {
        $rows = RandoriScore::query()->whereBelongsTo($event)->with($this->randoriRelations())->latest('updated_at')->get()->map(function (RandoriScore $score) use ($event): array {
            $item = $this->scoreFormatter->randori($score, $event);

            return ['category' => $item['category_name'], 'match' => 'Partai #'.$item['sequence'].' · '.$item['round_label'], 'court' => $item['court'], 'aka' => $item['aka_label'], 'aka_score' => $item['aka_total'], 'shiro' => $item['shiro_label'], 'shiro_score' => $item['shiro_total'], 'winner' => $item['winner_label'], 'signatures' => $item['signed_count'].'/6', 'status' => $this->scoreStatusLabel($score->status), 'print_url' => $this->randoriPrintUrl($event, $score)];
        });

        return $this->dataset($report, [['key' => 'category', 'label' => 'Nomor Pertandingan'], ['key' => 'match', 'label' => 'Partai'], ['key' => 'court', 'label' => 'Court'], ['key' => 'aka', 'label' => 'AKA / Merah'], ['key' => 'aka_score', 'label' => 'Nilai AKA'], ['key' => 'shiro', 'label' => 'SHIRO / Putih'], ['key' => 'shiro_score', 'label' => 'Nilai SHIRO'], ['key' => 'winner', 'label' => 'Pemenang'], ['key' => 'signatures', 'label' => 'TTD'], ['key' => 'status', 'label' => 'Status']], $rows, [['label' => 'Partai tercatat', 'value' => $rows->count()], ['label' => 'Disahkan', 'value' => $rows->where('status', 'Verified')->count()], ['label' => 'TTD lengkap', 'value' => $rows->where('signatures', '6/6')->count()]]);
    }

    /** @return array<string, mixed> */
    private function refereeScores(Event $event, string $report): array
    {
        $rows = EmbuJudgeScore::query()->whereBelongsTo($event)->with($this->embuJudgeRelations())->latest('updated_at')->get()->map(function (EmbuJudgeScore $score) use ($event): array {
            $item = $this->scoreFormatter->embu($score, $event);

            return ['category' => $item['category_name'], 'match' => 'Partai #'.$item['sequence'].' · '.$item['round_label'], 'participant' => $item['participant_details']['contingent_name'] ?: $item['participant'], 'athletes' => collect($item['participant_details']['athletes'])->pluck('name')->implode(', '), 'referee' => $item['referee_name'], 'position' => 'Juri '.$item['judge_number'].' · '.$item['role_label'], 'technique' => $item['technique_subtotal'], 'expression' => $item['expression_subtotal'], 'total' => $item['total_score'], 'signature' => $item['is_signed'] ? 'Tercatat' : 'Belum ada', 'status' => $item['status_label']];
        });

        return $this->dataset($report, [['key' => 'category', 'label' => 'Nomor Pertandingan'], ['key' => 'match', 'label' => 'Partai'], ['key' => 'participant', 'label' => 'Kontingen / Tim'], ['key' => 'athletes', 'label' => 'Atlet'], ['key' => 'referee', 'label' => 'Wasit'], ['key' => 'position', 'label' => 'Posisi'], ['key' => 'technique', 'label' => 'Teknik'], ['key' => 'expression', 'label' => 'Ekspresi'], ['key' => 'total', 'label' => 'Total'], ['key' => 'signature', 'label' => 'TTD'], ['key' => 'status', 'label' => 'Status']], $rows, [['label' => 'Total penilaian', 'value' => $rows->count()], ['label' => 'Wasit menilai', 'value' => $rows->pluck('referee')->unique()->count()], ['label' => 'TTD tercatat', 'value' => $rows->where('signature', 'Tercatat')->count()]]);
    }

    /** @return array<string, mixed> */
    private function refereeAnalysis(Event $event, string $report): array
    {
        $scores = EmbuJudgeScore::query()->whereBelongsTo($event)->with('referee:id,name,certification_level,region')->get();
        $rows = $scores->groupBy('referee_id')->map(function (Collection $refereeScores): array {
            $referee = $refereeScores->first()?->referee;
            $submitted = $refereeScores->where('status', 'submitted');

            return ['referee' => $referee?->name ?? 'Wasit tidak tersedia', 'certification' => $referee?->certification_level ?: '-', 'region' => $referee?->region ?: '-', 'total' => $refereeScores->count(), 'submitted' => $submitted->count(), 'drafts' => $refereeScores->count() - $submitted->count(), 'average' => round((float) $submitted->avg('total_score'), 2), 'minimum' => (float) ($submitted->min('total_score') ?? 0), 'maximum' => (float) ($submitted->max('total_score') ?? 0), 'signed' => $refereeScores->filter(fn (EmbuJudgeScore $score): bool => filled($score->signature))->count()];
        })->sortBy('referee')->values();

        return $this->dataset($report, [['key' => 'referee', 'label' => 'Wasit'], ['key' => 'certification', 'label' => 'Sertifikasi'], ['key' => 'region', 'label' => 'Daerah'], ['key' => 'total', 'label' => 'Total Nilai'], ['key' => 'submitted', 'label' => 'Terkirim'], ['key' => 'drafts', 'label' => 'Draft'], ['key' => 'average', 'label' => 'Rata-rata'], ['key' => 'minimum', 'label' => 'Minimum'], ['key' => 'maximum', 'label' => 'Maksimum'], ['key' => 'signed', 'label' => 'TTD']], $rows, [['label' => 'Wasit dianalisis', 'value' => $rows->count()], ['label' => 'Nilai terkirim', 'value' => $scores->where('status', 'submitted')->count()], ['label' => 'Rata-rata keseluruhan', 'value' => round((float) $scores->where('status', 'submitted')->avg('total_score'), 2)]]);
    }

    /** @return array<string, mixed> */
    private function embuSummary(Event $event, string $report): array
    {
        $rows = EmbuScore::query()->whereBelongsTo($event)->with($this->embuResultRelations())->latest('updated_at')->get()->map(function (EmbuScore $score): array {
            $judges = array_values($score->judge_scores ?? []);

            return ['category' => $score->tournamentMatch?->matchCategory?->name, 'match' => $this->matchLabel($score->tournamentMatch), 'participant' => $score->tournamentMatch?->participant_label, 'j1' => $judges[0] ?? 0, 'j2' => $judges[1] ?? 0, 'j3' => $judges[2] ?? 0, 'j4' => $judges[3] ?? 0, 'j5' => $judges[4] ?? 0, 'middle' => (float) $score->middle_score, 'penalty' => $score->effectiveTotalPenalty(), 'final' => (float) $score->final_score];
        });

        return $this->dataset($report, [['key' => 'category', 'label' => 'Nomor Pertandingan'], ['key' => 'match', 'label' => 'Partai'], ['key' => 'participant', 'label' => 'Peserta'], ['key' => 'j1', 'label' => 'Juri 1'], ['key' => 'j2', 'label' => 'Juri 2'], ['key' => 'j3', 'label' => 'Juri 3'], ['key' => 'j4', 'label' => 'Juri 4'], ['key' => 'j5', 'label' => 'Juri 5'], ['key' => 'middle', 'label' => 'Skor Tengah'], ['key' => 'penalty', 'label' => 'Total Denda'], ['key' => 'final', 'label' => 'Nilai Akhir']], $rows, [['label' => 'Partai direkap', 'value' => $rows->count()], ['label' => 'Nilai lengkap 5 Juri', 'value' => $rows->filter(fn (array $row): bool => collect(['j1', 'j2', 'j3', 'j4', 'j5'])->every(fn (string $key): bool => (float) $row[$key] > 0))->count()], ['label' => 'Kena denda', 'value' => $rows->where('penalty', '>', 0)->count()]]);
    }

    /** @return array<string, mixed> */
    private function scoringSummary(Event $event, string $report): array
    {
        $judgeScores = EmbuJudgeScore::query()->whereBelongsTo($event)->get(['status', 'signature']);
        $embuScores = EmbuScore::query()->whereBelongsTo($event)->get(['status']);
        $randoriScores = RandoriScore::query()->whereBelongsTo($event)->get(['status', 'signatures', 'locked_at']);
        $rows = collect([
            ['source' => 'Penilaian Wasit Embu', 'total' => $judgeScores->count(), 'completed' => $judgeScores->where('status', 'submitted')->count(), 'drafts' => $judgeScores->where('status', '!=', 'submitted')->count(), 'signatures' => $judgeScores->filter(fn (EmbuJudgeScore $score): bool => filled($score->signature))->count(), 'notes' => 'Satu baris per Wasit/Juri'],
            ['source' => 'Hasil Akhir Embu', 'total' => $embuScores->count(), 'completed' => $embuScores->where('status', 'verified')->count(), 'drafts' => $embuScores->where('status', '!=', 'verified')->count(), 'signatures' => '-', 'notes' => 'Skor tengah dikurangi denda waktu dan pelanggaran'],
            ['source' => 'Hasil Randori', 'total' => $randoriScores->count(), 'completed' => $randoriScores->where('status', 'verified')->count(), 'drafts' => $randoriScores->where('status', '!=', 'verified')->count(), 'signatures' => $randoriScores->filter(fn (RandoriScore $score): bool => collect($score->signatures)->filter()->count() === 6)->count(), 'notes' => $randoriScores->whereNotNull('locked_at')->count().' nilai terkunci'],
        ]);

        return $this->dataset($report, [['key' => 'source', 'label' => 'Sumber Penilaian'], ['key' => 'total', 'label' => 'Total'], ['key' => 'completed', 'label' => 'Selesai'], ['key' => 'drafts', 'label' => 'Draft'], ['key' => 'signatures', 'label' => 'TTD Lengkap'], ['key' => 'notes', 'label' => 'Keterangan']], $rows, [['label' => 'Seluruh rekaman', 'value' => $rows->sum('total')], ['label' => 'Selesai / resmi', 'value' => $rows->sum('completed')], ['label' => 'Masih draft', 'value' => $rows->sum('drafts')]]);
    }

    /**
     * @param  list<array{key: string, label: string}>  $columns
     * @param  Collection<int, array<string, mixed>>  $rows
     * @param  list<array{label: string, value: mixed}>  $summary
     * @return array<string, mixed>
     */
    private function dataset(string $report, array $columns, Collection $rows, array $summary): array
    {
        return ['key' => $report, ...self::Reports[$report], 'columns' => $columns, 'rows' => $rows->values()->all(), 'summary' => $summary];
    }

    /** @return list<string> */
    private function embuResultRelations(): array
    {
        return ['tournamentMatch:id,event_id,event_match_category_id,event_court_id,round_label,pool,match_sequence,participant_label', 'tournamentMatch.matchCategory:id,name,type', 'tournamentMatch.court:id,name'];
    }

    /** @return list<string> */
    private function embuJudgeRelations(): array
    {
        return ['referee:id,name,license_number,certification_level', 'court:id,name', 'tournamentMatch:id,event_id,event_match_category_id,event_court_id,participant_entry_id,round_label,pool,match_sequence,participant_label,scheduled_start_at,metadata', 'tournamentMatch.matchCategory:id,name,type'];
    }

    /** @return list<string> */
    private function randoriRelations(): array
    {
        return ['submitter:id,name', 'verifier:id,name', 'tournamentMatch:id,event_id,event_match_category_id,event_court_id,round_label,pool,match_sequence,red_label,blue_label,scheduled_start_at,metadata', 'tournamentMatch.matchCategory:id,name,type', 'tournamentMatch.court:id,name'];
    }

    private function matchLabel(mixed $match): string
    {
        return $match ? 'Partai #'.$match->match_sequence.' · '.$match->round_label : '-';
    }

    private function durationLabel(?int $seconds): string
    {
        return $seconds === null ? '-' : sprintf('%02d:%02d', intdiv($seconds, 60), $seconds % 60);
    }

    private function rankLabel(int $rank): string
    {
        return match ($rank) {
            1 => 'Juara 1 · Emas',
            2 => 'Juara 2 · Perak',
            3, 4 => 'Juara 3 Bersama · Perunggu',
            default => 'Peringkat '.$rank,
        };
    }

    private function scoreStatusLabel(string $status): string
    {
        return $status === 'verified' ? 'Verified' : str($status)->headline()->toString();
    }

    private function embuPrintUrl(Event $event, EmbuScore $score): string
    {
        return route('admin.laporan.print.embu', [
            'embuScore' => $score->id,
            'event_id' => $event->id,
        ], false);
    }

    private function randoriPrintUrl(Event $event, RandoriScore $score): string
    {
        return route('admin.laporan.print.randori', [
            'randoriScore' => $score->id,
            'event_id' => $event->id,
        ], false);
    }
}
