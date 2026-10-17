<?php

namespace App\Http\Controllers\Admin\Master;

use App\Actions\Admin\Master\SyncLoginAccountAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Master\StoreFieldCoordinatorRequest;
use App\Http\Requests\Admin\Master\UpdateFieldCoordinatorRequest;
use App\Models\FieldCoordinator;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class FieldCoordinatorController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        $likeOperator = config('database.default') === 'pgsql' ? 'ilike' : 'like';
        $fieldCoordinators = FieldCoordinator::query()
            ->when($search, fn ($query) => $query->where(fn ($query) => $query->where('name', $likeOperator, "%{$search}%")->orWhere('region', $likeOperator, "%{$search}%")))
            ->orderBy('name')->paginate(15)->withQueryString();

        return Inertia::render('Admin/Master/FieldCoordinator/Index', ['fieldCoordinators' => $fieldCoordinators, 'filters' => ['search' => $search]]);
    }

    public function store(StoreFieldCoordinatorRequest $request, SyncLoginAccountAction $syncLoginAccount): RedirectResponse
    {
        $validated = $request->validated();
        $password = $validated['password'] ?? null;
        unset($validated['password']);

        DB::transaction(function () use ($password, $syncLoginAccount, $validated): void {
            $fieldCoordinator = FieldCoordinator::create($validated);
            $syncLoginAccount->execute($fieldCoordinator->name, $fieldCoordinator->email, $password, 'Koordinator Lapangan', phone: $fieldCoordinator->phone);
        });

        return back()->with('success', 'Master Koordinator Lapangan berhasil ditambahkan.');
    }

    public function update(UpdateFieldCoordinatorRequest $request, FieldCoordinator $fieldCoordinator, SyncLoginAccountAction $syncLoginAccount): RedirectResponse
    {
        $validated = $request->validated();
        $password = $validated['password'] ?? null;
        unset($validated['password']);
        $loginUser = $fieldCoordinator->email
            ? User::query()->whereRaw('LOWER(email) = ?', [mb_strtolower($fieldCoordinator->email)])->first()
            : null;

        DB::transaction(function () use ($fieldCoordinator, $loginUser, $password, $syncLoginAccount, $validated): void {
            $fieldCoordinator->update($validated);
            $syncLoginAccount->execute($fieldCoordinator->name, $fieldCoordinator->email, $password, 'Koordinator Lapangan', $loginUser, $fieldCoordinator->phone);
        });

        return back()->with('success', 'Master Koordinator Lapangan berhasil diperbarui.');
    }

    public function destroy(FieldCoordinator $fieldCoordinator): RedirectResponse
    {
        $fieldCoordinator->delete();

        return back()->with('success', 'Master Koordinator Lapangan berhasil dihapus.');
    }
}
