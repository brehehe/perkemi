<?php

namespace App\Services\Admin\Master;

use App\Enums\EventStatus;
use App\Models\Clerk;
use App\Models\EmbuJudgeScore;
use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\FieldCoordinator;
use App\Models\Kyu;
use App\Models\PaymentMethod;
use App\Models\RandoriScore;
use App\Models\Referee;
use App\Models\RefereeAttendance;
use App\Models\Rundown;
use App\Models\TournamentResult;
use App\Models\User;
use App\Models\WeightClass;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EventDetailViewService
{
    /**
     * Resolve the target event based on tenant context, route parameter, or request parameters.
     */
    public function resolveEvent(Request $request, ?Event $event = null): ?Event
    {
        $tenantEvent = $request->attributes->get('tenantEvent');

        if ($tenantEvent instanceof Event) {
            return $tenantEvent;
        }

        if (! $event || ! $event->exists) {
            $requestedEventId = $request->input('event_id');
            abort_unless($requestedEventId === null || is_string($requestedEventId), 404, 'Event tidak ditemukan.');

            $requestedEventId = trim((string) $requestedEventId);
            $requestedEventId = $requestedEventId === 'all' ? '' : $requestedEventId;
            abort_unless($requestedEventId === '' || Str::isUuid($requestedEventId), 404, 'Event tidak ditemukan.');

            return ($requestedEventId !== '' ? Event::query()->find($requestedEventId) : null)
                ?? Event::where('is_active', true)->orderByDesc('start_date')->orderByDesc('id')->first()
                ?? Event::orderByDesc('start_date')->orderByDesc('id')->first()
                ?? Event::first();
        }

        return $event;
    }

    /**
     * Build the view data array for the Event Detail Inertia page.
     *
     * @return array<string, mixed>
     */
    public function build(Request $request, Event $event): array
    {
        $tenantEvent = $request->attributes->get('tenantEvent');

        // Load all relations
        $event->load([
            'ageCategories' => fn ($q) => $q->withCount('matchCategories')->orderBy('order')->orderBy('min_age'),
            'courts' => fn ($q) => $q->orderBy('order'),
            'matchCategories.ageCategory',
            'matchCategories.weightClass',
            'rundowns' => fn ($q) => $q->orderBy('date')->orderBy('order'),
            'paymentMethods',
            'referees',
            'clerks',
            'fieldCoordinators',
            'users:id,name,email',
        ]);

        // List of all events for the quick switcher
        $allEventsQuery = Event::query()
            ->select('id', 'name', 'edition', 'city', 'is_active', 'status', 'start_date', 'end_date')
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->orderByDesc('id');

        if ($tenantEvent instanceof Event) {
            $allEventsQuery->whereKey($tenantEvent);
        }

        $allEvents = $allEventsQuery
            ->get()
            ->map(fn (Event $e) => [
                'id' => $e->id,
                'name' => $e->name,
                'edition' => $e->edition,
                'city' => $e->city,
                'is_active' => (bool) $e->is_active,
                'status' => $e->status instanceof \BackedEnum ? $e->status->value : (string) $e->status,
                'status_label' => $e->status instanceof EventStatus ? $e->status->label() : (string) $e->status,
                'dates' => $e->start_date?->format('d/m/Y').' - '.$e->end_date?->format('d/m/Y'),
            ]);

        $kyus = Kyu::query()
            ->where('is_active', true)
            ->orderBy('order')
            ->orderByDesc('name')
            ->get(['id', 'name', 'belt_color']);

        $weightClasses = WeightClass::query()
            ->where('is_active', true)
            ->orderBy('gender')
            ->orderBy('order')
            ->get(['id', 'name', 'gender', 'min_weight', 'max_weight']);

        $selectedPaymentMethodIds = $event->paymentMethods->modelKeys();
        $paymentMethods = PaymentMethod::query()
            ->where(fn ($query) => $query
                ->where('is_active', true)
                ->orWhereIn('id', $selectedPaymentMethodIds))
            ->orderBy('order')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'type', 'provider', 'account_name', 'account_number', 'instructions', 'is_active']);

        $selectedRefereeIds = $event->referees->modelKeys();
        $referees = Referee::query()
            ->where(fn ($query) => $query
                ->where('is_active', true)
                ->orWhereIn('id', $selectedRefereeIds))
            ->orderBy('name')
            ->get(['id', 'name', 'gender', 'dan_grade', 'license_number', 'certification_level', 'region', 'phone', 'email', 'is_active']);

        $eventReferees = $event->referees->map(fn (Referee $referee) => [
            'id' => $referee->id,
            'name' => $referee->name,
            'gender' => $referee->gender ?? 'male',
            'dan_grade' => $referee->dan_grade,
            'license_number' => $referee->license_number,
            'certification_level' => $referee->certification_level,
            'region' => $referee->region,
            'phone' => $referee->phone,
            'email' => $referee->email,
            'role' => $referee->pivot->role,
        ]);

        $selectedClerkIds = $event->clerks->modelKeys();
        $clerks = Clerk::query()
            ->where(fn ($query) => $query
                ->where('is_active', true)
                ->orWhereIn('id', $selectedClerkIds))
            ->orderBy('name')
            ->get(['id', 'name', 'employee_number', 'certification', 'region', 'is_active']);

        $eventClerks = $event->clerks->map(fn (Clerk $clerk) => [
            'id' => $clerk->id,
            'name' => $clerk->name,
            'employee_number' => $clerk->employee_number,
            'certification' => $clerk->certification,
            'region' => $clerk->region,
            'role' => $clerk->pivot->role,
        ]);

        $selectedCoordinatorIds = $event->fieldCoordinators->modelKeys();
        $fieldCoordinators = FieldCoordinator::query()
            ->where(fn ($query) => $query
                ->where('is_active', true)
                ->orWhereIn('id', $selectedCoordinatorIds))
            ->orderBy('name')
            ->get(['id', 'name', 'coordinator_number', 'region', 'phone', 'email', 'is_active']);

        $eventFieldCoordinators = $event->fieldCoordinators->map(fn (FieldCoordinator $coordinator) => [
            'id' => $coordinator->id,
            'name' => $coordinator->name,
            'coordinator_number' => $coordinator->coordinator_number,
            'region' => $coordinator->region,
            'phone' => $coordinator->phone,
            'email' => $coordinator->email,
            'notes' => $coordinator->notes,
            'assignment_area' => $coordinator->pivot->assignment_area,
        ]);

        $users = User::query()->with('roles:id,name')->orderBy('name')->get(['id', 'name', 'email']);
        $eventUsers = $event->users->map(fn (User $user) => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'access_role' => $user->pivot->access_role,
        ]);

        // Formatted age categories with counts
        $ageCategories = $event->ageCategories->map(fn (EventAgeCategory $ac) => [
            'id' => $ac->id,
            'event_id' => $ac->event_id,
            'name' => $ac->name,
            'min_age' => $ac->min_age,
            'max_age' => $ac->max_age,
            'age_range' => ($ac->min_age && $ac->max_age) ? "{$ac->min_age} - {$ac->max_age} Tahun" : ($ac->min_age ? "≥ {$ac->min_age} Tahun" : ($ac->max_age ? "≤ {$ac->max_age} Tahun" : 'Semua Usia')),
            'fee' => (float) $ac->fee,
            'fee_formatted' => 'Rp '.number_format($ac->fee, 0, ',', '.'),
            'description' => $ac->description,
            'order' => $ac->order,
            'is_active' => (bool) $ac->is_active,
            'match_categories_count' => (int) ($ac->match_categories_count ?? 0),
        ]);

        // Formatted courts
        $courts = $event->courts->map(fn (EventCourt $c) => [
            'id' => $c->id,
            'event_id' => $c->event_id,
            'name' => $c->name,
            'location' => $c->location,
            'description' => $c->description,
            'order' => $c->order,
            'is_active' => (bool) $c->is_active,
            'access_code' => $c->access_code,
        ]);

        // Formatted match categories
        $matchCategories = $event->matchCategories->map(fn (EventMatchCategory $mc) => [
            'id' => $mc->id,
            'event_id' => $mc->event_id,
            'age_category_id' => $mc->age_category_id,
            'age_category_name' => $mc->ageCategory?->name ?? 'Semua Umur',
            'weight_class_id' => $mc->weight_class_id,
            'weight_class_name' => $mc->weightClass?->name,
            'name' => $mc->name,
            'type' => $mc->type, // 'embu' | 'randori'
            'gender' => $mc->gender, // 'male' | 'female' | 'mixed'
            'capacity' => (int) $mc->capacity,
            'max_athletes_per_team' => (int) $mc->max_athletes_per_team,
            'min_weight' => $mc->min_weight ? (float) $mc->min_weight : null,
            'max_weight' => $mc->max_weight ? (float) $mc->max_weight : null,
            'weight_range' => ($mc->min_weight && $mc->max_weight) ? "{$mc->min_weight} - {$mc->max_weight} kg" : ($mc->min_weight ? "≥ {$mc->min_weight} kg" : ($mc->max_weight ? "≤ {$mc->max_weight} kg" : '-')),
            'min_kyu' => $mc->min_kyu,
            'max_kyu' => $mc->max_kyu,
            'order' => $mc->order,
            'is_active' => (bool) $mc->is_active,
            'is_exhibition' => (bool) $mc->is_exhibition,
        ]);

        // Formatted rundowns
        $rundowns = $event->rundowns->map(fn (Rundown $r) => [
            'id' => $r->id,
            'event_id' => $r->event_id,
            'date' => $r->date?->format('Y-m-d H:i'),
            'date_formatted' => $r->date?->translatedFormat('d M Y, H:i').' WIB',
            'date_only' => $r->date?->format('Y-m-d'),
            'time_only' => $r->date?->format('H:i'),
            'end_time' => $r->end_time?->format('Y-m-d H:i'),
            'end_time_only' => $r->end_time?->format('H:i'),
            'name' => $r->name,
            'type' => $r->type,
            'is_match_session' => (bool) $r->is_match_session,
            'description' => $r->description,
            'order' => (int) $r->order,
        ]);

        return [
            'event' => [
                'id' => $event->id,
                'name' => $event->name,
                'slug' => $event->slug,
                'tenant_subdomain' => $event->tenant_subdomain,
                'tenant_url' => $this->tenantUrl($event),
                'public_url' => $this->tenantUrl($event),
                'admin_tenant_url' => $this->adminTenantUrl($event),
                'edition' => $event->edition,
                'description' => $event->description,
                'venue' => $event->venue,
                'city' => $event->city,
                'province' => $event->province,
                'start_date' => $event->start_date?->format('Y-m-d'),
                'end_date' => $event->end_date?->format('Y-m-d'),
                'start_date_formatted' => $event->start_date?->translatedFormat('d F Y'),
                'end_date_formatted' => $event->end_date?->translatedFormat('d F Y'),
                'registration_start' => $event->registration_start?->format('Y-m-d'),
                'registration_end' => $event->registration_end?->format('Y-m-d'),
                'registration_start_formatted' => $event->registration_start?->translatedFormat('d F Y'),
                'registration_end_formatted' => $event->registration_end?->translatedFormat('d F Y'),
                'is_paid' => (bool) $event->is_paid,
                'fee_per_athlete' => (float) $event->fee_per_athlete,
                'fee_per_athlete_formatted' => 'Rp '.number_format($event->fee_per_athlete, 0, ',', '.'),
                'fee_per_contingent' => (float) $event->fee_per_contingent,
                'fee_per_contingent_formatted' => 'Rp '.number_format($event->fee_per_contingent, 0, ',', '.'),
                'payment_method_ids' => $selectedPaymentMethodIds,
                'max_match_categories_per_athlete' => (int) $event->max_match_categories_per_athlete,
                'allow_cross_age_group_embu' => (bool) $event->allow_cross_age_group_embu,
                'participant_rules' => $event->participant_rules,
                'match_duration_minutes' => (int) $event->match_duration_minutes,
                'minimum_rest_minutes' => (int) $event->minimum_rest_minutes,
                'minimum_entries_per_category' => (int) $event->minimum_entries_per_category,
                'minimum_contingents_per_category' => (int) $event->minimum_contingents_per_category,
                'status' => $event->status instanceof \BackedEnum ? $event->status->value : (string) $event->status,
                'is_active' => (bool) $event->is_active,
                'tts_announcer_enabled' => (bool) $event->tts_announcer_enabled,
                'champion_ranking_system' => $event->champion_ranking_system ?? 'medals',
                'champion_gold_points' => (int) ($event->champion_gold_points ?? 5),
                'champion_silver_points' => (int) ($event->champion_silver_points ?? 3),
                'champion_bronze_points' => (int) ($event->champion_bronze_points ?? 1),
                'organizer' => $event->organizer,
                'contact_person' => $event->contact_person,
                'contact_phone' => $event->contact_phone,
                'rules_doc' => $event->rules_doc,
                'cover_image_url' => $event->coverImageUrl(),
                'created_at' => $event->created_at?->translatedFormat('d M Y H:i'),
                'updated_at_formatted' => $event->updated_at?->translatedFormat('d M Y H:i'),
            ],
            'ageCategories' => $ageCategories,
            'courts' => $courts,
            'matchCategories' => $matchCategories,
            'rundowns' => $rundowns,
            'allEvents' => $allEvents,
            'kyus' => $kyus,
            'weightClasses' => $weightClasses,
            'paymentMethods' => $paymentMethods,
            'referees' => $referees,
            'eventReferees' => $eventReferees,
            'clerks' => $clerks,
            'eventClerks' => $eventClerks,
            'fieldCoordinators' => $fieldCoordinators,
            'eventFieldCoordinators' => $eventFieldCoordinators,
            'users' => $users->map(fn (User $user) => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'roles' => $user->roles->pluck('name')->values()]),
            'eventUsers' => $eventUsers,
            'tenantBaseDomain' => config('app.tenant_base_domain'),
            'tournamentSummary' => [
                'status' => match (true) {
                    $event->tournamentDrawings()->where('status', 'in_progress')->exists() => 'in_progress',
                    $event->tournamentDrawings()->where('status', 'completed')->exists() => 'completed',
                    $event->tournamentDrawings()->where('status', 'published')->exists() => 'published',
                    $event->tournamentDrawings()->where('status', 'generated')->exists() => 'generated',
                    default => 'draft',
                },
                'generated_categories' => $event->tournamentDrawings()->whereIn('status', ['generated', 'published', 'in_progress', 'completed'])->count(),
                'skipped_categories' => $event->tournamentDrawings()->where('status', 'skipped')->count(),
                'total_matches' => $event->tournamentMatches()->count(),
                'match_sessions' => $event->rundowns()->where('is_match_session', true)->count(),
            ],
            'arbitrationSummary' => [
                'referees_count' => $eventReferees->count(),
                'total_matches' => $event->tournamentMatches()->count(),
                'completed_matches' => $event->tournamentMatches()->where('status', 'completed')->count(),
                'attendance_count' => RefereeAttendance::whereBelongsTo($event)->count(),
                'embu_scores_count' => EmbuJudgeScore::whereBelongsTo($event)->count(),
                'randori_scores_count' => RandoriScore::whereBelongsTo($event)->count(),
                'total_scores_count' => EmbuJudgeScore::whereBelongsTo($event)->count() + RandoriScore::whereBelongsTo($event)->count(),
                'champions_count' => TournamentResult::whereBelongsTo($event)->count(),
            ],
            'arbitrationAttendances' => RefereeAttendance::query()
                ->whereBelongsTo($event)
                ->with(['referee:id,name,dan_grade,license_number,certification_level,region'])
                ->orderByDesc('attendance_date')
                ->orderByDesc('checked_in_at')
                ->take(30)
                ->get()
                ->map(fn (RefereeAttendance $att) => [
                    'id' => $att->id,
                    'referee_name' => $att->referee?->name ?? 'Wasit #'.$att->referee_id,
                    'dan_grade' => $att->referee?->dan_grade ?? '-',
                    'license_number' => $att->referee?->license_number ?? '-',
                    'certification_level' => $att->referee?->certification_level ?? '-',
                    'region' => $att->referee?->region ?? '-',
                    'date' => $att->attendance_date?->format('d/m/Y') ?? $att->checked_in_at?->format('d/m/Y') ?? '-',
                    'time' => $att->checked_in_at ? $att->checked_in_at->format('H:i').' WIB' : '-',
                    'method' => $att->method ?: ($att->is_present ? 'QR Code' : '-'),
                    'is_present' => (bool) $att->is_present,
                    'notes' => $att->notes,
                ]),
            'arbitrationScores' => EmbuJudgeScore::query()
                ->whereBelongsTo($event)
                ->with([
                    'referee:id,name',
                    'tournamentMatch:id,match_sequence,participant_label,event_match_category_id,event_court_id',
                    'tournamentMatch.matchCategory:id,name',
                    'tournamentMatch.court:id,name',
                ])
                ->latest()
                ->take(20)
                ->get()
                ->map(fn (EmbuJudgeScore $s) => [
                    'id' => $s->id,
                    'type' => 'EMBU',
                    'match_sequence' => $s->tournamentMatch?->match_sequence ?? '-',
                    'category_name' => $s->tournamentMatch?->matchCategory?->name ?? '-',
                    'court_name' => $s->tournamentMatch?->court?->name ?? '-',
                    'participant' => $s->tournamentMatch?->participant_label ?? '-',
                    'referee_name' => $s->referee?->name ?? ('Juri Wasit #'.$s->judge_number),
                    'judge_number' => $s->judge_number,
                    'technique_subtotal' => (float) $s->technique_subtotal,
                    'expression_subtotal' => (float) $s->expression_subtotal,
                    'violation_penalty' => (float) $s->violation_penalty,
                    'total_score' => (float) $s->total_score,
                    'signed' => ! empty($s->signature),
                    'status' => $s->status ?: 'submitted',
                    'time' => $s->updated_at?->translatedFormat('d M H:i') ?? '-',
                ]),
            'arbitrationPersonnel' => $this->buildArbitrationPersonnel($event),
            'arbitrationRoleUsers' => $event->users()
                ->whereHas('roles', fn ($q) => $q->where('name', 'Arbitrase'))
                ->with('roles:id,name')
                ->get()
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->roles->pluck('name')->all(),
                    'access_role' => $user->pivot->access_role ?? 'staff',
                    'avatar_letter' => strtoupper(substr($user->name, 0, 1)),
                ]),
            'counts' => [
                'age_categories' => $ageCategories->count(),
                'courts' => $courts->count(),
                'match_categories' => $matchCategories->count(),
                'rundowns' => $rundowns->count(),
                'referees' => $eventReferees->count(),
                'clerks' => $eventClerks->count(),
                'field_coordinators' => $eventFieldCoordinators->count(),
                'arbitration' => $eventReferees->count(),
            ],
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'roles' => $request->user()->roles->pluck('name')->toArray(),
                ] : [
                    'name' => 'Administrator Perkemi',
                    'email' => 'admin@smart-perkemi.id',
                    'roles' => ['Super Admin'],
                ],
            ],
        ];
    }

    public function tenantUrl(Event $event): string
    {
        return url('/event/'.$event->slug);
    }

    public function adminTenantUrl(Event $event): string
    {
        return url('/event/'.$event->slug.'/admin');
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function buildArbitrationPersonnel(Event $event): array
    {
        $event->loadMissing(['referees', 'clerks', 'fieldCoordinators']);

        $presentRefereeIds = RefereeAttendance::whereBelongsTo($event)
            ->where('is_present', true)
            ->pluck('referee_id')
            ->unique()
            ->flip();

        $personnel = [];

        // 1. Petugas yang memiliki ROLE ARBITRASE yang dipilih untuk event ini
        $arbitrationUsers = $event->users()
            ->whereHas('roles', fn ($q) => $q->where('name', 'Arbitrase'))
            ->with('roles:id,name')
            ->get();

        foreach ($arbitrationUsers as $user) {
            $personnel[] = [
                'id' => 'arb-user-'.$user->id,
                'user_id' => $user->id,
                'name' => $user->name,
                'category' => 'arbitrase_role',
                'category_label' => 'Dewan Arbitrase (Role Arbitrase)',
                'role_title' => 'Dewan Arbitrase Event',
                'dan_grade' => '-',
                'certification_level' => 'Dewan Arbitrase Resmi',
                'license_number' => 'ARB-'.substr($user->id, 0, 8),
                'region' => 'Pengurus Arbitrase Event',
                'phone' => '-',
                'email' => $user->email,
                'is_present' => true,
                'attendance_status' => 'Ditugaskan (Role Arbitrase)',
                'avatar_letter' => strtoupper(substr($user->name, 0, 1)),
                'is_role_arbitrase' => true,
            ];
        }

        // 2. Dewan Hakim & Pengawas Pertandingan
        foreach ($event->fieldCoordinators as $fc) {
            $roleTitle = match (strtolower((string) $fc->pivot->assignment_area)) {
                'chief' => 'Dewan Hakim / Koordinator Utama',
                'court' => 'Pengawas Lapangan (Tatami)',
                default => 'Dewan Pengawas / Korlap',
            };

            $personnel[] = [
                'id' => 'fc-'.$fc->id,
                'name' => $fc->name,
                'category' => 'dewan',
                'category_label' => 'Dewan Hakim & Pengawas',
                'role_title' => $roleTitle,
                'dan_grade' => '-',
                'certification_level' => 'Pengawas Pertandingan',
                'license_number' => $fc->coordinator_number ?: '-',
                'region' => $fc->region ?: '-',
                'phone' => $fc->phone ?: '-',
                'email' => $fc->email ?: '-',
                'is_present' => true,
                'attendance_status' => 'Bertugas',
                'avatar_letter' => strtoupper(substr($fc->name, 0, 1)),
            ];
        }

        // 2. Wasit & Juri Pertandingan
        foreach ($event->referees as $ref) {
            $isPresent = isset($presentRefereeIds[$ref->id]);

            $roleTitle = match (strtolower((string) $ref->pivot->role)) {
                'chief_referee' => 'Wasit Kepala (Chief Referee)',
                'chief_judge' => 'Ketua Juri',
                'deputy_chief' => 'Wakil Wasit Kepala',
                'arbitration' => 'Dewan Arbitrase Wasit',
                default => 'Wasit & Juri Pertandingan',
            };

            $personnel[] = [
                'id' => 'ref-'.$ref->id,
                'name' => $ref->name,
                'category' => 'wasit',
                'category_label' => 'Wasit & Juri',
                'role_title' => $roleTitle,
                'dan_grade' => $ref->dan_grade ?: '-',
                'certification_level' => $ref->certification_level ?: '-',
                'license_number' => $ref->license_number ?: '-',
                'region' => $ref->region ?: '-',
                'phone' => $ref->phone ?: '-',
                'email' => $ref->email ?: '-',
                'is_present' => $isPresent,
                'attendance_status' => $isPresent ? 'Hadir Presensi' : 'Belum Presensi',
                'avatar_letter' => strtoupper(substr($ref->name, 0, 1)),
            ];
        }

        // 3. Panitera Meja
        foreach ($event->clerks as $clerk) {
            $personnel[] = [
                'id' => 'clerk-'.$clerk->id,
                'name' => $clerk->name,
                'category' => 'panitera',
                'category_label' => 'Panitera Meja',
                'role_title' => $clerk->pivot->role ?: 'Panitera Meja',
                'dan_grade' => '-',
                'certification_level' => $clerk->certification ?: '-',
                'license_number' => $clerk->employee_number ?: '-',
                'region' => $clerk->region ?: '-',
                'phone' => '-',
                'email' => '-',
                'is_present' => true,
                'attendance_status' => 'Bertugas',
                'avatar_letter' => strtoupper(substr($clerk->name, 0, 1)),
            ];
        }

        return $personnel;
    }
}
