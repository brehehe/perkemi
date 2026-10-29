<?php

namespace App\Services;

use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\PaymentMethod;
use App\Models\RandoriScore;
use App\Models\Referee;
use App\Models\Rundown;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\TournamentResult;
use Illuminate\Support\Collection;

class PublicEventPageService
{
    public function __construct(private ParticipantEligibilityService $eligibility) {}

    public function load(Event $event): Event
    {
        return $event->load([
            'ageCategories' => fn ($query) => $query->where('is_active', true)->orderBy('order'),
            'courts' => fn ($query) => $query->where('is_active', true)
                ->with([
                    'tournamentMatches' => fn ($mq) => $mq->where('is_bye', false)
                        ->whereIn('status', ['ready', 'in_progress'])
                        ->with([
                            'matchCategory:id,name,type',
                            'randoriScore',
                            'embuScores',
                        ])
                        ->orderByRaw("CASE WHEN status = 'in_progress' THEN 0 ELSE 1 END")
                        ->orderBy('match_sequence'),
                ])
                ->orderBy('order'),
            'matchCategories' => fn ($query) => $query->where('is_active', true)->orderBy('order'),
            'rundowns' => fn ($query) => $query->orderBy('date')->orderBy('order'),
            'paymentMethods' => fn ($query) => $query->where('is_active', true)->orderBy('order'),
            'referees' => fn ($query) => $query->where('referees.is_active', true)->orderBy('referees.name'),
            'contingents' => fn ($query) => $query->withCount('athletes')->orderBy('name'),
        ])->loadCount(['contingents', 'registrations']);
    }

    /**
     * @return array<string, mixed>
     */
    public function data(
        Event $event,
        bool $canManage = false,
        bool $isHomepage = false,
        bool $canAccessDashboard = false,
    ): array {
        $this->load($event);

        return [
            'event' => [
                'id' => $event->id,
                'name' => $event->name,
                'slug' => $event->slug,
                'edition' => $event->edition,
                'description' => $event->description,
                'venue' => $event->venue,
                'city' => $event->city,
                'province' => $event->province,
                'start_date' => $event->start_date?->format('Y-m-d'),
                'end_date' => $event->end_date?->format('Y-m-d'),
                'start_date_formatted' => $event->start_date?->translatedFormat('d F Y'),
                'end_date_formatted' => $event->end_date?->translatedFormat('d F Y'),
                'dates_formatted' => $event->start_date?->translatedFormat('d M').' - '.$event->end_date?->translatedFormat('d M Y'),
                'registration_start' => $event->registration_start?->format('Y-m-d'),
                'registration_end' => $event->registration_end?->format('Y-m-d'),
                'registration_start_formatted' => $event->registration_start?->translatedFormat('d F Y'),
                'registration_end_formatted' => $event->registration_end?->translatedFormat('d F Y'),
                'is_paid' => (bool) $event->is_paid,
                'fee_per_athlete' => (float) $event->fee_per_athlete,
                'fee_per_athlete_formatted' => 'Rp '.number_format((float) $event->fee_per_athlete, 0, ',', '.'),
                'fee_per_contingent' => (float) $event->fee_per_contingent,
                'fee_per_contingent_formatted' => 'Rp '.number_format((float) $event->fee_per_contingent, 0, ',', '.'),
                'max_match_categories_per_athlete' => (int) $event->max_match_categories_per_athlete,
                'participant_requirements' => $this->eligibility->summary($event),
                'status' => $event->status instanceof \BackedEnum ? $event->status->value : (string) $event->status,
                'is_active' => (bool) $event->is_active,
                'organizer' => $event->organizer,
                'contact_person' => $event->contact_person,
                'contact_phone' => $event->contact_phone,
                'rules_doc' => $event->rules_doc,
                'cover_image_url' => $event->coverImageUrl(),
                'google_maps_url' => 'https://www.google.com/maps/search/?api=1&query='.urlencode(implode(', ', array_filter([$event->venue, $event->city, $event->province]))),
                'contingents_count' => (int) $event->contingents_count,
                'registrations_count' => (int) $event->registrations_count,
            ],
            'ageCategories' => $event->ageCategories->map(fn (EventAgeCategory $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'min_age' => $category->min_age,
                'max_age' => $category->max_age,
                'age_range' => $this->eligibility->enabled($event) ? 'Usia dan kelas mengikuti persyaratan event' : (($category->min_age && $category->max_age)
                    ? "{$category->min_age} - {$category->max_age} Tahun"
                    : 'Usia mengikuti ketentuan event'),
                'fee' => (float) $category->fee,
                'fee_formatted' => $event->is_paid ? 'Rp '.number_format((float) $category->fee, 0, ',', '.') : 'Gratis',
                'description' => $this->eligibility->enabled($event) ? null : $category->description,
            ]),
            'courts' => $event->courts->map(function (EventCourt $court) use ($event) {
                $activeMatch = $court->tournamentMatches->first();
                $nextMatch = $court->tournamentMatches->skip(1)->first();
                $monitorUrl = route('event.public.court.monitor', ['slug' => $event->slug, 'eventCourt' => $court->id]);
                $monitorFullUrl = url($monitorUrl);

                $activeMatchData = null;
                if ($activeMatch) {
                    $isRandori = $activeMatch->matchCategory?->type === 'randori';
                    $randoriScore = $activeMatch->randoriScore;
                    $embuScore = $activeMatch->embuScores->first();

                    $akaScore = $isRandori ? (int) ($randoriScore?->aka_total ?? $randoriScore?->aka_score ?? 0) : null;
                    $shiroScore = $isRandori ? (int) ($randoriScore?->shiro_total ?? $randoriScore?->shiro_score ?? 0) : null;
                    $akaWazaAri = $isRandori ? (int) ($randoriScore?->aka_breakdown['waza_ari'] ?? $randoriScore?->score_breakdown['aka']['waza_ari'] ?? 0) : null;
                    $shiroWazaAri = $isRandori ? (int) ($randoriScore?->shiro_breakdown['waza_ari'] ?? $randoriScore?->score_breakdown['shiro']['waza_ari'] ?? 0) : null;

                    $activeMatchData = [
                        'id' => $activeMatch->id,
                        'status' => $activeMatch->status,
                        'status_label' => match ($activeMatch->status) {
                            'ready' => 'Siap Dipanggil',
                            'in_progress' => 'Sedang Berlangsung',
                            default => 'Aktif',
                        },
                        'category' => $activeMatch->matchCategory?->name,
                        'type' => $activeMatch->matchCategory?->type,
                        'round' => $activeMatch->round_label,
                        'sequence' => $activeMatch->match_sequence,
                        'aka_label' => $activeMatch->red_label,
                        'shiro_label' => $activeMatch->blue_label,
                        'participant' => $activeMatch->participant_label ?: implode(' vs ', array_filter([$activeMatch->red_label, $activeMatch->blue_label])),
                        'score_display' => $isRandori
                            ? "{$akaScore} - {$shiroScore}"
                            : ($embuScore ? number_format((float) $embuScore->final_score, 2) : 'Menunggu Penilaian'),
                        'aka_score' => $akaScore,
                        'shiro_score' => $shiroScore,
                        'aka_waza_ari' => $akaWazaAri,
                        'shiro_waza_ari' => $shiroWazaAri,
                        'embu_final_score' => ! $isRandori && $embuScore ? (float) $embuScore->final_score : null,
                    ];
                }

                $nextMatchData = null;
                if ($nextMatch) {
                    $nextMatchData = [
                        'id' => $nextMatch->id,
                        'sequence' => $nextMatch->match_sequence,
                        'category' => $nextMatch->matchCategory?->name,
                        'type' => $nextMatch->matchCategory?->type,
                        'round' => $nextMatch->round_label,
                        'participant' => $nextMatch->participant_label ?: implode(' vs ', array_filter([$nextMatch->red_label, $nextMatch->blue_label])),
                    ];
                }

                return [
                    'id' => $court->id,
                    'name' => $court->name,
                    'location' => $court->location,
                    'description' => $court->description,
                    'monitor_url' => $monitorUrl,
                    'monitor_full_url' => $monitorFullUrl,
                    'qr_url' => 'https://quickchart.io/qr?size=320&margin=2&ecLevel=M&text='.urlencode($monitorFullUrl),
                    'active_match' => $activeMatchData,
                    'next_match' => $nextMatchData,
                ];
            }),
            'matchCategories' => $event->matchCategories->map(fn (EventMatchCategory $category) => [
                'id' => $category->id,
                'age_category_id' => $category->age_category_id,
                'name' => $category->name,
                'type' => $category->type,
                'gender' => $category->gender,
                'capacity' => $category->capacity,
                'weight_range' => ($category->min_weight && $category->max_weight)
                    ? "{$category->min_weight} - {$category->max_weight} kg"
                    : ($category->min_weight ? "≥ {$category->min_weight} kg" : ($category->max_weight ? "≤ {$category->max_weight} kg" : '-')),
                'min_kyu' => $category->min_kyu,
                'max_kyu' => $category->max_kyu,
            ]),
            'rundowns' => $event->rundowns->map(fn (Rundown $rundown) => [
                'id' => $rundown->id,
                'date_formatted' => $rundown->date?->translatedFormat('d M Y, H:i').' WIB',
                'date_only' => $rundown->date?->format('Y-m-d'),
                'time_only' => $rundown->date?->format('H:i'),
                'end_time_only' => $rundown->end_time?->format('H:i'),
                'name' => $rundown->name,
                'type' => $rundown->type,
                'description' => $rundown->description,
            ]),
            'paymentMethods' => $event->paymentMethods->map(fn (PaymentMethod $paymentMethod) => [
                'id' => $paymentMethod->id,
                'name' => $paymentMethod->name,
                'type' => $paymentMethod->type,
                'provider' => $paymentMethod->provider,
                'account_name' => $paymentMethod->account_name,
                'account_number' => $paymentMethod->account_number,
                'instructions' => $paymentMethod->instructions,
            ]),
            'referees' => $event->referees->map(fn (Referee $referee): array => [
                'id' => $referee->id,
                'name' => $referee->name,
                'role' => match ($referee->pivot->role) {
                    'chief' => 'Wasit Utama',
                    'judge' => 'Juri',
                    'reserve' => 'Wasit Cadangan',
                    default => 'Wasit',
                },
                'certification' => $referee->certification_level ?: $referee->license_number,
                'dan_grade' => $referee->dan_grade,
                'region' => $referee->region,
                'photo_url' => $referee->profilePhotoUrl(),
            ])->values(),
            'matchSchedule' => $this->matchSchedule($event),
            'championGroups' => $this->championGroups($event),
            'embuScores' => $this->embuScores($event),
            'randoriBrackets' => $this->randoriBrackets($event),
            'contingents' => $event->contingents->map(fn ($contingent) => [
                'id' => $contingent->id,
                'name' => $contingent->name,
                'city' => $contingent->city,
                'province' => $contingent->province,
                'manager_name' => $contingent->manager_name,
                'athletes_count' => (int) ($contingent->athletes_count ?? 0),
            ])->values(),
            'canManage' => $canManage,
            'canAccessDashboard' => $canAccessDashboard,
            'isHomepage' => $isHomepage,
        ];
    }

    /** @return Collection<int, array<string, mixed>> */
    private function matchSchedule(Event $event): Collection
    {
        return TournamentMatch::query()
            ->whereBelongsTo($event)
            ->where('is_bye', false)
            ->whereNotNull('scheduled_start_at')
            ->with(['matchCategory:id,name,type', 'court:id,name'])
            ->orderBy('scheduled_start_at')
            ->orderBy('match_sequence')
            ->limit(300)
            ->get()
            ->map(fn (TournamentMatch $match): array => [
                'id' => $match->id,
                'date' => $match->scheduled_start_at?->format('Y-m-d'),
                'date_label' => $match->scheduled_start_at?->translatedFormat('l, d F Y'),
                'time' => $match->scheduled_start_at?->format('H:i'),
                'end_time' => $match->scheduled_end_at?->format('H:i'),
                'category' => $match->matchCategory?->name,
                'type' => $match->matchCategory?->type,
                'court' => $match->court?->name,
                'round' => $match->round_label,
                'sequence' => $match->match_sequence,
                'participant' => $match->participant_label ?: implode(' vs ', array_filter([$match->red_label, $match->blue_label])),
                'status' => $match->status,
            ]);
    }

    /** @return Collection<int, array<string, mixed>> */
    private function championGroups(Event $event): Collection
    {
        return TournamentResult::query()
            ->whereBelongsTo($event)
            ->with(['matchCategory:id,name,type', 'athlete:id,name'])
            ->orderBy('event_match_category_id')
            ->orderBy('rank')
            ->get()
            ->groupBy(fn (TournamentResult $result): string => $result->event_match_category_id ?: (string) $result->match_category)
            ->map(function (Collection $results): array {
                /** @var TournamentResult $first */
                $first = $results->first();

                return [
                    'id' => $first->event_match_category_id ?: $first->match_category,
                    'category' => $first->matchCategory?->name ?: $first->match_category,
                    'type' => $first->matchCategory?->type ?: strtolower((string) $first->match_category),
                    'is_exhibition' => (bool) $first->is_exhibition,
                    'champions' => $results->sortBy(fn (TournamentResult $result): int => $result->rank->value)
                        ->map(fn (TournamentResult $result): array => [
                            'id' => $result->id,
                            'rank' => $result->rank->value,
                            'rank_label' => match ($result->rank->value) {
                                1 => 'Juara 1',
                                2 => 'Juara 2',
                                3, 4 => 'Juara 3 Bersama',
                                default => 'Peringkat '.$result->rank->value,
                            },
                            'participant' => $result->athlete?->name ?: $result->contingent_name,
                            'contingent' => $result->contingent_name,
                        ])->values(),
                ];
            })
            ->values();
    }

    /** @return Collection<int, array<string, mixed>> */
    private function embuScores(Event $event): Collection
    {
        return EmbuScore::query()
            ->whereBelongsTo($event)
            ->where('status', 'verified')
            ->with(['tournamentMatch.matchCategory:id,name,type', 'tournamentMatch.court:id,name'])
            ->latest('verified_at')
            ->limit(200)
            ->get()
            ->map(function (EmbuScore $score): array {
                $match = $score->tournamentMatch;

                return [
                    'id' => $score->id,
                    'category' => $match?->matchCategory?->name,
                    'participant' => $match?->participant_label,
                    'round' => $match?->round_label,
                    'pool' => $match?->pool,
                    'sequence' => $match?->match_sequence,
                    'court' => $match?->court?->name,
                    'judge_scores' => array_values($score->judge_scores ?? []),
                    'middle_score' => (float) $score->middle_score,
                    'penalty' => $score->effectiveTotalPenalty(),
                    'final_score' => (float) $score->final_score,
                    'is_disqualified' => (bool) $score->is_disqualified,
                    'duration_seconds' => $score->duration_seconds,
                    'verified_at' => $score->verified_at?->translatedFormat('d M Y, H:i'),
                ];
            });
    }

    /** @return Collection<int, array<string, mixed>> */
    private function randoriBrackets(Event $event): Collection
    {
        return TournamentDrawing::query()
            ->whereBelongsTo($event)
            ->whereIn('status', ['published', 'in_progress', 'completed'])
            ->whereHas('matchCategory', fn ($query) => $query->where('type', 'randori'))
            ->with([
                'matchCategory:id,name,type',
                'matches' => fn ($query) => $query
                    ->with(['randoriScore', 'court:id,name'])
                    ->orderBy('match_sequence'),
            ])
            ->get()
            ->map(fn (TournamentDrawing $drawing): array => [
                'id' => $drawing->id,
                'category' => $drawing->matchCategory?->name,
                'format' => $drawing->bracket_type,
                'status' => $drawing->status,
                'rounds' => $drawing->matches
                    ->groupBy('round_label')
                    ->map(fn (Collection $matches, string $round): array => [
                        'name' => $round,
                        'matches' => $matches->map(fn (TournamentMatch $match): array => $this->randoriMatch($match))->values(),
                    ])->values(),
            ]);
    }

    /** @return array<string, mixed> */
    private function randoriMatch(TournamentMatch $match): array
    {
        /** @var RandoriScore|null $score */
        $score = $match->randoriScore;

        return [
            'id' => $match->id,
            'sequence' => $match->match_sequence,
            'position' => $match->bracket_position,
            'phase' => $match->phase,
            'court' => $match->court?->name,
            'scheduled_at' => $match->scheduled_start_at?->translatedFormat('d M, H:i'),
            'aka' => $match->red_label ?: 'Menunggu peserta',
            'shiro' => $match->blue_label ?: 'Menunggu peserta',
            'aka_score' => $score?->aka_total,
            'shiro_score' => $score?->shiro_total,
            'winner' => $score?->winner_corner,
            'status' => $match->status,
            'is_bye' => $match->is_bye,
        ];
    }
}
