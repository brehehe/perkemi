<?php

namespace App\Services\Referee;

use App\Models\Event;
use App\Models\EventCourt;
use App\Models\RefereeCheckInCode;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\URL;

class RefereeCheckInCodeService
{
    /**
     * Issue or retrieve the 6-digit check-in code and signed URL for daily event check-in.
     *
     * @return array{code: string, url: string}
     */
    public function issueEventCheckIn(Event $event, CarbonInterface $expiresAt): array
    {
        $record = RefereeCheckInCode::query()
            ->where('event_id', $event->id)
            ->where('type', RefereeCheckInCode::TypeEvent)
            ->first();

        $code = $record?->code ?? $this->generateUniqueCode();

        $url = URL::temporarySignedRoute('wasit.check-in.event', $expiresAt, [
            'event' => $event,
            'code' => $code,
        ]);

        if (! $record) {
            $record = RefereeCheckInCode::query()->create([
                'code' => $code,
                'type' => RefereeCheckInCode::TypeEvent,
                'event_id' => $event->id,
                'event_court_id' => null,
                'role' => null,
                'target_url' => $url,
                'expires_at' => $expiresAt,
            ]);
        } else {
            $record->update([
                'target_url' => $url,
                'expires_at' => $expiresAt,
            ]);
        }

        return [
            'code' => $record->code,
            'url' => $url,
        ];
    }

    /**
     * Issue or retrieve the 6-digit check-in code and signed URL for court check-in (overall court or specific role).
     *
     * @return array{code: string, url: string}
     */
    public function issueCourtCheckIn(
        Event $event,
        EventCourt $court,
        ?string $role,
        CarbonInterface $expiresAt,
    ): array {
        $record = RefereeCheckInCode::query()
            ->where('event_id', $event->id)
            ->where('type', RefereeCheckInCode::TypeCourt)
            ->where('event_court_id', $court->id)
            ->when(
                $role !== null,
                fn ($query) => $query->where('role', $role),
                fn ($query) => $query->whereNull('role'),
            )
            ->first();

        $code = $record?->code ?? $this->generateUniqueCode();

        $params = [
            'event' => $event,
            'eventCourt' => $court,
            'code' => $code,
        ];

        if ($role !== null) {
            $params['role'] = $role;
        }

        $url = URL::temporarySignedRoute('wasit.check-in.court', $expiresAt, $params);

        if (! $record) {
            $record = RefereeCheckInCode::query()->create([
                'code' => $code,
                'type' => RefereeCheckInCode::TypeCourt,
                'event_id' => $event->id,
                'event_court_id' => $court->id,
                'role' => $role,
                'target_url' => $url,
                'expires_at' => $expiresAt,
            ]);
        } else {
            $record->update([
                'target_url' => $url,
                'expires_at' => $expiresAt,
            ]);
        }

        return [
            'code' => $record->code,
            'url' => $url,
        ];
    }

    /**
     * Resolve a 6-digit code to its active RefereeCheckInCode record.
     */
    public function resolve(string $code): ?RefereeCheckInCode
    {
        $trimmed = trim($code);
        if ($trimmed === '' || strlen($trimmed) !== 6) {
            return null;
        }

        return RefereeCheckInCode::query()
            ->where('code', $trimmed)
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->with(['event', 'court'])
            ->first();
    }

    /**
     * Generate a unique 6-digit numeric string.
     */
    public function generateUniqueCode(): string
    {
        do {
            $code = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        } while (
            RefereeCheckInCode::query()
                ->where('code', $code)
                ->where(function ($query) {
                    $query->whereNull('expires_at')
                        ->orWhere('expires_at', '>', now());
                })
                ->exists()
        );

        return $code;
    }
}
