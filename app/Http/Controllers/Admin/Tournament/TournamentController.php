<?php

namespace App\Http\Controllers\Admin\Tournament;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Tournament\MoveCategoryScheduleCourtRequest;
use App\Http\Requests\Admin\Tournament\StoreCombinedEventMatchCategoryMergeRequest;
use App\Http\Requests\Admin\Tournament\StoreEventMatchCategoryMergeRequest;
use App\Http\Requests\Admin\Tournament\UpdateTournamentScheduleRequest;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\TournamentMatchVarReview;
use App\Models\TournamentResult;
use App\Services\Tournament\TournamentDrawingPdfService;
use App\Services\Tournament\TournamentDrawingViewService;
use App\Services\Tournament\TournamentScheduleViewService;
use App\Services\TournamentDrawingGenerator;
use App\Services\TournamentScheduleGenerator;
use App\Services\TournamentScheduleUpdater;
use App\Services\TournamentScheduleWorkbook;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TournamentController extends Controller
{
    /**
     * Display tournament drawing and match brackets.
     */
    public function drawing(Request $request, TournamentDrawingViewService $viewService): Response
    {
        $activeEvent = $this->eventForRequest($request);

        return Inertia::render('Admin/Tournament/Drawing', $viewService->buildViewData(
            $request,
            $activeEvent,
            $this->accessibleEvents($request),
            $this->canManageTournament($request, $activeEvent)
        ));
    }

    /**
     * Download the tournament brackets and match numbers as a PDF.
     */
    public function exportDrawingPdf(Request $request, TournamentDrawingPdfService $pdfService): HttpResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canAccessTournament($request, $activeEvent), 403);

        $categoryId = $request->string('category')->trim()->toString() ?: null;
        abort_unless($categoryId === null || Str::isUuid($categoryId), 404, 'Nomor pertandingan tidak ditemukan.');

        $drawings = $pdfService->build($activeEvent, $categoryId);
        abort_if($drawings->isEmpty(), 404, 'Bagan pertandingan belum tersedia.');

        $wantsHtml = $request->query('format') === 'html' || $request->boolean('preview');
        $viewData = [
            'event' => $activeEvent,
            'drawings' => $drawings,
            'isPdf' => ! $wantsHtml,
        ];

        if ($wantsHtml) {
            return response()->view('reports.tournament-drawings', $viewData);
        }

        $pdf = Pdf::loadView('reports.tournament-drawings', $viewData)
            ->setPaper('a4', 'landscape');

        $categorySuffix = $drawings->count() === 1
            ? '_'.Str::slug($drawings->first()['category_name'], '_')
            : '_Semua_Nomor';
        $filename = 'Bagan_Pertandingan_'.Str::slug($activeEvent->name ?: 'kejuaraan', '_').$categorySuffix.'_'.now()->format('Ymd_His').'.pdf';

        return $request->boolean('stream')
            ? $pdf->stream($filename)
            : $pdf->download($filename);
    }

    /**
     * Display the draggable schedule board for one event.
     */
    public function schedule(Request $request, TournamentScheduleViewService $viewService): Response
    {
        $activeEvent = $this->eventForRequest($request);
        $canManageSchedule = $activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent);

        return Inertia::render('Admin/Tournament/Schedule', $viewService->buildViewData(
            $request,
            $activeEvent,
            $this->accessibleEvents($request),
            $canManageSchedule
        ));
    }

    public function exportSchedule(Request $request, TournamentScheduleWorkbook $workbook): HttpResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event, 404);

        return response($workbook->build($activeEvent), 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$workbook->filename($activeEvent).'"',
            'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function exportSchedulePdf(Request $request): HttpResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canAccessTournament($request, $activeEvent), 403);

        $query = $activeEvent->tournamentMatches()
            ->where('is_bye', false)
            ->whereNotNull('scheduled_start_at')
            ->with([
                'matchCategory:id,name,type,order',
                'court:id,name,order',
                'rundown:id,name,date,end_time,order',
                'redEntry.athlete.contingent:id,name',
                'blueEntry.athlete.contingent:id,name',
            ]);

        $courts = $activeEvent->courts()->orderBy('order')->get();
        $selectedCourt = null;
        if ($courtId = $request->input('court_id')) {
            $query->where('event_court_id', $courtId);
            $selectedCourt = $courts->firstWhere('id', $courtId);
        }

        if ($date = $request->input('date')) {
            $query->whereDate('scheduled_start_at', $date);
        }

        if ($sessionId = $request->input('rundown_id')) {
            $query->where('rundown_id', $sessionId);
        }

        $type = $request->input('type');
        if ($type && in_array($type, ['embu', 'randori'], true)) {
            $query->whereHas('matchCategory', fn ($q) => $q->where('type', $type));
        }

        $matches = $query->get()
            ->sortBy(fn (TournamentMatch $match): array => [
                $match->scheduled_start_at?->timestamp ?? PHP_INT_MAX,
                $match->court?->order ?? PHP_INT_MAX,
                $match->match_sequence,
            ])
            ->values();

        $wantsHtml = $request->query('format') === 'html' || $request->boolean('preview');
        $wantsStream = $request->boolean('stream');
        $viewMode = $request->input('mode', 'separated'); // 'separated' (default) or 'mixed'

        $breaks = $activeEvent->rundowns()
            ->where('is_match_session', false)
            ->where(function ($sub): void {
                $sub->whereRaw('LOWER(type) LIKE ?', ['%istirahat%'])
                    ->orWhereRaw('LOWER(type) LIKE ?', ['%ishoma%'])
                    ->orWhereRaw('LOWER(name) LIKE ?', ['%ishoma%'])
                    ->orWhereRaw('LOWER(name) LIKE ?', ['%istirahat%'])
                    ->orWhereRaw('LOWER(name) LIKE ?', ['%break%']);
            })
            ->orderBy('date')
            ->orderBy('order')
            ->get();

        $viewData = [
            'event' => $activeEvent,
            'matches' => $matches,
            'isPdf' => ! $wantsHtml,
            'courts' => $courts,
            'selectedCourt' => $selectedCourt,
            'courtId' => $courtId,
            'selectedType' => $type,
            'viewMode' => $viewMode,
            'breaks' => $breaks,
        ];

        if ($wantsHtml) {
            return response()->view('reports.tournament-schedule-matches', $viewData);
        }

        $pdf = Pdf::loadView('reports.tournament-schedule-matches', $viewData)
            ->setPaper('a4', 'landscape');

        $safeEvent = Str::slug($activeEvent->name ?: 'kejuaraan', '_');
        $courtSuffix = $selectedCourt ? '_'.Str::slug($selectedCourt->name, '_') : '';
        $typeSuffix = $type ? '_'.Str::slug($type, '_') : '';
        $filename = "Jadwal_Pertandingan_{$safeEvent}{$courtSuffix}{$typeSuffix}_".now()->format('Ymd_His').'.pdf';

        if ($wantsStream) {
            return $pdf->stream($filename);
        }

        return $pdf->download($filename);
    }

    public function generateSchedule(Request $request, TournamentScheduleGenerator $generator): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);

        $duration = $request->input('match_duration_minutes');
        if ($duration !== null) {
            $duration = max(1, min(120, (int) $duration));
            $activeEvent->update(['match_duration_minutes' => $duration]);
        }

        $generator->schedule($activeEvent);

        $scheduledCount = $activeEvent->tournamentMatches()->whereNotNull('scheduled_start_at')->count();
        $ishomaCount = $activeEvent->rundowns()
            ->where('is_match_session', false)
            ->where(function ($sub): void {
                $sub->whereRaw('LOWER(type) LIKE ?', ['%istirahat%'])
                    ->orWhereRaw('LOWER(type) LIKE ?', ['%ishoma%'])
                    ->orWhereRaw('LOWER(name) LIKE ?', ['%ishoma%'])
                    ->orWhereRaw('LOWER(name) LIKE ?', ['%istirahat%'])
                    ->orWhereRaw('LOWER(name) LIKE ?', ['%break%']);
            })
            ->count();
        $ishomaNote = $ishomaCount > 0 ? " dengan {$ishomaCount} sesi jeda ISHOMA terproteksi" : '';

        return back()->with('success', "Jadwal pertandingan berhasil disusun otomatis ({$scheduledCount} partai teralokasi ke court & sesi{$ishomaNote}).");
    }

    public function scheduleReport(Request $request, TournamentDrawingViewService $service): HttpResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canAccessTournament($request, $activeEvent), 403);

        $capacityStats = $service->computeScheduleCapacityStats($activeEvent);

        $categories = $activeEvent->matchCategories()
            ->where('is_active', true)
            ->with(['tournamentDrawing'])
            ->orderBy('type')
            ->orderBy('order')
            ->get();

        $matches = $activeEvent->tournamentMatches()
            ->where('is_bye', false)
            ->whereNotNull('scheduled_start_at')
            ->with([
                'court:id,name',
                'rundown:id,name',
                'matchCategory:id,name,type',
                'redEntry.athlete.contingent:id,name',
                'blueEntry.athlete.contingent:id,name',
            ])
            ->orderBy('scheduled_start_at')
            ->orderBy('match_sequence')
            ->get();

        $categoriesSummary = $categories->map(function ($cat) use ($matches) {
            $catMatches = $matches->where('event_match_category_id', $cat->id);
            $first = $catMatches->sortBy('scheduled_start_at')->first();
            $last = $catMatches->sortBy('scheduled_start_at')->last();
            $courtNames = $catMatches->pluck('court.name')->unique()->filter()->implode(', ');

            return [
                'id' => $cat->id,
                'name' => $cat->name,
                'type' => ucfirst($cat->type),
                'format' => $cat->tournamentDrawing?->bracket_type ?? 'Single Elimination',
                'status' => $cat->tournamentDrawing?->status ?? 'Draft',
                'total_matches' => $catMatches->count(),
                'court_names' => $courtNames ?: '-',
                'first_match' => $first?->scheduled_start_at?->translatedFormat('d M, H:i') ?: '-',
                'last_match' => $last?->scheduled_start_at?->format('H:i') ?: '-',
            ];
        });

        $wantsHtml = $request->query('format') === 'html' || $request->boolean('preview');
        $wantsStream = $request->boolean('stream');

        if ($wantsHtml) {
            return response()->view('reports.tournament-schedule-capacity', [
                'event' => $activeEvent,
                'capacityStats' => $capacityStats,
                'categoriesSummary' => $categoriesSummary,
                'matches' => $matches,
                'isPdf' => false,
            ]);
        }

        $pdf = Pdf::loadView('reports.tournament-schedule-capacity', [
            'event' => $activeEvent,
            'capacityStats' => $capacityStats,
            'categoriesSummary' => $categoriesSummary,
            'matches' => $matches,
            'isPdf' => true,
        ])->setPaper('a4', 'portrait');

        $safeEvent = Str::slug($activeEvent->name ?: 'kejuaraan', '_');
        $filename = "Laporan_Jadwal_Kapasitas_{$safeEvent}_".now()->format('Ymd_His').'.pdf';

        if ($wantsStream) {
            return $pdf->stream($filename);
        }

        return $pdf->download($filename);
    }

    public function generate(Request $request, TournamentDrawingGenerator $generator): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);

        $duration = $request->input('match_duration_minutes');
        if ($duration !== null) {
            $duration = max(1, min(120, (int) $duration));
            $activeEvent->update(['match_duration_minutes' => $duration]);
        } elseif ((int) $activeEvent->match_duration_minutes < 5) {
            $activeEvent->update(['match_duration_minutes' => 10]);
        }

        $result = $generator->generate($activeEvent);

        $ishomaCount = $activeEvent->rundowns()
            ->where('is_match_session', false)
            ->where(function ($sub): void {
                $sub->whereRaw('LOWER(type) LIKE ?', ['%istirahat%'])
                    ->orWhereRaw('LOWER(type) LIKE ?', ['%ishoma%'])
                    ->orWhereRaw('LOWER(name) LIKE ?', ['%ishoma%'])
                    ->orWhereRaw('LOWER(name) LIKE ?', ['%istirahat%'])
                    ->orWhereRaw('LOWER(name) LIKE ?', ['%break%']);
            })
            ->count();
        $ishomaNote = $ishomaCount > 0 ? " | {$ishomaCount} sesi ISHOMA terproteksi" : '';

        return back()->with('success', "Generate bagan & jadwal selesai (durasi {$activeEvent->match_duration_minutes} menit per partai{$ishomaNote}): {$result['generated']} nomor dibuat, {$result['skipped']} nomor perlu merge.");
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

        if ($request->filled('bracket_type')) {
            $matchCategory->update(['preferred_bracket_type' => $request->input('bracket_type')]);
        }

        $generator->generate($activeEvent, $matchCategory);

        return back()->with('success', "Drawing '{$matchCategory->name}' berhasil dibuat ulang.");
    }

    public function updateCategoryFormat(Request $request, EventMatchCategory $matchCategory, TournamentDrawingGenerator $generator): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);
        abort_unless($matchCategory->event_id === $activeEvent->id && $matchCategory->is_active, 404);

        $validated = $request->validate([
            'bracket_type' => ['required', 'string', 'in:single_elimination,double_elimination,round_robin'],
        ]);

        $matchCategory->update(['preferred_bracket_type' => $validated['bracket_type']]);

        $drawing = $matchCategory->tournamentDrawing;
        if ($drawing && $drawing->status !== 'published') {
            $generator->generate($activeEvent, $matchCategory);
        }

        return back()->with('success', "Format pertandingan '{$matchCategory->name}' berhasil diperbarui.");
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

    public function updateSchedule(
        UpdateTournamentScheduleRequest $request,
        TournamentMatch $tournamentMatch,
        TournamentScheduleUpdater $updater,
    ): RedirectResponse {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);
        abort_unless($tournamentMatch->event_id === $activeEvent->id, 404);

        if ($tournamentMatch->status === 'completed') {
            throw ValidationException::withMessages([
                'schedule' => 'Partai yang sudah selesai dipertandingkan tidak dapat diubah jadwalnya demi integritas rekam hasil.',
            ]);
        }

        $validated = $request->validated();
        $updater->update($activeEvent, $tournamentMatch, $validated);

        if (! empty($validated['swap_with_match_id'])) {
            return back()->with('success', 'Dua partai berhasil ditukar. Partai lainnya tidak berubah.');
        }

        return back()->with('success', 'Partai berhasil dipindahkan. Partai lainnya tidak berubah.');
    }

    public function moveCategoryCourt(
        MoveCategoryScheduleCourtRequest $request,
        EventMatchCategory $matchCategory,
        TournamentScheduleUpdater $updater,
    ): RedirectResponse {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);
        abort_unless($matchCategory->event_id === $activeEvent->id, 404);

        $movedCount = $updater->moveCategory($activeEvent, $matchCategory, $request->validated());

        return back()->with('success', "Nomor pertandingan {$matchCategory->name} ({$movedCount} partai) berhasil dipindahkan ke gelanggang tujuan dan jadwal disesuaikan secara otomatis.");
    }

    public function unscheduleMatch(Request $request, TournamentMatch $tournamentMatch): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);
        abort_unless($tournamentMatch->event_id === $activeEvent->id, 404);

        if ($tournamentMatch->status === 'completed') {
            throw ValidationException::withMessages([
                'schedule' => 'Partai yang sudah selesai dipertandingkan tidak dapat dilepas dari jadwal demi integritas rekam hasil.',
            ]);
        }

        $tournamentMatch->update([
            'scheduled_start_at' => null,
            'scheduled_end_at' => null,
            'event_court_id' => null,
            'rundown_id' => null,
        ]);

        return back()->with('success', "Partai #{$tournamentMatch->match_sequence} ({$tournamentMatch->round_label}) berhasil dilepas dari jadwal dan dikembalikan ke antrean.");
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
            // Soft delete hasil juara dan nilai juri
            TournamentResult::query()->where('event_id', $activeEvent->id)->delete();
            TournamentMatchVarReview::query()->where('event_id', $activeEvent->id)->delete();
            $activeEvent->embuJudgeScores()->delete();
            $activeEvent->embuScores()->delete();
            $activeEvent->randoriScores()->delete();

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

        return back()->with('success', 'Pertandingan, nilai juri, dan hasil juara berhasil direset dengan aman (tersimpan dalam arsip soft delete). Bagan dan jadwal tetap tersimpan dan dapat disesuaikan kembali.');
    }

    public function reset(Request $request): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageTournament($request, $activeEvent), 403);

        DB::transaction(function () use ($activeEvent): void {
            // 1. Soft delete hasil juara turnamen
            TournamentResult::query()->where('event_id', $activeEvent->id)->delete();

            // 2. Soft delete review VAR
            TournamentMatchVarReview::query()->where('event_id', $activeEvent->id)->delete();

            // 3. Soft delete seluruh nilai pertandingan
            $activeEvent->embuJudgeScores()->delete();
            $activeEvent->embuScores()->delete();
            $activeEvent->randoriScores()->delete();

            // 4. Soft delete seluruh pertandingan
            $activeEvent->tournamentMatches()->delete();

            // 5. Soft delete seluruh bagan drawing
            $activeEvent->tournamentDrawings()->delete();
        });

        return back()->with('success', 'Draft bagan pertandingan, seluruh nilai juri, hasil juara, dan laporan berhasil direset dengan aman (tersimpan dalam arsip soft delete). Data peserta dan pengaturan event tetap tersimpan.');
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
            'activeEvent' => $activeEvent?->only(['id', 'name', 'venue', 'city', 'start_date', 'end_date', 'status', 'is_active']),
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

        $requestedEventId = $this->requestedEventId($request);
        if ($requestedEventId !== null) {
            $event = Event::query()->findOrFail($requestedEventId);
            abort_unless($this->canAccessTournament($request, $event), 403);

            return $event;
        }

        return $this->accessibleEventsQuery($request)
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->first();
    }

    private function requestedEventId(Request $request): ?string
    {
        $eventId = $request->input('event_id');
        abort_unless($eventId === null || is_string($eventId), 404, 'Event tidak ditemukan.');

        $eventId = trim((string) $eventId);
        if ($eventId === '' || $eventId === 'all') {
            return null;
        }

        abort_unless(Str::isUuid($eventId), 404, 'Event tidak ditemukan.');

        return $eventId;
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

        if ($user->hasAnyRole(['Super Admin', 'Admin', 'Pertandingan'])) {
            return true;
        }

        $accessRole = $event->accessRoleFor($user);

        return in_array($accessRole, [
            Event::AccessRoleResponsible,
            Event::AccessRoleAdmin,
        ], true) || ($accessRole === Event::AccessRoleStaff && $user->hasAnyRole(['Pertandingan', 'Arbitrase']));
    }

    private function canAccessTournament(Request $request, Event $event): bool
    {
        $user = $request->user();

        return (bool) ($user && (
            $user->hasAnyRole(['Super Admin', 'Admin', 'Pertandingan'])
            || ($user->hasAnyRole(['Arbitrase', 'Koordinator Lapangan', 'Court']) && $event->is_active)
            || $event->users()->whereKey($user->id)->exists()
        ));
    }

    /** @return Builder<Event> */
    private function accessibleEventsQuery(Request $request): Builder
    {
        $user = $request->user();
        $query = Event::query();

        if (! $user?->hasAnyRole(['Super Admin', 'Admin', 'Pertandingan'])) {
            $query->whereHas('users', fn ($eventUsers) => $eventUsers->whereKey($user?->id));
        }

        return $query;
    }

    /**
     * @return Collection<int, array{id: string, name: string, city: ?string, date_label: string, status: string, status_label: string, is_active: bool, option_description: string}>
     */
    private function accessibleEvents(Request $request): Collection
    {
        return $this->accessibleEventsQuery($request)
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->get(['id', 'name', 'city', 'start_date', 'end_date', 'status', 'is_active'])
            ->map(function (Event $event): array {
                $dateLabel = $event->start_date?->translatedFormat('d M Y').' – '.$event->end_date?->translatedFormat('d M Y');

                return [
                    'id' => $event->id,
                    'name' => $event->name,
                    'city' => $event->city,
                    'date_label' => $dateLabel,
                    'status' => $event->status->value,
                    'status_label' => $event->status->label(),
                    'is_active' => (bool) $event->is_active,
                    'option_description' => implode(' · ', array_filter([
                        $event->status->label(),
                        $dateLabel,
                        $event->city,
                        $event->is_active ? 'Operasional' : 'Nonaktif operasional',
                    ])),
                ];
            });
    }
}
