<?php

namespace App\Services;

use App\Models\AthleteMatchCategoryEntry;
use App\Models\EmbuTeamTechnique;
use App\Models\Event;
use App\Models\TournamentMatch;

class EmbuParticipantDetails
{
    /**
     * @return array{
     *     kind: string,
     *     team_number: int|null,
     *     contingent_name: string|null,
     *     athletes: list<array{id: string|null, name: string}>,
     *     techniques: list<array{id: string, name: string, order: int}>
     * }
     */
    public function forMatch(Event $event, TournamentMatch $match): array
    {
        $emptyDetails = [
            'kind' => 'Tim Embu',
            'team_number' => null,
            'contingent_name' => null,
            'athletes' => [],
            'techniques' => [],
        ];

        if ($match->event_id !== $event->id) {
            return $emptyDetails;
        }

        $match->loadMissing('matchCategory:id,type');

        if ($match->matchCategory?->type !== 'embu') {
            return $emptyDetails;
        }

        $metadata = $match->metadata ?? [];
        $participantEntry = $match->participant_entry_id
            ? AthleteMatchCategoryEntry::query()
                ->whereBelongsTo($event)
                ->whereKey($match->participant_entry_id)
                ->with('athlete.contingent:id,name')
                ->first()
            : null;

        $sourceCategoryId = $participantEntry?->event_match_category_id
            ?? data_get($metadata, 'event_match_category_id')
            ?? $match->event_match_category_id;
        $teamNumber = (int) ($participantEntry?->team_number ?? data_get($metadata, 'team_number', 1));
        $contingentId = $participantEntry?->athlete?->contingent_id ?? data_get($metadata, 'contingent_id');
        $metadataAthleteIds = collect(data_get($metadata, 'athlete_ids', []))->filter()->values();

        $athletes = AthleteMatchCategoryEntry::query()
            ->whereBelongsTo($event)
            ->where('event_match_category_id', $sourceCategoryId)
            ->where('team_number', $teamNumber)
            ->when($metadataAthleteIds->isNotEmpty(), fn ($query) => $query->whereIn('athlete_id', $metadataAthleteIds))
            ->when($metadataAthleteIds->isEmpty() && $contingentId, fn ($query) => $query->whereHas(
                'athlete',
                fn ($athleteQuery) => $athleteQuery->where('contingent_id', $contingentId),
            ))
            ->with('athlete:id,contingent_id,name')
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(fn (AthleteMatchCategoryEntry $entry): array => [
                'id' => $entry->athlete?->id,
                'name' => $entry->athlete?->name ?? 'Nama atlet belum dicatat',
            ])
            ->values();

        if ($athletes->isEmpty()) {
            $athletes = collect(data_get($metadata, 'members', []))
                ->filter()
                ->map(fn (string $name): array => ['id' => null, 'name' => $name])
                ->values();
        }

        $techniques = $contingentId
            ? EmbuTeamTechnique::query()
                ->where('event_id', $event->id)
                ->where('contingent_id', $contingentId)
                ->where('event_match_category_id', $sourceCategoryId)
                ->where('team_number', $teamNumber)
                ->with('technique:id,name')
                ->orderBy('order')
                ->orderBy('id')
                ->get()
                ->map(fn (EmbuTeamTechnique $teamTechnique): array => [
                    'id' => $teamTechnique->technique_id,
                    'name' => $teamTechnique->technique?->name ?? 'Teknik tidak tersedia',
                    'order' => $teamTechnique->order,
                ])
                ->values()
            : collect();

        $kind = match ($athletes->count()) {
            1 => 'Perorangan',
            2 => 'Pasangan',
            4 => 'Beregu',
            default => 'Tim Embu',
        };

        return [
            'kind' => $kind,
            'team_number' => $teamNumber,
            'contingent_name' => $participantEntry?->athlete?->contingent?->name
                ?? data_get($metadata, 'contingent_name'),
            'athletes' => $athletes->all(),
            'techniques' => $techniques->all(),
        ];
    }
}
