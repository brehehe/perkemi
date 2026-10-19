<?php

namespace App\Http\Controllers;

use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\TournamentMatch;
use App\Models\TournamentResult;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PublicAthleteController extends Controller
{
    public function index(Request $request): Response
    {
        $search = mb_substr(trim((string) $request->query('search', '')), 0, 100);
        $allProfiles = $this->profiles();
        $topChampions = $allProfiles
            ->filter(fn (array $profile): bool => $profile['medal_count'] > 0)
            ->sortByDesc(fn (array $profile): array => [
                $profile['gold_count'],
                $profile['silver_count'],
                $profile['bronze_count'],
                $profile['medal_count'],
            ])
            ->take(6)
            ->values();

        $filteredProfiles = $allProfiles
            ->when($search !== '', fn (Collection $profiles) => $profiles->filter(function (array $profile) use ($search): bool {
                $haystack = Str::lower(implode(' ', [
                    $profile['name'],
                    $profile['contingent'],
                    $profile['dojo_name'],
                    $profile['kenshi_number'],
                ]));

                return Str::contains($haystack, Str::lower($search));
            }))
            ->sortBy(fn (array $profile): string => Str::lower($profile['name']))
            ->values();

        $page = max(1, $request->integer('page', 1));
        $perPage = 18;
        $athletes = new LengthAwarePaginator(
            $filteredProfiles->forPage($page, $perPage)->values(),
            $filteredProfiles->count(),
            $perPage,
            $page,
            [
                'path' => route('athletes.index'),
                'query' => $request->query(),
            ],
        );

        return Inertia::render('Public/Athletes/Index', [
            'athletes' => $athletes,
            'topChampions' => $topChampions,
            'filters' => ['search' => $search],
        ]);
    }

    public function show(Athlete $athlete): Response
    {
        $peers = $this->peersQuery($athlete)->get();

        abort_if($peers->isEmpty(), 404);

        return Inertia::render('Public/Athletes/Show', [
            'athlete' => $this->profile($peers, true),
        ]);
    }

    public function photo(Athlete $athlete): mixed
    {
        $photoOwner = $this->peersQuery($athlete)
            ->whereNotNull('profile_photo_path')
            ->get()
            ->first(fn (Athlete $candidate): bool => Storage::exists((string) $candidate->profile_photo_path));

        abort_unless($photoOwner instanceof Athlete, 404);

        return Storage::response($photoOwner->profile_photo_path);
    }

    private function peersQuery(Athlete $athlete): Builder
    {
        $query = $this->athleteQuery();

        if (filled($athlete->nik)) {
            return $query->where('nik', trim((string) $athlete->nik));
        }

        if (filled($athlete->kenshi_number)) {
            return $query->where('kenshi_number', trim((string) $athlete->kenshi_number));
        }

        $userId = $athlete->contingent?->user_id;

        return $query
            ->where('name', $athlete->name)
            ->when($athlete->birth_date, fn ($q) => $q->whereDate('birth_date', $athlete->birth_date))
            ->when($userId, fn ($q) => $q->whereHas('contingent', fn ($cq) => $cq->where('user_id', $userId)));
    }

    /** @return Collection<int, array<string, mixed>> */
    private function profiles(): Collection
    {
        return $this->athleteQuery()
            ->get()
            ->groupBy(fn (Athlete $athlete): string => $this->identityKey($athlete))
            ->map(fn (Collection $athletes): array => $this->profile($athletes))
            ->values();
    }

    private function athleteQuery(): Builder
    {
        return Athlete::query()
            ->select([
                'id', 'contingent_id', 'name', 'nik', 'kenshi_number', 'gender',
                'birth_date', 'dojo_name', 'kyu_dan', 'profile_photo_path',
            ])
            ->whereHas('contingent')
            ->with([
                'contingent:id,user_id,event_id,name,city',
                'matchCategoryEntries:id,event_id,athlete_id,event_match_category_id',
                'matchCategoryEntries.event:id,name,slug,start_date,end_date',
                'matchCategoryEntries.matchCategory:id,name,type',
                'tournamentResults:id,event_id,event_match_category_id,athlete_id,rank,match_category',
                'tournamentResults.event:id,name,slug,start_date,end_date',
                'tournamentResults.matchCategory:id,name,type',
            ]);
    }

    private function identityKey(Athlete $athlete): string
    {
        if (filled($athlete->nik)) {
            return 'nik:'.hash('sha256', Str::lower(trim((string) $athlete->nik)));
        }

        if (filled($athlete->kenshi_number)) {
            return 'kenshi:'.Str::lower(trim((string) $athlete->kenshi_number));
        }

        return 'profile:'.hash('sha256', Str::lower(implode('|', [
            $athlete->name,
            $athlete->birth_date?->format('Y-m-d'),
            $athlete->contingent?->user_id,
        ])));
    }

    /**
     * @param  Collection<int, Athlete>  $athletes
     * @return array<string, mixed>
     */
    private function profile(Collection $athletes, bool $includeMatchHistory = false): array
    {
        /** @var Athlete $representative */
        $representative = $athletes->first(fn (Athlete $athlete): bool => filled($athlete->profile_photo_path))
            ?? $athletes->first();
        $entries = $athletes->flatMap(fn (Athlete $athlete) => $athlete->matchCategoryEntries);
        $results = $athletes->flatMap(fn (Athlete $athlete) => $athlete->tournamentResults);

        $history = $entries
            ->map(fn (AthleteMatchCategoryEntry $entry): array => [
                'event_id' => $entry->event_id,
                'event' => $entry->event?->name,
                'event_slug' => $entry->event?->slug,
                'date' => $entry->event?->start_date?->format('Y-m-d'),
                'category' => $entry->matchCategory?->name,
                'type' => $entry->matchCategory?->type,
                'title' => null,
            ])
            ->concat($results->map(fn (TournamentResult $result): array => [
                'event_id' => $result->event_id,
                'event' => $result->event?->name,
                'event_slug' => $result->event?->slug,
                'date' => $result->event?->start_date?->format('Y-m-d'),
                'category' => $result->matchCategory?->name ?: $result->match_category,
                'type' => $result->matchCategory?->type,
                'title' => $result->rank->label(),
            ]))
            ->groupBy(fn (array $item): string => implode('|', [$item['event_id'], $item['category']]))
            ->map(function (Collection $items): array {
                $item = $items->first();
                $title = $items->pluck('title')->filter()->first();

                return [...$item, 'title' => $title];
            })
            ->sortByDesc('date')
            ->values();

        $rankCounts = $results->countBy(fn (TournamentResult $result): int => $result->rank->value);
        $matchHistory = $includeMatchHistory
            ? $this->randoriMatchHistory($entries->pluck('id'))
            : collect();
        $playedCount = $matchHistory->count();
        $winsCount = $matchHistory->where('result', 'win')->count();
        $resultYears = $results->groupBy(fn (TournamentResult $result): ?int => $result->event?->start_date?->year);
        $yearlyStatistics = $matchHistory
            ->pluck('year')
            ->merge($resultYears->keys())
            ->filter()
            ->unique()
            ->sortDesc()
            ->map(function (int|string $year) use ($matchHistory, $resultYears): array {
                $yearMatches = $matchHistory->where('year', (int) $year);
                $yearWins = $yearMatches->where('result', 'win')->count();
                $yearResults = $resultYears->get($year, collect());

                return [
                    'year' => (int) $year,
                    'played' => $yearMatches->count(),
                    'wins' => $yearWins,
                    'win_rate' => $yearMatches->isNotEmpty()
                        ? round(($yearWins / $yearMatches->count()) * 100, 1)
                        : 0,
                    'titles' => $yearResults->count(),
                    'gold' => $yearResults->where(fn (TournamentResult $result): bool => $result->rank->value === 1)->count(),
                    'silver' => $yearResults->where(fn (TournamentResult $result): bool => $result->rank->value === 2)->count(),
                    'bronze' => $yearResults->where(fn (TournamentResult $result): bool => in_array($result->rank->value, [3, 4], true))->count(),
                ];
            })
            ->values();

        return [
            'id' => $representative->id,
            'name' => $representative->name,
            'kenshi_number' => $representative->kenshi_number,
            'gender' => $representative->gender,
            'age' => $representative->birth_date?->age,
            'dojo_name' => $representative->dojo_name,
            'kyu_dan' => $representative->kyu_dan,
            'contingent' => $representative->contingent?->name,
            'city' => $representative->contingent?->city,
            'photo_url' => filled($representative->profile_photo_path)
                ? route('athletes.photo', $representative)
                : null,
            'show_url' => route('athletes.show', $representative),
            'participation_count' => $history->pluck('event_id')->filter()->unique()->count(),
            'medal_count' => $results->count(),
            'gold_count' => (int) ($rankCounts[1] ?? 0),
            'silver_count' => (int) ($rankCounts[2] ?? 0),
            'bronze_count' => (int) (($rankCounts[3] ?? 0) + ($rankCounts[4] ?? 0)),
            'played_count' => $playedCount,
            'wins_count' => $winsCount,
            'win_rate' => $playedCount > 0 ? round(($winsCount / $playedCount) * 100, 1) : 0,
            'yearly_statistics' => $yearlyStatistics,
            'match_history' => $matchHistory,
            'history' => $history,
        ];
    }

    /**
     * @param  Collection<int, string>  $entryIds
     * @return Collection<int, array<string, mixed>>
     */
    private function randoriMatchHistory(Collection $entryIds): Collection
    {
        if ($entryIds->isEmpty()) {
            return collect();
        }

        return TournamentMatch::query()
            ->where(function (Builder $query) use ($entryIds): void {
                $query->whereIn('red_entry_id', $entryIds)
                    ->orWhereIn('blue_entry_id', $entryIds);
            })
            ->whereHas('randoriScore', fn (Builder $query) => $query->where('status', 'verified'))
            ->with([
                'event:id,name,slug,start_date',
                'matchCategory:id,name,type',
                'court:id,name',
                'randoriScore:id,tournament_match_id,aka_total,shiro_total,winner_corner,status,verified_at',
            ])
            ->orderByDesc('scheduled_start_at')
            ->orderByDesc('match_sequence')
            ->get([
                'id', 'event_id', 'event_match_category_id', 'event_court_id',
                'red_entry_id', 'blue_entry_id', 'red_label', 'blue_label',
                'round_label', 'match_sequence', 'scheduled_start_at',
            ])
            ->map(function (TournamentMatch $match) use ($entryIds): array {
                $score = $match->randoriScore;
                $ownCorner = $entryIds->contains($match->red_entry_id) ? 'aka' : 'shiro';
                $opponentCorner = $ownCorner === 'aka' ? 'shiro' : 'aka';
                $date = $match->scheduled_start_at ?? $score?->verified_at ?? $match->event?->start_date;

                return [
                    'id' => $match->id,
                    'event' => $match->event?->name,
                    'event_url' => $match->event?->slug ? route('event.public.show', $match->event->slug) : null,
                    'date' => $date?->toIso8601String(),
                    'year' => $date?->year,
                    'category' => $match->matchCategory?->name,
                    'round' => $match->round_label,
                    'sequence' => $match->match_sequence,
                    'court' => $match->court?->name,
                    'own_corner' => $ownCorner,
                    'opponent' => $ownCorner === 'aka' ? $match->blue_label : $match->red_label,
                    'own_score' => (int) ($ownCorner === 'aka' ? $score?->aka_total : $score?->shiro_total),
                    'opponent_score' => (int) ($opponentCorner === 'aka' ? $score?->aka_total : $score?->shiro_total),
                    'result' => $score?->winner_corner === $ownCorner ? 'win' : 'loss',
                ];
            });
    }
}
