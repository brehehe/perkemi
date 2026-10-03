<?php

namespace App\Models;

use App\Enums\EventStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Event extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    public const AccessRoleResponsible = 'responsible';

    public const AccessRoleAdmin = 'admin';

    public const AccessRoleStaff = 'staff';

    public const AccessRoleViewer = 'viewer';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'slug',
        'tenant_subdomain',
        'edition',
        'description',
        'venue',
        'city',
        'province',
        'start_date',
        'end_date',
        'registration_start',
        'registration_end',
        'is_paid',
        'fee_per_athlete',
        'fee_per_contingent',
        'max_match_categories_per_athlete',
        'allow_cross_age_group_embu',
        'match_duration_minutes',
        'minimum_rest_minutes',
        'minimum_entries_per_category',
        'minimum_contingents_per_category',
        'status',
        'is_active',
        'organizer',
        'contact_person',
        'contact_phone',
        'rules_doc',
        'cover_image_path',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => EventStatus::class,
            'start_date' => 'date',
            'end_date' => 'date',
            'registration_start' => 'date',
            'registration_end' => 'date',
            'is_paid' => 'boolean',
            'fee_per_athlete' => 'decimal:2',
            'fee_per_contingent' => 'decimal:2',
            'max_match_categories_per_athlete' => 'integer',
            'allow_cross_age_group_embu' => 'boolean',
            'match_duration_minutes' => 'integer',
            'minimum_rest_minutes' => 'integer',
            'minimum_entries_per_category' => 'integer',
            'minimum_contingents_per_category' => 'integer',
            'is_active' => 'boolean',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Scope a query to only include active events.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to only include events with open registration.
     */
    public function scopeOpenRegistration(Builder $query): Builder
    {
        return $query->where('status', EventStatus::OpenRegistration);
    }

    /**
     * Scope a query to only include ongoing events.
     */
    public function scopeOngoing(Builder $query): Builder
    {
        return $query->where('status', EventStatus::Ongoing);
    }

    /**
     * Scope a query to only include completed events.
     */
    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('status', EventStatus::Completed);
    }

    /**
     * Set this event as the currently active event and deactivate others.
     */
    public function makeActive(): self
    {
        static::query()->where('id', '!=', $this->id)->update(['is_active' => false]);
        $this->update(['is_active' => true]);

        return $this;
    }

    /**
     * Get the contingents registered for this event.
     */
    public function contingents(): HasMany
    {
        return $this->hasMany(Contingent::class);
    }

    /**
     * Get the registrations for this event.
     */
    public function registrations(): HasMany
    {
        return $this->hasMany(Registration::class);
    }

    /**
     * Get the tournament results for this event.
     */
    public function tournamentResults(): HasMany
    {
        return $this->hasMany(TournamentResult::class);
    }

    /**
     * Get the rundowns / schedule for this event.
     */
    public function rundowns(): HasMany
    {
        return $this->hasMany(Rundown::class);
    }

    /**
     * Get the age categories configured for this event.
     */
    public function ageCategories(): HasMany
    {
        return $this->hasMany(EventAgeCategory::class)->orderBy('order')->orderBy('min_age');
    }

    /**
     * Get the courts / tatamis configured for this event.
     */
    public function courts(): HasMany
    {
        return $this->hasMany(EventCourt::class)->orderBy('order');
    }

    /**
     * Get the match categories configured for this event.
     */
    public function matchCategories(): HasMany
    {
        return $this->hasMany(EventMatchCategory::class)->orderBy('order')->orderBy('name');
    }

    public function tournamentDrawings(): HasMany
    {
        return $this->hasMany(TournamentDrawing::class);
    }

    public function tournamentMatches(): HasMany
    {
        return $this->hasMany(TournamentMatch::class);
    }

    /**
     * Get payment methods accepted for registration in this event.
     */
    public function paymentMethods(): BelongsToMany
    {
        return $this->belongsToMany(PaymentMethod::class)->withTimestamps()->orderBy('order');
    }

    /**
     * Get referees assigned to this event.
     */
    public function referees(): BelongsToMany
    {
        return $this->belongsToMany(Referee::class)->withPivot('role')->withTimestamps()->orderBy('name');
    }

    /**
     * Get clerks assigned to this event.
     */
    public function clerks(): BelongsToMany
    {
        return $this->belongsToMany(Clerk::class)->withPivot('role')->withTimestamps()->orderBy('name');
    }

    public function fieldCoordinators(): BelongsToMany
    {
        return $this->belongsToMany(FieldCoordinator::class)->withPivot('assignment_area')->withTimestamps()->orderBy('name');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot('access_role')->withTimestamps()->orderBy('name');
    }

    public function responsibleUsers(): BelongsToMany
    {
        return $this->users()->wherePivot('access_role', self::AccessRoleResponsible);
    }

    public function accessRoleFor(User $user): ?string
    {
        return $this->users()
            ->whereKey($user->id)
            ->value('event_user.access_role');
    }

    public function isResponsibleUser(User $user): bool
    {
        return $this->accessRoleFor($user) === self::AccessRoleResponsible;
    }

    public function coverImageUrl(): ?string
    {
        return $this->cover_image_path
            ? Storage::disk('public')->url($this->cover_image_path)
            : null;
    }

    /**
     * Get all athletes through contingents.
     */
    public function athletes(): HasManyThrough
    {
        return $this->hasManyThrough(Athlete::class, Contingent::class);
    }
}
