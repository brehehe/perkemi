<?php

namespace App\Http\Controllers\Admin\Registration;

use App\Enums\PaymentStatus;
use App\Enums\RegistrationStatus;
use App\Http\Controllers\Controller;
use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\EmbuTeamTechnique;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\Official;
use App\Models\Registration;
use App\Services\ParticipantEligibilityService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RegistrationWizardController extends Controller
{
    public function __construct(private ParticipantEligibilityService $eligibility) {}

    public function updateContingent(Request $request, Registration $registration): RedirectResponse
    {
        $this->authorizeRegistrationMutation($request, $registration);
        $data = $request->validate([
            'city' => ['required', 'string', 'max:100'],
            'name' => ['required', 'string', 'max:255'],
            'manager_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'email' => ['required', 'email', 'max:255'],
            'address' => ['required', 'string', 'max:2000'],
        ]);
        $registration->contingent->update($data);

        return back()->with('success', 'Data kontingen tersimpan.');
    }

    public function saveOfficial(Request $request, Registration $registration, ?Official $official = null): RedirectResponse
    {
        $this->authorizeRegistrationMutation($request, $registration);
        if ($official !== null) {
            abort_unless($official->contingent_id === $registration->contingent_id, 404);
        }
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:50'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'putra', 'putri', 'L', 'P'])],
        ]);
        $data['gender'] ??= $official?->gender ?? 'L';
        $registration->contingent->officials()->updateOrCreate(['id' => $official?->id], $data);

        return back()->with('success', 'Official pendamping tersimpan.');
    }

    public function deleteOfficial(Request $request, Registration $registration, Official $official): RedirectResponse
    {
        $this->authorizeRegistrationMutation($request, $registration);
        abort_unless($official->contingent_id === $registration->contingent_id, 404);
        $official->delete();

        return back()->with('success', 'Official pendamping dihapus.');
    }

    public function copyOfficial(Request $request, Registration $registration): RedirectResponse
    {
        $this->authorizeRegistrationMutation($request, $registration);
        $data = $request->validate(['official_id' => ['required', 'uuid', 'exists:officials,id']]);
        $source = Official::query()->with('contingent')->findOrFail($data['official_id']);
        $this->authorizeSource($request, $registration, $source->contingent);
        if ($source->contingent_id === $registration->contingent_id) {
            return back();
        }
        $copy = $source->replicate();
        $copy->contingent_id = $registration->contingent_id;
        $copy->save();

        return back()->with('success', 'Official dari master berhasil diambil.');
    }

    public function copyAthlete(Request $request, Registration $registration): RedirectResponse
    {
        $this->authorizeRegistrationMutation($request, $registration);
        $data = $request->validate(['athlete_id' => ['required', 'uuid', 'exists:athletes,id']]);
        $source = Athlete::query()->with('contingent')->findOrFail($data['athlete_id']);
        $this->authorizeSource($request, $registration, $source->contingent);
        if ($source->contingent_id === $registration->contingent_id) {
            return back();
        }
        if ($source->contingent?->event_id === $registration->event_id) {
            throw ValidationException::withMessages(['athlete_id' => 'Atlet pada event yang sama harus tetap menggunakan kontingen asalnya.']);
        }
        $this->ensureIdentityAvailable($registration, $source->nik, $source->kenshi_number);
        $copy = $source->replicate(['school_document_path', 'school_verified_at', 'school_verified_by', 'school_verification_hash']);
        $copy->contingent_id = $registration->contingent_id;
        $copy->event_age_category_id = null;
        $this->eligibility->validateProfile($registration->event, $copy);
        $copy->save();
        if ($copy->kyu_dan) {
            $copy->rankHistories()->create(['changed_by' => $request->user()?->id, 'new_rank' => $copy->kyu_dan]);
        }

        return back()->with('success', 'Atlet dari master berhasil diambil. Pilih nomor pertandingannya pada data atlet.');
    }

    public function athletePhoto(Request $request, Registration $registration, Athlete $athlete): mixed
    {
        $this->authorizeRegistration($request, $registration);
        abort_unless($athlete->contingent_id === $registration->contingent_id
            && $athlete->profile_photo_path && Storage::exists($athlete->profile_photo_path), 404);

        return Storage::response($athlete->profile_photo_path);
    }

    public function saveAthlete(Request $request, Registration $registration, ?Athlete $athlete = null): RedirectResponse
    {
        $this->authorizeRegistrationMutation($request, $registration);
        if ($athlete !== null) {
            abort_unless($athlete->contingent_id === $registration->contingent_id, 404);
        }
        $data = $request->validate([
            ...$this->eligibility->schoolInputRules(),
            'school_document' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'name' => ['required', 'string', 'max:255'],
            'nik' => ['nullable', 'digits:16'],
            'kenshi_number' => ['nullable', 'string', 'max:50'],
            'gender' => ['required', Rule::in(['male', 'female', 'putra', 'putri', 'L', 'P'])],
            'birth_place' => ['nullable', 'string', 'max:255'],
            'birth_date' => ['required', 'date', 'before:today'],
            'event_age_category_id' => ['required', 'uuid', 'exists:event_age_categories,id'],
            'blood_type' => ['nullable', Rule::in(['A', 'B', 'AB', 'O'])],
            'dojo_name' => ['nullable', 'string', 'max:255'],
            'kyu_dan' => ['required', 'string', 'max:50'],
            'bpjs_number' => ['nullable', 'string', 'max:40'],
            'bpjs_status' => ['nullable', Rule::in(['active', 'inactive', 'none'])],
            'weight' => ['nullable', 'numeric', 'min:20', 'max:200'],
            'photo' => ['nullable', 'image', 'max:5120'],
            'category_ids' => ['array', 'max:20'],
            'category_ids.*' => ['uuid', 'distinct'],
            'promoted_category_ids' => ['array'],
            'promoted_category_ids.*' => ['uuid', 'distinct'],
            'joined_age_category_id' => ['nullable', 'uuid', 'exists:event_age_categories,id'],
        ]);
        $categoryIds = $data['category_ids'] ?? [];
        $promotedIds = $data['promoted_category_ids'] ?? [];
        $joinedGroupId = $data['joined_age_category_id'] ?? null;
        $maximum = (int) ($registration->event->max_match_categories_per_athlete ?? 1);
        if (count($categoryIds) > $maximum) {
            throw ValidationException::withMessages(['category_ids' => "Maksimal {$maximum} nomor pertandingan per atlet pada event ini."]);
        }
        if (array_diff($promotedIds, $categoryIds)) {
            throw ValidationException::withMessages(['promoted_category_ids' => 'Pilih nomor pertandingan sebelum memakai penyesuaian kelompok usia.']);
        }
        unset($data['category_ids'], $data['promoted_category_ids'], $data['joined_age_category_id'], $data['photo'], $data['school_document']);
        $candidate = $athlete ? clone $athlete : new Athlete;
        $candidate->fill($data);
        $this->eligibility->validateProfile($registration->event, $candidate);
        $this->ensureIdentityAvailable($registration, $data['nik'] ?? null, $data['kenshi_number'] ?? null, $athlete);
        $photo = $request->file('photo');

        DB::transaction(function () use ($request, $registration, $athlete, $data, $categoryIds, $promotedIds, $joinedGroupId, $photo): void {
            $selectedGroup = $registration->event->ageCategories()->whereKey($data['event_age_category_id'])
                ->where('is_active', true)->first();
            if ($selectedGroup === null) {
                throw ValidationException::withMessages(['event_age_category_id' => 'Pilih kelompok usia yang tersedia pada event ini.']);
            }
            $joinedGroup = $joinedGroupId ? $registration->event->ageCategories()->whereKey($joinedGroupId)
                ->where('is_active', true)->first() : null;
            if ($joinedGroupId && $joinedGroup === null) {
                throw ValidationException::withMessages(['joined_age_category_id' => 'Pilih kelompok usia tujuan yang tersedia pada event ini.']);
            }
            if ($joinedGroup && ($selectedGroup->max_age === null || $joinedGroup->min_age === null
                || $selectedGroup->max_age >= $joinedGroup->min_age)) {
                throw ValidationException::withMessages(['joined_age_category_id' => 'Kelompok usia tujuan harus lebih tua dari kelompok asal.']);
            }
            $previousRank = $athlete?->kyu_dan;
            $athlete = $registration->contingent->athletes()->updateOrCreate(['id' => $athlete?->id], $data);
            if ($previousRank !== $athlete->kyu_dan) {
                $athlete->rankHistories()->create([
                    'changed_by' => $request->user()?->id,
                    'previous_rank' => $previousRank,
                    'new_rank' => $athlete->kyu_dan,
                ]);
            }
            $event = $registration->event;
            $categories = EventMatchCategory::query()->whereBelongsTo($event)->whereIn('id', $categoryIds)
                ->where('is_active', true)->whereNull('merged_into_id')->with('ageCategory')->lockForUpdate()->get()->keyBy('id');
            if ($categories->count() !== count($categoryIds)) {
                throw ValidationException::withMessages(['category_ids' => 'Salah satu nomor pertandingan tidak tersedia pada event ini.']);
            }
            $existing = AthleteMatchCategoryEntry::query()->where('event_id', $event->id)
                ->where('athlete_id', $athlete->id)->get()->keyBy('event_match_category_id');
            if ($promotedIds && $joinedGroup === null) {
                throw ValidationException::withMessages(['joined_age_category_id' => 'Pilih kelompok usia tujuan untuk Gabung Kelompok Usia Lain.']);
            }
            foreach ($promotedIds as $categoryId) {
                if ($categories->get($categoryId)?->age_category_id !== $joinedGroupId) {
                    throw ValidationException::withMessages(['joined_age_category_id' => 'Nomor gabung harus sesuai dengan kelompok usia tujuan yang dipilih.']);
                }
                if (! $event->allow_cross_age_group_embu && ! $existing->get($categoryId)?->age_group_promotion) {
                    throw ValidationException::withMessages(['joined_age_category_id' => 'Gabung Kelompok Usia Lain dinonaktifkan untuk event ini.']);
                }
            }
            foreach ($existing as $categoryId => $entry) {
                if (! in_array($categoryId, $categoryIds, true)) {
                    $entry->delete();
                    $this->clearEmptyTeamTechniques($registration, $entry);
                }
            }
            foreach ($categoryIds as $categoryId) {
                $category = $categories->get($categoryId);
                $promoted = in_array($categoryId, $promotedIds, true);
                $this->validateEligibility($athlete, $category, $registration, $promoted);
                $entry = $existing->get($categoryId);
                if ($entry !== null) {
                    $entry->update(['age_group_promotion' => $promoted]);

                    continue;
                }
                $count = AthleteMatchCategoryEntry::query()->where('event_match_category_id', $categoryId)
                    ->whereHas('athlete', fn ($query) => $query->where('contingent_id', $registration->contingent_id))->count();
                $team = 1;
                if ($category->type === 'embu') {
                    for ($candidate = 1; $candidate <= 20; $candidate++) {
                        $teamCount = AthleteMatchCategoryEntry::query()->where('event_match_category_id', $categoryId)
                            ->where('team_number', $candidate)
                            ->whereHas('athlete', fn ($query) => $query->where('contingent_id', $registration->contingent_id))->count();
                        if ($teamCount < $category->max_athletes_per_team) {
                            $team = $candidate;
                            break;
                        }
                    }
                    if ($candidate > 20) {
                        throw ValidationException::withMessages(['category_ids' => 'Batas 20 tim untuk nomor Embu ini tercapai.']);
                    }
                }
                if ($category->type !== 'embu' && $count >= $category->max_athletes_per_team) {
                    throw ValidationException::withMessages(['category_ids' => "Kuota {$category->name} untuk kontingen ini sudah penuh."]);
                }
                AthleteMatchCategoryEntry::create([
                    'event_id' => $event->id,
                    'athlete_id' => $athlete->id,
                    'event_match_category_id' => $categoryId,
                    'team_number' => $team,
                    'age_group_promotion' => $promoted,
                ]);
            }
            if ($photo !== null) {
                $athlete->update(['profile_photo_path' => $photo->store('athlete-photos')]);
            }
            if ($request->hasFile('school_document')) {
                $path = $request->file('school_document')->store('school-documents', 'local');
                $athlete->forceFill(['school_document_path' => $path])->save();
            }
            $this->syncFees($registration);
        });

        return back()->with('success', 'Data dan nomor pertandingan atlet tersimpan.');
    }

    public function schoolDocument(Request $request, Registration $registration, Athlete $athlete): mixed
    {
        $this->authorizeRegistration($request, $registration);
        abort_unless($athlete->contingent_id === $registration->contingent_id, 404);
        abort_unless($athlete->school_document_path && Storage::disk('local')->exists($athlete->school_document_path), 404);

        return Storage::disk('local')->response($athlete->school_document_path, null, ['Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function verifySchool(Request $request, Registration $registration, Athlete $athlete): RedirectResponse
    {
        $this->authorizeRegistration($request, $registration);
        abort_unless($athlete->contingent_id === $registration->contingent_id, 404);
        $user = $request->user();
        abort_unless($user->hasAnyRole(['Super Admin', 'Admin']) || in_array($registration->event->accessRoleFor($user), [
            Event::AccessRoleResponsible, Event::AccessRoleAdmin, Event::AccessRoleStaff,
        ], true), 403);
        $request->validate(['confirmed' => ['accepted']]);

        DB::transaction(function () use ($registration, $athlete, $user): void {
            $athlete = Athlete::query()->whereKey($athlete)->lockForUpdate()->firstOrFail();
            $event = $registration->event;
            $this->eligibility->validateProfile($event, $athlete);
            $this->eligibility->validateSchoolDocument($event, $athlete);
            foreach ($athlete->matchCategoryEntries()->where('event_id', $event->id)->with('matchCategory')->get() as $entry) {
                $this->eligibility->validateCategory($event, $athlete, $entry->matchCategory);
            }
            $athlete->forceFill([
                'school_verified_at' => now(),
                'school_verified_by' => $user->id,
                'school_verification_hash' => $this->eligibility->verificationHash($event, $athlete),
            ])->save();
        });

        return back()->with('success', 'Data sekolah dan kelas atlet telah diverifikasi.');
    }

    public function updateTeam(Request $request, Registration $registration, AthleteMatchCategoryEntry $entry): RedirectResponse
    {
        $this->authorizeRegistrationMutation($request, $registration);
        abort_unless($entry->event_id === $registration->event_id && $entry->athlete?->contingent_id === $registration->contingent_id, 404);
        $category = $entry->matchCategory;
        abort_unless($category?->type === 'embu', 404);
        $validated = $request->validate([
            'team_number' => ['required', 'integer', 'min:1', 'max:20'],
            'swap_entry_id' => ['nullable', 'uuid'],
        ]);
        $team = (int) $validated['team_number'];
        if ($team !== $entry->team_number) {
            DB::transaction(function () use ($registration, $entry, $category, $team, $validated): void {
                EventMatchCategory::query()->whereKey($category)->lockForUpdate()->firstOrFail();
                $entry = AthleteMatchCategoryEntry::query()->whereKey($entry)->lockForUpdate()->firstOrFail();
                $oldTeam = $entry->team_number;
                if ($oldTeam === $team) {
                    return;
                }

                if (! empty($validated['swap_entry_id'])) {
                    $partner = AthleteMatchCategoryEntry::query()
                        ->whereKey($validated['swap_entry_id'])
                        ->where('event_id', $registration->event_id)
                        ->where('event_match_category_id', $category->id)
                        ->whereHas('athlete', fn ($query) => $query->where('contingent_id', $registration->contingent_id))
                        ->lockForUpdate()
                        ->firstOrFail();
                    if ($partner->team_number !== $team) {
                        throw ValidationException::withMessages(['swap_entry_id' => 'Atlet tujuan tidak berada di tim yang dipilih.']);
                    }

                    $entry->update(['team_number' => $team]);
                    $partner->update(['team_number' => $oldTeam]);

                    return;
                }

                $count = AthleteMatchCategoryEntry::query()->where('event_match_category_id', $category->id)->where('team_number', $team)
                    ->whereHas('athlete', fn ($query) => $query->where('contingent_id', $registration->contingent_id))->count();
                if ($count >= $category->max_athletes_per_team) {
                    throw ValidationException::withMessages(['team_number' => 'Tim tujuan sudah penuh.']);
                }
                $entry->update(['team_number' => $team]);
                $entry->team_number = $oldTeam;
                $this->clearEmptyTeamTechniques($registration, $entry);
            });
        }

        return back()->with('success', 'Susunan tim diperbarui.');
    }

    public function recalculate(Request $request, Registration $registration): RedirectResponse
    {
        $this->authorizeRegistrationMutation($request, $registration);
        DB::transaction(fn () => $this->syncFees($registration));

        return back()->with('success', 'Ringkasan biaya diperbarui.');
    }

    private function authorizeRegistration(Request $request, Registration $registration): void
    {
        $tenantEvent = $request->attributes->get('tenantEvent');
        abort_unless($request->user() && (! $tenantEvent || $tenantEvent->id === $registration->event_id), 404);
        $user = $request->user();
        abort_unless($this->canManageEvent($request, $registration) || $registration->contingent?->user_id === $user->id, 403);
    }

    private function authorizeRegistrationMutation(Request $request, Registration $registration): void
    {
        $this->authorizeRegistration($request, $registration);

        if ($registration->status === RegistrationStatus::Verified && ! $this->canManageEvent($request, $registration)) {
            throw ValidationException::withMessages([
                'registration' => 'Registrasi sudah diverifikasi dan dikunci. Hubungi admin atau penyelenggara event jika data perlu diperbaiki.',
            ]);
        }
    }

    private function canManageEvent(Request $request, Registration $registration): bool
    {
        $user = $request->user();

        return (bool) ($user && ($user->hasAnyRole(['Super Admin', 'Admin'])
            || in_array($registration->event?->accessRoleFor($user), [
                Event::AccessRoleResponsible,
                Event::AccessRoleAdmin,
                Event::AccessRoleStaff,
            ], true)));
    }

    private function authorizeSource(Request $request, Registration $registration, ?Contingent $source): void
    {
        abort_unless($source !== null, 404);
        $user = $request->user();
        abort_unless($user->hasAnyRole(['Super Admin', 'Admin']) || $source->user_id === $user->id
            || ($source->event_id === $registration->event_id && in_array($registration->event->accessRoleFor($user), [
                Event::AccessRoleResponsible,
                Event::AccessRoleAdmin,
                Event::AccessRoleStaff,
            ], true)), 403);
    }

    private function ensureIdentityAvailable(Registration $registration, ?string $nik, ?string $kenshiNumber, ?Athlete $except = null): void
    {
        $query = Athlete::query()->whereHas('contingent', fn ($builder) => $builder->where('event_id', $registration->event_id))
            ->when($except !== null, fn ($builder) => $builder->where('id', '!=', $except->id));
        if ($nik && (clone $query)->where('nik', $nik)->exists()) {
            throw ValidationException::withMessages(['nik' => 'NIK ini sudah terdaftar pada event yang sama.']);
        }
        if ($kenshiNumber && (clone $query)->where('kenshi_number', $kenshiNumber)->exists()) {
            throw ValidationException::withMessages(['kenshi_number' => 'Nomor Induk Kenshi ini sudah terdaftar pada event yang sama.']);
        }
    }

    private function validateEligibility(Athlete $athlete, EventMatchCategory $category, Registration $registration, bool $promoted): void
    {
        $this->eligibility->validateCategory($registration->event, $athlete, $category);
        if (($category->min_weight !== null && ($athlete->weight === null || $athlete->weight < $category->min_weight))
            || ($category->max_weight !== null && ($athlete->weight === null || $athlete->weight > $category->max_weight))) {
            throw ValidationException::withMessages(['category_ids' => "Berat badan tidak sesuai untuk {$category->name}."]);
        }
        $ageCategory = $category->ageCategory;
        $originalGroup = $athlete->ageCategory;
        if ($ageCategory === null) {
            if ($promoted) {
                throw ValidationException::withMessages(['promoted_category_ids' => 'Nomor ini tidak memiliki kelompok usia tujuan.']);
            }

            return;
        }
        if ($originalGroup?->id === $ageCategory->id) {
            if ($promoted) {
                throw ValidationException::withMessages(['promoted_category_ids' => 'Gabung Kelompok Usia Lain hanya diperlukan untuk nomor dengan kelompok usia berbeda.']);
            }

            return;
        }
        $isOlderGroup = $originalGroup?->event_id === $registration->event_id
            && $originalGroup?->max_age !== null && $ageCategory->min_age !== null
            && $originalGroup->max_age < $ageCategory->min_age;
        if ($category->type !== 'embu' || ! $promoted || ! $isOlderGroup) {
            throw ValidationException::withMessages(['category_ids' => "Kelompok usia {$originalGroup?->name} memerlukan pilihan Gabung Kelompok Usia Lain untuk {$category->name} (khusus Embu ke kelompok lebih tua)."]);
        }
    }

    private function clearEmptyTeamTechniques(Registration $registration, AthleteMatchCategoryEntry $entry): void
    {
        if ($entry->matchCategory?->type !== 'embu') {
            return;
        }
        $hasAthletes = AthleteMatchCategoryEntry::query()->where('event_match_category_id', $entry->event_match_category_id)
            ->where('team_number', $entry->team_number)
            ->whereHas('athlete', fn ($query) => $query->where('contingent_id', $registration->contingent_id))->exists();
        if (! $hasAthletes) {
            EmbuTeamTechnique::query()->where('event_id', $registration->event_id)->where('contingent_id', $registration->contingent_id)
                ->where('event_match_category_id', $entry->event_match_category_id)->where('team_number', $entry->team_number)->delete();
        }
    }

    private function syncFees(Registration $registration): void
    {
        if (! $registration->event->is_paid) {
            $registration->update([
                'verification_code' => null,
                'total_amount' => 0,
                'final_amount' => 0,
                'payment_status' => PaymentStatus::Verified,
                'payment_amount' => 0,
                'payment_verified_at' => null,
                'payment_verified_by' => null,
                'payment_note' => 'Event gratis; pembayaran tidak diperlukan.',
            ]);

            return;
        }

        $athleteCount = Athlete::query()->where('contingent_id', $registration->contingent_id)
            ->whereHas('matchCategoryEntries', fn ($query) => $query->where('event_id', $registration->event_id))->count();
        $base = (float) $registration->event->fee_per_contingent + $athleteCount * (float) $registration->event->fee_per_athlete;
        if ($registration->verification_code === null) {
            Event::query()->whereKey($registration->event_id)->lockForUpdate()->firstOrFail();
        }
        $code = $registration->verification_code ?? Registration::nextVerificationCode($registration->event_id);
        $amount = $base + $code;
        $changes = ['verification_code' => $code, 'total_amount' => $base, 'final_amount' => $amount];
        if ((float) $registration->final_amount !== $amount
            && in_array($registration->payment_status, [PaymentStatus::Submitted, PaymentStatus::Verified], true)) {
            $changes['payment_status'] = PaymentStatus::Rejected;
            $changes['payment_verified_at'] = null;
            $changes['payment_verified_by'] = null;
            $changes['payment_note'] = 'Biaya berubah setelah data atlet diperbarui. Periksa dan ajukan ulang pembayaran.';
        }
        $registration->update($changes);
    }
}
