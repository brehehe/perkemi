<?php

namespace App\Http\Controllers\Admin\Master;

use App\Enums\ContingentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Master\StoreContingentRequest;
use App\Http\Requests\Admin\Master\UpdateContingentRequest;
use App\Models\Athlete;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\Official;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ContingentController extends Controller
{
    /**
     * Display a listing of contingents.
     */
    public function index(Request $request): Response
    {
        $tenantEvent = $request->attributes->get('tenantEvent');
        $activeEvent = $tenantEvent instanceof Event
            ? $tenantEvent
            : Event::where('is_active', true)->first();

        $search = $request->input('search');
        $status = $request->input('status', 'all');

        $query = Contingent::query()
            ->with([
                'event:id,name,city',
                'user:id,name,email',
                'athletes:id,contingent_id,name,gender,kyu_dan,weight,height',
                'officials:id,contingent_id,name,role,gender,phone,email',
            ])
            ->withCount(['athletes', 'officials', 'registrations'])
            ->latest();

        if ($tenantEvent instanceof Event) {
            $query->whereBelongsTo($tenantEvent);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('city', 'ilike', "%{$search}%")
                    ->orWhere('manager_name', 'ilike', "%{$search}%")
                    ->orWhere('phone', 'ilike', "%{$search}%");
            });
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $contingents = $query->paginate(15)->withQueryString();

        $contingentStatsQuery = Contingent::query();

        if ($tenantEvent instanceof Event) {
            $contingentStatsQuery->whereBelongsTo($tenantEvent);
        }

        $stats = [
            'total_contingents' => (clone $contingentStatsQuery)->count(),
            'verified_contingents' => (clone $contingentStatsQuery)->where('status', ContingentStatus::Verified)->count(),
            'pending_contingents' => (clone $contingentStatsQuery)->where('status', ContingentStatus::Pending)->count(),
            'total_athletes' => Athlete::query()->when($tenantEvent instanceof Event, fn ($query) => $query->whereHas('contingent', fn ($contingentQuery) => $contingentQuery->whereBelongsTo($tenantEvent)))->count(),
            'total_officials' => Official::query()->when($tenantEvent instanceof Event, fn ($query) => $query->whereHas('contingent', fn ($contingentQuery) => $contingentQuery->whereBelongsTo($tenantEvent)))->count(),
        ];

        return Inertia::render('Admin/Master/Contingent/Index', [
            'contingents' => $contingents,
            'stats' => $stats,
            'activeEvent' => $activeEvent,
            'users' => User::query()->orderBy('name')->get(['id', 'name', 'email']),
            'filters' => [
                'search' => $search ?? '',
                'status' => $status,
            ],
        ]);
    }

    /**
     * Store a newly created contingent.
     */
    public function store(StoreContingentRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $tenantEvent = $request->attributes->get('tenantEvent');

        if ($tenantEvent instanceof Event) {
            $validated['event_id'] = $tenantEvent->id;
        }

        if (empty($validated['event_id'])) {
            $activeEvent = Event::where('is_active', true)->first();
            if ($activeEvent) {
                $validated['event_id'] = $activeEvent->id;
            }
        }

        if (empty($validated['user_id']) && $request->user()) {
            $validated['user_id'] = $request->user()->id;
        }

        if (empty($validated['status'])) {
            $validated['status'] = ContingentStatus::Pending;
        }

        Contingent::create($validated);

        return redirect()->back()->with('success', 'Kontingen berhasil ditambahkan.');
    }

    /**
     * Update the specified contingent.
     */
    public function update(UpdateContingentRequest $request, Contingent $contingent): RedirectResponse
    {
        $tenantEvent = $request->attributes->get('tenantEvent');
        abort_unless(! ($tenantEvent instanceof Event) || $contingent->event_id === $tenantEvent->id, 404);

        $validated = $request->validated();

        if ($tenantEvent instanceof Event) {
            $validated['event_id'] = $tenantEvent->id;
        }

        if (empty($validated['user_id'])) {
            unset($validated['user_id']);
        }

        $contingent->update($validated);

        return redirect()->back()->with('success', 'Data kontingen berhasil diperbarui.');
    }

    /**
     * Verify the specified contingent.
     */
    public function verify(Request $request, Contingent $contingent): RedirectResponse
    {
        $tenantEvent = $request->attributes->get('tenantEvent');
        abort_unless(! ($tenantEvent instanceof Event) || $contingent->event_id === $tenantEvent->id, 404);

        $contingent->update([
            'status' => ContingentStatus::Verified,
        ]);

        return redirect()->back()->with('success', "Kontingen {$contingent->name} berhasil diverifikasi.");
    }

    /**
     * Remove the specified contingent from storage.
     */
    public function destroy(Request $request, Contingent $contingent): RedirectResponse
    {
        $tenantEvent = $request->attributes->get('tenantEvent');
        abort_unless(! ($tenantEvent instanceof Event) || $contingent->event_id === $tenantEvent->id, 404);

        $contingent->delete();

        return redirect()->back()->with('success', 'Kontingen berhasil dihapus.');
    }
}
