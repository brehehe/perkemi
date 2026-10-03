<?php

namespace App\Http\Controllers\Admin\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Master\StoreClerkRequest;
use App\Http\Requests\Admin\Master\UpdateClerkRequest;
use App\Models\Clerk;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClerkController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        $likeOperator = config('database.default') === 'pgsql' ? 'ilike' : 'like';

        $clerks = Clerk::query()
            ->when($search, fn ($query) => $query->where(fn ($query) => $query
                ->where('name', $likeOperator, "%{$search}%")
                ->orWhere('employee_number', $likeOperator, "%{$search}%")
                ->orWhere('region', $likeOperator, "%{$search}%")))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Master/Clerk/Index', ['clerks' => $clerks, 'filters' => ['search' => $search]]);
    }

    public function store(StoreClerkRequest $request): RedirectResponse
    {
        Clerk::create($request->validated());

        return back()->with('success', 'Master Data Panitera berhasil ditambahkan.');
    }

    public function update(UpdateClerkRequest $request, Clerk $clerk): RedirectResponse
    {
        $clerk->update($request->validated());

        return back()->with('success', 'Master Data Panitera berhasil diperbarui.');
    }

    public function destroy(Clerk $clerk): RedirectResponse
    {
        $clerk->delete();

        return back()->with('success', 'Master Data Panitera berhasil dihapus.');
    }
}
