<?php

namespace App\Http\Controllers\Admin\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Master\StoreRefereeRequest;
use App\Http\Requests\Admin\Master\UpdateRefereeRequest;
use App\Models\Referee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RefereeController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        $likeOperator = config('database.default') === 'pgsql' ? 'ilike' : 'like';

        $referees = Referee::query()
            ->when($search, fn ($query) => $query->where(fn ($query) => $query
                ->where('name', $likeOperator, "%{$search}%")
                ->orWhere('license_number', $likeOperator, "%{$search}%")
                ->orWhere('region', $likeOperator, "%{$search}%")))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Master/Referee/Index', [
            'referees' => $referees,
            'filters' => ['search' => $search],
        ]);
    }

    public function store(StoreRefereeRequest $request): RedirectResponse
    {
        Referee::create($request->validated());

        return back()->with('success', 'Master Data Wasit berhasil ditambahkan.');
    }

    public function update(UpdateRefereeRequest $request, Referee $referee): RedirectResponse
    {
        $referee->update($request->validated());

        return back()->with('success', 'Master Data Wasit berhasil diperbarui.');
    }

    public function destroy(Referee $referee): RedirectResponse
    {
        $referee->delete();

        return back()->with('success', 'Master Data Wasit berhasil dihapus.');
    }
}
