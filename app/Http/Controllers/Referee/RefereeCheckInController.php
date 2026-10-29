<?php

namespace App\Http\Controllers\Referee;

use App\Enums\RefereeCourtRole;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\Referee;
use App\Models\RefereeAttendance;
use App\Models\RefereeCourtAttendance;
use App\Models\Role;
use App\Models\User;
use App\Services\Referee\RefereeIdentity;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class RefereeCheckInController extends Controller
{
    public function event(Request $request, Event $event, RefereeIdentity $refereeIdentity): Response|RedirectResponse
    {
        if (! $request->user()) {
            $this->authenticateGuestRefereeForEvent($request, $event);
        }

        $referee = $this->refereeFor($request, $event, $refereeIdentity);
        $attendance = RefereeAttendance::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($referee)
            ->whereDate('attendance_date', now()->toDateString())
            ->first();

        if ($request->isMethod('POST')) {
            $attendance ??= new RefereeAttendance([
                'event_id' => $event->id,
                'referee_id' => $referee->id,
                'attendance_date' => now()->toDateString(),
            ]);
            $attendance->fill([
                'is_present' => true,
                'checked_in_by_user_id' => $request->user()?->id,
                'checked_in_at' => now(),
                'method' => 'qr',
                'notes' => null,
            ]);
            $attendance->save();

            return redirect()->route('wasit.portal', ['event_id' => $event->id])
                ->with('success', "Absensi event berhasil. Selamat datang, {$referee->name}.");
        }

        return $this->confirmationResponse(
            $request,
            $event,
            $referee,
            'event',
            "Absensi Event · {$event->name}",
            'Konfirmasi bahwa Anda hadir pada event ini sebelum menerima penugasan court.',
            $attendance?->is_present ? $attendance->checked_in_at : null,
        );
    }

    public function court(
        Request $request,
        Event $event,
        EventCourt $eventCourt,
        RefereeIdentity $refereeIdentity,
        ?string $role = null,
    ): Response|RedirectResponse {
        $role ??= $request->query('role');
        $courtRole = $role ? RefereeCourtRole::tryFrom($role) : null;

        abort_unless($eventCourt->event_id === $event->id, 404);

        if (! $request->user()) {
            $this->authenticateGuestRefereeForCourt($request, $event, $eventCourt, $courtRole);
        }

        $referee = $this->refereeFor($request, $event, $refereeIdentity);

        $assignment = EventCourtAssignment::query()
            ->whereBelongsTo($eventCourt, 'court')
            ->where('staff_type', 'referee')
            ->where('staff_id', $referee->id)
            ->first();

        abort_unless(
            $assignment !== null,
            403,
            "Anda belum ditugaskan sebagai wasit pada {$eventCourt->name}."
        );

        if ($courtRole !== null && $assignment->role !== $courtRole->value) {
            $actualRole = RefereeCourtRole::tryFrom($assignment->role);
            $actualLabel = $actualRole?->label() ?? $assignment->role;
            abort(
                403,
                "QR ini khusus untuk {$courtRole->label()}. Anda ditugaskan sebagai {$actualLabel} pada {$eventCourt->name}. Silakan pindai QR {$actualLabel}."
            );
        }

        $activeRoleLabel = $courtRole?->label()
            ?? RefereeCourtRole::tryFrom($assignment->role)?->label();

        $eventAttendance = RefereeAttendance::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($referee)
            ->whereDate('attendance_date', now()->toDateString())
            ->where('is_present', true)
            ->first();
        $courtAttendance = RefereeCourtAttendance::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($eventCourt, 'court')
            ->whereBelongsTo($referee)
            ->whereDate('attendance_date', now()->toDateString())
            ->first();

        if ($request->isMethod('POST')) {
            if (! $eventAttendance) {
                return back()->with('error', 'Scan QR absensi event terlebih dahulu sebelum check-in ke court.');
            }

            $courtAttendance ??= RefereeCourtAttendance::query()->create([
                'event_id' => $event->id,
                'event_court_id' => $eventCourt->id,
                'referee_id' => $referee->id,
                'attendance_date' => now()->toDateString(),
                'checked_in_by_user_id' => $request->user()?->id,
                'checked_in_at' => now(),
                'method' => 'qr',
            ]);

            $successMsg = $activeRoleLabel
                ? "Check-in {$eventCourt->name} sebagai {$activeRoleLabel} berhasil. Posisi penilaian Anda sudah aktif."
                : "Check-in {$eventCourt->name} berhasil. Posisi penilaian Anda sudah aktif.";

            return redirect()->route('wasit.portal', ['event_id' => $event->id])
                ->with('success', $successMsg);
        }

        $title = $activeRoleLabel
            ? "Check-in Court · {$eventCourt->name} ({$activeRoleLabel})"
            : "Check-in Court · {$eventCourt->name}";

        $description = $eventAttendance
            ? ($activeRoleLabel
                ? "Konfirmasi kehadiran Anda sebagai {$activeRoleLabel} di {$eventCourt->name}. Setelah berhasil, posisi penilaian Anda akan aktif."
                : 'Konfirmasi kehadiran di court. Setelah berhasil, posisi penilaian yang ditetapkan Panitera akan aktif.')
            : 'Anda belum absensi event. Scan QR event terlebih dahulu sebelum mengonfirmasi court.';

        return $this->confirmationResponse(
            $request,
            $event,
            $referee,
            'court',
            $title,
            $description,
            $courtAttendance?->checked_in_at,
            $eventCourt,
            $eventAttendance !== null,
            $activeRoleLabel,
        );
    }

    private function refereeFor(Request $request, Event $event, RefereeIdentity $refereeIdentity): Referee
    {
        $user = $request->user();
        abort_unless(
            $user && $user->hasRole('Wasit'),
            403,
            'QR absensi hanya dapat dikonfirmasi dari akun Wasit. Admin/Panitera cukup menampilkan QR untuk dipindai.',
        );
        $referee = $refereeIdentity->forEvent($user, $event);
        abort_unless($referee, 403, 'Akun login belum ditautkan ke roster Wasit event ini.');
        abort_unless($referee->is_active, 403, 'Master Wasit Anda sedang tidak aktif.');

        $request->session()->put('tenant_event_id', $event->id);
        $request->session()->put('tenant_event_slug', $event->slug);
        $request->session()->forget('url.intended');

        return $referee;
    }

    private function confirmationResponse(
        Request $request,
        Event $event,
        Referee $referee,
        string $type,
        string $title,
        string $description,
        ?Carbon $checkedInAt,
        ?EventCourt $court = null,
        bool $canConfirm = true,
        ?string $roleLabel = null,
    ): Response {
        return Inertia::render('Referee/CheckIn', [
            'activeEvent' => $event->only(['id', 'name', 'slug', 'city', 'venue']),
            'referee' => $referee->only(['id', 'name', 'license_number', 'certification_level']),
            'target' => [
                'type' => $type,
                'title' => $title,
                'description' => $description,
                'court' => $court?->only(['id', 'name', 'location']),
                'role_label' => $roleLabel,
                'is_checked_in' => $checkedInAt !== null,
                'checked_in_at' => $checkedInAt?->translatedFormat('d M Y, H:i'),
                'can_confirm' => $canConfirm,
            ],
            'submitUrl' => $request->fullUrl(),
        ]);
    }

    private function authenticateGuestRefereeForCourt(
        Request $request,
        Event $event,
        EventCourt $eventCourt,
        ?RefereeCourtRole $courtRole,
    ): void {
        $assignment = null;
        if ($courtRole !== null) {
            $assignment = EventCourtAssignment::query()
                ->whereBelongsTo($eventCourt, 'court')
                ->where('staff_type', 'referee')
                ->where('role', $courtRole->value)
                ->first();
        }
        if (! $assignment) {
            $assignment = EventCourtAssignment::query()
                ->whereBelongsTo($eventCourt, 'court')
                ->where('staff_type', 'referee')
                ->first();
        }

        $referee = null;
        if ($assignment && $assignment->staff_id) {
            $referee = Referee::find($assignment->staff_id);
        }

        if (! $referee) {
            $roleKey = $courtRole?->value ?? 'corner_1';
            $referee = Referee::firstOrCreate(
                ['email' => "guest.referee.court{$eventCourt->id}.{$roleKey}@perkemi.local"],
                [
                    'name' => 'Guest Wasit '.($courtRole?->label() ?? 'Tatami')." ({$eventCourt->name})",
                    'license_number' => 'GUEST-'.strtoupper(Str::random(6)),
                    'certification_level' => 'Regional',
                    'is_active' => true,
                ]
            );
            $event->referees()->syncWithoutDetaching([$referee->id => ['role' => 'judge']]);
            $assignment = EventCourtAssignment::firstOrCreate([
                'event_court_id' => $eventCourt->id,
                'staff_type' => 'referee',
                'role' => $roleKey,
            ], [
                'staff_id' => $referee->id,
            ]);
        }

        $user = $referee->user;
        if (! $user) {
            $user = User::firstOrCreate(
                ['email' => $referee->email ?: "guest.referee.{$referee->id}@perkemi.local"],
                [
                    'name' => $referee->name,
                    'password' => Hash::make(Str::random(16)),
                    'nik_perkemi' => $referee->license_number,
                ]
            );
            $roleModel = Role::firstOrCreate(['name' => 'Wasit', 'guard_name' => 'web']);
            $user->syncRoles([$roleModel]);
            $referee->update(['user_id' => $user->id]);
        }
        $event->users()->syncWithoutDetaching([$user->id => ['access_role' => Event::AccessRoleStaff]]);

        Auth::login($user);
        $request->setUserResolver(fn () => $user);

        RefereeAttendance::query()->updateOrCreate(
            ['event_id' => $event->id, 'referee_id' => $referee->id, 'attendance_date' => now()->toDateString()],
            [
                'is_present' => true,
                'checked_in_by_user_id' => $user->id,
                'checked_in_at' => now(),
                'method' => 'qr',
            ]
        );
    }

    private function authenticateGuestRefereeForEvent(Request $request, Event $event): void
    {
        $firstAssigned = EventCourtAssignment::query()
            ->whereIn('event_court_id', $event->courts()->pluck('id'))
            ->where('staff_type', 'referee')
            ->first();
        $referee = $firstAssigned ? Referee::find($firstAssigned->staff_id) : null;
        if (! $referee) {
            $referee = Referee::firstOrCreate(
                ['email' => "guest.referee.event{$event->id}@perkemi.local"],
                [
                    'name' => "Guest Wasit ({$event->name})",
                    'license_number' => 'GUEST-'.strtoupper(Str::random(6)),
                    'certification_level' => 'Regional',
                    'is_active' => true,
                ]
            );
            $event->referees()->syncWithoutDetaching([$referee->id => ['role' => 'judge']]);
        }

        $user = $referee->user;
        if (! $user) {
            $user = User::firstOrCreate(
                ['email' => $referee->email ?: "guest.referee.{$referee->id}@perkemi.local"],
                [
                    'name' => $referee->name,
                    'password' => Hash::make(Str::random(16)),
                    'nik_perkemi' => $referee->license_number,
                ]
            );
            $roleModel = Role::firstOrCreate(['name' => 'Wasit', 'guard_name' => 'web']);
            $user->syncRoles([$roleModel]);
            $referee->update(['user_id' => $user->id]);
        }
        $event->users()->syncWithoutDetaching([$user->id => ['access_role' => Event::AccessRoleStaff]]);

        Auth::login($user);
        $request->setUserResolver(fn () => $user);
    }
}
