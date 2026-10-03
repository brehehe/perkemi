<?php

namespace App\Actions\Admin\Event;

use App\Models\Event;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SyncEventUsersAction
{
    public const ResponsibleRoleName = 'Penanggung Jawab Event';

    /**
     * @param  array<int, array{id: string, access_role: string}>  $users
     */
    public function execute(Event $event, array $users): void
    {
        DB::transaction(function () use ($event, $users): void {
            $previousResponsibleUsers = $event->responsibleUsers()->get();
            $responsibleRole = Role::query()->firstOrCreate([
                'name' => self::ResponsibleRoleName,
                'guard_name' => 'web',
            ]);

            $assignments = collect($users)
                ->mapWithKeys(fn (array $user) => [
                    $user['id'] => ['access_role' => $user['access_role']],
                ])
                ->all();

            $event->users()->sync($assignments);

            $responsibleUserIds = collect($users)
                ->where('access_role', Event::AccessRoleResponsible)
                ->pluck('id');

            User::query()
                ->whereKey($responsibleUserIds)
                ->get()
                ->each(fn (User $user) => $user->assignRole($responsibleRole));

            $previousResponsibleUsers
                ->whereNotIn('id', $responsibleUserIds)
                ->each(function (User $user): void {
                    if (! $user->responsibleEvents()->exists()) {
                        $user->removeRole(self::ResponsibleRoleName);
                    }
                });
        });
    }
}
