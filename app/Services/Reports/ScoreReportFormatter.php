<?php

namespace App\Services\Reports;

use App\Enums\RefereeCourtRole;
use App\Models\EmbuJudgeScore;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\RandoriScore;
use App\Services\EmbuParticipantDetails;
use App\Services\Panitera\EmbuPenaltyCatalog;
use Illuminate\Support\Str;

class ScoreReportFormatter
{
    /** @var array<string, array<string, mixed>> */
    private array $participantCache = [];

    /** @var array<string, string> */
    public const EmbuAspectLabels = [
        'goho_attack' => 'GOHO 1 · Serangan (Kougeki)',
        'goho_defense' => 'GOHO 2 · Bertahan (Bougyo)',
        'goho_counter' => 'GOHO 3 · Serangan Balasan & 5 Unsur Serangan',
        'juho_escape' => 'JUHO 1 · Shuha & Nukiwaza',
        'juho_lock_throw' => 'JUHO 2 · Gyakuwaza & Nagewaza',
        'juho_ground' => 'JUHO 3 · Katamewaza',
        'expression_sequence' => 'EKSPRESI 1 · Rangkaian, Irama & Harmoni',
        'expression_stance' => 'EKSPRESI 2 · Tai Gamae, Kuda-kuda & Keindahan Gerak',
        'expression_spirit' => 'EKSPRESI 3 · Semangat & Disiplin',
        'expression_breath_zanshin' => 'EKSPRESI 4 · Nafas, Pandangan Mata & Zanshin',
    ];

    /** @var array<string, string> */
    public const RandoriSignatureLabels = [
        'arbitrase' => 'Arbitrase',
        'field_coordinator' => 'Koordinator Lapangan',
        'referee' => 'Wasit Lapangan',
        'clerk' => 'Panitera',
        'red_manager' => 'Manajer Kontingen Merah',
        'white_manager' => 'Manajer Kontingen Putih',
    ];

    public function __construct(
        private EmbuParticipantDetails $participantDetails,
        private EmbuPenaltyCatalog $penaltyCatalog,
    ) {}

    /** @return array<string, mixed> */
    public function embu(EmbuJudgeScore $score, Event $event): array
    {
        $match = $score->tournamentMatch;
        $participant = $match
            ? ($this->participantCache[$match->id] ??= $this->participantDetails->forMatch($event, $match))
            : ['kind' => 'Tim Embu', 'contingent_name' => null, 'athletes' => [], 'techniques' => []];

        return [
            'id' => $score->id,
            'type' => 'embu',
            'referee_name' => $score->referee?->name ?? 'Wasit tidak tersedia',
            'referee_license' => $score->referee?->certification_level ?: $score->referee?->license_number,
            'court' => $score->court?->name,
            'category_name' => $match?->matchCategory?->name,
            'sequence' => $match?->match_sequence,
            'round_label' => $match?->round_label,
            'pool' => $match?->pool,
            'participant' => $match?->participant_label,
            'participant_details' => $participant,
            'scheduled_at' => $match?->scheduled_start_at?->translatedFormat('d M Y, H:i'),
            'tiebreak_round' => $score->tiebreak_round,
            'judge_number' => $score->judge_number,
            'role_label' => RefereeCourtRole::tryFrom($score->role)?->label() ?? Str::headline($score->role),
            'aspect_scores' => $score->aspect_scores ?? [],
            'aspect_labels' => self::EmbuAspectLabels,
            'completed_items' => $score->completed_items,
            'technique_subtotal' => (float) $score->technique_subtotal,
            'expression_subtotal' => (float) $score->expression_subtotal,
            'total_score' => (float) $score->total_score,
            'violation_penalty' => (float) $score->violation_penalty,
            'penalty_summaries' => $this->penaltyCatalog->summaries(
                $score->violation_penalties ?? [],
                (string) $match?->matchCategory?->name,
            ),
            'status' => $score->status,
            'status_label' => $score->status === 'submitted' ? 'Sudah dikirim' : 'Draft',
            'is_signed' => filled($score->signature),
            'signature' => $score->signature,
            'notes' => $score->notes,
            'submitted_at' => $score->submitted_at?->translatedFormat('d M Y, H:i:s'),
            'updated_at' => $score->updated_at?->translatedFormat('d M Y, H:i:s'),
            'print_url' => route('admin.arbitrase.scoring.print.embu', [
                'embuJudgeScore' => $score->id,
                'event_id' => $event->id,
            ], false),
        ];
    }

    /** @return array<string, mixed> */
    public function embuResult(EmbuScore $score, Event $event): array
    {
        $match = $score->tournamentMatch;
        $participant = $match
            ? ($this->participantCache[$match->id] ??= $this->participantDetails->forMatch($event, $match))
            : ['kind' => 'Tim Embu', 'contingent_name' => null, 'athletes' => [], 'techniques' => []];
        $judgeScores = $match?->relationLoaded('embuJudgeScores')
            ? $match->embuJudgeScores
            : EmbuJudgeScore::query()
                ->whereBelongsTo($event)
                ->where('tournament_match_id', $match?->id)
                ->with(['referee:id,name,license_number,certification_level', 'court:id,name'])
                ->orderBy('judge_number')
                ->get();
        $judges = collect($judgeScores)
            ->where('tiebreak_round', $score->tiebreak_round)
            ->sortBy('judge_number')
            ->map(function (EmbuJudgeScore $judgeScore) use ($event, $match): array {
                if ($match) {
                    $judgeScore->setRelation('tournamentMatch', $match);
                }

                return $this->embu($judgeScore, $event);
            })
            ->values()
            ->all();

        return [
            'id' => $score->id,
            'category_name' => $match?->matchCategory?->name,
            'sequence' => $match?->match_sequence,
            'round_label' => $match?->round_label,
            'pool' => $match?->pool,
            'court' => $match?->court?->name,
            'scheduled_at' => $match?->scheduled_start_at?->translatedFormat('d M Y, H:i'),
            'participant' => $match?->participant_label,
            'participant_details' => $participant,
            'judge_scores' => array_values($score->judge_scores ?? []),
            'duration' => $score->duration_seconds === null
                ? '-'
                : sprintf('%02d:%02d', intdiv($score->duration_seconds, 60), $score->duration_seconds % 60),
            'duration_seconds' => $score->duration_seconds,
            'middle_score' => (float) $score->middle_score,
            'time_penalty' => (float) $score->time_penalty,
            'violation_penalty' => (float) $score->violation_penalty,
            'total_penalty' => $score->effectiveTotalPenalty(),
            'penalty_summaries' => $this->penaltyCatalog->summaries(
                $score->violation_penalties ?? [],
                (string) $match?->matchCategory?->name,
            ),
            'is_disqualified' => (bool) $score->is_disqualified,
            'disqualification_reason' => $score->disqualification_reason,
            'final_score' => (float) $score->final_score,
            'status' => $score->status,
            'status_label' => $score->status === 'verified' ? 'Verified' : Str::headline($score->status),
            'verified_by' => $score->verifier?->name,
            'verified_at' => $score->verified_at?->translatedFormat('d M Y, H:i:s'),
            'notes' => $score->notes,
            'judges' => $judges,
        ];
    }

    /** @return array<string, mixed> */
    public function randori(RandoriScore $score, Event $event): array
    {
        $match = $score->tournamentMatch;
        $signatures = collect(self::RandoriSignatureLabels)
            ->map(fn (string $label, string $key): array => [
                'key' => $key,
                'label' => $label,
                'name' => data_get($score->signature_names, $key),
                'signature' => data_get($score->signatures, $key),
            ])
            ->values()
            ->all();
        $signedCount = collect($signatures)
            ->filter(fn (array $signature): bool => filled($signature['signature']))
            ->count();
        $isLocked = filled($score->locked_at);

        return [
            'id' => $score->id,
            'type' => 'randori',
            'court' => $match?->court?->name,
            'category_name' => $match?->matchCategory?->name,
            'sequence' => $match?->match_sequence,
            'round_label' => $match?->round_label,
            'pool' => $match?->pool,
            'scheduled_at' => $match?->scheduled_start_at?->translatedFormat('d M Y, H:i'),
            'aka_label' => $match?->red_label ?: 'AKA / Merah',
            'shiro_label' => $match?->blue_label ?: 'SHIRO / Putih',
            'aka_breakdown' => $score->aka_breakdown ?? [],
            'shiro_breakdown' => $score->shiro_breakdown ?? [],
            'aka_total' => (int) $score->aka_total,
            'shiro_total' => (int) $score->shiro_total,
            'winner_corner' => $score->winner_corner,
            'winner_label' => match ($score->winner_corner) {
                'aka' => $match?->red_label ?: 'AKA / Merah',
                'shiro' => $match?->blue_label ?: 'SHIRO / Putih',
                default => 'Belum ditentukan',
            },
            'status' => $isLocked ? 'locked' : $score->status,
            'status_label' => $isLocked ? 'Nilai dikunci' : ($score->status === 'verified' ? 'Sudah disahkan' : 'Draft'),
            'signed_count' => $signedCount,
            'is_signed' => $signedCount === count(RandoriScore::SignatureKeys),
            'signatures' => $signatures,
            'notes' => $score->notes,
            'submitted_by' => $score->submitter?->name,
            'verified_by' => $score->verifier?->name,
            'verified_at' => $score->verified_at?->translatedFormat('d M Y, H:i:s'),
            'locked_at' => $score->locked_at?->translatedFormat('d M Y, H:i:s'),
            'updated_at' => $score->updated_at?->translatedFormat('d M Y, H:i:s'),
            'print_url' => route('admin.arbitrase.scoring.print.randori', [
                'randoriScore' => $score->id,
                'event_id' => $event->id,
            ], false),
        ];
    }
}
