<?php

namespace App\Services;

use App\Enums\ContingentStatus;
use App\Enums\PaymentStatus;
use App\Enums\RegistrationStatus;
use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\Registration;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Random\Engine\Mt19937;
use Random\Randomizer;
use RuntimeException;

class TournamentDrawingDemoData
{
    private const CONTINGENT_COUNT = 6;

    public function __construct(private TournamentDrawingGenerator $drawingGenerator) {}

    /**
     * @return array{
     *     contingents: int,
     *     athletes: int,
     *     entries: int,
     *     drawings: int,
     *     matches: int,
     *     random_seed: int,
     *     double_elimination_category: string,
     *     single_elimination_categories: int,
     *     category_participants: list<array{name: string, type: string, participant_count: int, unit: string}>
     * }
     */
    public function create(Event $event, ?int $seed = null): array
    {
        $randomSeed = $seed ?? random_int(0, 2_147_483_647);

        return DB::transaction(function () use ($event, $randomSeed): array {
            $event = Event::query()->lockForUpdate()->findOrFail($event->id);
            $this->ensureCanCreate($event);
            $randomizer = new Randomizer(new Mt19937($randomSeed));

            $prechecks = $this->drawingGenerator->precheck($event)->keyBy('id');
            $doubleEliminationCategory = $this->doubleEliminationCategory($event, $prechecks);
            $contingents = $this->createContingents($event);

            $athleteCount = 0;
            $entryCount = 0;
            $athletePool = collect();

            $activeCategories = $event->matchCategories()
                ->where('is_active', true)
                ->orderBy('order')
                ->orderBy('id')
                ->get();

            foreach ($activeCategories as $categoryIndex => $category) {
                $check = $prechecks->get($category->id, []);
                $existingParticipantCount = (int) ($check['participant_count'] ?? 0);

                if ($category->type === 'randori') {
                    $targetParticipantCount = $category->is($doubleEliminationCategory)
                        ? 4
                        : $this->randomParticipantTarget($randomizer, $category, 5, $existingParticipantCount);
                    $participantsToCreate = max(0, $targetParticipantCount - $existingParticipantCount);

                    for ($participantIndex = 0; $participantIndex < $participantsToCreate; $participantIndex++) {
                        $contingent = $contingents->get($participantIndex % $contingents->count());
                        $athlete = $this->createAthlete(
                            $event,
                            $contingent,
                            $category,
                            $categoryIndex,
                            $participantIndex,
                        );
                        $this->createEntry($event, $category, $athlete);
                        $this->trackAthleteEntry($athletePool, $athlete, $category);
                        $athleteCount++;
                        $entryCount++;
                    }

                    continue;
                }

                $targetTeamCount = $this->randomParticipantTarget(
                    $randomizer,
                    $category,
                    4,
                    $existingParticipantCount,
                );
                $teamsToCreate = max(0, $targetTeamCount - $existingParticipantCount);
                $athletesPerTeam = max(1, (int) $category->max_athletes_per_team);

                for ($teamIndex = 0; $teamIndex < $teamsToCreate; $teamIndex++) {
                    $contingent = $contingents->get($teamIndex % $contingents->count());

                    for ($memberIndex = 0; $memberIndex < $athletesPerTeam; $memberIndex++) {
                        $athlete = $this->reusableEmbuAthlete(
                            $athletePool,
                            $event,
                            $contingent,
                            $category,
                            $memberIndex,
                        );

                        if (! $athlete) {
                            $athlete = $this->createAthlete(
                                $event,
                                $contingent,
                                $category,
                                $categoryIndex,
                                ($teamIndex * $athletesPerTeam) + $memberIndex,
                                $memberIndex,
                            );
                            $athleteCount++;
                        }

                        $this->createEntry($event, $category, $athlete, $teamIndex + 1);
                        $this->trackAthleteEntry($athletePool, $athlete, $category);
                        $entryCount++;
                    }
                }
            }

            $this->createRegistrations($event, $contingents);
            $generationResult = $this->drawingGenerator->generate($event);

            return [
                'contingents' => $contingents->count(),
                'athletes' => $athleteCount,
                'entries' => $entryCount,
                'drawings' => $generationResult['generated'],
                'matches' => $generationResult['matches'],
                'random_seed' => $randomSeed,
                'double_elimination_category' => $doubleEliminationCategory->name,
                'single_elimination_categories' => $event->tournamentDrawings()
                    ->where('bracket_type', 'single_elimination')
                    ->count(),
                'category_participants' => $event->tournamentDrawings()
                    ->with('matchCategory')
                    ->get()
                    ->sortBy([
                        fn ($first, $second): int => $first->matchCategory->order <=> $second->matchCategory->order,
                        fn ($first, $second): int => $first->matchCategory->id <=> $second->matchCategory->id,
                    ])
                    ->map(fn ($drawing): array => [
                        'name' => $drawing->matchCategory->name,
                        'type' => $drawing->matchCategory->type,
                        'participant_count' => $drawing->participant_count,
                        'unit' => $drawing->matchCategory->type === 'embu' ? 'tim' : 'atlet',
                    ])
                    ->values()
                    ->all(),
            ];
        }, 3);
    }

    /** @return array{contingents: int, athletes: int, drawings: int} */
    public function delete(Event $event): array
    {
        return DB::transaction(function () use ($event): array {
            $event = Event::query()->lockForUpdate()->findOrFail($event->id);
            $users = $this->demoUsers($event)->get();
            $contingents = Contingent::withTrashed()
                ->whereBelongsTo($event)
                ->whereIn('user_id', $users->modelKeys())
                ->get();

            if ($users->isEmpty() && $contingents->isEmpty()) {
                return ['contingents' => 0, 'athletes' => 0, 'drawings' => 0];
            }

            $athleteCount = Athlete::withTrashed()
                ->whereIn('contingent_id', $contingents->modelKeys())
                ->count();
            $drawingCount = $event->tournamentDrawings()->count();

            $event->tournamentDrawings()->delete();
            $contingents->each->forceDelete();
            $users->each->forceDelete();

            return [
                'contingents' => $contingents->count(),
                'athletes' => $athleteCount,
                'drawings' => $drawingCount,
            ];
        }, 3);
    }

    private function ensureCanCreate(Event $event): void
    {
        if ($this->demoUsers($event)->exists()) {
            throw new RuntimeException('Data dummy untuk event ini sudah ada. Jalankan command dengan opsi --delete terlebih dahulu.');
        }

        if ($event->tournamentDrawings()->exists()) {
            throw new RuntimeException('Event sudah memiliki drawing. Reset drawing dari halaman pertandingan sebelum membuat data dummy.');
        }

        $activeCategories = $event->matchCategories()->where('is_active', true)->get();
        if ($activeCategories->where('type', 'randori')->count() < 2) {
            throw new RuntimeException('Event membutuhkan minimal dua nomor randori aktif untuk demo double dan single elimination.');
        }

        if ((int) $event->minimum_entries_per_category > 4 || (int) $event->minimum_contingents_per_category > 4) {
            throw new RuntimeException('Batas minimum event harus maksimal 4 agar randori 4 atlet dapat memakai double elimination.');
        }
    }

    /** @param Collection<string, array<string, mixed>> $prechecks */
    private function doubleEliminationCategory(Event $event, Collection $prechecks): EventMatchCategory
    {
        $minimumContingents = max(1, (int) $event->minimum_contingents_per_category);

        $category = $event->matchCategories()
            ->where('is_active', true)
            ->where('type', 'randori')
            ->orderBy('order')
            ->orderBy('id')
            ->get()
            ->first(function (EventMatchCategory $category) use ($minimumContingents, $prechecks): bool {
                $check = $prechecks->get($category->id, []);
                $participantCount = (int) ($check['participant_count'] ?? 0);
                $contingentCount = (int) ($check['contingent_count'] ?? 0);
                $availableSlots = 4 - $participantCount;

                return $availableSlots >= 0
                    && $availableSlots >= max(0, $minimumContingents - $contingentCount);
            });

        if (! $category) {
            throw new RuntimeException('Tidak ada nomor randori yang dapat dibuat tepat 4 atlet tanpa mengubah peserta asli.');
        }

        return $category;
    }

    private function randomParticipantTarget(
        Randomizer $randomizer,
        EventMatchCategory $category,
        int $minimum,
        int $existingParticipantCount,
    ): int {
        $maximum = min(20, max(1, (int) $category->capacity));

        if ($existingParticipantCount >= $maximum) {
            return $existingParticipantCount;
        }

        $minimum = min($maximum, max($minimum, $existingParticipantCount));

        return $randomizer->getInt($minimum, $maximum);
    }

    /** @return EloquentCollection<int, Contingent> */
    private function createContingents(Event $event): EloquentCollection
    {
        $role = Role::findOrCreate('kontingen', 'web');
        $contingents = new EloquentCollection;

        foreach (range(1, self::CONTINGENT_COUNT) as $number) {
            $label = str_pad((string) $number, 2, '0', STR_PAD_LEFT);
            $user = User::query()->create([
                'name' => "Manajer Dummy Drawing {$label}",
                'email' => $this->emailPrefix($event)."{$label}@example.test",
                'password' => Str::password(32),
            ]);
            $user->assignRole($role);

            $contingents->push(Contingent::query()->create([
                'event_id' => $event->id,
                'user_id' => $user->id,
                'name' => "[DUMMY DRAWING] Kontingen {$label}",
                'city' => "Kota Dummy {$label}",
                'manager_name' => $user->name,
                'phone' => '08000000'.str_pad((string) $number, 4, '0', STR_PAD_LEFT),
                'email' => $user->email,
                'address' => "Alamat dummy drawing nomor {$label}",
                'status' => ContingentStatus::Verified,
            ]));
        }

        return $contingents;
    }

    private function createAthlete(
        Event $event,
        Contingent $contingent,
        EventMatchCategory $category,
        int $categoryIndex,
        int $participantIndex,
        int $memberIndex = 0,
    ): Athlete {
        $gender = match ($category->gender) {
            'male' => 'male',
            'female' => 'female',
            default => $memberIndex % 2 === 0 ? 'male' : 'female',
        };
        $serial = ($categoryIndex * 100) + $participantIndex + 1;

        return Athlete::query()->create([
            'contingent_id' => $contingent->id,
            'event_age_category_id' => $category->age_category_id,
            'name' => sprintf('Atlet Dummy %02d-%03d', $categoryIndex + 1, $participantIndex + 1),
            'nik' => sprintf('350000%02d%02d%02d0000', ($categoryIndex % 90) + 1, ($participantIndex % 90) + 1, ($memberIndex % 90) + 1),
            'kenshi_number' => 'DRAW-'.$this->eventToken($event).'-'.str_pad((string) $serial, 4, '0', STR_PAD_LEFT),
            'gender' => $gender,
            'birth_place' => 'Surabaya',
            'home_address' => 'Alamat khusus data dummy drawing',
            'dojo_name' => $contingent->name,
            'kyu_dan' => $category->min_kyu ?? 'Kyu 3',
            'weight' => $this->weightFor($category),
            'height' => 160,
            'birth_date' => '2010-01-15',
            'bpjs_number' => 'DUMMY-'.$this->eventToken($event).'-'.str_pad((string) $serial, 4, '0', STR_PAD_LEFT),
            'bpjs_status' => 'active',
            'school_name' => 'SMA Dummy Drawing',
            'school_level' => 'SMA',
            'school_entry_year' => 2026,
            'school_grade' => 10,
        ]);
    }

    private function createEntry(
        Event $event,
        EventMatchCategory $category,
        Athlete $athlete,
        int $teamNumber = 1,
    ): void {
        AthleteMatchCategoryEntry::query()->create([
            'event_id' => $event->id,
            'athlete_id' => $athlete->id,
            'event_match_category_id' => $category->id,
            'team_number' => $teamNumber,
        ]);
    }

    /**
     * Reuse only an athlete who already follows another Embu category. This guarantees
     * realistic two-category dummy data without creating incompatible Randori weights.
     *
     * @param  Collection<string, array{athlete: Athlete, category_ids: list<string>, types: list<string>}>  $athletePool
     */
    private function reusableEmbuAthlete(
        Collection $athletePool,
        Event $event,
        Contingent $contingent,
        EventMatchCategory $category,
        int $memberIndex,
    ): ?Athlete {
        if ((int) $event->max_match_categories_per_athlete < 2) {
            return null;
        }

        $requiredGender = match ($category->gender) {
            'male' => 'male',
            'female' => 'female',
            default => $memberIndex % 2 === 0 ? 'male' : 'female',
        };
        $requiredKyu = $category->min_kyu ?? 'Kyu 3';
        $record = $athletePool->first(function (array $record) use ($category, $contingent, $requiredGender, $requiredKyu): bool {
            return $record['athlete']->contingent_id === $contingent->id
                && $record['athlete']->gender === $requiredGender
                && $record['athlete']->kyu_dan === $requiredKyu
                && count($record['category_ids']) < 2
                && ! in_array($category->id, $record['category_ids'], true)
                && in_array('embu', $record['types'], true);
        });

        return $record['athlete'] ?? null;
    }

    /** @param Collection<string, array{athlete: Athlete, category_ids: list<string>, types: list<string>}> $athletePool */
    private function trackAthleteEntry(
        Collection $athletePool,
        Athlete $athlete,
        EventMatchCategory $category,
    ): void {
        $record = $athletePool->get($athlete->id, [
            'athlete' => $athlete,
            'category_ids' => [],
            'types' => [],
        ]);
        $record['category_ids'][] = $category->id;
        $record['types'][] = $category->type;
        $athletePool->put($athlete->id, $record);
    }

    /** @param EloquentCollection<int, Contingent> $contingents */
    private function createRegistrations(Event $event, EloquentCollection $contingents): void
    {
        foreach ($contingents as $index => $contingent) {
            $registrationNumber = sprintf(
                'REG-DRAW-%s-%02d',
                Str::upper($this->eventToken($event)),
                $index + 1,
            );

            Registration::query()->create([
                'event_id' => $event->id,
                'contingent_id' => $contingent->id,
                'registration_number' => $registrationNumber,
                'status' => RegistrationStatus::Verified,
                'total_amount' => 0,
                'final_amount' => 0,
                'verification_code' => Registration::nextVerificationCode($event->id),
                'payment_status' => PaymentStatus::Verified,
                'payment_amount' => 0,
                'payment_submitted_at' => now(),
                'payment_verified_at' => now(),
                'payment_note' => 'Pembayaran dummy terverifikasi untuk pengujian drawing.',
            ]);
        }
    }

    private function weightFor(EventMatchCategory $category): float
    {
        $minimum = $category->min_weight !== null ? (float) $category->min_weight : null;
        $maximum = $category->max_weight !== null ? (float) $category->max_weight : null;

        return match (true) {
            $minimum !== null && $maximum !== null => round(($minimum + $maximum) / 2, 2),
            $maximum !== null => max(1, $maximum - 1),
            $minimum !== null => $minimum + 1,
            default => 55,
        };
    }

    private function demoUsers(Event $event): Builder
    {
        return User::withTrashed()->where('email', 'like', $this->emailPrefix($event).'%');
    }

    private function emailPrefix(Event $event): string
    {
        return 'drawing-demo-'.$this->eventToken($event).'-';
    }

    private function eventToken(Event $event): string
    {
        return substr(sha1($event->id), 0, 10);
    }
}
