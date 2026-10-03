<?php

namespace App\Http\Controllers\Admin\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Master\StoreKyuRequest;
use App\Http\Requests\Admin\Master\UpdateKyuRequest;
use App\Models\Kyu;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KyuController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        $likeOperator = config('database.default') === 'pgsql' ? 'ilike' : 'like';

        $kyus = Kyu::query()
            ->when($search, fn ($query) => $query->where('name', $likeOperator, "%{$search}%"))
            ->orderBy('order')
            ->orderByDesc('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Master/Kyu/Index', [
            'kyus' => $kyus,
            'filters' => ['search' => $search],
        ]);
    }

    public function store(StoreKyuRequest $request): RedirectResponse
    {
        Kyu::create($request->validated());

        return back()->with('success', 'Master Kyu berhasil ditambahkan.');
    }

    public function update(UpdateKyuRequest $request, Kyu $kyu): RedirectResponse
    {
        $kyu->update($request->validated());

        return back()->with('success', 'Master Kyu berhasil diperbarui.');
    }

    public function destroy(Kyu $kyu): RedirectResponse
    {
        $kyu->delete();

        return back()->with('success', 'Master Kyu berhasil dihapus.');
    }
}
