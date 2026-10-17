<?php

namespace App\Http\Controllers\Admin\Master;

use App\Actions\Admin\Master\SyncLoginAccountAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Master\StoreRefereeRequest;
use App\Http\Requests\Admin\Master\UpdateRefereeRequest;
use App\Models\Referee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
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

    public function store(StoreRefereeRequest $request, SyncLoginAccountAction $syncLoginAccount): RedirectResponse
    {
        $validated = $request->validated();
        $password = $validated['password'] ?? null;
        unset($validated['password']);

        DB::transaction(function () use ($password, $syncLoginAccount, $validated): void {
            $referee = Referee::create($validated);
            $user = $syncLoginAccount->execute($referee->name, $referee->email, $password, 'Wasit', phone: $referee->phone);

            if ($user && Referee::query()->where('user_id', $user->id)->whereKeyNot($referee->id)->exists()) {
                throw ValidationException::withMessages([
                    'email' => 'Email login tersebut sudah terhubung ke wasit lain.',
                ]);
            }

            if ($user) {
                $referee->update(['user_id' => $user->id]);
            }
        });

        return back()->with('success', 'Master Data Wasit berhasil ditambahkan.');
    }

    public function update(UpdateRefereeRequest $request, Referee $referee, SyncLoginAccountAction $syncLoginAccount): RedirectResponse
    {
        $validated = $request->validated();
        $password = $validated['password'] ?? null;
        unset($validated['password']);

        DB::transaction(function () use ($password, $referee, $syncLoginAccount, $validated): void {
            $referee->update($validated);
            $user = $syncLoginAccount->execute($referee->name, $referee->email, $password, 'Wasit', $referee->user, $referee->phone);

            if ($user && Referee::query()->where('user_id', $user->id)->whereKeyNot($referee->id)->exists()) {
                throw ValidationException::withMessages([
                    'email' => 'Email login tersebut sudah terhubung ke wasit lain.',
                ]);
            }

            if ($user && $referee->user_id !== $user->id) {
                $referee->update(['user_id' => $user->id]);
            }
        });

        return back()->with('success', 'Master Data Wasit berhasil diperbarui.');
    }

    public function destroy(Referee $referee): RedirectResponse
    {
        $referee->delete();

        return back()->with('success', 'Master Data Wasit berhasil dihapus.');
    }
}
