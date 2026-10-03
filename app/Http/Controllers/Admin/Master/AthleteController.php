<?php

namespace App\Http\Controllers\Admin\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Master\StoreAthleteRequest;
use App\Http\Requests\Admin\Master\UpdateAthleteRequest;
use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\AthleteRankHistory;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\Kyu;
use App\Models\Registration;
use App\Models\TournamentResult;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AthleteController extends Controller
{
    /**
     * Display a listing of athletes.
     */
    public function index(Request $request): Response
    {
        $tenantEvent = $this->tenantEvent($request);
        $search = $request->input('search');
        $gender = $request->input('gender', 'all');
        $contingentId = $request->input('contingent_id', 'all');
        $kyuDan = $request->input('kyu_dan', 'all');

        $query = Athlete::query()
            ->with('contingent:id,name,city')
            ->latest();

        if ($tenantEvent instanceof Event) {
            $query->whereHas('contingent', fn ($contingentQuery) => $contingentQuery->whereBelongsTo($tenantEvent));
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('nik', 'like', "%{$search}%")
                    ->orWhere('kenshi_number', 'ilike', "%{$search}%")
                    ->orWhere('kyu_dan', 'ilike', "%{$search}%")
                    ->orWhereHas('contingent', function ($cq) use ($search) {
                        $cq->where('name', 'ilike', "%{$search}%")
                            ->orWhere('city', 'ilike', "%{$search}%");
                    });
            });
        }

        if ($gender && $gender !== 'all') {
            if ($gender === 'male' || $gender === 'putra') {
                $query->whereIn('gender', ['male', 'putra']);
            } elseif ($gender === 'female' || $gender === 'putri') {
                $query->whereIn('gender', ['female', 'putri']);
            }
        }

        if ($contingentId && $contingentId !== 'all') {
            $query->where('contingent_id', $contingentId);
        }

        if ($kyuDan && $kyuDan !== 'all') {
            $query->where('kyu_dan', $kyuDan);
        }

        $athletes = $query->paginate(15)->withQueryString();

        // Transform formatted birthdate & age
        $athletes->getCollection()->transform(function ($athlete) {
            $birthDate = $athlete->birth_date;
            $age = $birthDate ? Carbon::parse($birthDate)->age : null;

            return [
                'id' => $athlete->id,
                'contingent_id' => $athlete->contingent_id,
                'contingent' => $athlete->contingent,
                'name' => $athlete->name,
                'nik' => $athlete->nik,
                'kenshi_number' => $athlete->kenshi_number,
                'gender' => in_array($athlete->gender, ['male', 'putra']) ? 'male' : 'female',
                'birth_place' => $athlete->birth_place,
                'blood_type' => $athlete->blood_type,
                'home_address' => $athlete->home_address,
                'dojo_name' => $athlete->dojo_name,
                'has_photo' => $athlete->profile_photo_path !== null,
                'kyu_dan' => $athlete->kyu_dan,
                'weight' => $athlete->weight ? (float) $athlete->weight : null,
                'height' => $athlete->height ? (float) $athlete->height : null,
                'birth_date' => $birthDate ? $birthDate->format('Y-m-d') : null,
                'birth_date_formatted' => $birthDate ? $birthDate->translatedFormat('d M Y') : '-',
                'age' => $age,
                'created_at' => $athlete->created_at?->format('d M Y'),
            ];
        });

        $athleteStatsQuery = Athlete::query();

        if ($tenantEvent instanceof Event) {
            $athleteStatsQuery->whereHas('contingent', fn ($contingentQuery) => $contingentQuery->whereBelongsTo($tenantEvent));
        }

        $stats = [
            'total_athletes' => (clone $athleteStatsQuery)->count(),
            'male_athletes' => (clone $athleteStatsQuery)->whereIn('gender', ['male', 'putra'])->count(),
            'female_athletes' => (clone $athleteStatsQuery)->whereIn('gender', ['female', 'putri'])->count(),
            'avg_weight' => round((float) (clone $athleteStatsQuery)->avg('weight'), 1),
        ];

        $contingentsQuery = Contingent::select(['id', 'name', 'city'])->orderBy('name');

        if ($tenantEvent instanceof Event) {
            $contingentsQuery->whereBelongsTo($tenantEvent);
        }

        $contingentsList = $contingentsQuery->get();

        $kyuDanList = Kyu::query()
            ->where('is_active', true)
            ->orderBy('order')
            ->orderByDesc('name')
            ->pluck('name');

        return Inertia::render('Admin/Master/Athlete/Index', [
            'athletes' => $athletes,
            'stats' => $stats,
            'contingentsList' => $contingentsList,
            'kyuDanList' => $kyuDanList,
            'filters' => [
                'search' => $search ?? '',
                'gender' => $gender,
                'contingent_id' => $contingentId,
                'kyu_dan' => $kyuDan,
            ],
        ]);
    }

    public function detail(Request $request, Athlete $athlete): Response
    {
        $this->ensureAthleteBelongsToTenant($request, $athlete);
        $athlete->load('contingent:id,event_id,name,city');

        $relatedAthletes = Athlete::query()
            ->with('contingent:id,event_id,name')
            ->when(
                $this->tenantEvent($request) instanceof Event && ! $request->user()?->hasAnyRole(['Super Admin', 'Admin']),
                fn ($query) => $query->whereHas(
                    'contingent',
                    fn ($contingentQuery) => $contingentQuery->whereBelongsTo($this->tenantEvent($request))
                )
            )
            ->when(
                $athlete->nik,
                fn ($query) => $query->where('nik', $athlete->nik),
                fn ($query) => $athlete->kenshi_number
                    ? $query->where('kenshi_number', $athlete->kenshi_number)
                    : $query->whereKey($athlete->id)
            )
            ->get();
        $relatedIds = $relatedAthletes->modelKeys();
        $entries = AthleteMatchCategoryEntry::query()
            ->with('matchCategory:id,name')
            ->whereIn('athlete_id', $relatedIds)
            ->get();
        $results = TournamentResult::query()
            ->whereIn('athlete_id', $relatedIds)
            ->whereNotNull('event_id')
            ->get();
        $registeredEventIds = Registration::query()
            ->whereIn('contingent_id', $relatedAthletes->pluck('contingent_id'))
            ->whereNotNull('event_id')
            ->pluck('event_id');
        $eventIds = $entries->pluck('event_id')
            ->merge($results->pluck('event_id'))
            ->merge($registeredEventIds)
            ->unique();
        $eventHistory = Event::query()
            ->whereIn('id', $eventIds)
            ->orderByDesc('start_date')
            ->get(['id', 'name', 'start_date', 'city'])
            ->map(fn (Event $event) => [
                'id' => $event->id,
                'name' => $event->name,
                'city' => $event->city,
                'start_date' => $event->start_date?->format('Y-m-d'),
                'match_categories' => $entries->where('event_id', $event->id)
                    ->map(fn (AthleteMatchCategoryEntry $entry) => $entry->matchCategory?->name)
                    ->filter()->unique()->values(),
                'results' => $results->where('event_id', $event->id)
                    ->map(fn (TournamentResult $result) => [
                        'rank' => $result->rank?->label(),
                        'match_category' => $result->match_category,
                    ])->values(),
            ]);
        $rankHistory = AthleteRankHistory::query()
            ->with(['changedBy:id,name', 'athlete.contingent.event:id,name'])
            ->whereIn('athlete_id', $relatedIds)
            ->latest()
            ->get()
            ->map(fn (AthleteRankHistory $history) => [
                'id' => $history->id,
                'previous_rank' => $history->previous_rank,
                'new_rank' => $history->new_rank,
                'changed_at' => $history->created_at?->format('d M Y H:i'),
                'changed_by' => $history->changedBy?->name,
                'event' => $history->athlete?->contingent?->event?->name,
            ]);

        return Inertia::render('Admin/Master/Athlete/Detail', [
            'athlete' => [
                'id' => $athlete->id,
                'contingent_id' => $athlete->contingent_id,
                'contingent' => $athlete->contingent,
                'name' => $athlete->name,
                'nik' => $athlete->nik,
                'kenshi_number' => $athlete->kenshi_number,
                'gender' => in_array($athlete->gender, ['male', 'putra'], true) ? 'male' : 'female',
                'birth_place' => $athlete->birth_place,
                'birth_date' => $athlete->birth_date?->format('Y-m-d'),
                'blood_type' => $athlete->blood_type,
                'home_address' => $athlete->home_address,
                'dojo_name' => $athlete->dojo_name,
                'kyu_dan' => $athlete->kyu_dan,
                'weight' => $athlete->weight,
                'height' => $athlete->height,
                'profile_photo_url' => $athlete->profile_photo_path
                    ? route('admin.master.athlete.photo', $athlete)
                    : null,
            ],
            'contingents' => Contingent::query()
                ->where('event_id', $athlete->contingent?->event_id)
                ->orderBy('name')
                ->get(['id', 'name']),
            'kyus' => Kyu::query()->where('is_active', true)->orderBy('order')->pluck('name'),
            'rankHistory' => $rankHistory,
            'eventHistory' => $eventHistory,
            'historyScopedToEvent' => $this->tenantEvent($request) instanceof Event
                && ! $request->user()?->hasAnyRole(['Super Admin', 'Admin']),
        ]);
    }

    /**
     * Store a newly created athlete.
     */
    public function store(StoreAthleteRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $this->ensureContingentBelongsToTenant($request, $validated['contingent_id']);
        $this->ensureIdentityAvailable($validated);

        DB::transaction(function () use ($request, $validated): void {
            $athlete = Athlete::create($validated);
            $athlete->rankHistories()->create([
                'changed_by' => $request->user()?->id,
                'new_rank' => $athlete->kyu_dan,
            ]);
        });

        return redirect()->back()->with('success', 'Data atlet/kenshi berhasil ditambahkan.');
    }

    /**
     * Update the specified athlete.
     */
    public function update(UpdateAthleteRequest $request, Athlete $athlete): RedirectResponse
    {
        $this->ensureAthleteBelongsToTenant($request, $athlete);

        $validated = $request->validated();
        $this->ensureContingentBelongsToTenant($request, $validated['contingent_id']);
        $this->ensureIdentityAvailable($validated, $athlete);
        $targetContingent = Contingent::query()->findOrFail($validated['contingent_id']);
        if ($targetContingent->event_id !== $athlete->contingent?->event_id) {
            throw ValidationException::withMessages([
                'contingent_id' => 'Perpindahan kontingen hanya dapat dilakukan dalam event yang sama.',
            ]);
        }

        DB::transaction(function () use ($request, $athlete, $validated): void {
            $previousRank = $athlete->kyu_dan;
            $athlete->update($validated);
            if ($previousRank !== $athlete->kyu_dan) {
                $athlete->rankHistories()->create([
                    'changed_by' => $request->user()?->id,
                    'previous_rank' => $previousRank,
                    'new_rank' => $athlete->kyu_dan,
                ]);
            }
        });

        return redirect()->back()->with('success', 'Data atlet/kenshi berhasil diperbarui.');
    }

    /**
     * Remove the specified athlete from storage.
     */
    public function destroy(Request $request, Athlete $athlete): RedirectResponse
    {
        $this->ensureAthleteBelongsToTenant($request, $athlete);

        $athlete->delete();

        return redirect()->back()->with('success', 'Data atlet/kenshi berhasil dihapus.');
    }

    public function photo(Request $request, Athlete $athlete): mixed
    {
        $this->ensureAthleteBelongsToTenant($request, $athlete);
        abort_unless($athlete->profile_photo_path && Storage::exists($athlete->profile_photo_path), 404);

        return Storage::response($athlete->profile_photo_path);
    }

    public function updatePhoto(Request $request, Athlete $athlete): RedirectResponse
    {
        $this->ensureAthleteBelongsToTenant($request, $athlete);
        $request->validate(['profile_photo' => ['required', 'image', 'max:2048']]);
        $previousPhoto = $athlete->profile_photo_path;
        $athlete->update([
            'profile_photo_path' => $request->file('profile_photo')->store('athlete-photos'),
        ]);
        if ($previousPhoto) {
            Storage::delete($previousPhoto);
        }

        return back()->with('success', 'Foto profil kenshi berhasil diperbarui.');
    }

    private function tenantEvent(Request $request): ?Event
    {
        $tenantEvent = $request->attributes->get('tenantEvent');

        return $tenantEvent instanceof Event ? $tenantEvent : null;
    }

    private function ensureContingentBelongsToTenant(Request $request, string $contingentId): void
    {
        $tenantEvent = $this->tenantEvent($request);

        if ($tenantEvent instanceof Event) {
            abort_unless(Contingent::query()->whereKey($contingentId)->whereBelongsTo($tenantEvent)->exists(), 404);
        }
    }

    private function ensureAthleteBelongsToTenant(Request $request, Athlete $athlete): void
    {
        $tenantEvent = $this->tenantEvent($request);

        if ($tenantEvent instanceof Event) {
            abort_unless($athlete->contingent()->whereBelongsTo($tenantEvent)->exists(), 404);
        }
    }

    /**
     * Keep one identity per event while allowing the same kenshi to return for later events.
     *
     * @param  array<string, mixed>  $data
     */
    private function ensureIdentityAvailable(array $data, ?Athlete $except = null): void
    {
        $contingent = Contingent::query()->findOrFail($data['contingent_id']);
        $query = Athlete::query()
            ->whereHas('contingent', fn ($builder) => $builder->where('event_id', $contingent->event_id))
            ->when($except, fn ($builder) => $builder->where('id', '!=', $except->id));

        if (! empty($data['nik']) && (clone $query)->where('nik', $data['nik'])->exists()) {
            throw ValidationException::withMessages(['nik' => 'NIK ini sudah terdaftar pada event yang sama.']);
        }
        if (! empty($data['kenshi_number']) && (clone $query)->where('kenshi_number', $data['kenshi_number'])->exists()) {
            throw ValidationException::withMessages(['kenshi_number' => 'Nomor Induk Kenshi ini sudah terdaftar pada event yang sama.']);
        }
    }
}
