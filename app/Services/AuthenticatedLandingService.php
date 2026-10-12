<?php

namespace App\Services;

use App\Models\Event;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AuthenticatedLandingService
{
    public function urlFor(Request $request): string
    {
        $user = $request->user();

        if (! $user) {
            return route('home');
        }

        if ($user->hasRole('Wasit') && ($checkInUrl = $this->refereeCheckInIntendedUrl($request))) {
            return $checkInUrl;
        }

        $hostEvent = $this->eventFromHost($request);
        $event = collect([
            $hostEvent,
            $this->eventFromIntendedUrl($request),
            $this->eventFromSession($request),
        ])->first(fn (?Event $candidate): bool => $candidate instanceof Event && $this->canAccessEvent($candidate, $user));

        if (! $event && ! $user->hasAnyRole(['Super Admin', 'Admin'])) {
            $event = $user->accessibleEvents()
                ->orderByDesc('events.is_active')
                ->orderByDesc('events.start_date')
                ->first();

            $event ??= $user->contingent()->with('event')->first()?->event;
        }

        if (! $event) {
            $request->session()->forget(['tenant_event_id', 'tenant_event_slug', 'url.intended']);

            return $user->hasAnyRole(['Super Admin', 'Admin'])
                ? route('admin.dashboard')
                : route('home');
        }

        $request->session()->put('tenant_event_id', $event->id);
        $request->session()->put('tenant_event_slug', $event->slug);
        $request->session()->forget('url.intended');

        $routeName = match (true) {
            $this->isContingentOnlyAccess($event, $user) => 'kontingen.registrasi',
            $user->hasRole('Panitera') && ! $user->hasAnyRole(['Super Admin', 'Admin']) => 'admin.panitera.scoring.index',
            $user->hasRole('Wasit') && ! $user->hasAnyRole(['Super Admin', 'Admin']) => 'wasit.portal',
            default => 'admin.dashboard',
        };

        if ($hostEvent?->is($event)) {
            return $request->getSchemeAndHttpHost().route($routeName, [], false);
        }

        return route($routeName);
    }

    public function canAccessEvent(Event $event, User $user): bool
    {
        return $user->hasAnyRole(['Super Admin', 'Admin'])
            || $event->accessRoleFor($user) !== null
            || $event->contingents()->where('user_id', $user->id)->exists();
    }

    private function isContingentOnlyAccess(Event $event, User $user): bool
    {
        return ! $user->hasAnyRole(['Super Admin', 'Admin'])
            && $event->accessRoleFor($user) === null
            && $event->contingents()->where('user_id', $user->id)->exists();
    }

    private function eventFromHost(Request $request): ?Event
    {
        $baseDomain = Str::lower((string) config('app.tenant_base_domain', 'localhost'));
        $host = Str::lower($request->getHost());

        if ($host === $baseDomain || ! Str::endsWith($host, ".{$baseDomain}")) {
            return null;
        }

        $subdomain = Str::beforeLast($host, ".{$baseDomain}");

        if ($subdomain === '' || Str::contains($subdomain, '.')) {
            return null;
        }

        return Event::query()
            ->where('tenant_subdomain', $subdomain)
            ->orWhere('slug', $subdomain)
            ->first();
    }

    private function eventFromIntendedUrl(Request $request): ?Event
    {
        $intendedUrl = $request->session()->get('url.intended');

        if (! is_string($intendedUrl)) {
            return null;
        }

        $path = parse_url($intendedUrl, PHP_URL_PATH);

        if (! is_string($path) || ! preg_match('#^/event/([^/]+)(?:/|$)#', $path, $matches)) {
            return null;
        }

        return Event::query()->where('slug', rawurldecode($matches[1]))->first();
    }

    private function eventFromSession(Request $request): ?Event
    {
        $eventId = $request->session()->get('tenant_event_id');

        return is_string($eventId) ? Event::query()->find($eventId) : null;
    }

    private function refereeCheckInIntendedUrl(Request $request): ?string
    {
        $intendedUrl = $request->session()->get('url.intended');

        if (! is_string($intendedUrl)) {
            return null;
        }

        $path = parse_url($intendedUrl, PHP_URL_PATH);
        $host = parse_url($intendedUrl, PHP_URL_HOST);

        if (! is_string($path) || ! Str::startsWith($path, '/wasit/check-in/')) {
            return null;
        }

        if (is_string($host) && Str::lower($host) !== Str::lower($request->getHost())) {
            return null;
        }

        return $intendedUrl;
    }
}
