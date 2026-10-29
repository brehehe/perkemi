<?php

namespace App\Http\Controllers\Admin\Tournament;

use App\Http\Controllers\Controller;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\EventMatchCategory;
use App\Models\TournamentMatch;
use App\Services\Panitera\EventContext;
use App\Services\WeighInService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WeighInController extends Controller
{
    /**
     * Tampilkan halaman Stasiun Penimbangan Badan Hari-H.
     */
    public function index(Request $request, EventContext $eventContext, WeighInService $weighInService): Response
    {
        $event = $eventContext->eventFor($request);

        $categories = $event->matchCategories()
            ->where('type', 'randori')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $selectedCategoryId = $request->string('category_id')->toString() ?: $categories->first()?->id;
        $selectedCategory = $selectedCategoryId ? $categories->firstWhere('id', $selectedCategoryId) : null;

        $entriesQuery = AthleteMatchCategoryEntry::query()
            ->whereBelongsTo($event)
            ->with(['athlete.contingent', 'matchCategory', 'weighedBy:id,name']);

        if ($selectedCategory) {
            $entriesQuery->where('event_match_category_id', $selectedCategory->id);
        } else {
            $entriesQuery->whereIn('event_match_category_id', $categories->pluck('id'));
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $entriesQuery->where(function ($query) use ($search): void {
                $query->whereHas('athlete', fn ($aq) => $aq->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('athlete.contingent', fn ($cq) => $cq->where('name', 'like', "%{$search}%"));
            });
        }

        if ($statusFilter = $request->string('status')->trim()->toString()) {
            if ($statusFilter === 'pending') {
                $entriesQuery->where(fn ($q) => $q->whereNull('weigh_in_status')->orWhere('weigh_in_status', 'pending'));
            } else {
                $entriesQuery->where('weigh_in_status', $statusFilter);
            }
        }

        $entries = $entriesQuery->orderBy('event_match_category_id')->get()->map(function (AthleteMatchCategoryEntry $entry): array {
            return [
                'id' => $entry->id,
                'athlete_id' => $entry->athlete_id,
                'name' => $entry->athlete?->name ?? 'Kenshi',
                'gender' => $entry->athlete?->gender,
                'contingent_id' => $entry->athlete?->contingent_id,
                'contingent_name' => $entry->athlete?->contingent?->name ?? 'Kontingen',
                'contingent_city' => $entry->athlete?->contingent?->city,
                'kyu_dan' => $entry->athlete?->kyu_dan ?? $entry->athlete?->belt_grade ?? 'Kyu/Dan',
                'category_id' => $entry->event_match_category_id,
                'category_name' => $entry->matchCategory?->name ?? 'Randori',
                'min_weight' => $entry->matchCategory?->min_weight ? (float) $entry->matchCategory->min_weight : null,
                'max_weight' => $entry->matchCategory?->max_weight ? (float) $entry->matchCategory->max_weight : null,
                'initial_weight' => $entry->athlete?->weight ? (float) $entry->athlete->weight : null,
                'actual_weight' => $entry->actual_weight !== null ? (float) $entry->actual_weight : null,
                'weigh_in_status' => $entry->weigh_in_status ?? 'pending',
                'weigh_in_notes' => $entry->weigh_in_notes,
                'weigh_in_at' => $entry->weigh_in_at?->format('H:i d/m/Y'),
                'weigh_in_locked_at' => $entry->weigh_in_locked_at?->format('H:i d/m/Y'),
                'is_locked' => (bool) ($entry->weigh_in_locked_at || $entry->matchCategory?->weigh_in_locked_at),
                'weighed_by_name' => $entry->weighedBy?->name,
            ];
        });

        $categoryStats = $selectedCategory ? $weighInService->statistics($event, $selectedCategory) : null;
        $overallStats = $weighInService->statistics($event);

        $activeEventData = [
            'id' => $event->id,
            'name' => $event->name,
            'city' => $event->city,
            'venue' => $event->venue,
            'start_date' => $event->start_date?->format('Y-m-d'),
            'end_date' => $event->end_date?->format('Y-m-d'),
            'status' => $event->status?->value ?? (string) $event->status,
            'is_active' => (bool) $event->is_active,
        ];

        return Inertia::render('Admin/Tournament/WeighIn', [
            'activeEvent' => $activeEventData,
            'event' => $activeEventData,
            'events' => $eventContext->accessibleEvents($request),
            'categories' => $categories->map(fn (EventMatchCategory $cat) => [
                'id' => $cat->id,
                'name' => $cat->name,
                'gender' => $cat->gender,
                'min_weight' => $cat->min_weight ? (float) $cat->min_weight : null,
                'max_weight' => $cat->max_weight ? (float) $cat->max_weight : null,
                'weigh_in_locked_at' => $cat->weigh_in_locked_at?->format('H:i d/m/Y'),
                'is_locked' => (bool) $cat->weigh_in_locked_at,
            ]),
            'selectedCategory' => $selectedCategory ? [
                'id' => $selectedCategory->id,
                'name' => $selectedCategory->name,
                'gender' => $selectedCategory->gender,
                'min_weight' => $selectedCategory->min_weight ? (float) $selectedCategory->min_weight : null,
                'max_weight' => $selectedCategory->max_weight ? (float) $selectedCategory->max_weight : null,
                'weigh_in_locked_at' => $selectedCategory->weigh_in_locked_at?->format('H:i d/m/Y'),
                'is_locked' => (bool) $selectedCategory->weigh_in_locked_at,
            ] : null,
            'entries' => $entries,
            'categoryStats' => $categoryStats,
            'overallStats' => $overallStats,
            'filters' => [
                'event_id' => $event->id,
                'category_id' => $selectedCategoryId,
                'search' => $request->string('search')->toString(),
                'status' => $request->string('status')->toString(),
            ],
            'canManageWeighIn' => $eventContext->canManage($request, $event),
            'isSuperOrAdmin' => (bool) $request->user()?->hasAnyRole(['Super Admin', 'Admin']),
        ]);
    }

    /**
     * Simpan / Perbarui hasil timbang badan atlet.
     */
    public function update(Request $request, AthleteMatchCategoryEntry $entry, WeighInService $weighInService): RedirectResponse
    {
        $validated = $request->validate([
            'actual_weight' => ['required', 'numeric', 'min:20', 'max:200'],
            'weigh_in_notes' => ['nullable', 'string', 'max:500'],
            'force_override' => ['nullable', 'boolean'],
        ]);

        $weighInService->recordWeighIn(
            $entry,
            (float) $validated['actual_weight'],
            $validated['weigh_in_notes'] ?? null,
            (string) $request->user()?->id,
            (bool) ($validated['force_override'] ?? false),
        );

        return back()->with('success', 'Data timbang badan kenshi berhasil disimpan.');
    }

    /**
     * Kunci sesi penimbangan nomor pertandingan.
     */
    public function lock(Request $request, EventMatchCategory $matchCategory, WeighInService $weighInService): RedirectResponse
    {
        $weighInService->lockCategory($matchCategory, (string) $request->user()?->id);

        return back()->with('success', "Sesi penimbangan kategori {$matchCategory->name} berhasil dikunci.");
    }

    /**
     * Buka kunci sesi penimbangan nomor pertandingan.
     */
    public function unlock(Request $request, EventMatchCategory $matchCategory, WeighInService $weighInService): RedirectResponse
    {
        abort_unless(
            $request->user()?->hasAnyRole(['Super Admin', 'Admin']),
            403,
            'Hanya Super Admin atau Admin yang berhak membuka kunci penimbangan.'
        );

        $weighInService->unlockCategory($matchCategory);

        return back()->with('success', "Kunci penimbangan kategori {$matchCategory->name} berhasil dibuka.");
    }

    /**
     * Terapkan WO manual pada partai pertandingan akibat gagal timbang.
     */
    public function walkover(Request $request, TournamentMatch $tournamentMatch, WeighInService $weighInService): RedirectResponse
    {
        $validated = $request->validate([
            'corner' => ['required', 'in:red,blue'],
        ]);

        $weighInService->applyWeighInWalkover($tournamentMatch, $validated['corner']);

        return back()->with('success', 'Walkover (WO) diskualifikasi timbang badan berhasil diproses.');
    }

    /**
     * Cetak Berita Acara Penimbangan Badan Resmi.
     */
    public function export(
        Request $request,
        EventContext $eventContext,
        WeighInService $weighInService,
        ?EventMatchCategory $matchCategory = null
    ): Response {
        $event = $eventContext->eventFor($request);

        $category = $matchCategory ?? ($request->has('category_id') ? EventMatchCategory::find($request->input('category_id')) : null);

        $entriesQuery = AthleteMatchCategoryEntry::query()
            ->whereBelongsTo($event)
            ->with(['athlete.contingent', 'matchCategory', 'weighedBy:id,name']);

        if ($category) {
            $entriesQuery->where('event_match_category_id', $category->id);
        } else {
            $entriesQuery->whereHas('matchCategory', fn ($q) => $q->where('type', 'randori'));
        }

        $entries = $entriesQuery->orderBy('event_match_category_id')->get()->map(function (AthleteMatchCategoryEntry $entry): array {
            return [
                'id' => $entry->id,
                'name' => $entry->athlete?->name ?? 'Kenshi',
                'gender' => $entry->athlete?->gender,
                'contingent_name' => $entry->athlete?->contingent?->name ?? 'Kontingen',
                'kyu_dan' => $entry->athlete?->kyu_dan ?? $entry->athlete?->belt_grade ?? 'Kyu/Dan',
                'category_name' => $entry->matchCategory?->name ?? 'Randori',
                'min_weight' => $entry->matchCategory?->min_weight ? (float) $entry->matchCategory->min_weight : null,
                'max_weight' => $entry->matchCategory?->max_weight ? (float) $entry->matchCategory->max_weight : null,
                'actual_weight' => $entry->actual_weight !== null ? (float) $entry->actual_weight : null,
                'weigh_in_status' => $entry->weigh_in_status ?? 'pending',
                'weigh_in_notes' => $entry->weigh_in_notes,
                'weigh_in_at' => $entry->weigh_in_at?->format('H:i d/m/Y'),
                'weighed_by_name' => $entry->weighedBy?->name ?? 'Petugas Timbang',
            ];
        });

        $stats = $category ? $weighInService->statistics($event, $category) : $weighInService->statistics($event);

        $eventReportData = [
            'id' => $event->id,
            'name' => $event->name,
            'city' => $event->city,
            'date_label' => $event->start_date?->translatedFormat('d F Y').' – '.$event->end_date?->translatedFormat('d F Y'),
        ];

        return Inertia::render('Admin/Tournament/WeighInReport', [
            'activeEvent' => $eventReportData,
            'event' => $eventReportData,
            'category' => $category ? [
                'id' => $category->id,
                'name' => $category->name,
                'min_weight' => $category->min_weight ? (float) $category->min_weight : null,
                'max_weight' => $category->max_weight ? (float) $category->max_weight : null,
            ] : null,
            'entries' => $entries,
            'stats' => $stats,
            'printed_at' => now()->translatedFormat('d F Y H:i:s'),
            'printed_by' => $request->user()?->name ?? 'Panitia Pelaksana',
        ]);
    }
}
