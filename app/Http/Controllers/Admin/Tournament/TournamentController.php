<?php

namespace App\Http\Controllers\Admin\Tournament;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Tournament\StoreCombinedEventMatchCategoryMergeRequest;
use App\Http\Requests\Admin\Tournament\StoreEventMatchCategoryMergeRequest;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Services\TournamentDrawingGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TournamentController extends Controller
{
    /**
     * Display tournament drawing and match brackets.
     */
    public function drawing(Request $request, TournamentDrawingGenerator $generator): Response
    {
        $activeEvent = $this->eventForRequest($request);
        $prechecks = $activeEvent instanceof Event ? $generator->precheck($activeEvent) : collect();
        $drawings = $activeEvent instanceof Event
            ? $activeEvent->tournamentDrawings()->get()->keyBy('event_match_category_id')
            : collect();
        $categories = $prechecks->map(function (array $check) use ($drawings): array {
            $drawing = $drawings->get($check['id']);

            return [
                ...collect($check)->except('participants')->all(),
                'type_label' => ucfirst($check['type']),
                'quota' => $check['capacity'],
                'drawing_status' => $drawing?->status ?? 'draft',
                'drawing_id' => $drawing?->id,
            ];
        })->values();

        $selectedCategoryId = $request->string('category')->toString() ?: $categories->first()['id'] ?? null;
        $selectedCategory = $activeEvent instanceof Event && $selectedCategoryId
            ? $activeEvent->matchCategories()->where('is_active', true)->find($selectedCategoryId)
            : null;
        $participants = $selectedCategory instanceof EventMatchCategory
            ? $generator->participantsFor($activeEvent, $selectedCategory)
            : collect();
        $contestants = $participants->map(fn (array $participant, int $index) => [
            'id' => $participant['key'],
            'entry_id' => $participant['entry_id'],
            'seed' => $index + 1,
            'name' => $participant['label'],
            'contingent' => $participant['contingent_name'],
            'city' => $participant['city'],
            'members' => $participant['members'] ?? [],
        ])->values();
        $selectedDrawing = $selectedCategory
            ? TournamentDrawing::query()
                ->whereBelongsTo($activeEvent)
                ->where('event_match_category_id', $selectedCategory->id)
                ->with(['matches.court:id,name', 'matches.rundown:id,name'])
                ->first()
            : null;
        $matches = $selectedDrawing?->matches->map(fn ($match) => [
            'id' => $match->id,
            'phase' => $match->phase,
            'round_label' => $match->round_label,
            'pool' => $match->pool,
            'sequence' => $match->match_sequence,
            'position' => $match->bracket_position,
            'red_label' => $match->red_label,
            'blue_label' => $match->blue_label,
            'participant_label' => $match->participant_label,
            'is_bye' => $match->is_bye,
            'status' => $match->status,
            'court' => $match->court?->name,
            'session' => $match->rundown?->name,
            'scheduled_start' => $match->scheduled_start_at?->format('Y-m-d H:i'),
            'scheduled_start_formatted' => $match->scheduled_start_at?->translatedFormat('d M, H:i'),
            'scheduled_end_formatted' => $match->scheduled_end_at?->format('H:i'),
            'metadata' => $match->metadata,
        ])->values() ?? collect();
        $scheduleCourts = $activeEvent instanceof Event
            ? $activeEvent->courts()->where('is_active', true)->get(['id', 'name'])->map(fn ($court) => [
                'id' => $court->id,
                'name' => $court->name,
            ])->values()
            : collect();
        $scheduleSessions = $activeEvent instanceof Event
            ? $activeEvent->rundowns()->where('is_match_session', true)->orderBy('date')->get()->map(fn ($session) => [
                'id' => $session->id,
                'name' => $session->name,
                'date' => $session->date?->format('Y-m-d'),
                'date_formatted' => $session->date?->translatedFormat('d F Y'),
                'start_time' => $session->date?->format('H:i'),
                'end_time' => $session->end_time?->format('H:i'),
            ])->values()
            : collect();
        $eventSchedule = $activeEvent instanceof Event
            ? $activeEvent->tournamentMatches()
                ->whereNotNull('scheduled_start_at')
                ->with(['matchCategory:id,name,type', 'court:id,name', 'rundown:id,name'])
                ->orderBy('scheduled_start_at')
                ->orderBy('match_sequence')
                ->get()
                ->map(fn ($match) => [
                    'id' => $match->id,
                    'category_id' => $match->event_match_category_id,
                    'category_name' => $match->matchCategory?->name,
                    'category_type' => $match->matchCategory?->type,
                    'court_id' => $match->event_court_id,
                    'court' => $match->court?->name,
                    'session_id' => $match->rundown_id,
                    'session' => $match->rundown?->name,
                    'phase' => $match->phase,
                    'round_label' => $match->round_label,
                    'sequence' => $match->match_sequence,
                    'red_label' => $match->red_label,
                    'blue_label' => $match->blue_label,
                    'participant_label' => $match->participant_label,
                    'is_bye' => $match->is_bye,
                    'scheduled_start' => $match->scheduled_start_at?->format('Y-m-d H:i'),
                    'scheduled_date_formatted' => $match->scheduled_start_at?->translatedFormat('d M Y'),
                    'scheduled_start_formatted' => $match->scheduled_start_at?->format('H:i'),
                    'scheduled_start_input' => $match->scheduled_start_at?->format('H:i'),
                    'scheduled_end_formatted' => $match->scheduled_end_at?->format('H:i'),
                ])->values()
            : collect();
        $workflowStatus = match (true) {
            $drawings->contains(fn (TournamentDrawing $drawing) => $drawing->status === 'in_progress') => 'in_progress',
            $drawings->contains(fn (TournamentDrawing $drawing) => $drawing->status === 'completed') => 'completed',
            $drawings->contains(fn (TournamentDrawing $drawing) => $drawing->status === 'published') => 'published',
            $drawings->contains(fn (TournamentDrawing $drawing) => $drawing->status === 'generated') => 'generated',
            default => 'draft',
        };

        return Inertia::render('Admin/Tournament/Drawing', [
            'activeEvent' => $activeEvent?->only(['id', 'name', 'venue', 'city', 'start_date', 'end_date']),
            'events' => $this->accessibleEvents($request),
            'categories' => $categories,
            'selectedCategory' => $selectedCategory?->id,
            'contestants' => $contestants,
            'drawing' => $selectedDrawing ? [
                'id' => $selectedDrawing->id,
                'status' => $selectedDrawing->status,
                'format' => $selectedDrawing->bracket_type,
                'participant_count' => $selectedDrawing->participant_count,
                'contingent_count' => $selectedDrawing->contingent_count,
                'skip_reason' => $selectedDrawing->skip_reason,
            ] : null,
            'matches' => $matches,
            'scheduleCourts' => $scheduleCourts,
            'scheduleSessions' => $scheduleSessions,
            'eventSchedule' => $eventSchedule,
            'workflow' => [
                'status' => $workflowStatus,
                'total_categories' => $categories->count(),
                'ready_categories' => $categories->where('is_eligible', true)->count(),
                'merge_categories' => $categories->where('is_eligible', false)->count(),
                'generated_categories' => $drawings->whereIn('status', ['generated', 'published', 'in_progress', 'completed'])->count(),
                'skipped_categories' => $drawings->where('status', 'skipped')->count(),
                'total_matches' => $activeEvent?->tournamentMatches()->count() ?? 0,
            ],
            'settings' => $activeEvent ? [
                'match_duration_minutes' => (int) $activeEvent->match_duration_minutes,
                'minimum_rest_minutes' => (int) $activeEvent->minimum_rest_minutes,
                'minimum_entries_per_category' => (int) $activeEvent->minimum_entries_per_category,
                'minimum_contingents_per_category' => (int) $activeEvent->minimum_contingents_per_category,
                'courts_count' => $activeEvent->courts()->where('is_active', true)->count(),
                'sessions_count' => $activeEvent->rundowns()->where('is_match_session', true)->count(),
            ] : null,
            'canManageDrawing' => $this->canManageTournament($request, $activeEvent),
        ]);
    }

    public function generate(Request $request, TournamentDrawingGenerator $generator): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);

        $result = $generator->generate($activeEvent);

        return back()->with('success', "Generate selesai: {$result['generated']} nomor dibuat, {$result['skipped']} nomor perlu merge.");
    }

    public function redrawCategory(Request $request, EventMatchCategory $matchCategory, TournamentDrawingGenerator $generator): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);
        abort_unless($matchCategory->event_id === $activeEvent->id && $matchCategory->is_active, 404);

        if ($matchCategory->tournamentDrawing()->where('status', 'published')->exists()) {
            throw ValidationException::withMessages([
                'drawing' => 'Bagan sudah dipublikasikan. Buka kunci/reset terlebih dahulu sebelum melakukan drawing ulang.',
            ]);
        }

        $generator->generate($activeEvent, $matchCategory);

        return back()->with('success', "Drawing '{$matchCategory->name}' berhasil dibuat ulang.");
    }

    public function publish(Request $request): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);

        if (! $activeEvent->tournamentDrawings()->where('status', 'generated')->exists()) {
            throw ValidationException::withMessages(['drawing' => 'Belum ada bagan hasil generate yang dapat dipublikasikan.']);
        }

        $activeEvent->tournamentDrawings()->where('status', 'generated')->update([
            'status' => 'published',
            'published_at' => now(),
        ]);

        return back()->with('success', 'Bagan dan jadwal event telah dipublikasikan dan dikunci.');
    }

    public function unpublish(Request $request): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);

        if ($activeEvent->tournamentDrawings()->whereIn('status', ['in_progress', 'completed'])->exists()
            || $activeEvent->tournamentMatches()->whereIn('status', ['live', 'finished'])->exists()) {
            throw ValidationException::withMessages([
                'drawing' => 'Publikasi tidak dapat dibatalkan karena pertandingan sudah dimulai.',
            ]);
        }

        if (! $activeEvent->tournamentDrawings()->where('status', 'published')->exists()) {
            throw ValidationException::withMessages([
                'drawing' => 'Tidak ada drawing berstatus publikasi yang dapat dikembalikan.',
            ]);
        }

        $activeEvent->tournamentDrawings()->where('status', 'published')->update([
            'status' => 'generated',
            'published_at' => null,
        ]);

        return back()->with('success', 'Publikasi dibatalkan. Drawing dan jadwal kembali dapat disesuaikan.');
    }

    public function updateSchedule(Request $request, TournamentMatch $tournamentMatch): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);
        abort_unless($tournamentMatch->event_id === $activeEvent->id, 404);

        $tournamentMatch->loadMissing('drawing');
        if ($tournamentMatch->drawing?->status !== 'generated') {
            throw ValidationException::withMessages([
                'schedule' => 'Kembalikan publikasi ke tahap penyusunan sebelum mengubah jadwal.',
            ]);
        }

        $validated = $request->validate([
            'event_court_id' => ['required', 'uuid'],
            'rundown_id' => ['required', 'uuid'],
            'start_time' => ['required', 'date_format:H:i'],
        ]);
        $court = $activeEvent->courts()
            ->where('is_active', true)
            ->find($validated['event_court_id']);
        $session = $activeEvent->rundowns()
            ->where('is_match_session', true)
            ->find($validated['rundown_id']);

        if ($court === null || $session === null) {
            throw ValidationException::withMessages([
                'schedule' => 'Court atau sesi pertandingan tidak tersedia pada event ini.',
            ]);
        }

        $start = CarbonImmutable::instance($session->date)
            ->setTimeFromTimeString($validated['start_time']);
        $end = $start->addMinutes(max(1, (int) $activeEvent->match_duration_minutes));
        $sessionStart = CarbonImmutable::instance($session->date);
        $sessionEnd = $session->end_time
            ? CarbonImmutable::instance($session->end_time)
            : $sessionStart->addHours(4);

        if ($start->lessThan($sessionStart) || $end->greaterThan($sessionEnd)) {
            throw ValidationException::withMessages([
                'start_time' => 'Jam pertandingan harus berada di dalam rentang sesi yang dipilih.',
            ]);
        }

        $categoryMatches = $activeEvent->tournamentMatches()
            ->where('event_match_category_id', $tournamentMatch->event_match_category_id)
            ->get();
        $proposedSchedules = $categoryMatches
            ->filter(fn (TournamentMatch $match) => $match->id === $tournamentMatch->id || ($match->scheduled_start_at && $match->scheduled_end_at))
            ->map(fn (TournamentMatch $match) => [
                'id' => $match->id,
                'start' => $match->id === $tournamentMatch->id
                    ? $start
                    : CarbonImmutable::instance($match->scheduled_start_at),
                'end' => $match->id === $tournamentMatch->id
                    ? $end
                    : CarbonImmutable::instance($match->scheduled_end_at),
            ])->values();

        foreach ($proposedSchedules as $index => $proposed) {
            $internalConflict = $proposedSchedules->slice($index + 1)->contains(
                fn (array $other) => $proposed['start']->lessThan($other['end'])
                    && $proposed['end']->greaterThan($other['start']),
            );
            $externalConflict = $activeEvent->tournamentMatches()
                ->whereNotIn('id', $categoryMatches->modelKeys())
                ->where('event_court_id', $court->id)
                ->whereNotNull('scheduled_start_at')
                ->where('scheduled_start_at', '<', $proposed['end'])
                ->where('scheduled_end_at', '>', $proposed['start'])
                ->exists();

            if ($internalConflict || $externalConflict) {
                throw ValidationException::withMessages([
                    'schedule' => 'Jadwal bentrok dengan partai lain pada court yang dipilih.',
                ]);
            }
        }

        DB::transaction(function () use ($categoryMatches, $court, $tournamentMatch, $session, $start, $end): void {
            TournamentMatch::query()
                ->whereIn('id', $categoryMatches->modelKeys())
                ->update(['event_court_id' => $court->id]);
            $tournamentMatch->update([
                'event_court_id' => $court->id,
                'rundown_id' => $session->id,
                'scheduled_start_at' => $start,
                'scheduled_end_at' => $end,
            ]);
        });

        return back()->with('success', 'Jadwal partai berhasil diperbarui. Court diterapkan ke seluruh nomor pertandingan.');
    }

    public function start(Request $request): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);

        if (! $activeEvent->tournamentDrawings()->where('status', 'published')->exists()) {
            throw ValidationException::withMessages(['drawing' => 'Publikasikan bagan sebelum pertandingan dimulai.']);
        }

        $activeEvent->tournamentDrawings()->where('status', 'published')->update(['status' => 'in_progress']);

        return back()->with('success', 'Pertandingan event dimulai. Bagan sekarang terkunci untuk operasional lapangan.');
    }

    public function complete(Request $request): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);

        if (! $activeEvent->tournamentDrawings()->where('status', 'in_progress')->exists()) {
            throw ValidationException::withMessages(['drawing' => 'Belum ada pertandingan aktif yang dapat diselesaikan.']);
        }

        $activeEvent->tournamentDrawings()->where('status', 'in_progress')->update(['status' => 'completed']);

        return back()->with('success', 'Seluruh drawing event ditandai selesai.');
    }

    public function resetCompetition(Request $request): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);

        if (! $activeEvent->tournamentDrawings()->whereIn('status', ['published', 'in_progress', 'completed'])->exists()) {
            throw ValidationException::withMessages([
                'drawing' => 'Belum ada pertandingan yang dipublikasikan, dimulai, atau diselesaikan untuk direset.',
            ]);
        }

        DB::transaction(function () use ($activeEvent): void {
            $activeEvent->tournamentDrawings()
                ->whereIn('status', ['published', 'in_progress', 'completed'])
                ->update([
                    'status' => 'generated',
                    'published_at' => null,
                ]);

            $activeEvent->tournamentMatches()->get()->each(function (TournamentMatch $match): void {
                $metadata = $match->metadata ?? [];
                unset(
                    $metadata['rank'],
                    $metadata['score'],
                    $metadata['total_score'],
                    $metadata['result'],
                    $metadata['winner'],
                );

                $match->update([
                    'status' => 'pending',
                    'metadata' => $metadata,
                ]);
            });
        });

        return back()->with('success', 'Pertandingan berhasil direset. Bagan dan jadwal tetap tersimpan dan dapat disesuaikan kembali.');
    }

    public function reset(Request $request): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);

        if ($activeEvent->tournamentDrawings()->whereIn('status', ['in_progress', 'completed'])->exists()
            || $activeEvent->tournamentMatches()->whereIn('status', ['live', 'finished'])->exists()) {
            throw ValidationException::withMessages(['drawing' => 'Drawing tidak dapat direset karena pertandingan sudah dimulai.']);
        }

        $activeEvent->tournamentDrawings()->delete();

        return back()->with('success', 'Drawing dikembalikan ke Draft. Data peserta dan pengaturan event tetap tersimpan.');
    }

    /**
     * Display merge tournament category tool.
     */
    public function merge(Request $request, TournamentDrawingGenerator $generator): Response
    {
        $activeEvent = $this->eventForRequest($request);

        $matchCategories = $activeEvent instanceof Event
            ? $activeEvent->matchCategories()
                ->with([
                    'mergedInto:id,name',
                    'mergedSources:id,name,merged_into_id',
                    'mergedSources.athleteEntries.athlete:id,contingent_id',
                    'athleteEntries.athlete:id,contingent_id',
                ])
                ->orderBy('order')->get()
            : collect();
        $minimumQuota = max(1, (int) ($activeEvent?->minimum_entries_per_category ?? 3));
        $minimumContingents = max(1, (int) ($activeEvent?->minimum_contingents_per_category ?? 3));

        $categories = $matchCategories->map(function (EventMatchCategory $matchCategory) use ($activeEvent, $generator, $matchCategories, $minimumQuota, $minimumContingents) {
            $participants = $activeEvent instanceof Event
                ? $generator->participantsFor($activeEvent, $matchCategory)
                : collect();
            $participantsCount = $participants->count();
            $contingentsCount = $participants->pluck('contingent_id')->filter()->unique()->count();
            $isMerged = $matchCategory->merged_into_id !== null;
            $isUnderQuota = ! $isMerged
                && $matchCategory->is_active
                && ($participantsCount < $minimumQuota || $contingentsCount < $minimumContingents);

            return [
                'id' => $matchCategory->id,
                'name' => $matchCategory->name,
                'type' => ucfirst($matchCategory->type),
                'type_key' => $matchCategory->type,
                'participants_count' => $participantsCount,
                'contingents_count' => $contingentsCount,
                'participant_label' => $matchCategory->type === 'embu' ? 'Tim' : 'Atlet',
                'is_combined' => $matchCategory->is_combined,
                'min_quota' => $minimumQuota,
                'min_contingents' => $minimumContingents,
                'reason' => $isUnderQuota
                    ? "Membutuhkan minimal {$minimumQuota} peserta/tim dari {$minimumContingents} kontingen."
                    : null,
                'status' => $isMerged ? 'merged' : ($isUnderQuota ? 'under_quota' : 'eligible'),
                'merged_into' => $matchCategory->mergedInto?->only(['id', 'name']),
                'merged_sources' => $matchCategory->mergedSources->map(function (EventMatchCategory $source) use ($activeEvent, $generator) {
                    $sourceParticipants = $generator->participantsFor($activeEvent, $source);

                    return [
                        'id' => $source->id,
                        'name' => $source->name,
                        'participants_count' => $sourceParticipants->count(),
                        'contingents_count' => $sourceParticipants->pluck('contingent_id')->filter()->unique()->count(),
                    ];
                })->values(),
                'merge_targets' => $isUnderQuota
                    ? $matchCategories
                        ->filter(fn (EventMatchCategory $target) => $target->is_active
                            && $target->merged_into_id === null
                            && $target->id !== $matchCategory->id
                            && $target->type === $matchCategory->type
                            && $target->gender === $matchCategory->gender)
                        ->map(fn (EventMatchCategory $target) => ['id' => $target->id, 'name' => $target->name])
                        ->values()
                    : [],
            ];
        })->values();

        return Inertia::render('Admin/Tournament/Merge', [
            'activeEvent' => $activeEvent?->only(['id', 'name', 'venue', 'city']),
            'events' => $this->accessibleEvents($request),
            'categories' => $categories,
            'canManageMerge' => $this->canManageTournament($request, $activeEvent),
            'drawingUrl' => '/admin/pertandingan/drawing?event_id='.$activeEvent?->id,
        ]);
    }

    /**
     * Create one new combined category from several under-quota categories.
     */
    public function storeCombinedMerge(StoreCombinedEventMatchCategoryMergeRequest $request, TournamentDrawingGenerator $generator): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);

        $sourceIds = $request->validated('source_category_ids');
        $sources = $activeEvent->matchCategories()
            ->whereIn('id', $sourceIds)
            ->where('is_active', true)
            ->whereNull('merged_into_id')
            ->with('athleteEntries.athlete:id,contingent_id')
            ->get();

        if ($sources->count() !== count($sourceIds)) {
            throw ValidationException::withMessages([
                'source_category_ids' => 'Salah satu nomor pertandingan tidak tersedia atau sudah pernah digabung.',
            ]);
        }

        if ($sources->pluck('type')->unique()->count() !== 1) {
            throw ValidationException::withMessages([
                'source_category_ids' => 'Semua nomor yang digabung harus memiliki jenis pertandingan yang sama.',
            ]);
        }

        $minimumEntries = max(1, (int) $activeEvent->minimum_entries_per_category);
        $minimumContingents = max(1, (int) $activeEvent->minimum_contingents_per_category);
        $hasEligibleSource = $sources->contains(function (EventMatchCategory $source) use ($activeEvent, $generator, $minimumEntries, $minimumContingents): bool {
            $participants = $generator->participantsFor($activeEvent, $source);

            return $participants->count() >= $minimumEntries
                && $participants->pluck('contingent_id')->filter()->unique()->count() >= $minimumContingents;
        });

        if ($hasEligibleSource) {
            throw ValidationException::withMessages([
                'source_category_ids' => 'Merge hanya dapat memakai nomor yang belum memenuhi ambang peserta atau kontingen event.',
            ]);
        }

        $combinedName = trim($request->validated('combined_name'));
        if ($activeEvent->matchCategories()->whereRaw('LOWER(name) = ?', [mb_strtolower($combinedName)])->exists()) {
            throw ValidationException::withMessages([
                'combined_name' => 'Nama nomor pertandingan ini sudah digunakan pada event.',
            ]);
        }

        DB::transaction(function () use ($activeEvent, $sources, $combinedName): void {
            $sameAgeCategory = $sources->pluck('age_category_id')->filter()->unique();
            $combined = EventMatchCategory::create([
                'event_id' => $activeEvent->id,
                'age_category_id' => $sameAgeCategory->count() === 1 ? $sameAgeCategory->first() : null,
                'name' => $combinedName,
                'type' => $sources->first()->type,
                'gender' => $sources->pluck('gender')->unique()->count() === 1 ? $sources->first()->gender : 'mixed',
                'capacity' => max(8, (int) $sources->sum('capacity')),
                'max_athletes_per_team' => (int) $sources->max('max_athletes_per_team'),
                'min_weight' => $sources->min('min_weight'),
                'max_weight' => $sources->max('max_weight'),
                'is_combined' => true,
                'order' => (int) $activeEvent->matchCategories()->max('order') + 1,
                'is_active' => true,
            ]);

            $sources->toQuery()->update([
                'merged_into_id' => $combined->id,
                'is_active' => false,
            ]);

            $activeEvent->tournamentDrawings()->whereIn('event_match_category_id', $sources->modelKeys())->delete();
        });

        return back()->with('success', "Nomor gabungan '{$combinedName}' berhasil dibuat dari {$sources->count()} nomor pertandingan.");
    }

    /**
     * Delete a generated combined category and reactivate its source categories.
     */
    public function destroyCombinedMerge(Request $request, EventMatchCategory $matchCategory): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);
        abort_unless(
            $matchCategory->event_id === $activeEvent->id
                && $matchCategory->is_active
                && $matchCategory->is_combined
                && $matchCategory->merged_into_id === null,
            404
        );

        $sources = $activeEvent->matchCategories()
            ->where('merged_into_id', $matchCategory->id)
            ->get();

        if ($sources->count() < 2) {
            throw ValidationException::withMessages([
                'combined_category' => 'Nomor gabungan tidak memiliki nomor asal yang dapat dipulihkan.',
            ]);
        }

        if ($matchCategory->athleteEntries()->exists()) {
            throw ValidationException::withMessages([
                'combined_category' => 'Merge tidak dapat dihapus karena sudah memiliki peserta yang didaftarkan langsung.',
            ]);
        }

        DB::transaction(function () use ($matchCategory, $sources): void {
            $matchCategory->tournamentDrawing()->delete();
            $sources->toQuery()->update([
                'merged_into_id' => null,
                'is_active' => true,
            ]);

            $matchCategory->delete();
        });

        return back()->with('success', "Merge '{$matchCategory->name}' berhasil dihapus. Semua nomor asal telah diaktifkan kembali.");
    }

    /**
     * Merge an under-quota match category into a compatible category.
     */
    public function storeMerge(StoreEventMatchCategoryMergeRequest $request, EventMatchCategory $matchCategory): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);
        abort_unless($matchCategory->event_id === $activeEvent->id && $matchCategory->is_active && $matchCategory->merged_into_id === null, 404);

        $targetCategory = $activeEvent->matchCategories()
            ->whereKey($request->validated('target_category_id'))
            ->where('is_active', true)
            ->whereNull('merged_into_id')
            ->where('type', $matchCategory->type)
            ->where('gender', $matchCategory->gender)
            ->first();

        if ($targetCategory === null || $targetCategory->is($matchCategory)) {
            throw ValidationException::withMessages([
                'target_category_id' => 'Pilih nomor pertandingan aktif yang kompatibel sebagai target penggabungan.',
            ]);
        }

        DB::transaction(function () use ($matchCategory, $targetCategory): void {
            TournamentDrawing::query()
                ->whereIn('event_match_category_id', [$matchCategory->id, $targetCategory->id])
                ->delete();
            $matchCategory->update([
                'merged_into_id' => $targetCategory->id,
                'is_active' => false,
            ]);
        });

        return back()->with('success', "Nomor pertandingan '{$matchCategory->name}' berhasil digabungkan ke '{$targetCategory->name}'.");
    }

    private function eventForRequest(Request $request): ?Event
    {
        $tenantEvent = $request->attributes->get('tenantEvent');

        if ($tenantEvent instanceof Event) {
            return $tenantEvent;
        }

        $requestedEventId = $request->input('event_id');
        if (is_string($requestedEventId) && $requestedEventId !== '') {
            $event = Event::query()->findOrFail($requestedEventId);
            abort_unless($this->canAccessTournament($request, $event), 403);

            return $event;
        }

        return $this->accessibleEventsQuery($request)
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->first();
    }

    /**
     * Determine whether the user can alter a tenant event's tournament setup.
     */
    private function canManageTournament(Request $request, ?Event $event): bool
    {
        $user = $request->user();

        if (! $user || ! $event instanceof Event) {
            return false;
        }

        if ($user->hasAnyRole(['Super Admin', 'Admin'])) {
            return true;
        }

        return in_array($event->accessRoleFor($user), [
            Event::AccessRoleResponsible,
            Event::AccessRoleAdmin,
        ], true);
    }

    private function canAccessTournament(Request $request, Event $event): bool
    {
        $user = $request->user();

        return (bool) ($user && (
            $user->hasAnyRole(['Super Admin', 'Admin'])
            || $event->users()->whereKey($user->id)->exists()
        ));
    }

    /** @return Builder<Event> */
    private function accessibleEventsQuery(Request $request): Builder
    {
        $user = $request->user();
        $query = Event::query();

        if (! $user?->hasAnyRole(['Super Admin', 'Admin'])) {
            $query->whereHas('users', fn ($eventUsers) => $eventUsers->whereKey($user?->id));
        }

        return $query;
    }

    /** @return Collection<int, array{id: string, name: string}> */
    private function accessibleEvents(Request $request): Collection
    {
        return $this->accessibleEventsQuery($request)
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->get(['id', 'name'])
            ->map(fn (Event $event) => ['id' => $event->id, 'name' => $event->name]);
    }
}
