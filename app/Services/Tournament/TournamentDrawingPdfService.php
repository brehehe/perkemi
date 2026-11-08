<?php

namespace App\Services\Tournament;

use App\Models\Event;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use Illuminate\Support\Collection;

class TournamentDrawingPdfService
{
    /**
     * Build the print-ready drawing dataset for one event.
     *
     * @return Collection<int, array{
     *     category_id: string,
     *     category_name: string,
     *     category_type: string,
     *     format: string,
     *     format_label: string,
     *     status: string,
     *     participant_count: int,
     *     contingent_count: int,
     *     rounds: Collection<string, Collection<int, array<string, mixed>>>,
     *     matches: Collection<int, array<string, mixed>>
     * }>
     */
    public function build(Event $event, ?string $categoryId = null): Collection
    {
        $query = $event->tournamentDrawings()
            ->whereIn('status', ['generated', 'published', 'in_progress', 'completed'])
            ->whereHas('matchCategory', fn ($categoryQuery) => $categoryQuery->where('is_active', true))
            ->with([
                'matchCategory:id,name,type,order',
                'matches.court:id,name',
                'matches.rundown:id,name',
                'matches.redEntry.athlete.contingent:id,name',
                'matches.blueEntry.athlete.contingent:id,name',
                'matches.participantEntry.athlete.contingent:id,name',
            ]);

        if ($categoryId !== null) {
            $query->where('event_match_category_id', $categoryId);
        }

        return $query->get()
            ->sortBy(fn (TournamentDrawing $drawing): array => [
                $drawing->matchCategory?->type ?? '',
                $drawing->matchCategory?->order ?? PHP_INT_MAX,
                $drawing->matchCategory?->name ?? '',
            ])
            ->map(function (TournamentDrawing $drawing): array {
                $matches = $drawing->matches
                    ->map(fn (TournamentMatch $match): array => $this->serializeMatch($match))
                    ->values();

                return [
                    'category_id' => $drawing->event_match_category_id,
                    'category_name' => $drawing->matchCategory?->name ?? 'Nomor Pertandingan',
                    'category_type' => $drawing->matchCategory?->type ?? 'randori',
                    'format' => $drawing->bracket_type,
                    'format_label' => $this->formatLabel($drawing->bracket_type),
                    'status' => $drawing->status,
                    'participant_count' => (int) $drawing->participant_count,
                    'contingent_count' => (int) $drawing->contingent_count,
                    'rounds' => $matches->groupBy(fn (array $match): string => $match['round_label']),
                    'matches' => $matches,
                ];
            })
            ->values();
    }

    /** @return array<string, mixed> */
    private function serializeMatch(TournamentMatch $match): array
    {
        $metadata = $match->metadata ?? [];

        return [
            'id' => $match->id,
            'sequence' => $match->match_sequence,
            'position' => $match->bracket_position,
            'phase' => $match->phase,
            'round_label' => $match->round_label ?: 'Penyisihan',
            'pool' => $match->pool,
            'red_label' => $match->red_label ?: 'Menunggu hasil',
            'blue_label' => $match->blue_label ?: 'Menunggu hasil',
            'red_contingent' => $metadata['red']['contingent_name'] ?? $metadata['red']['city'] ?? $match->redEntry?->athlete?->contingent?->name,
            'blue_contingent' => $metadata['blue']['contingent_name'] ?? $metadata['blue']['city'] ?? $match->blueEntry?->athlete?->contingent?->name,
            'participant_label' => $match->participant_label ?: $match->participantEntry?->athlete?->name,
            'participant_contingent' => $metadata['contingent_name'] ?? $metadata['city'] ?? $match->participantEntry?->athlete?->contingent?->name,
            'members' => $metadata['members'] ?? [],
            'is_bye' => (bool) $match->is_bye,
            'status' => $match->status,
            'court' => $match->court?->name,
            'session' => $match->rundown?->name,
            'scheduled_at' => $match->scheduled_start_at?->translatedFormat('d M Y, H:i'),
        ];
    }

    private function formatLabel(string $format): string
    {
        return match ($format) {
            'round_robin' => 'Setengah Kompetisi (Round Robin)',
            'double_elimination' => 'Sistem Gugur Ganda',
            'single_elimination' => 'Sistem Gugur Tunggal',
            'embu_direct_final' => 'Embu Satu Pool + Final',
            'embu_2_pools' => 'Embu 2 Pool',
            'embu_3_pools' => 'Embu 3 Pool',
            'embu_4_pools' => 'Embu 4 Pool',
            default => str($format)->replace('_', ' ')->title()->toString(),
        };
    }
}
