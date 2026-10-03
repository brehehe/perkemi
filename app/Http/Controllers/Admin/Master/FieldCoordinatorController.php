<?php

namespace App\Http\Controllers\Admin\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Master\StoreFieldCoordinatorRequest;
use App\Http\Requests\Admin\Master\UpdateFieldCoordinatorRequest;
use App\Models\FieldCoordinator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

    public function store(StoreFieldCoordinatorRequest $request): RedirectResponse
    {
        FieldCoordinator::create($request->validated());

        return back()->with('success', 'Master Koordinator Lapangan berhasil ditambahkan.');
    }

    public function update(UpdateFieldCoordinatorRequest $request, FieldCoordinator $fieldCoordinator): RedirectResponse
    {
        $fieldCoordinator->update($request->validated());

        return back()->with('success', 'Master Koordinator Lapangan berhasil diperbarui.');
    }

    public function destroy(FieldCoordinator $fieldCoordinator): RedirectResponse
    {
        $fieldCoordinator->delete();

        return back()->with('success', 'Master Koordinator Lapangan berhasil dihapus.');
    }
}
