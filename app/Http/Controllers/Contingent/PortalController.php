<?php

namespace App\Http\Controllers\Contingent;

use App\Http\Controllers\Controller;
use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\Kyu;
use App\Models\Official;
use App\Models\Registration;
use App\Models\Rundown;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\TournamentResult;
use App\Services\Panitera\EmbuScoreCalculator;
use App\Services\Reports\ScoreReportFormatter;
use App\Services\TournamentDrawingGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\View\View;
use Inertia\Inertia;
use Inertia\Response;

class PortalController extends Controller
{
    public function registration(Request $request): Response
    {
        [$contingent, $event, $eventOptions] = $this->context($request);

        $registration = Registration::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($contingent)
            ->with('paymentMethod:id,name,type,provider,account_name,account_number')
            ->latest()
            ->first();

        $entryCount = AthleteMatchCategoryEntry::query()
            ->whereBelongsTo($event)
            ->whereHas('athlete', fn ($query) => $query->whereBelongsTo($contingent))
            ->count();
        $registrationEvents = Contingent::query()
            ->where('user_id', $request->user()->id)
            ->with([
                'event:id,name,slug,start_date,end_date,status,is_active,is_paid',
                'registrations' => fn ($query) => $query->latest(),
            ])
            ->orderByDesc(Event::select('is_active')->whereColumn('events.id', 'contingents.event_id'))
            ->orderByDesc('created_at')
            ->get()
            ->filter(fn (Contingent $ownedContingent): bool => $ownedContingent->event instanceof Event)
            ->map(function (Contingent $ownedContingent) use ($event): array {
                $ownedEvent = $ownedContingent->event;
                $existingRegistration = $ownedContingent->registrations->first();

                return [
                    'id' => $ownedEvent->id,
                    'name' => $ownedEvent->name,
                    'slug' => $ownedEvent->slug,
                    'start_date' => $ownedEvent->start_date?->format('Y-m-d'),
                    'end_date' => $ownedEvent->end_date?->format('Y-m-d'),
                    'status' => $ownedEvent->status->value,
                    'status_label' => $ownedEvent->status->label(),
                    'is_active' => (bool) $ownedEvent->is_active,
                    'is_paid' => (bool) $ownedEvent->is_paid,
                    'contingent_name' => $ownedContingent->name,
                    'is_current' => $ownedEvent->is($event),
                    'registration' => $existingRegistration ? [
                        ...$existingRegistration->only(['id', 'registration_number', 'status', 'updated_at']),
                        'status_label' => $existingRegistration->status->label(),
                    ] : null,
                    'action_label' => $existingRegistration ? 'Lihat Registrasi' : 'Mulai Registrasi',
                    'action_url' => $existingRegistration
                        ? route('kontingen.registrasi.detail', $existingRegistration)
                        : route('kontingen.registrasi.start', $ownedEvent),
                ];
            })
            ->unique('id')
            ->values();

        return $this->render('registration', $contingent, $event, $eventOptions, [
            'registration' => $registration ? [
                ...$registration->only([
                    'id', 'registration_number', 'status', 'payment_status', 'total_amount',
                    'final_amount', 'payment_amount', 'payment_reference', 'payment_note',
                    'created_at', 'updated_at',
                ]),
                'status_label' => $registration->status->label(),
                'payment_status_label' => $event->is_paid
                    ? $registration->payment_status->label()
                    : 'Gratis · Tanpa Pembayaran',
                'payment_method' => $registration->paymentMethod,
                'detail_url' => route('kontingen.registrasi.detail', $registration),
                'match_groups_url' => route('kontingen.registrasi.detail', [
                    'registration' => $registration,
                    'step' => 3,
                ]),
            ] : null,
            'summary' => [
                'athletes' => (int) ($contingent->athletes_count ?? $contingent->athletes()->count()),
                'officials' => (int) ($contingent->officials_count ?? $contingent->officials()->count()),
                'match_entries' => $entryCount,
                'is_paid' => (bool) $event->is_paid,
            ],
            'registration_events' => $registrationEvents,
        ]);
    }

    public function schedule(Request $request): Response
    {
        [$contingent, $event, $eventOptions] = $this->context($request);

        $entryIds = AthleteMatchCategoryEntry::query()
            ->whereBelongsTo($event)
            ->whereHas('athlete', fn ($query) => $query->whereBelongsTo($contingent))
            ->pluck('id');

        $matches = TournamentMatch::query()
            ->whereBelongsTo($event)
            ->when($entryIds->isNotEmpty(), fn ($query) => $query->where(function ($matchQuery) use ($entryIds) {
                $matchQuery->whereIn('red_entry_id', $entryIds)
                    ->orWhereIn('blue_entry_id', $entryIds)
                    ->orWhereIn('participant_entry_id', $entryIds);
            }), fn ($query) => $query->whereRaw('1 = 0'))
            ->with([
                'matchCategory:id,name,type',
                'court:id,name',
                'rundown:id,name,date,end_time',
            ])
            ->orderByRaw('scheduled_start_at is null')
            ->orderBy('scheduled_start_at')
            ->orderBy('match_sequence')
            ->get([
                'id', 'event_id', 'event_match_category_id', 'event_court_id', 'rundown_id',
                'red_entry_id', 'blue_entry_id', 'participant_entry_id', 'phase', 'round_label',
                'match_sequence', 'red_label', 'blue_label', 'participant_label',
                'scheduled_start_at', 'scheduled_end_at', 'status',
            ]);

        $rundowns = Rundown::query()
            ->whereBelongsTo($event)
            ->orderBy('date')
            ->orderBy('order')
            ->get(['id', 'date', 'end_time', 'name', 'type', 'is_match_session', 'description', 'order']);

        return $this->render('schedule', $contingent, $event, $eventOptions, [
            'rundowns' => $rundowns,
            'matches' => $matches,
        ]);
    }

    public function bracket(Request $request, TournamentDrawingGenerator $generator): Response
    {
        [$contingent, $event, $eventOptions] = $this->context($request);

        $contingentEntries = AthleteMatchCategoryEntry::query()
            ->whereBelongsTo($event)
            ->whereHas('athlete', fn ($query) => $query->whereBelongsTo($contingent))
            ->with('athlete:id,name,contingent_id')
            ->get(['id', 'athlete_id', 'event_id', 'event_match_category_id']);

        $contingentEntryIds = $contingentEntries->pluck('id');
        $contingentCategoryIds = $contingentEntries->pluck('event_match_category_id')->filter()->unique();
        $contingentAthleteNames = $contingentEntries->pluck('athlete.name')->filter()->unique()->values();

        $allRandoriCategories = $event->matchCategories()
            ->where('type', 'randori')
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'event_id', 'name', 'type', 'gender', 'preferred_bracket_type', 'capacity', 'min_weight', 'max_weight']);

        $drawings = TournamentDrawing::query()
            ->whereBelongsTo($event)
            ->whereIn('event_match_category_id', $allRandoriCategories->pluck('id'))
            ->get(['id', 'event_match_category_id', 'status', 'bracket_type'])
            ->keyBy('event_match_category_id');

        $categories = $allRandoriCategories->map(function (EventMatchCategory $cat) use ($contingentCategoryIds, $contingentEntries, $drawings): array {
            $isEntered = $contingentCategoryIds->contains($cat->id);
            $myEntries = $contingentEntries->where('event_match_category_id', $cat->id);
            $drawing = $drawings->get($cat->id);
            $hasDrawing = $drawing !== null && in_array($drawing->status, ['generated', 'published', 'in_progress', 'completed'], true);
            $format = $drawing?->bracket_type ?? $cat->preferred_bracket_type ?? 'single_elimination';

            return [
                'id' => $cat->id,
                'name' => $cat->name,
                'format' => $format,
                'gender' => $cat->gender,
                'is_entered' => $isEntered,
                'my_athletes_count' => $myEntries->count(),
                'my_athlete_names' => $myEntries->pluck('athlete.name')->filter()->values()->all(),
                'has_drawing' => $hasDrawing,
                'drawing_status' => $drawing?->status ?? 'not_generated',
            ];
        })
            ->sortBy(function (array $item): array {
                return [
                    $item['is_entered'] ? 0 : 1,
                    $item['has_drawing'] ? 0 : 1,
                    $item['name'],
                ];
            })
            ->values();

        $requestedCategoryId = $request->string('category')->toString();
        $selectedCategoryMeta = null;

        if ($requestedCategoryId) {
            $selectedCategoryMeta = $categories->firstWhere('id', $requestedCategoryId);
        }

        if (! $selectedCategoryMeta) {
            $selectedCategoryMeta = $categories->first(fn (array $c): bool => $c['is_entered'] && $c['has_drawing'])
                ?? $categories->first(fn (array $c): bool => $c['is_entered'])
                ?? $categories->first(fn (array $c): bool => $c['has_drawing'])
                ?? $categories->first();
        }

        $selectedCategory = $selectedCategoryMeta
            ? $allRandoriCategories->firstWhere('id', $selectedCategoryMeta['id'])
            : null;

        $matches = collect();

        if ($selectedCategory instanceof EventMatchCategory) {
            $generator->syncCategoryByes($selectedCategory);

            $selectedDrawing = TournamentDrawing::query()
                ->whereBelongsTo($event)
                ->where('event_match_category_id', $selectedCategory->id)
                ->with([
                    'matches' => fn ($query) => $query->orderBy('bracket_position')->orderBy('match_sequence'),
                    'matches.court:id,name',
                    'matches.rundown:id,name',
                    'matches.randoriScore',
                    'matches.redEntry.athlete.contingent:id,name',
                    'matches.blueEntry.athlete.contingent:id,name',
                ])
                ->first();

            if ($selectedDrawing instanceof TournamentDrawing) {
                $matches = $selectedDrawing->matches->map(function (TournamentMatch $match): array {
                    $akaContingent = $match->metadata['red']['contingent_name']
                        ?? $match->metadata['red']['city']
                        ?? $match->redEntry?->athlete?->contingent?->name;
                    $shiroContingent = $match->metadata['blue']['contingent_name']
                        ?? $match->metadata['blue']['city']
                        ?? $match->blueEntry?->athlete?->contingent?->name;

                    return [
                        'id' => $match->id,
                        'phase' => $match->phase,
                        'round_label' => $match->round_label,
                        'pool' => $match->pool,
                        'sequence' => $match->match_sequence,
                        'position' => $match->bracket_position,
                        'red_label' => $match->red_label,
                        'blue_label' => $match->blue_label,
                        'aka_label' => $match->red_label,
                        'shiro_label' => $match->blue_label,
                        'red_entry_id' => $match->red_entry_id ?? ($match->metadata['red']['entry_id'] ?? null),
                        'blue_entry_id' => $match->blue_entry_id ?? ($match->metadata['blue']['entry_id'] ?? null),
                        'aka_contingent' => $akaContingent,
                        'shiro_contingent' => $shiroContingent,
                        'red_contingent' => $akaContingent,
                        'blue_contingent' => $shiroContingent,
                        'aka_contingent_id' => $match->redEntry?->athlete?->contingent_id ?? ($match->metadata['red']['contingent_id'] ?? null),
                        'shiro_contingent_id' => $match->blueEntry?->athlete?->contingent_id ?? ($match->metadata['blue']['contingent_id'] ?? null),
                        'participant_label' => $match->participant_label,
                        'is_bye' => (bool) $match->is_bye,
                        'is_ready' => ! ($match->metadata['placeholder'] ?? false),
                        'status' => $match->status,
                        'court' => $match->court?->name,
                        'session' => $match->rundown?->name,
                        'scheduled_start' => $match->scheduled_start_at?->format('Y-m-d H:i'),
                        'scheduled_start_formatted' => $match->scheduled_start_at?->translatedFormat('d M, H:i'),
                        'scheduled_end_formatted' => $match->scheduled_end_at?->format('H:i'),
                        'metadata' => $match->metadata,
                        'score' => $match->randoriScore ? [
                            'winner_corner' => $match->randoriScore->winner_corner,
                            'aka_total' => $match->randoriScore->aka_total,
                            'shiro_total' => $match->randoriScore->shiro_total,
                            'is_locked' => $match->randoriScore->locked_at !== null,
                        ] : null,
                    ];
                })->values();
            }
        }

        return $this->render('bracket', $contingent, $event, $eventOptions, [
            'categories' => $categories,
            'selected_category' => $selectedCategoryMeta,
            'matches' => $matches,
            'highlight_contingent_id' => $contingent->id,
            'highlight_contingent_name' => $contingent->name,
            'highlight_entry_ids' => $contingentEntryIds->values()->all(),
            'highlight_athlete_names' => $contingentAthleteNames->all(),
        ]);
    }

    public function results(Request $request): Response
    {
        [$contingent, $event, $eventOptions] = $this->context($request);

        $results = TournamentResult::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($contingent)
            ->with('athlete:id,name')
            ->orderBy('rank')
            ->orderBy('match_category')
            ->get(['id', 'event_id', 'contingent_id', 'athlete_id', 'contingent_name', 'rank', 'match_category'])
            ->map(fn (TournamentResult $result): array => [
                ...$result->only(['id', 'contingent_name', 'match_category']),
                'rank' => $result->rank->value,
                'rank_label' => $result->rank->label(),
                'athlete' => $result->athlete,
            ]);

        return $this->render('results', $contingent, $event, $eventOptions, [
            'results' => $results,
            'medal_summary' => [
                'gold' => $results->where('rank', 1)->count(),
                'silver' => $results->where('rank', 2)->count(),
                'bronze' => $results->whereIn('rank', [3, 4])->count(),
            ],
        ]);
    }

    public function embuResults(Request $request, ScoreReportFormatter $scoreFormatter): Response
    {
        [$contingent, $event, $eventOptions] = $this->context($request);
        $entryIds = $this->entryIds($event, $contingent);
        $embuCalculator = app(EmbuScoreCalculator::class);

        $embuCategoryIds = AthleteMatchCategoryEntry::query()
            ->whereBelongsTo($event)
            ->whereIn('id', $entryIds)
            ->whereHas('matchCategory', fn ($query) => $query->where('type', 'embu'))
            ->pluck('event_match_category_id')
            ->filter()
            ->unique();

        $embuCategories = EventMatchCategory::query()
            ->whereBelongsTo($event)
            ->whereIn('id', $embuCategoryIds)
            ->orderBy('name')
            ->get(['id', 'name', 'gender'])
            ->map(function (EventMatchCategory $cat) use ($entryIds, $event): array {
                $count = AthleteMatchCategoryEntry::query()
                    ->whereBelongsTo($event)
                    ->where('event_match_category_id', $cat->id)
                    ->whereIn('id', $entryIds)
                    ->count();

                return [
                    'id' => $cat->id,
                    'name' => $cat->name,
                    'gender' => $cat->gender,
                    'own_athletes_count' => $count,
                ];
            })
            ->values();

        $matches = TournamentMatch::query()
            ->whereBelongsTo($event)
            ->whereIn('participant_entry_id', $entryIds)
            ->whereHas('matchCategory', fn ($query) => $query->where('type', 'embu'))
            ->with([
                'court:id,name',
                'matchCategory:id,name,type',
                'embuScores' => fn ($query) => $query->with('verifier:id,name')->orderByDesc('tiebreak_round'),
                'embuJudgeScores' => fn ($query) => $query
                    ->with([
                        'referee:id,name,license_number,certification_level',
                        'court:id,name',
                    ])
                    ->orderBy('judge_number'),
            ])
            ->orderByRaw("CASE 
                WHEN status = 'completed' THEN 0 
                WHEN status = 'in_progress' THEN 1 
                WHEN status = 'ready' THEN 2 
                ELSE 3 END")
            ->orderBy('scheduled_start_at')
            ->orderBy('match_sequence')
            ->get();

        $scores = $matches->map(function (TournamentMatch $match) use ($event, $scoreFormatter, $embuCalculator): array {
            $score = $match->embuScores->firstWhere('status', 'verified') ?? $match->embuScores->first();

            if ($score) {
                $score->setRelation('tournamentMatch', $match);
                $item = $scoreFormatter->embuResult($score, $event);

                $rawJudges = collect($item['judges'] ?? [])
                    ->map(fn (array $judge): array => collect($judge)->only([
                        'id', 'referee_name', 'judge_number', 'role_label', 'aspect_scores',
                        'aspect_labels', 'completed_items', 'technique_subtotal',
                        'expression_subtotal', 'total_score', 'status_label', 'is_signed',
                    ])->all())
                    ->values()
                    ->all();

                $trimming = $embuCalculator->calculateTrimmingAndParameters($rawJudges, (float) $score->final_score);

                return [
                    ...$item,
                    'category_id' => $match->event_match_category_id,
                    'category' => $item['category_name'] ?? $match->matchCategory?->name,
                    'round' => $item['round_label'] ?? $match->round_label,
                    'athlete_name' => $item['participant'] ?? $match->participant_label,
                    'judges' => $trimming['judges'],
                    'trimmed_min_judge' => $trimming['trimmed_min_judge'],
                    'trimmed_max_judge' => $trimming['trimmed_max_judge'],
                    'middle_judge_numbers' => $trimming['middle_judge_numbers'],
                    'middle_judges_label' => $trimming['middle_judges_label'],
                    'status' => $score->status,
                    'status_label' => $score->status === 'verified' ? 'Selesai & Diverifikasi' : 'Menunggu Verifikasi',
                    'is_verified' => $score->status === 'verified',
                    'verified_at' => $score->verified_at?->toIso8601String(),
                    'print_url' => $score->status === 'verified' ? route('kontingen.hasil.embu.print', [
                        'embuScore' => $score->id,
                        'event_id' => $event->id,
                    ], false) : null,
                ];
            }

            return [
                'id' => $match->id,
                'category_id' => $match->event_match_category_id,
                'category' => $match->matchCategory?->name,
                'category_name' => $match->matchCategory?->name,
                'round' => $match->round_label,
                'round_label' => $match->round_label,
                'sequence' => $match->match_sequence,
                'court' => $match->court?->name ?? 'Belum Ditentukan',
                'athlete_name' => $match->participant_label ?: 'Atlet Kontingen',
                'final_score' => null,
                'middle_score' => null,
                'total_penalty' => null,
                'time_penalty' => null,
                'violation_penalty' => null,
                'duration_seconds' => 0,
                'duration' => '-',
                'judge_scores' => [],
                'judges' => [],
                'status' => $match->status,
                'status_label' => match ($match->status) {
                    'in_progress' => 'Sedang Tanding',
                    'ready' => 'Siap Tanding',
                    default => 'Belum Tanding',
                },
                'is_verified' => false,
                'verified_at' => null,
                'print_url' => null,
            ];
        });

        // Sertakan entry yang belum digenerate bagan/partainya jika ada
        $matchedEntryIds = $matches->pluck('participant_entry_id')->filter();
        $unmatchedEntries = AthleteMatchCategoryEntry::query()
            ->whereBelongsTo($event)
            ->whereIn('id', $entryIds)
            ->whereNotIn('id', $matchedEntryIds)
            ->whereHas('matchCategory', fn ($query) => $query->where('type', 'embu'))
            ->with(['matchCategory:id,name,type', 'athlete:id,name'])
            ->get();

        $unmatchedScores = $unmatchedEntries->map(function (AthleteMatchCategoryEntry $entry): array {
            return [
                'id' => $entry->id,
                'category_id' => $entry->event_match_category_id,
                'category' => $entry->matchCategory?->name,
                'category_name' => $entry->matchCategory?->name,
                'round' => 'Menunggu Bagan',
                'round_label' => 'Menunggu Bagan',
                'sequence' => '-',
                'court' => '-',
                'athlete_name' => $entry->athlete?->name ?? 'Atlet Kontingen',
                'final_score' => null,
                'middle_score' => null,
                'total_penalty' => null,
                'time_penalty' => null,
                'violation_penalty' => null,
                'duration_seconds' => 0,
                'duration' => '-',
                'judge_scores' => [],
                'judges' => [],
                'status' => 'pending',
                'status_label' => 'Bagan Belum Rilis',
                'is_verified' => false,
                'verified_at' => null,
                'print_url' => null,
            ];
        });

        $allEmbuResults = $scores->concat($unmatchedScores)->values();

        return $this->render('embu-results', $contingent, $event, $eventOptions, [
            'embu_results' => $allEmbuResults,
            'categories' => $embuCategories,
        ]);
    }

    public function printEmbuResult(
        Request $request,
        EmbuScore $embuScore,
        ScoreReportFormatter $scoreFormatter,
    ): View {
        [$contingent, $event] = $this->context($request);
        abort_unless($embuScore->event_id === $event->id && $embuScore->status === 'verified', 404);

        $entryIds = $this->entryIds($event, $contingent);
        $embuScore->load([
            'verifier:id,name',
            'tournamentMatch:id,event_id,event_match_category_id,event_court_id,participant_entry_id,participant_label,round_label,pool,match_sequence,scheduled_start_at,metadata',
            'tournamentMatch.matchCategory:id,name,type',
            'tournamentMatch.court:id,name',
            'tournamentMatch.embuJudgeScores' => fn ($query) => $query
                ->with([
                    'referee:id,name,license_number,certification_level',
                    'court:id,name',
                ])
                ->orderBy('judge_number'),
        ]);
        $match = $embuScore->tournamentMatch;
        abort_unless($match && $entryIds->contains($match->participant_entry_id), 404);

        return view('reports.embu-result-detail', [
            'event' => $event,
            'score' => $scoreFormatter->embuResult($embuScore, $event),
        ]);
    }

    public function randoriResults(Request $request): Response
    {
        [$contingent, $event, $eventOptions] = $this->context($request);
        $entryIds = $this->entryIds($event, $contingent);

        $myRandoriEntries = AthleteMatchCategoryEntry::query()
            ->whereBelongsTo($event)
            ->whereIn('id', $entryIds)
            ->whereHas('matchCategory', fn ($query) => $query->where('type', 'randori'))
            ->with(['athlete:id,name,contingent_id', 'matchCategory:id,name,type,gender,preferred_bracket_type'])
            ->get();

        $myCategoryIds = $myRandoriEntries->pluck('event_match_category_id')->filter()->unique()->values();

        $categories = EventMatchCategory::query()
            ->whereBelongsTo($event)
            ->where('type', 'randori')
            ->whereIn('id', $myCategoryIds)
            ->orderBy('name')
            ->get(['id', 'event_id', 'name', 'type', 'gender', 'preferred_bracket_type'])
            ->map(function (EventMatchCategory $cat) use ($myRandoriEntries): array {
                return [
                    'id' => $cat->id,
                    'name' => $cat->name,
                    'gender' => $cat->gender,
                    'own_athletes_count' => $myRandoriEntries->where('event_match_category_id', $cat->id)->count(),
                ];
            })
            ->values();

        $requestedCategoryId = $request->string('category_id')->toString();
        $selectedCategoryId = $categories->firstWhere('id', $requestedCategoryId)['id'] ?? $categories->first()['id'] ?? null;
        $selectedCategory = $selectedCategoryId ? EventMatchCategory::find($selectedCategoryId) : null;

        $bracketMatches = collect();
        $format = 'single_elimination';

        if ($selectedCategory) {
            $drawing = TournamentDrawing::query()
                ->whereBelongsTo($event)
                ->where('event_match_category_id', $selectedCategory->id)
                ->with([
                    'matches' => fn ($query) => $query->orderBy('bracket_position')->orderBy('match_sequence'),
                    'matches.court:id,name',
                    'matches.rundown:id,name',
                    'matches.randoriScore',
                    'matches.redEntry.athlete.contingent:id,name',
                    'matches.blueEntry.athlete.contingent:id,name',
                ])
                ->first();

            if ($drawing) {
                $format = $drawing->bracket_type ?? $selectedCategory->preferred_bracket_type ?? 'single_elimination';
                $bracketMatches = $drawing->matches->map(function (TournamentMatch $match) use ($contingent, $entryIds): array {
                    $akaContingent = $match->metadata['red']['contingent_name']
                        ?? $match->metadata['red']['city']
                        ?? $match->redEntry?->athlete?->contingent?->name;
                    $shiroContingent = $match->metadata['blue']['contingent_name']
                        ?? $match->metadata['blue']['city']
                        ?? $match->blueEntry?->athlete?->contingent?->name;

                    $isRedOwn = ($match->red_entry_id && $entryIds->contains($match->red_entry_id))
                        || ($match->redEntry?->athlete?->contingent_id === $contingent->id)
                        || (($match->metadata['red']['contingent_id'] ?? null) === $contingent->id);

                    $isBlueOwn = ($match->blue_entry_id && $entryIds->contains($match->blue_entry_id))
                        || ($match->blueEntry?->athlete?->contingent_id === $contingent->id)
                        || (($match->metadata['blue']['contingent_id'] ?? null) === $contingent->id);

                    return [
                        'id' => $match->id,
                        'phase' => $match->phase,
                        'round_label' => $match->round_label,
                        'pool' => $match->pool,
                        'sequence' => $match->match_sequence,
                        'match_sequence' => $match->match_sequence,
                        'position' => $match->bracket_position,
                        'bracket_position' => $match->bracket_position,
                        'red_label' => $match->red_label ?: ($match->redEntry?->athlete?->name ?? 'AKA'),
                        'blue_label' => $match->blue_label ?: ($match->blueEntry?->athlete?->name ?? 'SHIRO'),
                        'aka_label' => $match->red_label ?: ($match->redEntry?->athlete?->name ?? 'AKA'),
                        'shiro_label' => $match->blue_label ?: ($match->blueEntry?->athlete?->name ?? 'SHIRO'),
                        'red_entry_id' => $match->red_entry_id ?? ($match->metadata['red']['entry_id'] ?? null),
                        'blue_entry_id' => $match->blue_entry_id ?? ($match->metadata['blue']['entry_id'] ?? null),
                        'aka_contingent' => $akaContingent,
                        'shiro_contingent' => $shiroContingent,
                        'red_contingent' => $akaContingent,
                        'blue_contingent' => $shiroContingent,
                        'is_involving_own' => $isRedOwn || $isBlueOwn,
                        'is_bye' => (bool) $match->is_bye,
                        'is_ready' => ! ($match->metadata['placeholder'] ?? false),
                        'status' => $match->status,
                        'court' => $match->court?->name ?? 'Belum Ditentukan',
                        'metadata' => $match->metadata,
                        'score' => $match->randoriScore ? [
                            'winner_corner' => $match->randoriScore->winner_corner,
                            'aka_total' => $match->randoriScore->aka_total,
                            'shiro_total' => $match->randoriScore->shiro_total,
                            'is_locked' => $match->randoriScore->locked_at !== null,
                        ] : null,
                    ];
                })->values();
            }
        }

        $matches = TournamentMatch::query()
            ->whereBelongsTo($event)
            ->where(function ($matchQuery) use ($entryIds): void {
                $matchQuery->whereIn('red_entry_id', $entryIds)
                    ->orWhereIn('blue_entry_id', $entryIds);
            })
            ->whereHas('matchCategory', fn ($query) => $query->where('type', 'randori'))
            ->with([
                'matchCategory:id,name,type',
                'court:id,name',
                'randoriScore',
                'redEntry.athlete:id,name',
                'blueEntry.athlete:id,name',
            ])
            ->orderByRaw("CASE 
                WHEN status = 'completed' THEN 0 
                WHEN status = 'in_progress' THEN 1 
                WHEN status = 'ready' THEN 2 
                ELSE 3 END")
            ->orderBy('scheduled_start_at')
            ->orderBy('match_sequence')
            ->get();

        $scores = $matches->map(function (TournamentMatch $match) use ($entryIds): array {
            $score = $match->randoriScore;
            $ownCorner = $entryIds->contains($match->red_entry_id) ? 'aka' : 'shiro';
            $isVerified = $score && $score->status === 'verified';

            return [
                'id' => $score?->id ?? $match->id,
                'match_id' => $match->id,
                'category_id' => $match->event_match_category_id,
                'category' => $match->matchCategory?->name,
                'round' => $match->round_label,
                'sequence' => $match->match_sequence,
                'court' => $match->court?->name ?? 'Belum Ditentukan',
                'aka_label' => $match->red_label ?: ($match->redEntry?->athlete?->name ?? 'AKA'),
                'shiro_label' => $match->blue_label ?: ($match->blueEntry?->athlete?->name ?? 'SHIRO'),
                'aka_total' => $isVerified ? (int) $score->aka_total : '-',
                'shiro_total' => $isVerified ? (int) $score->shiro_total : '-',
                'winner_corner' => $isVerified ? $score->winner_corner : null,
                'own_corner' => $ownCorner,
                'is_winner' => $isVerified && $score->winner_corner === $ownCorner,
                'is_played' => $isVerified,
                'signatures_count' => $score ? collect($score->signatures ?? [])->filter()->count() : 0,
                'status' => $match->status,
                'status_label' => $isVerified
                    ? ($score->winner_corner === $ownCorner ? 'MENANG' : ($score->winner_corner ? 'KALAH' : 'SELESAI'))
                    : match ($match->status) {
                        'in_progress' => 'Sedang Berlangsung',
                        'ready' => 'Siap Tanding',
                        default => 'Belum Tanding',
                    },
                'verified_at' => $score?->verified_at?->toIso8601String(),
            ];
        });

        // Entry randori yang belum digenerate bagan/partainya
        $matchedRedBlueIds = $matches->pluck('red_entry_id')->merge($matches->pluck('blue_entry_id'))->filter();
        $unmatchedRandoriEntries = AthleteMatchCategoryEntry::query()
            ->whereBelongsTo($event)
            ->whereIn('id', $entryIds)
            ->whereNotIn('id', $matchedRedBlueIds)
            ->whereHas('matchCategory', fn ($query) => $query->where('type', 'randori'))
            ->with(['matchCategory:id,name,type', 'athlete:id,name'])
            ->get();

        $unmatchedScores = $unmatchedRandoriEntries->map(function (AthleteMatchCategoryEntry $entry): array {
            return [
                'id' => $entry->id,
                'match_id' => null,
                'category_id' => $entry->event_match_category_id,
                'category' => $entry->matchCategory?->name,
                'round' => 'Menunggu Bagan',
                'sequence' => '-',
                'court' => '-',
                'aka_label' => $entry->athlete?->name ?? 'Atlet Kontingen',
                'shiro_label' => 'Menunggu Lawan',
                'aka_total' => '-',
                'shiro_total' => '-',
                'winner_corner' => null,
                'own_corner' => 'aka',
                'is_winner' => false,
                'is_played' => false,
                'status' => 'pending',
                'status_label' => 'Bagan Belum Rilis',
                'signatures_count' => 0,
                'verified_at' => null,
            ];
        });

        $allRandoriResults = $scores->concat($unmatchedScores)->values();

        return $this->render('randori-results', $contingent, $event, $eventOptions, [
            'randori_results' => $allRandoriResults,
            'categories' => $categories,
            'selected_category' => $selectedCategory ? [
                'id' => $selectedCategory->id,
                'name' => $selectedCategory->name,
                'gender' => $selectedCategory->gender,
                'format' => $format,
            ] : null,
            'bracket_matches' => $bracketMatches,
            'my_contingent' => [
                'id' => $contingent->id,
                'name' => $contingent->name,
            ],
            'highlight_entry_ids' => $entryIds->values()->all(),
            'highlight_athlete_names' => $myRandoriEntries->pluck('athlete.name')->filter()->unique()->values()->all(),
        ]);
    }

    public function categoryResults(Request $request): Response
    {
        [$contingent, $event, $eventOptions] = $this->context($request);
        $entryIds = $this->entryIds($event, $contingent);

        $myEntries = AthleteMatchCategoryEntry::query()
            ->whereBelongsTo($event)
            ->whereIn('id', $entryIds)
            ->with(['athlete:id,name,contingent_id', 'matchCategory:id,name,type,gender'])
            ->get();

        $myCategoryIds = $myEntries->pluck('event_match_category_id')->filter()->unique()->values();

        $categories = EventMatchCategory::query()
            ->whereBelongsTo($event)
            ->whereIn('id', $myCategoryIds)
            ->orderBy('type')
            ->orderBy('name')
            ->get(['id', 'event_id', 'name', 'type', 'gender', 'capacity']);

        $categoryOptions = $categories->map(function (EventMatchCategory $cat) use ($myEntries): array {
            $ownCount = $myEntries->where('event_match_category_id', $cat->id)->count();

            return [
                'id' => $cat->id,
                'name' => $cat->name,
                'type' => $cat->type,
                'gender' => $cat->gender,
                'own_athletes_count' => $ownCount,
            ];
        })->values();

        $requestedCategoryId = $request->string('category_id')->toString();
        $selectedCategoryId = $myCategoryIds->contains($requestedCategoryId)
            ? $requestedCategoryId
            : $myCategoryIds->first();

        $selectedCategory = $categories->firstWhere('id', $selectedCategoryId);

        $champions = collect();
        $matches = collect();

        if ($selectedCategory) {
            $champions = TournamentResult::query()
                ->whereBelongsTo($event)
                ->where('event_match_category_id', $selectedCategory->id)
                ->with(['contingent:id,name', 'athlete:id,name'])
                ->orderBy('rank')
                ->get()
                ->map(function (TournamentResult $res) use ($contingent): array {
                    return [
                        'id' => $res->id,
                        'rank' => (int) $res->rank->value,
                        'rank_label' => $res->rank->label(),
                        'contingent_id' => $res->contingent_id,
                        'contingent_name' => $res->contingent?->name ?? $res->contingent_name ?? '—',
                        'athlete_name' => $res->athlete?->name ?? $res->participant_key ?? '—',
                        'is_own' => $res->contingent_id === $contingent->id,
                    ];
                });

            if ($selectedCategory->type === 'embu') {
                $matches = TournamentMatch::query()
                    ->whereBelongsTo($event)
                    ->where('event_match_category_id', $selectedCategory->id)
                    ->with([
                        'court:id,name',
                        'embuScores' => fn ($query) => $query->orderByDesc('tiebreak_round'),
                        'participantEntry.athlete.contingent:id,name',
                    ])
                    ->orderBy('round_label')
                    ->orderBy('pool')
                    ->orderBy('match_sequence')
                    ->get()
                    ->map(function (TournamentMatch $match) use ($contingent, $entryIds): array {
                        $embuScore = $match->embuScores->first();
                        $isVerified = $embuScore?->status === 'verified';
                        $participantContingent = $match->metadata['contingent_name']
                            ?? $match->participantEntry?->athlete?->contingent?->name
                            ?? '—';
                        $isOwn = $entryIds->contains($match->participant_entry_id)
                            || ($match->participantEntry?->athlete?->contingent_id === $contingent->id)
                            || (($match->metadata['contingent_id'] ?? null) === $contingent->id);

                        return [
                            'id' => $match->id,
                            'sequence' => $match->match_sequence,
                            'round_label' => $match->round_label,
                            'pool' => $match->pool,
                            'court' => $match->court?->name ?? 'Belum Ditentukan',
                            'participant_label' => $match->participant_label ?: ($match->participantEntry?->athlete?->name ?? '—'),
                            'contingent_name' => $participantContingent,
                            'is_own' => $isOwn,
                            'final_score' => $isVerified ? (float) $embuScore->final_score : ($embuScore?->final_score ? (float) $embuScore->final_score : null),
                            'middle_score' => $isVerified ? (float) $embuScore->middle_score : null,
                            'total_penalty' => $isVerified ? $embuScore->effectiveTotalPenalty() : null,
                            'duration_seconds' => $isVerified ? $embuScore->duration_seconds : null,
                            'status' => $match->status,
                            'status_label' => match ($match->status) {
                                'completed' => $isVerified ? 'Selesai' : 'Menunggu Verifikasi',
                                'in_progress' => 'Sedang Tanding',
                                'ready' => 'Siap Tanding',
                                default => 'Belum Tanding',
                            },
                        ];
                    });
            } else {
                $drawing = TournamentDrawing::query()
                    ->whereBelongsTo($event)
                    ->where('event_match_category_id', $selectedCategory->id)
                    ->first();
                $format = $drawing?->bracket_type ?? $selectedCategory->preferred_bracket_type ?? 'single_elimination';

                $matches = TournamentMatch::query()
                    ->whereBelongsTo($event)
                    ->where('event_match_category_id', $selectedCategory->id)
                    ->with([
                        'court:id,name',
                        'randoriScore',
                        'redEntry.athlete.contingent:id,name',
                        'blueEntry.athlete.contingent:id,name',
                    ])
                    ->orderBy('bracket_position')
                    ->orderBy('match_sequence')
                    ->get()
                    ->map(function (TournamentMatch $match) use ($contingent, $entryIds): array {
                        $score = $match->randoriScore;
                        $isVerified = $score && $score->status === 'verified';

                        $redContingent = $match->metadata['red']['contingent_name']
                            ?? $match->metadata['red']['city']
                            ?? $match->redEntry?->athlete?->contingent?->name
                            ?? '—';
                        $isRedOwn = ($match->red_entry_id && $entryIds->contains($match->red_entry_id))
                            || ($match->redEntry?->athlete?->contingent_id === $contingent->id)
                            || (($match->metadata['red']['contingent_id'] ?? null) === $contingent->id);

                        $blueContingent = $match->metadata['blue']['contingent_name']
                            ?? $match->metadata['blue']['city']
                            ?? $match->blueEntry?->athlete?->contingent?->name
                            ?? '—';
                        $isBlueOwn = ($match->blue_entry_id && $entryIds->contains($match->blue_entry_id))
                            || ($match->blueEntry?->athlete?->contingent_id === $contingent->id)
                            || (($match->metadata['blue']['contingent_id'] ?? null) === $contingent->id);

                        $redLabel = $match->red_label ?: ($match->redEntry?->athlete?->name ?? 'AKA');
                        $blueLabel = $match->blue_label ?: ($match->blueEntry?->athlete?->name ?? 'SHIRO');

                        return [
                            'id' => $match->id,
                            'phase' => $match->phase,
                            'round_label' => $match->round_label,
                            'pool' => $match->pool,
                            'sequence' => $match->match_sequence,
                            'match_sequence' => $match->match_sequence,
                            'position' => $match->bracket_position,
                            'bracket_position' => $match->bracket_position,
                            'red_label' => $redLabel,
                            'blue_label' => $blueLabel,
                            'aka_label' => $redLabel,
                            'shiro_label' => $blueLabel,
                            'red_entry_id' => $match->red_entry_id ?? ($match->metadata['red']['entry_id'] ?? null),
                            'blue_entry_id' => $match->blue_entry_id ?? ($match->metadata['blue']['entry_id'] ?? null),
                            'aka_contingent' => $redContingent,
                            'shiro_contingent' => $blueContingent,
                            'red_contingent' => $redContingent,
                            'blue_contingent' => $blueContingent,
                            'aka_contingent_id' => $match->redEntry?->athlete?->contingent_id ?? ($match->metadata['red']['contingent_id'] ?? null),
                            'shiro_contingent_id' => $match->blueEntry?->athlete?->contingent_id ?? ($match->metadata['blue']['contingent_id'] ?? null),
                            'court' => $match->court?->name ?? 'Belum Ditentukan',
                            'is_involving_own' => $isRedOwn || $isBlueOwn,
                            'is_bye' => (bool) $match->is_bye,
                            'is_ready' => ! ($match->metadata['placeholder'] ?? false),
                            'status' => $match->status,
                            'status_label' => match ($match->status) {
                                'completed' => 'Selesai',
                                'in_progress' => 'Sedang Tanding',
                                'ready' => 'Siap Tanding',
                                default => 'Belum Tanding',
                            },
                            'metadata' => $match->metadata,
                            'score' => $score ? [
                                'winner_corner' => $score->winner_corner,
                                'aka_total' => $score->aka_total,
                                'shiro_total' => $score->shiro_total,
                                'is_locked' => $score->locked_at !== null,
                            ] : null,
                            'red' => [
                                'athlete_name' => $redLabel,
                                'contingent_name' => $redContingent,
                                'is_own' => $isRedOwn,
                                'score' => $isVerified ? (int) $score->aka_total : '-',
                            ],
                            'blue' => [
                                'athlete_name' => $blueLabel,
                                'contingent_name' => $blueContingent,
                                'is_own' => $isBlueOwn,
                                'score' => $isVerified ? (int) $score->shiro_total : '-',
                            ],
                            'winner_corner' => $isVerified ? $score->winner_corner : null,
                        ];
                    });
            }
        }

        return $this->render('category-results', $contingent, $event, $eventOptions, [
            'categories' => $categoryOptions,
            'selected_category' => $selectedCategory ? [
                'id' => $selectedCategory->id,
                'name' => $selectedCategory->name,
                'type' => $selectedCategory->type,
                'gender' => $selectedCategory->gender,
                'format' => $format ?? 'single_elimination',
            ] : null,
            'champions' => $champions,
            'matches' => $matches,
            'my_contingent' => [
                'id' => $contingent->id,
                'name' => $contingent->name,
            ],
            'highlight_entry_ids' => $entryIds->values()->all(),
            'highlight_athlete_names' => $myEntries->pluck('athlete.name')->filter()->unique()->values()->all(),
        ]);
    }

    public function athletes(Request $request): Response
    {
        [$contingent, $event, $eventOptions] = $this->context($request);
        $masterContingentIds = $this->masterContingentIds($request);

        $athletes = Athlete::query()
            ->whereIn('contingent_id', $masterContingentIds)
            ->with([
                'matchCategoryEntries' => fn ($query) => $query
                    ->with('matchCategory:id,name,type'),
            ])
            ->orderBy('name')
            ->get([
                'id', 'contingent_id', 'name', 'nik', 'kenshi_number', 'gender', 'birth_place',
                'birth_date', 'blood_type', 'home_address', 'dojo_name', 'profile_photo_path',
                'kyu_dan', 'weight', 'height', 'bpjs_number', 'bpjs_status', 'school_name',
                'school_level', 'school_entry_year', 'school_grade',
            ])
            ->map(fn (Athlete $athlete): array => [
                ...$athlete->only([
                    'id', 'name', 'nik', 'kenshi_number', 'birth_place', 'blood_type',
                    'home_address', 'dojo_name', 'kyu_dan', 'weight', 'height', 'bpjs_number',
                    'bpjs_status', 'school_name', 'school_level', 'school_entry_year', 'school_grade',
                ]),
                'gender' => in_array($athlete->gender, ['male', 'putra', 'L'], true) ? 'male' : 'female',
                'birth_date' => $athlete->birth_date?->format('Y-m-d'),
                'profile_photo_url' => $athlete->profile_photo_path
                    ? route('kontingen.atlet.photo', $athlete)
                    : null,
                'match_category_entries' => $athlete->matchCategoryEntries,
            ]);

        return $this->render('athletes', $contingent, $event, $eventOptions, [
            'athletes' => $athletes,
            'kyus' => Kyu::query()
                ->where('is_active', true)
                ->orderBy('order')
                ->orderByDesc('name')
                ->pluck('name'),
        ]);
    }

    public function officials(Request $request): Response
    {
        [$contingent, $event, $eventOptions] = $this->context($request);
        $masterContingentIds = $this->masterContingentIds($request);

        $officials = Official::query()
            ->whereIn('contingent_id', $masterContingentIds)
            ->orderBy('name')
            ->get(['id', 'contingent_id', 'name', 'role', 'gender', 'phone', 'email', 'notes'])
            ->map(fn (Official $official): array => [
                ...$official->only(['id', 'name', 'role', 'phone', 'email', 'notes']),
                'gender' => in_array($official->gender, ['male', 'putra', 'L'], true) ? 'male' : 'female',
            ]);

        return $this->render('officials', $contingent, $event, $eventOptions, [
            'officials' => $officials,
        ]);
    }

    public function history(Request $request): Response
    {
        [$contingent, $event, $eventOptions] = $this->context($request);

        $registrations = Registration::query()
            ->whereHas('contingent', fn ($query) => $query->where('user_id', $request->user()->id))
            ->with([
                'event:id,name,slug,start_date,end_date,is_paid',
                'contingent' => fn ($query) => $query
                    ->select(['id', 'event_id', 'name', 'city'])
                    ->withCount(['athletes', 'officials']),
            ])
            ->latest()
            ->get()
            ->map(fn (Registration $registration): array => [
                ...$registration->only([
                    'id', 'registration_number', 'status', 'payment_status', 'final_amount',
                    'created_at', 'updated_at',
                ]),
                'status_label' => $registration->status->label(),
                'payment_status_label' => $registration->event?->is_paid
                    ? $registration->payment_status->label()
                    : 'Gratis · Tanpa Pembayaran',
                'event' => $registration->event,
                'contingent' => $registration->contingent,
                'detail_url' => route('kontingen.registrasi.detail', $registration),
            ]);

        return $this->render('history', $contingent, $event, $eventOptions, [
            'registrations' => $registrations,
        ]);
    }

    public function openRegistration(Request $request, Registration $registration): RedirectResponse
    {
        $registration->loadMissing(['contingent:id,user_id', 'event:id,slug']);
        abort_unless($registration->contingent?->user_id === $request->user()->id, 404);
        abort_unless($registration->event instanceof Event, 404);

        $request->session()->put('tenant_event_id', $registration->event->id);
        $request->session()->put('tenant_event_slug', $registration->event->slug);

        $step = max(1, min(5, $request->integer('step', 1)));

        return redirect()->route('admin.pendaftaran.registrasi.detail', [
            'registration' => $registration,
            'step' => $step,
        ]);
    }

    public function startRegistration(Request $request, Event $event): RedirectResponse
    {
        $contingent = Contingent::query()
            ->whereBelongsTo($event)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();
        $registration = Registration::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($contingent)
            ->latest()
            ->first();

        if ($registration instanceof Registration) {
            return $this->openRegistration($request, $registration);
        }

        $request->session()->put('tenant_event_id', $event->id);
        $request->session()->put('tenant_event_slug', $event->slug);

        return redirect()->route('admin.pendaftaran.registrasi.create', ['event_id' => $event->id]);
    }

    /**
     * @return array{Contingent, Event, Collection<int, array<string, mixed>>}
     */
    private function context(Request $request): array
    {
        $contingents = Contingent::query()
            ->where('user_id', $request->user()->id)
            ->with('event:id,name,slug,start_date,end_date,status,is_active,is_paid,fee_per_athlete,fee_per_contingent')
            ->withCount(['athletes', 'officials'])
            ->orderByDesc(Event::select('is_active')->whereColumn('events.id', 'contingents.event_id'))
            ->orderByDesc('created_at')
            ->get();

        $requestedEventId = $request->query('event_id');
        abort_unless($requestedEventId === null || is_string($requestedEventId), 404, 'Event kontingen tidak ditemukan.');
        $requestedEventId = $requestedEventId === 'all' ? null : $requestedEventId;

        $tenantEventId = $request->session()->get('tenant_event_id');
        $requestedContingent = $requestedEventId
            ? $contingents->firstWhere('event_id', $requestedEventId)
            : null;
        if ($requestedEventId) {
            abort_unless($requestedContingent instanceof Contingent, 404, 'Event kontingen tidak ditemukan.');
        }

        $contingent = $requestedContingent
            ?? $contingents->firstWhere('event_id', $tenantEventId)
            ?? $contingents->first(fn (Contingent $item): bool => (bool) $item->event?->is_active)
            ?? $contingents->first();

        abort_unless($contingent?->event instanceof Event, 404, 'Event kontingen tidak ditemukan.');

        $event = $contingent->event;
        $request->session()->put('tenant_event_id', $event->id);
        $request->session()->put('tenant_event_slug', $event->slug);

        $eventOptions = $contingents
            ->filter(fn (Contingent $item): bool => $item->event instanceof Event)
            ->map(fn (Contingent $item): array => [
                'id' => $item->event->id,
                'name' => $item->event->name,
                'slug' => $item->event->slug,
                'start_date' => $item->event->start_date?->format('Y-m-d'),
                'end_date' => $item->event->end_date?->format('Y-m-d'),
                'status' => $item->event->status->value,
                'status_label' => $item->event->status->label(),
                'is_active' => (bool) $item->event->is_active,
                'contingent_name' => $item->name,
            ])
            ->unique('id')
            ->values();

        return [$contingent, $event, $eventOptions];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $eventOptions
     * @param  array<string, mixed>  $props
     */
    private function render(
        string $section,
        Contingent $contingent,
        Event $event,
        Collection $eventOptions,
        array $props = [],
    ): Response {
        return Inertia::render('Contingent/Portal', [
            'section' => $section,
            'portal' => [
                'contingent' => $contingent->only([
                    'id', 'name', 'city', 'manager_name', 'phone', 'email', 'address',
                    'athletes_count', 'officials_count',
                ]),
                'event' => [
                    ...$event->only([
                        'id', 'name', 'slug', 'start_date', 'end_date', 'is_paid',
                        'fee_per_athlete', 'fee_per_contingent',
                    ]),
                    'status' => $event->status->value,
                    'status_label' => $event->status->label(),
                ],
                'event_options' => $eventOptions,
            ],
            ...$props,
        ]);
    }

    /** @return Collection<int, string> */
    private function entryIds(Event $event, Contingent $contingent): Collection
    {
        return AthleteMatchCategoryEntry::query()
            ->whereBelongsTo($event)
            ->whereHas('athlete', fn ($query) => $query->whereBelongsTo($contingent))
            ->pluck('id');
    }

    /** @return Collection<int, string> */
    private function masterContingentIds(Request $request): Collection
    {
        $ownedContingents = Contingent::query()
            ->where('user_id', $request->user()->id)
            ->get(['id', 'source_contingent_id']);
        $ownedIds = $ownedContingents->pluck('id');

        return $ownedContingents
            ->map(fn (Contingent $ownedContingent): string => $ownedContingent->source_contingent_id
                && $ownedIds->contains($ownedContingent->source_contingent_id)
                    ? $ownedContingent->source_contingent_id
                    : $ownedContingent->id)
            ->unique()
            ->values();
    }
}
