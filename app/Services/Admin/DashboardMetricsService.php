<?php

namespace App\Services\Admin;

use App\Enums\PaymentStatus;
use App\Enums\RegistrationStatus;
use App\Enums\TournamentRank;
use App\Models\Athlete;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\Registration;
use App\Models\Rundown;
use App\Models\TournamentResult;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class DashboardMetricsService
{
    /**
     * Calculate core dashboard metrics.
     *
     * @return array{
     *     total_athletes: int,
     *     total_contingents: int,
     *     total_registrations: int,
     *     verified_count: int,
     *     pending_count: int,
     *     total_amount: float,
     *     verification_rate: float
     * }
     */
    public function getStats(?Event $event = null): array
    {
        $totalAthletes = $this->scopeAthletesToEvent(Athlete::query(), $event)->count();
        $totalContingents = Contingent::query()
            ->when($event instanceof Event, fn (Builder $query) => $query->whereBelongsTo($event))
            ->count();

        $verifiedVal = RegistrationStatus::Verified->value;
        $pendingVal = RegistrationStatus::Pending->value;
        $verifiedPaymentVal = PaymentStatus::Verified->value;

        $regStats = Registration::query()
            ->when($event instanceof Event, fn (Builder $query) => $query->whereBelongsTo($event))
            ->selectRaw("
            COUNT(*) as total_registrations,
            SUM(CASE WHEN status = '{$verifiedVal}' THEN 1 ELSE 0 END) as verified_count,
            SUM(CASE WHEN status = '{$pendingVal}' THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN payment_status = '{$verifiedPaymentVal}' THEN payment_amount ELSE 0 END) as total_amount
        ")
            ->first();

        $totalRegistrations = (int) ($regStats->total_registrations ?? 0);
        $verifiedCount = (int) ($regStats->verified_count ?? 0);
        $pendingCount = (int) ($regStats->pending_count ?? 0);
        $totalAmount = (float) ($regStats->total_amount ?? 0);

        $verificationRate = $totalRegistrations > 0
            ? round(($verifiedCount / $totalRegistrations) * 100, 1)
            : 0;

        return [
            'total_athletes' => $totalAthletes,
            'total_contingents' => $totalContingents,
            'total_registrations' => $totalRegistrations,
            'verified_count' => $verifiedCount,
            'pending_count' => $pendingCount,
            'total_amount' => $totalAmount,
            'verification_rate' => $verificationRate,
        ];
    }

    /**
     * Get monthly athlete growth for the past 6 months.
     *
     * @return array{labels: list<string>, data: list<int>}
     */
    public function getMonthlyAthletes(?Event $event = null): array
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            $data = $this->scopeAthletesToEvent(Athlete::selectRaw("TO_CHAR(created_at, 'Mon') as month_label, EXTRACT(MONTH FROM created_at) as month, EXTRACT(YEAR FROM created_at) as year, count(*) as total"), $event)
                ->where('created_at', '>=', now()->subMonths(6))
                ->groupByRaw("TO_CHAR(created_at, 'Mon'), EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)")
                ->orderByRaw('EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)')
                ->get();
        } elseif ($driver === 'sqlite') {
            $data = $this->scopeAthletesToEvent(Athlete::selectRaw("strftime('%m', created_at) as month, strftime('%Y', created_at) as year, count(*) as total"), $event)
                ->where('created_at', '>=', now()->subMonths(6))
                ->groupByRaw("strftime('%Y', created_at), strftime('%m', created_at)")
                ->orderByRaw("strftime('%Y', created_at), strftime('%m', created_at)")
                ->get()
                ->map(function ($row) {
                    $row->month_label = date('M', mktime(0, 0, 0, (int) $row->month, 10));

                    return $row;
                });
        } else {
            $data = $this->scopeAthletesToEvent(Athlete::selectRaw("DATE_FORMAT(created_at, '%b') as month_label, MONTH(created_at) as month, YEAR(created_at) as year, count(*) as total"), $event)
                ->where('created_at', '>=', now()->subMonths(6))
                ->groupByRaw("DATE_FORMAT(created_at, '%b'), YEAR(created_at), MONTH(created_at)")
                ->orderByRaw('YEAR(created_at), MONTH(created_at)')
                ->get();
        }

        $months = [];
        $counts = [];

        foreach ($data as $row) {
            $months[] = (string) $row->month_label;
            $counts[] = (int) $row->total;
        }

        // Fallback default months if data is empty
        if (empty($months)) {
            for ($i = 5; $i >= 0; $i--) {
                $months[] = now()->subMonths($i)->translatedFormat('M');
                $counts[] = 0;
            }
        }

        return ['labels' => $months, 'data' => $counts];
    }

    /**
     * Get status breakdown of registrations.
     *
     * @return array<string, int>
     */
    public function getRegistrationStatusBreakdown(?Event $event = null): array
    {
        $breakdown = [
            RegistrationStatus::Verified->value => 0,
            RegistrationStatus::Pending->value => 0,
            RegistrationStatus::Rejected->value => 0,
        ];

        $data = Registration::query()
            ->when($event instanceof Event, fn (Builder $query) => $query->whereBelongsTo($event))
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->get();

        foreach ($data as $row) {
            $statusKey = $row->status instanceof \BackedEnum ? $row->status->value : (string) $row->status;
            if (array_key_exists($statusKey, $breakdown)) {
                $breakdown[$statusKey] = (int) $row->total;
            }
        }

        return $breakdown;
    }

    /**
     * Get latest contingents with athlete count using selective projection.
     *
     * @return array<int, array{id: string, name: string, city: string, manager_name: string, athletes_count: int}>
     */
    public function getLatestContingents(?Event $event = null): array
    {
        return Contingent::query()
            ->when($event instanceof Event, fn (Builder $query) => $query->whereBelongsTo($event))
            ->select(['id', 'name', 'city', 'manager_name'])
            ->withCount('athletes')
            ->latest()
            ->take(8)
            ->get()
            ->map(fn (Contingent $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'city' => $c->city,
                'manager_name' => $c->manager_name,
                'athletes_count' => (int) $c->athletes_count,
            ])
            ->toArray();
    }

    /**
     * Get latest registrations with eager-loaded contingent details.
     */
    public function getLatestRegistrations(?string $search, ?Event $event = null): LengthAwarePaginator
    {
        $driver = DB::connection()->getDriverName();
        $like = $driver === 'pgsql' ? 'ilike' : 'like';

        return Registration::query()
            ->when($event instanceof Event, fn (Builder $query) => $query->whereBelongsTo($event))
            ->select(['id', 'event_id', 'contingent_id', 'registration_number', 'status', 'final_amount', 'created_at'])
            ->with(['contingent:id,name,city', 'event:id,is_paid'])
            ->when($search, function ($query, $search) use ($like) {
                $query->where(function (Builder $query) use ($search, $like) {
                    $query->where('registration_number', $like, '%'.$search.'%')
                        ->orWhereHas('contingent', function (Builder $query) use ($search, $like) {
                            $query->where('name', $like, '%'.$search.'%')
                                ->orWhere('city', $like, '%'.$search.'%');
                        });
                });
            })
            ->latest()
            ->paginate(5)
            ->through(function (Registration $reg) {
                return [
                    'id' => $reg->id,
                    'registration_number' => $reg->registration_number,
                    'status' => $reg->status instanceof \BackedEnum ? $reg->status->value : (string) $reg->status,
                    'final_amount' => (float) $reg->final_amount,
                    'is_paid' => (bool) $reg->event?->is_paid,
                    'created_at' => $reg->created_at ? $reg->created_at->format('d M Y') : '-',
                    'contingent' => $reg->contingent ? [
                        'id' => $reg->contingent->id,
                        'name' => $reg->contingent->name,
                        'city' => $reg->contingent->city,
                    ] : null,
                ];
            })
            ->withQueryString();
    }

    /**
     * Aggregate total gold, silver, bronze medals.
     *
     * @return array{gold: int, silver: int, bronze: int}
     */
    public function getMedalStats(?Event $event = null): array
    {
        $goldVal = TournamentRank::Gold->value;
        $silverVal = TournamentRank::Silver->value;
        $bronzeVal = TournamentRank::Bronze->value;
        $runnerUpVal = TournamentRank::RunnerUp->value;

        $statsQuery = TournamentResult::selectRaw("
            SUM(CASE WHEN rank = {$goldVal} THEN 1 ELSE 0 END) as gold,
            SUM(CASE WHEN rank = {$silverVal} THEN 1 ELSE 0 END) as silver,
            SUM(CASE WHEN rank IN ({$bronzeVal}, {$runnerUpVal}) THEN 1 ELSE 0 END) as bronze
        ");

        if ($event instanceof Event) {
            $statsQuery->whereBelongsTo($event);
        }

        $stats = $statsQuery->first();

        return [
            'gold' => (int) ($stats->gold ?? 0),
            'silver' => (int) ($stats->silver ?? 0),
            'bronze' => (int) ($stats->bronze ?? 0),
        ];
    }

    /**
     * Get medal distribution per contingent for leaderboard and bar chart.
     *
     * @return array{
     *     labels: list<string>,
     *     gold: list<int>,
     *     silver: list<int>,
     *     bronze: list<int>,
     *     contingents: list<array<string, mixed>>
     * }
     */
    public function getMedalDistribution(?Event $event = null): array
    {
        $goldVal = TournamentRank::Gold->value;
        $silverVal = TournamentRank::Silver->value;
        $bronzeVal = TournamentRank::Bronze->value;
        $runnerUpVal = TournamentRank::RunnerUp->value;

        $contingents = Contingent::query()
            ->when($event instanceof Event, fn (Builder $query) => $query->whereBelongsTo($event))
            ->select(['id', 'name'])
            ->withCount([
                'tournamentResults as gold_count' => function ($query) use ($goldVal, $event) {
                    $query->where('rank', $goldVal);

                    if ($event instanceof Event) {
                        $query->whereBelongsTo($event);
                    }
                },
                'tournamentResults as silver_count' => function ($query) use ($silverVal, $event) {
                    $query->where('rank', $silverVal);

                    if ($event instanceof Event) {
                        $query->whereBelongsTo($event);
                    }
                },
                'tournamentResults as bronze_count' => function ($query) use ($bronzeVal, $runnerUpVal, $event) {
                    $query->whereIn('rank', [$bronzeVal, $runnerUpVal]);

                    if ($event instanceof Event) {
                        $query->whereBelongsTo($event);
                    }
                },
            ])
            ->orderByRaw('gold_count DESC, silver_count DESC, bronze_count DESC')
            ->take(7)
            ->get();

        $labels = $contingents->pluck('name')->toArray();
        $goldData = $contingents->pluck('gold_count')->map(fn ($v) => (int) $v)->toArray();
        $silverData = $contingents->pluck('silver_count')->map(fn ($v) => (int) $v)->toArray();
        $bronzeData = $contingents->pluck('bronze_count')->map(fn ($v) => (int) $v)->toArray();

        $contingentsList = $contingents->map(function ($con) {
            $gold = (int) $con->gold_count;
            $silver = (int) $con->silver_count;
            $bronze = (int) $con->bronze_count;

            return [
                'id' => $con->id,
                'name' => $con->name,
                'gold_count' => $gold,
                'silver_count' => $silver,
                'bronze_count' => $bronze,
                'total_score' => $gold + $silver + $bronze,
            ];
        })->toArray();

        return [
            'labels' => $labels,
            'gold' => $goldData,
            'silver' => $silverData,
            'bronze' => $bronzeData,
            'contingents' => $contingentsList,
        ];
    }

    /**
     * Get scheduled rundown for today.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getTodaySchedules(?Event $event = null): array
    {
        return Rundown::query()
            ->when($event instanceof Event, fn (Builder $query) => $query->whereBelongsTo($event))
            ->select(['id', 'date', 'name', 'type', 'description', 'order'])
            ->whereDate('date', now())
            ->orderBy('order')
            ->take(6)
            ->get()
            ->map(fn (Rundown $r) => [
                'id' => $r->id,
                'time' => $r->date ? $r->date->format('H.i') : '08.00',
                'name' => $r->name,
                'type' => $r->type,
                'description' => $r->description,
            ])
            ->toArray();
    }

    /**
     * Get latest activities feed from registrations and tournament results.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getLatestActivities(?Event $event = null): array
    {
        $activities = [];

        $registrations = Registration::query()
            ->when($event instanceof Event, fn (Builder $query) => $query->whereBelongsTo($event))
            ->select(['id', 'contingent_id', 'created_at'])
            ->with(['contingent:id,name,city'])
            ->latest()
            ->take(3)
            ->get();

        foreach ($registrations as $reg) {
            $activities[] = [
                'icon' => 'fa-user-plus',
                'color' => '#27ae60',
                'bg' => 'rgba(39,174,96,.12)',
                'title' => 'Registrasi Baru — '.($reg->contingent->name ?? 'Kontingen'),
                'desc' => ($reg->contingent->city ?? '-').' · '.$reg->created_at->diffForHumans(),
            ];
        }

        $results = TournamentResult::query()
            ->when($event instanceof Event, fn (Builder $query) => $query->whereBelongsTo($event))
            ->select(['id', 'contingent_name', 'rank', 'created_at'])
            ->latest()
            ->take(3)
            ->get();

        foreach ($results as $res) {
            $rankVal = $res->rank instanceof \BackedEnum ? (int) $res->rank->value : (int) $res->rank;
            $rankName = match ($rankVal) {
                1 => 'Emas (Juara 1)',
                2 => 'Perak (Juara 2)',
                3 => 'Perunggu (Juara 3)',
                default => 'Peringkat '.$rankVal,
            };

            $activities[] = [
                'icon' => 'fa-medal',
                'color' => '#d4a843',
                'bg' => 'rgba(212,168,67,.12)',
                'title' => 'Hasil Pertandingan — '.$rankName,
                'desc' => $res->contingent_name.' · '.$res->created_at->diffForHumans(),
            ];
        }

        return $activities;
    }

    private function scopeAthletesToEvent(Builder $query, ?Event $event): Builder
    {
        if ($event instanceof Event) {
            $query->whereHas('contingent', function (Builder $query) use ($event) {
                $query->whereBelongsTo($event);
            });
        }

        return $query;
    }
}
