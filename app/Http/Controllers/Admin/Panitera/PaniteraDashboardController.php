<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Http\Controllers\Controller;
use App\Models\EmbuScore;
use App\Models\EventCourtAssignment;
use App\Models\RandoriScore;
use App\Models\TournamentMatch;
use App\Services\Panitera\EventContext;
use App\Services\Panitera\PaniteraCourtAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PaniteraDashboardController extends Controller
{
    public function __invoke(
        Request $request,
        EventContext $eventContext,
        PaniteraCourtAccess $courtAccess,
    ): Response {
        $event = $eventContext->eventFor($request);
        $assignedCourtIds = $courtAccess->assignedCourtIds($request, $event);
        $event->load('clerks:id,name');
        $clerkNames = $event->clerks->pluck('name', 'id');

        $courts = $event->courts()
            ->when($assignedCourtIds !== null, fn (Builder $query) => $query->whereIn('id', $assignedCourtIds))
            ->with([
                'assignments',
                'tournamentMatches' => fn ($query) => $query
                    ->where('is_bye', false)
                    ->whereIn('status', ['ready', 'in_progress'])
                    ->with('matchCategory:id,name')
                    ->orderByRaw('scheduled_start_at IS NULL')
                    ->orderBy('scheduled_start_at')
                    ->orderBy('match_sequence'),
            ])
            ->withCount([
                'tournamentMatches as total_matches_count' => fn ($query) => $query->where('is_bye', false),
                'tournamentMatches as completed_matches_count' => fn ($query) => $query
                    ->where('is_bye', false)
                    ->where('status', 'completed'),
            ])
            ->get()
            ->map(function ($court) use ($clerkNames): array {
                $clerks = $court->assignments
                    ->where('staff_type', 'clerk')
                    ->map(fn (EventCourtAssignment $assignment): array => [
                        'id' => $assignment->id,
                        'name' => $clerkNames->get($assignment->staff_id, 'Panitera tidak tersedia'),
                        'role' => Str::title(str_replace('_', ' ', $assignment->role)),
                    ])->values();
                $activeMatch = $court->tournamentMatches
                    ->first(fn (TournamentMatch $match): bool => in_array($match->status, ['ready', 'in_progress'], true));

                return [
                    'id' => $court->id,
                    'name' => $court->name,
                    'location' => $court->location,
                    'is_active' => (bool) $court->is_active,
                    'access_code' => $court->access_code,
                    'clerks' => $clerks,
                    'total_matches' => (int) $court->total_matches_count,
                    'completed_matches' => (int) $court->completed_matches_count,
                    'active_match' => $activeMatch ? [
                        'id' => $activeMatch->id,
                        'label' => "Partai #{$activeMatch->match_sequence} · {$activeMatch->matchCategory?->name}",
                    ] : null,
                ];
            })
            ->values();

        $availableCourtIds = $courts->pluck('id');
        $requestedCourtId = $request->string('court_id')->toString();
        $selectedCourtId = $availableCourtIds->contains($requestedCourtId)
            ? $requestedCourtId
            : ($assignedCourtIds !== null && $availableCourtIds->count() === 1 ? (string) $availableCourtIds->first() : '');
        $requestedStatus = $request->string('status')->toString();
        $status = in_array($requestedStatus, ['completed', 'unfinished'], true) ? $requestedStatus : 'all';
        $requestedCategoryType = $request->string('category_type')->toString();
        $categoryType = in_array($requestedCategoryType, ['embu', 'randori'], true) ? $requestedCategoryType : 'all';
        $search = Str::limit(trim($request->string('search')->toString()), 100, '');

        $scopedMatches = fn (): Builder => TournamentMatch::query()
            ->whereBelongsTo($event)
            ->where('is_bye', false)
            ->when($assignedCourtIds !== null, fn (Builder $query) => $query->whereIn('event_court_id', $assignedCourtIds));

        $matches = $scopedMatches()
            ->with([
                'matchCategory:id,name,type',
                'court:id,name',
                'embuScores',
                'randoriScore',
            ])
            ->when($selectedCourtId !== '', fn (Builder $query) => $query->where('event_court_id', $selectedCourtId))
            ->when($categoryType !== 'all', fn (Builder $query) => $query->whereHas(
                'matchCategory',
                fn (Builder $categoryQuery) => $categoryQuery->where('type', $categoryType),
            ))
            ->when($status === 'completed', fn (Builder $query) => $query->where('status', 'completed'))
            ->when($status === 'unfinished', fn (Builder $query) => $query->where('status', '!=', 'completed'))
            ->when($search !== '', function (Builder $query) use ($search): void {
                $keyword = '%'.Str::lower($search).'%';
                $query->where(function (Builder $matchQuery) use ($keyword): void {
                    $matchQuery->whereRaw('LOWER(participant_label) LIKE ?', [$keyword])
                        ->orWhereRaw('LOWER(red_label) LIKE ?', [$keyword])
                        ->orWhereRaw('LOWER(blue_label) LIKE ?', [$keyword])
                        ->orWhereRaw('LOWER(round_label) LIKE ?', [$keyword])
                        ->orWhereHas('matchCategory', fn (Builder $categoryQuery) => $categoryQuery->whereRaw('LOWER(name) LIKE ?', [$keyword]))
                        ->orWhereHas('court', fn (Builder $courtQuery) => $courtQuery->whereRaw('LOWER(name) LIKE ?', [$keyword]));
                });
            })
            ->orderByRaw('scheduled_start_at IS NULL')
            ->orderBy('scheduled_start_at')
            ->orderBy('event_court_id')
            ->orderBy('match_sequence')
            ->orderBy('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (TournamentMatch $match): array => $this->matchData($match));

        $totalMatches = $scopedMatches()->count();
        $completedMatches = $scopedMatches()->where('status', 'completed')->count();
        $scopeScoreToCourts = fn (Builder $query): Builder => $query->when(
            $assignedCourtIds !== null,
            fn (Builder $scoreQuery) => $scoreQuery->whereHas(
                'tournamentMatch',
                fn (Builder $matchQuery) => $matchQuery->whereIn('event_court_id', $assignedCourtIds),
            ),
        );

        return Inertia::render('Admin/Panitera/Dashboard', [
            'activeEvent' => $event->only(['id', 'name', 'city', 'venue', 'start_date', 'end_date']),
            'events' => $eventContext->accessibleEvents($request),
            'canManage' => $eventContext->canManage($request, $event),
            'stats' => [
                'total_matches' => $totalMatches,
                'completed_matches' => $completedMatches,
                'embu_scored' => $scopeScoreToCourts(
                    EmbuScore::query()->whereBelongsTo($event)->where('status', 'verified'),
                )->count(),
                'randori_scored' => $scopeScoreToCourts(
                    RandoriScore::query()->whereBelongsTo($event)->where('status', 'verified'),
                )->count(),
            ],
            'courts' => $courts,
            'matches' => $matches,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'category_type' => $categoryType,
                'court_id' => $selectedCourtId,
            ],
            'isCourtRestricted' => $assignedCourtIds !== null,
        ]);
    }

    /** @return array<string, mixed> */
    private function matchData(TournamentMatch $match): array
    {
        $categoryType = $match->matchCategory?->type;
        $result = null;

        if ($match->status === 'completed') {
            if ($categoryType === 'embu') {
                $embuScore = $match->embuScores->first();
                if ($embuScore) {
                    $result = [
                        'type' => 'embu',
                        'final_score' => (float) $embuScore->final_score,
                        'total_penalty' => $embuScore->effectiveTotalPenalty(),
                        'is_disqualified' => (bool) $embuScore->is_disqualified,
                        'status' => $embuScore->status,
                        'status_label' => match ($embuScore->status) {
                            'verified' => 'Terverifikasi',
                            'ready_for_verification' => 'Siap Verifikasi',
                            default => 'Draft Wasit',
                        },
                    ];
                }
            } elseif ($categoryType === 'randori') {
                $randoriScore = $match->randoriScore;
                if ($randoriScore) {
                    $signatures = is_array($randoriScore->signatures) ? $randoriScore->signatures : [];
                    $signedCount = count(array_filter($signatures, fn ($signed): bool => (bool) $signed));

                    $result = [
                        'type' => 'randori',
                        'winner_corner' => $randoriScore->winner_corner,
                        'winner_label' => match ($randoriScore->winner_corner) {
                            'aka' => $match->red_label ?: 'AKA (Merah)',
                            'shiro' => $match->blue_label ?: 'SHIRO (Putih)',
                            default => 'Belum ditentukan',
                        },
                        'aka_total' => (int) $randoriScore->aka_total,
                        'shiro_total' => (int) $randoriScore->shiro_total,
                        'is_locked' => $randoriScore->locked_at !== null,
                        'signed_count' => $signedCount,
                        'status' => $randoriScore->status,
                    ];
                }
            }
        }

        return [
            'id' => $match->id,
            'category_name' => $match->matchCategory?->name,
            'category_type' => $categoryType,
            'court_id' => $match->event_court_id,
            'court' => $match->court?->name ?? 'Belum diplot',
            'round_label' => $match->round_label,
            'sequence' => $match->match_sequence,
            'participant' => $match->participant_label ?: implode(' vs ', array_filter([$match->red_label, $match->blue_label])),
            'red_label' => $match->red_label,
            'blue_label' => $match->blue_label,
            'scheduled_at' => $match->scheduled_start_at?->translatedFormat('d M Y, H:i'),
            'status' => $match->status,
            'status_label' => match ($match->status) {
                'ready' => 'Siap Dipanggil',
                'in_progress' => 'Sedang Berlangsung',
                'completed' => 'Selesai',
                default => 'Menunggu',
            },
            'call_status' => $match->call_status,
            'call_status_label' => match ($match->call_status) {
                'officials_called' => 'Ofisial Dipanggil',
                'participants_called' => 'Peserta Dipanggil',
                'completed' => 'Selesai',
                default => 'Belum Dipanggil',
            },
            'is_placeholder' => (bool) ($match->metadata['placeholder'] ?? false),
            'result' => $result,
        ];
    }
}
