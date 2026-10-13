<?php

namespace App\Http\Controllers\Contingent;

use App\Http\Controllers\Controller;
use App\Http\Requests\Contingent\SaveOfficialRequest;
use App\Models\Contingent;
use App\Models\Official;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class OfficialController extends Controller
{
    public function store(SaveOfficialRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['contingent_id'] = $this->primaryContingent($request)->id;
        Official::create($data);

        return back()->with('success', 'Data master official berhasil ditambahkan.');
    }

    public function update(SaveOfficialRequest $request, Official $official): RedirectResponse
    {
        $this->ensureOwned($request, $official);
        $official->update($request->validated());

        return back()->with('success', 'Data master official berhasil diperbarui.');
    }

    public function destroy(Request $request, Official $official): RedirectResponse
    {
        $this->ensureOwned($request, $official);
        $official->delete();

        return back()->with('success', 'Data master official berhasil dihapus.');
    }

    private function ensureOwned(Request $request, Official $official): void
    {
        abort_unless($this->masterContingentIds($request->user())->contains($official->contingent_id), 404);
    }

    private function primaryContingent(Request $request): Contingent
    {
        return Contingent::query()
            ->where('user_id', $request->user()->id)
            ->whereIn('id', $this->masterContingentIds($request->user()))
            ->oldest()
            ->firstOrFail();
    }

    /** @return Collection<int, string> */
    private function masterContingentIds(User $user): Collection
    {
        $ownedContingents = Contingent::query()
            ->where('user_id', $user->id)
            ->get(['id', 'source_contingent_id']);
        $ownedIds = $ownedContingents->pluck('id');

        return $ownedContingents
            ->map(fn (Contingent $contingent): string => $contingent->source_contingent_id
                && $ownedIds->contains($contingent->source_contingent_id)
                    ? $contingent->source_contingent_id
                    : $contingent->id)
            ->unique()
            ->values();
    }
}
