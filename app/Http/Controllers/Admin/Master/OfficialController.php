<?php

namespace App\Http\Controllers\Admin\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Master\StoreOfficialRequest;
use App\Http\Requests\Admin\Master\UpdateOfficialRequest;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\Official;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OfficialController extends Controller
{
    /**
     * Display a listing of officials.
     */
    public function index(Request $request): Response
    {
        $tenantEvent = $this->tenantEvent($request);
        $search = $request->input('search');
        $role = $request->input('role', 'all');
        $contingentId = $request->input('contingent_id', 'all');
        $gender = $request->input('gender', 'all');
        $likeOp = config('database.default') === 'pgsql' ? 'ilike' : 'like';

        $query = Official::query()
            ->with('contingent:id,name,city')
            ->latest();

        if ($tenantEvent instanceof Event) {
            $query->whereHas('contingent', fn ($contingentQuery) => $contingentQuery->whereBelongsTo($tenantEvent));
        }

        if ($search) {
            $query->where(function ($q) use ($search, $likeOp) {
                $q->where('name', $likeOp, "%{$search}%")
                    ->orWhere('role', $likeOp, "%{$search}%")
                    ->orWhere('phone', $likeOp, "%{$search}%")
                    ->orWhere('email', $likeOp, "%{$search}%")
                    ->orWhereHas('contingent', function ($cq) use ($search, $likeOp) {
                        $cq->where('name', $likeOp, "%{$search}%")
                            ->orWhere('city', $likeOp, "%{$search}%");
                    });
            });
        }

        if ($role && $role !== 'all') {
            $query->where('role', $role);
        }

        if ($contingentId && $contingentId !== 'all') {
            $query->where('contingent_id', $contingentId);
        }

        if ($gender && $gender !== 'all') {
            if ($gender === 'male' || $gender === 'putra' || $gender === 'L') {
                $query->whereIn('gender', ['male', 'putra', 'L']);
            } elseif ($gender === 'female' || $gender === 'putri' || $gender === 'P') {
                $query->whereIn('gender', ['female', 'putri', 'P']);
            }
        }

        $officials = $query->paginate(15)->withQueryString();

        // Transform formatted data
        $officials->getCollection()->transform(function ($official) {
            return [
                'id' => $official->id,
                'contingent_id' => $official->contingent_id,
                'contingent' => $official->contingent,
                'name' => $official->name,
                'role' => $official->role,
                'gender' => in_array($official->gender, ['male', 'putra', 'L']) ? 'male' : 'female',
                'phone' => $official->phone,
                'email' => $official->email,
                'id_card_number' => $official->id_card_number,
                'notes' => $official->notes,
                'created_at' => $official->created_at?->format('d M Y'),
            ];
        });

        $officialStatsQuery = Official::query();

        if ($tenantEvent instanceof Event) {
            $officialStatsQuery->whereHas('contingent', fn ($contingentQuery) => $contingentQuery->whereBelongsTo($tenantEvent));
        }

        $stats = [
            'total_officials' => (clone $officialStatsQuery)->count(),
            'total_managers' => (clone $officialStatsQuery)->where('role', $likeOp, '%Manajer%')->count(),
            'total_coaches' => (clone $officialStatsQuery)->where('role', $likeOp, '%Pelatih%')->count(),
            'total_medics' => (clone $officialStatsQuery)->where('role', $likeOp, '%Medis%')->count(),
        ];

        $contingentsQuery = Contingent::select(['id', 'name', 'city'])->orderBy('name');

        if ($tenantEvent instanceof Event) {
            $contingentsQuery->whereBelongsTo($tenantEvent);
        }

        $contingentsList = $contingentsQuery->get();

        $rolesListQuery = Official::select('role')
            ->distinct()
            ->whereNotNull('role')
            ->orderBy('role');

        if ($tenantEvent instanceof Event) {
            $rolesListQuery->whereHas('contingent', fn ($contingentQuery) => $contingentQuery->whereBelongsTo($tenantEvent));
        }

        $rolesList = $rolesListQuery->pluck('role');

        return Inertia::render('Admin/Master/Official/Index', [
            'officials' => $officials,
            'stats' => $stats,
            'contingentsList' => $contingentsList,
            'rolesList' => $rolesList,
            'filters' => [
                'search' => $search ?? '',
                'role' => $role,
                'contingent_id' => $contingentId,
                'gender' => $gender,
            ],
        ]);
    }

    /**
     * Store a newly created official.
     */
    public function store(StoreOfficialRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $this->ensureContingentBelongsToTenant($request, $validated['contingent_id']);

        Official::create($validated);

        return redirect()->back()->with('success', 'Data official kontingen berhasil ditambahkan.');
    }

    /**
     * Update the specified official.
     */
    public function update(UpdateOfficialRequest $request, Official $official): RedirectResponse
    {
        $this->ensureOfficialBelongsToTenant($request, $official);

        $validated = $request->validated();
        $this->ensureContingentBelongsToTenant($request, $validated['contingent_id']);

        $official->update($validated);

        return redirect()->back()->with('success', 'Data official kontingen berhasil diperbarui.');
    }

    /**
     * Remove the specified official from storage.
     */
    public function destroy(Request $request, Official $official): RedirectResponse
    {
        $this->ensureOfficialBelongsToTenant($request, $official);

        $official->delete();

        return redirect()->back()->with('success', 'Data official kontingen berhasil dihapus.');
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

    private function ensureOfficialBelongsToTenant(Request $request, Official $official): void
    {
        $tenantEvent = $this->tenantEvent($request);

        if ($tenantEvent instanceof Event) {
            abort_unless($official->contingent()->whereBelongsTo($tenantEvent)->exists(), 404);
        }
    }
}
