<?php

namespace App\Http\Controllers\Contingent;

use App\Http\Controllers\Controller;
use App\Http\Requests\Contingent\SaveAthleteRequest;
use App\Models\Athlete;
use App\Models\Contingent;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AthleteController extends Controller
{
    public function store(SaveAthleteRequest $request): RedirectResponse
    {
        $data = $request->safe()->except('profile_photo');
        $data['contingent_id'] = $this->primaryContingent($request)->id;
        $this->ensureIdentityAvailable($request, $data);

        $photoPath = $request->file('profile_photo')?->store('athlete-photos');
        if ($photoPath !== null) {
            $data['profile_photo_path'] = $photoPath;
        }

        try {
            DB::transaction(function () use ($request, $data): void {
                $athlete = Athlete::create($data);
                $athlete->rankHistories()->create([
                    'changed_by' => $request->user()?->id,
                    'new_rank' => $athlete->kyu_dan,
                ]);
            });
        } catch (\Throwable $exception) {
            if ($photoPath !== null) {
                Storage::delete($photoPath);
            }

            throw $exception;
        }

        return back()->with('success', 'Data master atlet berhasil ditambahkan.');
    }

    public function update(SaveAthleteRequest $request, Athlete $athlete): RedirectResponse
    {
        $this->ensureOwned($request, $athlete);
        $data = $request->safe()->except('profile_photo');
        $data['contingent_id'] = $athlete->contingent_id;
        $this->ensureIdentityAvailable($request, $data, $athlete);

        $previousPhotoPath = $athlete->profile_photo_path;
        $newPhotoPath = $request->file('profile_photo')?->store('athlete-photos');
        if ($newPhotoPath !== null) {
            $data['profile_photo_path'] = $newPhotoPath;
        }

        try {
            DB::transaction(function () use ($request, $athlete, $data): void {
                $previousRank = $athlete->kyu_dan;
                $athlete->update($data);

                if ($previousRank !== $athlete->kyu_dan) {
                    $athlete->rankHistories()->create([
                        'changed_by' => $request->user()?->id,
                        'previous_rank' => $previousRank,
                        'new_rank' => $athlete->kyu_dan,
                    ]);
                }
            });
        } catch (\Throwable $exception) {
            if ($newPhotoPath !== null) {
                Storage::delete($newPhotoPath);
            }

            throw $exception;
        }

        if ($newPhotoPath !== null && $previousPhotoPath !== null) {
            Storage::delete($previousPhotoPath);
        }

        return back()->with('success', 'Data master atlet berhasil diperbarui.');
    }

    public function destroy(Request $request, Athlete $athlete): RedirectResponse
    {
        $this->ensureOwned($request, $athlete);
        $athlete->delete();

        return back()->with('success', 'Data master atlet berhasil dihapus.');
    }

    public function photo(Request $request, Athlete $athlete): mixed
    {
        $this->ensureOwned($request, $athlete);
        abort_unless($athlete->profile_photo_path && Storage::exists($athlete->profile_photo_path), 404);

        return Storage::response($athlete->profile_photo_path, null, [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function ensureOwned(Request $request, Athlete $athlete): void
    {
        abort_unless($this->masterContingentIds($request->user())->contains($athlete->contingent_id), 404);
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

    /** @param array<string, mixed> $data */
    private function ensureIdentityAvailable(Request $request, array $data, ?Athlete $except = null): void
    {
        $query = Athlete::query()
            ->whereIn('contingent_id', $this->masterContingentIds($request->user()))
            ->when($except, fn ($builder) => $builder->whereKeyNot($except->id));

        if (! empty($data['nik']) && (clone $query)->where('nik', $data['nik'])->exists()) {
            throw ValidationException::withMessages(['nik' => 'NIK ini sudah tercatat pada master atlet kontingen.']);
        }

        if (! empty($data['kenshi_number']) && (clone $query)->where('kenshi_number', $data['kenshi_number'])->exists()) {
            throw ValidationException::withMessages(['kenshi_number' => 'Nomor Induk Kenshi ini sudah tercatat pada master atlet kontingen.']);
        }
    }
}
