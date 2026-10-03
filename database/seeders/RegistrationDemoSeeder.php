<?php

namespace Database\Seeders;

use App\Enums\ContingentStatus;
use App\Enums\PaymentStatus;
use App\Enums\RegistrationStatus;
use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\EmbuTeamTechnique;
use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\EventMatchCategory;
use App\Models\Official;
use App\Models\PaymentMethod;
use App\Models\Registration;
use App\Models\Role;
use App\Models\Technique;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\PermissionRegistrar;

class RegistrationDemoSeeder extends Seeder
{
    private const ATHLETE_NAMES = [
        'Arga Pratama', 'Bima Saputra', 'Citra Maharani', 'Dewi Anggraini',
        'Eka Wicaksono', 'Fani Permatasari', 'Gilang Ramadhan', 'Hana Kartika',
        'Ivan Nugraha', 'Jelita Puspita',
        'Kamal Hidayat', 'Laras Pertiwi', 'Mahendra Putra', 'Nadia Safitri',
        'Oscar Wijaya', 'Putri Ramadhani', 'Surya Mahendra', 'Tiara Wulandari',
    ];

    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            $this->command?->warn('Data demo registrasi hanya boleh dibuat di lingkungan local atau testing.');

            return;
        }

        $events = Event::query()->orderBy('id')->get();
        if ($events->isEmpty()) {
            $this->command?->warn('Belum ada event. Jalankan EventSeeder terlebih dahulu.');

            return;
        }

        DB::transaction(function () use ($events): void {
            app(PermissionRegistrar::class)->forgetCachedPermissions();
            Role::findOrCreate('kontingen', 'web');

            $paymentMethod = PaymentMethod::firstOrCreate(['code' => 'demo-transfer-bank'], [
                'name' => 'Transfer Bank Demo',
                'type' => 'bank_transfer',
                'provider' => 'Bank Simulasi',
                'account_name' => 'SMART PERKEMI DEMO',
                'account_number' => '0000000000',
                'instructions' => 'Data simulasi. Jangan melakukan transfer.',
                'order' => 99,
                'is_active' => true,
            ]);
            $techniques = collect(['Demo Tenchiken Daisan', 'Demo Sode Dori'])
                ->map(fn (string $name, int $index) => Technique::firstOrCreate(['name' => $name], [
                    'category' => 'Embu', 'order' => 900 + $index, 'is_active' => true,
                ]));

            foreach ($events as $eventIndex => $event) {
                $event->paymentMethods()->syncWithoutDetaching([$paymentMethod->id]);
                [$category, $secondaryEmbu, $ageCategory, $randoriCategories] = $this->categoriesFor($event);
                $teamSize = min(4, max(1, (int) $category->max_athletes_per_team));

                foreach ([1, 2, 3] as $slot) {
                    $this->seedContingent(
                        $event, $eventIndex + 1, $slot, $teamSize,
                        $category, $secondaryEmbu, $ageCategory, $randoriCategories, $paymentMethod, $techniques
                    );
                }
            }
        });
    }

    private function categoriesFor(Event $event): array
    {
        $embuCategories = $event->matchCategories()->where('type', 'embu')->where('is_active', true)
            ->whereNull('merged_into_id')->orderBy('order')->get();
        $randoriCategories = $event->matchCategories()->where('type', 'randori')->where('is_active', true)
            ->whereNull('merged_into_id')->orderBy('order')->get();
        $category = $embuCategories->first(fn (EventMatchCategory $item) => $item->gender === 'mixed'
            && $randoriCategories->contains('age_category_id', $item->age_category_id))
            ?? $embuCategories->first(fn (EventMatchCategory $item) => $item->gender === 'mixed')
            ?? $embuCategories->first();

        $ageCategory = $category?->ageCategory
            ?? $event->ageCategories()->where('is_active', true)->orderBy('order')->first()
            ?? EventAgeCategory::firstOrCreate(['event_id' => $event->id, 'name' => 'Remaja Demo'], [
                'min_age' => 14, 'max_age' => 17, 'fee' => 0, 'order' => 99, 'is_active' => true,
            ]);

        if (! $category) {
            $category = EventMatchCategory::firstOrCreate([
                'event_id' => $event->id, 'name' => 'Embu Beregu Demo',
            ], [
                'age_category_id' => $ageCategory->id, 'type' => 'embu', 'gender' => 'mixed',
                'capacity' => 32, 'max_athletes_per_team' => 4, 'order' => 99, 'is_active' => true,
            ]);
        }

        $secondaryEmbu = EventMatchCategory::query()->where('event_id', $event->id)
            ->where('name', 'Embu Berpasangan Demo '.$ageCategory->name)->first();
        if ((int) ($event->max_match_categories_per_athlete ?? 1) >= 3) {
            $secondaryEmbu ??= EventMatchCategory::firstOrCreate([
                'event_id' => $event->id, 'name' => 'Embu Berpasangan Demo '.$ageCategory->name,
            ], [
                'age_category_id' => $ageCategory->id, 'type' => 'embu', 'gender' => 'mixed',
                'capacity' => 64, 'max_athletes_per_team' => 2, 'order' => 101, 'is_active' => true,
            ]);
        }

        $randoriForAge = $randoriCategories->where('age_category_id', $ageCategory->id)->values();
        if ($randoriForAge->isEmpty()) {
            $randoriForAge = collect([EventMatchCategory::firstOrCreate([
                'event_id' => $event->id, 'name' => 'Randori Demo '.$ageCategory->name,
            ], [
                'age_category_id' => $ageCategory->id, 'type' => 'randori', 'gender' => 'male',
                'capacity' => 32, 'max_athletes_per_team' => 1,
                'min_weight' => 45, 'max_weight' => 55, 'order' => 100, 'is_active' => true,
            ])]);
        }

        return [$category, $secondaryEmbu, $ageCategory, $randoriForAge];
    }

    private function seedContingent(
        Event $event,
        int $eventNumber,
        int $slot,
        int $teamSize,
        EventMatchCategory $category,
        ?EventMatchCategory $secondaryEmbu,
        EventAgeCategory $ageCategory,
        Collection $randoriCategories,
        PaymentMethod $paymentMethod,
        Collection $techniques
    ): void {
        $email = "demo.kontingen.{$event->slug}.{$slot}@example.test";
        $manager = "Manajer Demo {$slot} {$event->city}";
        $phone = sprintf('081290%06d', $eventNumber * 10 + $slot);
        $user = User::firstOrCreate(['email' => $email], [
            'name' => $manager, 'password' => Hash::make('Demo12345!'),
        ]);
        if (! $user->hasRole('kontingen')) {
            $user->assignRole('kontingen');
        }

        $contingent = Contingent::firstOrCreate([
            'event_id' => $event->id,
            'name' => "Demo Dojo {$event->city} {$slot}",
        ], [
            'user_id' => $user->id,
            'city' => $event->city,
            'manager_name' => $manager,
            'phone' => $phone,
            'email' => $email,
            'address' => "Jl. Simulasi No. {$slot}, {$event->city}, {$event->province}",
            'status' => $slot === 3 ? ContingentStatus::Pending : ContingentStatus::Verified,
        ]);

        foreach (['Pelatih', 'Pendamping'] as $officialIndex => $role) {
            Official::firstOrCreate([
                'contingent_id' => $contingent->id,
                'name' => "Official Demo {$slot}-".($officialIndex + 1),
            ], [
                'role' => $role,
                'gender' => $officialIndex === 0 ? 'male' : 'female',
                'phone' => sprintf('081291%06d', $eventNumber * 100 + $slot * 10 + $officialIndex),
                'email' => "demo.official.{$event->slug}.{$slot}.{$officialIndex}@example.test",
                'notes' => 'Official pendamping data simulasi.',
            ]);
        }

        $categoryLimit = max(1, (int) ($event->max_match_categories_per_athlete ?? 1));
        $athletes = collect();
        for ($number = 1; $number <= 16; $number++) {
            $athlete = $this->demoAthlete($event, $contingent, $ageCategory, $eventNumber, $slot, $number);
            $athletes->put($number, $athlete);

            AthleteMatchCategoryEntry::firstOrCreate([
                'athlete_id' => $athlete->id,
                'event_match_category_id' => $category->id,
            ], [
                'event_id' => $event->id,
                'team_number' => intdiv($number - 1, $teamSize) + 1,
            ]);
        }

        $randoriIds = $randoriCategories->pluck('id')->all();
        AthleteMatchCategoryEntry::query()->where('event_id', $event->id)
            ->whereIn('athlete_id', $athletes->pluck('id')->all())
            ->whereIn('event_match_category_id', $randoriIds)->delete();

        if ($secondaryEmbu !== null) {
            if ($categoryLimit >= 3) {
                foreach (range(1, 8) as $number) {
                    AthleteMatchCategoryEntry::firstOrCreate([
                        'athlete_id' => $athletes->get($number)->id,
                        'event_match_category_id' => $secondaryEmbu->id,
                    ], [
                        'event_id' => $event->id,
                        'team_number' => intdiv($number - 1, 2) + 1,
                    ]);
                }
            } else {
                AthleteMatchCategoryEntry::query()->where('event_match_category_id', $secondaryEmbu->id)
                    ->whereIn('athlete_id', $athletes->pluck('id')->all())->delete();
                EmbuTeamTechnique::query()->where('contingent_id', $contingent->id)
                    ->where('event_match_category_id', $secondaryEmbu->id)->delete();
            }
        }

        foreach ([17, 18] as $number) {
            $reserve = Athlete::withTrashed()->where('contingent_id', $contingent->id)
                ->where('name', 'Demo '.self::ATHLETE_NAMES[$number - 1])->first();
            if ($reserve !== null) {
                $reserve->matchCategoryEntries()->where('event_id', $event->id)
                    ->whereIn('event_match_category_id', $randoriIds)->delete();
                if (! $reserve->trashed() && $reserve->matchCategoryEntries()->doesntExist()) {
                    $reserve->delete();
                }
            }
        }

        $randoriByGender = [
            'male' => $randoriCategories->first(fn (EventMatchCategory $item) => in_array($item->gender, ['male', 'mixed'], true)),
            'female' => $randoriCategories->first(fn (EventMatchCategory $item) => $item->gender === 'female'),
        ];
        foreach ($randoriByGender as $gender => $randori) {
            if ($randori === null) {
                continue;
            }

            $number = $gender === 'male' ? ($categoryLimit > 1 ? 1 : 17) : ($categoryLimit > 1 ? 4 : 18);
            $athlete = $athletes->get($number)
                ?? $this->demoAthlete($event, $contingent, $ageCategory, $eventNumber, $slot, $number);
            $athlete->update(['weight' => round(((float) ($randori->min_weight ?? 45) + (float) ($randori->max_weight ?? 55)) / 2, 1)]);
            AthleteMatchCategoryEntry::firstOrCreate([
                'athlete_id' => $athlete->id,
                'event_match_category_id' => $randori->id,
            ], [
                'event_id' => $event->id,
                'team_number' => 1,
            ]);
        }

        $embuTeams = [[$category, (int) ceil(16 / $teamSize)]];
        if ($secondaryEmbu !== null && $categoryLimit >= 3) {
            $embuTeams[] = [$secondaryEmbu, 4];
        }
        foreach ($embuTeams as [$embuCategory, $teamCount]) {
            foreach (range(1, $teamCount) as $teamNumber) {
                foreach ($techniques as $index => $technique) {
                    EmbuTeamTechnique::firstOrCreate([
                        'contingent_id' => $contingent->id,
                        'event_match_category_id' => $embuCategory->id,
                        'team_number' => $teamNumber,
                        'technique_id' => $technique->id,
                    ], [
                        'event_id' => $event->id,
                        'order' => $index + 1,
                    ]);
                }
            }
        }

        $code = strtoupper(substr(sha1($event->id), 0, 8));
        $registrationNumber = "REG-DEMO-{$code}-{$slot}";
        $registration = Registration::query()->where('registration_number', $registrationNumber)->first();
        $verificationCode = $registration?->verification_code ?? Registration::nextVerificationCode($event->id);
        $totalAthletes = $contingent->athletes()->whereHas('matchCategoryEntries', fn ($query) => $query->where('event_id', $event->id))->count();
        $total = (float) $event->fee_per_contingent + $totalAthletes * (float) $event->fee_per_athlete;
        $registration ??= Registration::firstOrCreate([
            'event_id' => $event->id,
            'contingent_id' => $contingent->id,
        ], [
            'registration_number' => $registrationNumber,
            'status' => match ($slot) {
                1 => RegistrationStatus::Verified,
                2 => RegistrationStatus::Pending,
                3 => RegistrationStatus::Rejected,
            },
            'total_amount' => $total,
            'verification_code' => $verificationCode,
            'final_amount' => $total + $verificationCode,
            'payment_method_id' => $paymentMethod->id,
            'payment_status' => match ($slot) {
                1 => PaymentStatus::Verified,
                2 => PaymentStatus::Submitted,
                3 => PaymentStatus::Rejected,
            },
            'payment_amount' => $total + $verificationCode,
            'payment_reference' => "DEMO-{$code}-{$slot}",
            'payment_submitted_at' => now()->subDays(4 - $slot),
            'payment_verified_at' => $slot === 1 ? now()->subDay() : null,
            'payment_note' => 'Transaksi simulasi untuk pengujian alur registrasi.',
            'notes' => 'Data simulasi lengkap untuk '.$contingent->name,
        ]);

        $registration->update([
            'total_amount' => $total,
            'final_amount' => $total + $registration->verification_code,
            'payment_amount' => $total + $registration->verification_code,
        ]);
    }

    private function demoAthlete(
        Event $event,
        Contingent $contingent,
        EventAgeCategory $ageCategory,
        int $eventNumber,
        int $slot,
        int $number
    ): Athlete {
        $age = max((int) ($ageCategory->min_age ?? 14), min((int) ($ageCategory->max_age ?? 17), 15));
        $gender = in_array($number, [3, 4, 6, 8, 10, 12, 14, 16, 18], true) ? 'female' : 'male';
        $athlete = Athlete::withTrashed()->firstOrCreate([
            'contingent_id' => $contingent->id,
            'name' => 'Demo '.self::ATHLETE_NAMES[$number - 1],
        ], [
            'nik' => '99'.sprintf('%014d', $eventNumber * 100000 + $slot * 1000 + $number),
            'kenshi_number' => sprintf('DEMO-%02d-%02d-%02d', $eventNumber, $slot, $number),
            'gender' => $gender,
            'birth_place' => $event->city,
            'birth_date' => $event->start_date->copy()->subYears($age)->subDays($number * 3),
            'blood_type' => ['A', 'B', 'AB', 'O'][($number - 1) % 4],
            'home_address' => $contingent->address,
            'dojo_name' => $contingent->name,
            'event_age_category_id' => $ageCategory->id,
            'kyu_dan' => 'Kyu 2',
            'bpjs_number' => sprintf('DEMO-BPJS-%02d-%02d-%02d', $eventNumber, $slot, $number),
            'bpjs_status' => 'active',
            'weight' => 44 + $number * 1.5,
            'height' => 150 + $number * 2,
        ]);
        if ($athlete->trashed()) {
            $athlete->restore();
        }
        if ($athlete->gender !== $gender) {
            $athlete->update(['gender' => $gender]);
        }

        return $athlete;
    }
}
