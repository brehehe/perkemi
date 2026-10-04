<?php

namespace App\Http\Middleware;

use App\Models\Event;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class ResolveEventTenant
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tenantEvent = $this->resolveTenantEvent($request);

        if (! $tenantEvent) {
            return $next($request);
        }

        $routeEvent = $request->route('event');

        if ($routeEvent instanceof Event && ! $routeEvent->is($tenantEvent)) {
            abort(404);
        }

        $user = $request->user();

        if (! $user) {
            return redirect()->guest($request->getSchemeAndHttpHost().route('login', [], false));
        }

        $isFullAdmin = $user?->hasAnyRole(['Super Admin', 'Admin']) ?? false;
        $eventAccessRole = $user
            ? $tenantEvent->accessRoleFor($user)
            : null;
        $isResponsibleUser = $eventAccessRole === Event::AccessRoleResponsible;
        $isContingentOwner = $user && $tenantEvent->contingents()->where('user_id', $user->id)->exists();
        $hasTenantAccess = $user
            && ($isFullAdmin
                || $isResponsibleUser
                || $eventAccessRole !== null
                || $isContingentOwner);

        abort_unless($hasTenantAccess, 403);

        if ($isContingentOwner && ! $isFullAdmin && ! $isResponsibleUser && $eventAccessRole === null) {
            abort_unless($request->routeIs(['admin.pendaftaran.registrasi*', 'admin.pendaftaran.nomor-pertandingan']), 403);
        }

        $isEventAdministration = $request->routeIs([
            'admin.master.event.store',
            'admin.master.event.update',
            'admin.master.event.destroy',
            'admin.master.event.activate',
            'admin.master.event.update.general',
            'admin.master.event.users.update',
        ]);

        if ($isEventAdministration && ! $isFullAdmin && ! in_array($eventAccessRole, [
            Event::AccessRoleResponsible,
            Event::AccessRoleAdmin,
        ], true)) {
            abort(403);
        }

        if (! $request->isMethod('GET') && ! $isFullAdmin && ! $isResponsibleUser && $eventAccessRole === 'viewer') {
            abort(403);
        }

        if ($isResponsibleUser && $request->routeIs([
            'admin.master.contingent.*',
            'admin.master.athlete.*',
            'admin.master.official.*',
        ])) {
            abort(403);
        }

        $isAllowedTenantMasterRoute = $request->routeIs([
            'admin.master.event.*',
            'admin.master.contingent.*',
            'admin.master.athlete.*',
            'admin.master.official.*',
        ]);

        if ($request->routeIs('admin.master.*') && ! $isFullAdmin && ! $isAllowedTenantMasterRoute) {
            abort(403);
        }

        $request->attributes->set('tenantEvent', $tenantEvent);
        $request->attributes->set('tenantAccessRole', $eventAccessRole);

        return $next($request);
    }

    /**
     * Resolve the tenant event from subdomain, session, route, or user assignment.
     */
    protected function resolveTenantEvent(Request $request): ?Event
    {
        $baseDomain = Str::lower((string) config('app.tenant_base_domain', 'localhost'));
        $host = Str::lower($request->getHost());

        // 1. Subdomain resolution (backward compatibility)
        if ($host !== $baseDomain && Str::endsWith($host, ".{$baseDomain}")) {
            $subdomain = Str::beforeLast($host, ".{$baseDomain}");

            if ($subdomain !== '' && ! Str::contains($subdomain, '.')) {
                return Event::query()
                    ->where('tenant_subdomain', $subdomain)
                    ->orWhere('slug', $subdomain)
                    ->firstOrFail();
            }
        }

        // 2. Route slug resolution (if route has eventSlug or slug)
        $routeParam = $request->route('eventSlug') ?? $request->route('slug');
        if (is_string($routeParam) && $routeParam !== '') {
            $event = Event::query()->where('slug', $routeParam)->first();
            if ($event) {
                return $event;
            }
        }

        // 3. Session resolution (when user entered via /event/{slug}/admin or switched tenant)
        if ($request->hasSession() && ($eventId = $request->session()->get('tenant_event_id'))) {
            $event = Event::query()->find($eventId);
            if ($event) {
                return $event;
            }
            $request->session()->forget(['tenant_event_id', 'tenant_event_slug']);
        }

        // 4. Auto-scope for restricted event users without full admin privileges
        $user = $request->user();
        if ($user && ! $user->hasAnyRole(['Super Admin', 'Admin'])) {
            $assignedEvent = Event::query()
                ->whereHas('users', fn ($q) => $q->whereKey($user->id))
                ->orderByDesc('is_active')
                ->orderByDesc('start_date')
                ->orderByDesc('id')
                ->first();

            if ($assignedEvent) {
                if ($request->hasSession()) {
                    $request->session()->put('tenant_event_id', $assignedEvent->id);
                    $request->session()->put('tenant_event_slug', $assignedEvent->slug);
                }

                return $assignedEvent;
            }

        }

        return null;
    }
}
