<?php

namespace App\Http\Controllers\Admin\Master;

use App\Actions\Admin\Master\SyncLoginAccountAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Master\StoreClerkRequest;
use App\Http\Requests\Admin\Master\UpdateClerkRequest;
use App\Models\Clerk;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

    public function store(StoreClerkRequest $request, SyncLoginAccountAction $syncLoginAccount): RedirectResponse
    {
        $validated = $request->validated();
        $password = $validated['password'] ?? null;
        unset($validated['password']);

        DB::transaction(function () use ($password, $syncLoginAccount, $validated): void {
            $clerk = Clerk::create($validated);
            $syncLoginAccount->execute($clerk->name, $clerk->email, $password, 'Panitera', phone: $clerk->phone);
        });

        return back()->with('success', 'Master Data Panitera berhasil ditambahkan.');
    }

    public function update(UpdateClerkRequest $request, Clerk $clerk, SyncLoginAccountAction $syncLoginAccount): RedirectResponse
    {
        $validated = $request->validated();
        $password = $validated['password'] ?? null;
        unset($validated['password']);
        $loginUser = $clerk->email
            ? User::query()->whereRaw('LOWER(email) = ?', [mb_strtolower($clerk->email)])->first()
            : null;

        DB::transaction(function () use ($clerk, $loginUser, $password, $syncLoginAccount, $validated): void {
            $clerk->update($validated);
            $syncLoginAccount->execute($clerk->name, $clerk->email, $password, 'Panitera', $loginUser, $clerk->phone);
        });

        return back()->with('success', 'Master Data Panitera berhasil diperbarui.');
    }

    public function destroy(Clerk $clerk): RedirectResponse
    {
        $clerk->delete();

        return back()->with('success', 'Master Data Panitera berhasil dihapus.');
    }
}
