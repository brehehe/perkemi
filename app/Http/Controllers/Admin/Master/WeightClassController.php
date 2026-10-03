<?php

namespace App\Http\Controllers\Admin\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Master\StoreWeightClassRequest;
use App\Http\Requests\Admin\Master\UpdateWeightClassRequest;
use App\Models\WeightClass;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WeightClassController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        $likeOperator = config('database.default') === 'pgsql' ? 'ilike' : 'like';

        $weightClasses = WeightClass::query()
            ->when($search, fn ($query) => $query->where('name', $likeOperator, "%{$search}%"))
            ->orderBy('order')
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Master/WeightClass/Index', [
            'weightClasses' => $weightClasses,
            'filters' => ['search' => $search],
        ]);
    }

    public function store(StoreWeightClassRequest $request): RedirectResponse
    {
        WeightClass::create($request->validated());

        return back()->with('success', 'Master Berat Badan berhasil ditambahkan.');
    }

    public function update(UpdateWeightClassRequest $request, WeightClass $weightClass): RedirectResponse
    {
        $weightClass->update($request->validated());

        return back()->with('success', 'Master Berat Badan berhasil diperbarui.');
    }

    public function destroy(WeightClass $weightClass): RedirectResponse
    {
        $weightClass->delete();

        return back()->with('success', 'Master Berat Badan berhasil dihapus.');
    }
}
