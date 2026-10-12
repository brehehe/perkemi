<?php

namespace App\Services;

use App\Enums\RefereeCourtRole;
use App\Models\Clerk;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\FieldCoordinator;
use App\Models\Referee;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class EventStaffDemoData
{
    /**
     * @return array{
     *     users: int,
     *     referees: int,
     *     clerks: int,
     *     field_coordinators: int,
     *     court_assignments: int,
     *     accounts: list<array{role: string, name: string, email: string, court: string}>
     * }
     */
    public function create(Event $event, string $password, bool $useSimpleRefereeAccounts = false): array
    {
        return DB::transaction(function () use ($event, $password, $useSimpleRefereeAccounts): array {
            $event = Event::query()->lockForUpdate()->findOrFail($event->id);
            $this->ensureCanCreate($event);

            $courts = $event->courts()->where('is_active', true)->get();

            if ($courts->isEmpty()) {
                throw new RuntimeException('Event membutuhkan minimal satu court aktif untuk membagi petugas dummy.');
            }

            if ($useSimpleRefereeAccounts) {
                $this->ensureSimpleRefereeEmailsAreAvailable($courts->count() * count(RefereeCourtRole::cases()));
            }

            $roles = [
                'Wasit' => Role::findOrCreate('Wasit', 'web'),
                'Panitera' => Role::findOrCreate('Panitera', 'web'),
                'Koordinator Lapangan' => Role::findOrCreate('Koordinator Lapangan', 'web'),
            ];
            $accounts = [];
            $refereeCount = 0;
            $clerkCount = 0;
            $coordinatorCount = 0;
            $courtAssignmentCount = 0;

            foreach ($courts as $courtIndex => $court) {
                $courtNumber = $courtIndex + 1;

                foreach (RefereeCourtRole::cases() as $positionIndex => $refereeRole) {
                    $position = $positionIndex + 1;
                    $refereeNumber = ($courtIndex * count(RefereeCourtRole::cases())) + $position;
                    $isChief = $refereeRole === RefereeCourtRole::Chief;
                    $eventRole = $refereeRole->value;
                    $positionName = $refereeRole->label();
                    $name = "{$positionName} Dummy {$court->name}";
                    $email = $useSimpleRefereeAccounts
                        ? $this->simpleRefereeEmail($refereeNumber)
                        : $this->email($event, 'wasit', $courtNumber, $position);
                    $refereePassword = $useSimpleRefereeAccounts ? "wasit{$refereeNumber}" : $password;
                    $user = $this->createUser($event, $roles['Wasit'], $name, $email, $refereePassword);
                    $referee = Referee::query()->create([
                        'user_id' => $user->id,
                        'name' => $name,
                        'gender' => $position % 2 === 0 ? 'female' : 'male',
                        'dan_grade' => 'III Dan',
                        'license_number' => $this->identifier($event, 'WST', $courtNumber, $position),
                        'certification_level' => $isChief ? 'Wasit Nasional A' : 'Wasit Nasional B',
                        'region' => 'Jawa Timur',
                        'phone' => $this->phone($courtNumber, $position),
                        'email' => $email,
                        'notes' => $this->marker($event),
                        'is_active' => true,
                    ]);

                    $event->referees()->attach($referee->id, ['role' => $eventRole]);
                    $this->assignToCourt($court, 'referee', $referee->id, $eventRole);
                    $accounts[] = $this->account($user, 'Wasit', $court);
                    $refereeCount++;
                    $courtAssignmentCount++;
                }

                foreach (['scorer' => 'Pencatat Nilai', 'timekeeper' => 'Pencatat Waktu'] as $eventRole => $positionName) {
                    $position = $eventRole === 'scorer' ? 1 : 2;
                    $name = "Panitera {$positionName} Dummy {$court->name}";
                    $email = $this->email($event, 'panitera', $courtNumber, $position);
                    $user = $this->createUser($event, $roles['Panitera'], $name, $email, $password);
                    $clerk = Clerk::query()->create([
                        'name' => $name,
                        'employee_number' => $this->identifier($event, 'PNT', $courtNumber, $position),
                        'certification' => 'Panitera Pertandingan',
                        'region' => 'Jawa Timur',
                        'phone' => $this->phone($courtNumber, $position + 3),
                        'email' => $email,
                        'notes' => $this->marker($event),
                        'is_active' => true,
                    ]);

                    $event->clerks()->attach($clerk->id, ['role' => $eventRole]);
                    $this->assignToCourt($court, 'clerk', $clerk->id, $eventRole);
                    $accounts[] = $this->account($user, 'Panitera', $court);
                    $clerkCount++;
                    $courtAssignmentCount++;
                }

                $name = "Koordinator Lapangan Dummy {$court->name}";
                $email = $this->email($event, 'koordinator', $courtNumber, 1);
                $user = $this->createUser($event, $roles['Koordinator Lapangan'], $name, $email, $password);
                $coordinator = FieldCoordinator::query()->create([
                    'name' => $name,
                    'coordinator_number' => $this->identifier($event, 'KOR', $courtNumber, 1),
                    'region' => 'Jawa Timur',
                    'phone' => $this->phone($courtNumber, 6),
                    'email' => $email,
                    'notes' => $this->marker($event),
                    'is_active' => true,
                ]);

                $event->fieldCoordinators()->attach($coordinator->id, ['assignment_area' => 'court']);
                $this->assignToCourt($court, 'field_coordinator', $coordinator->id, 'koordinator');
                $accounts[] = $this->account($user, 'Koordinator Lapangan', $court);
                $coordinatorCount++;
                $courtAssignmentCount++;
            }

            return [
                'users' => count($accounts),
                'referees' => $refereeCount,
                'clerks' => $clerkCount,
                'field_coordinators' => $coordinatorCount,
                'court_assignments' => $courtAssignmentCount,
                'accounts' => $accounts,
            ];
        });
    }

    /**
     * @return array{users: int, referees: int, clerks: int, field_coordinators: int, court_assignments: int}
     */
    public function delete(Event $event): array
    {
        return DB::transaction(function () use ($event): array {
            $event = Event::query()->lockForUpdate()->findOrFail($event->id);
            $users = $this->demoUsers($event)->get();
            $referees = $this->demoReferees($event)->get();
            $clerks = $this->demoClerks($event)->get();
            $coordinators = $this->demoFieldCoordinators($event)->get();
            $courtIds = $event->courts()->withTrashed()->pluck('id');
            $staffIds = $referees->modelKeys();
            array_push($staffIds, ...$clerks->modelKeys(), ...$coordinators->modelKeys());

            $courtAssignments = EventCourtAssignment::query()
                ->whereIn('event_court_id', $courtIds)
                ->whereIn('staff_id', $staffIds);
            $courtAssignmentCount = $courtAssignments->count();
            $courtAssignments->delete();

            $event->referees()->detach($referees->modelKeys());
            $event->clerks()->detach($clerks->modelKeys());
            $event->fieldCoordinators()->detach($coordinators->modelKeys());
            $event->users()->detach($users->modelKeys());

            $referees->each(fn (Referee $referee) => $referee->forceDelete());
            $clerks->each(fn (Clerk $clerk) => $clerk->forceDelete());
            $coordinators->each(fn (FieldCoordinator $coordinator) => $coordinator->forceDelete());
            $users->each(fn (User $user) => $user->forceDelete());

            return [
                'users' => $users->count(),
                'referees' => $referees->count(),
                'clerks' => $clerks->count(),
                'field_coordinators' => $coordinators->count(),
                'court_assignments' => $courtAssignmentCount,
            ];
        });
    }

    private function ensureCanCreate(Event $event): void
    {
        if (
            $this->demoUsers($event)->exists()
            || $this->demoReferees($event)->exists()
            || $this->demoClerks($event)->exists()
            || $this->demoFieldCoordinators($event)->exists()
        ) {
            throw new RuntimeException('Petugas dummy untuk event ini sudah ada. Jalankan command dengan opsi --delete terlebih dahulu.');
        }
    }

    private function createUser(Event $event, Role $role, string $name, string $email, string $password): User
    {
        $user = User::query()->create([
            'name' => $name,
            'email' => $email,
            'password' => $password,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->assignRole($role);
        $event->users()->attach($user->id, ['access_role' => Event::AccessRoleStaff]);

        return $user;
    }

    private function assignToCourt(EventCourt $court, string $staffType, string $staffId, string $role): void
    {
        EventCourtAssignment::query()->create([
            'event_court_id' => $court->id,
            'staff_type' => $staffType,
            'staff_id' => $staffId,
            'role' => $role,
        ]);
    }

    /** @return array{role: string, name: string, email: string, court: string} */
    private function account(User $user, string $role, EventCourt $court): array
    {
        return [
            'role' => $role,
            'name' => $user->name,
            'email' => $user->email,
            'court' => $court->name,
        ];
    }

    /** @return Builder<User> */
    private function demoUsers(Event $event): Builder
    {
        return User::withTrashed()
            ->where(function (Builder $query) use ($event): void {
                $query
                    ->where('email', 'like', $this->emailPrefix($event).'%')
                    ->orWhereHas('referee', fn (Builder $refereeQuery) => $refereeQuery
                        ->where('license_number', 'like', $this->identifierPrefix($event, 'WST').'%'));
            });
    }

    /** @return Builder<Referee> */
    private function demoReferees(Event $event): Builder
    {
        return Referee::withTrashed()->where('license_number', 'like', $this->identifierPrefix($event, 'WST').'%');
    }

    /** @return Builder<Clerk> */
    private function demoClerks(Event $event): Builder
    {
        return Clerk::withTrashed()->where('employee_number', 'like', $this->identifierPrefix($event, 'PNT').'%');
    }

    /** @return Builder<FieldCoordinator> */
    private function demoFieldCoordinators(Event $event): Builder
    {
        return FieldCoordinator::withTrashed()->where('coordinator_number', 'like', $this->identifierPrefix($event, 'KOR').'%');
    }

    private function email(Event $event, string $type, int $courtNumber, int $position): string
    {
        return sprintf('%s%s-%02d-%02d@example.test', $this->emailPrefix($event), $type, $courtNumber, $position);
    }

    private function emailPrefix(Event $event): string
    {
        return 'event-staff-demo-'.strtolower($this->eventToken($event)).'-';
    }

    private function simpleRefereeEmail(int $refereeNumber): string
    {
        return "wasit{$refereeNumber}@example.test";
    }

    private function ensureSimpleRefereeEmailsAreAvailable(int $refereeCount): void
    {
        $emails = collect(range(1, $refereeCount))
            ->map(fn (int $refereeNumber): string => $this->simpleRefereeEmail($refereeNumber));

        if (User::withTrashed()->whereIn('email', $emails)->exists()) {
            throw new RuntimeException('Login Wasit singkat sudah digunakan. Hapus data dummy pemilik akun tersebut terlebih dahulu atau gunakan login event standar.');
        }
    }

    private function identifier(Event $event, string $type, int $courtNumber, int $position): string
    {
        return sprintf('%s%02d-%02d', $this->identifierPrefix($event, $type), $courtNumber, $position);
    }

    private function identifierPrefix(Event $event, string $type): string
    {
        return "{$type}-DMO-{$this->eventToken($event)}-";
    }

    private function eventToken(Event $event): string
    {
        return strtoupper(substr(sha1($event->id), 0, 10));
    }

    private function marker(Event $event): string
    {
        return "[DUMMY EVENT STAFF {$this->eventToken($event)}] Hapus melalui event:seed-official-demo --delete.";
    }

    private function phone(int $courtNumber, int $position): string
    {
        return sprintf('080100%02d%04d', $courtNumber, $position);
    }
}
