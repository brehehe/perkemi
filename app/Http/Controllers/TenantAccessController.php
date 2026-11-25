<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Services\Admin\DashboardEventAccessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TenantAccessController extends Controller
{
    /**
     * Enter event tenant context by slug.
     */
    public function enter(
        Request $request,
        string $slug,
        DashboardEventAccessService $eventAccess,
    ): RedirectResponse {
        $event = Event::query()->where('slug', $slug)->firstOrFail();

        return $this->enterEvent($request, $event, $eventAccess);
    }

    /**
     * Enter event tenant context by event model/ID.
     */
    public function enterById(
        Request $request,
        Event $event,
        DashboardEventAccessService $eventAccess,
    ): RedirectResponse {
        return $this->enterEvent($request, $event, $eventAccess);
    }

    /**
     * Shared logic to enter event tenant context.
     */
    protected function enterEvent(
        Request $request,
        Event $event,
        DashboardEventAccessService $eventAccess,
    ): RedirectResponse {
        $user = $request->user();

        if (! $user) {
            return redirect()->guest(route('login'))
                ->with('status', "Silakan login terlebih dahulu untuk mengakses panel event: {$event->name}");
        }

        $isFullAdmin = $user->hasAnyRole(['Super Admin', 'Admin']);
        $eventAccessRole = $event->accessRoleFor($user);
        $isResponsibleUser = $eventAccessRole === Event::AccessRoleResponsible;
        $isContingentOwner = $event->contingents()->where('user_id', $user->id)->exists();
        $isContingentUser = $user->hasAnyRole(['kontingen', 'Contingent']) || $user->contingents()->exists();
        $hasTenantAccess = $isFullAdmin
            || $eventAccessRole !== null
            || $eventAccess->canAccess($user, $event)
            || $isContingentOwner
            || $isContingentUser;

        abort_unless($hasTenantAccess, 403, 'Anda tidak memiliki hak akses untuk mengelola event ini.');

        $request->session()->put('tenant_event_id', $event->id);
        $request->session()->put('tenant_event_slug', $event->slug);

        $target = $request->query('target');
        if ($target && is_string($target) && str_starts_with($target, '/')) {
            if (str_starts_with($target, '/kontingen') && ! $isContingentOwner && ! $isFullAdmin) {
                return redirect()->route('kontingen.registrasi.join', $event)
                    ->with('info', "Silakan mulai pendaftaran kontingen untuk event: {$event->name}");
            }

            if (str_contains($target, 'event_id=')) {
                $target = (string) preg_replace('/([?&])event_id=[^&]+/', '$1event_id='.$event->id, $target);
            }

            return redirect($target)
                ->with('success', "Berhasil beralih ke panel event: {$event->name}");
        }

        $routeName = match (true) {
            $isContingentOwner && ! $isFullAdmin && ! $isResponsibleUser && $eventAccessRole === null => 'kontingen.registrasi',
            ! $isContingentOwner && ! $isFullAdmin && ($user->hasAnyRole(['kontingen', 'Contingent']) || $user->contingents()->exists()) => 'kontingen.registrasi.join',
            ($user->hasRole('Koordinator Lapangan') || $user->hasRole('Court')) && ! $isFullAdmin => 'admin.koordinator-court.index',
            $user->hasRole('Panitera') && ! $isFullAdmin => 'admin.panitera.scoring.index',
            $user->hasRole('Wasit') && ! $isFullAdmin => 'wasit.portal',
            default => 'admin.dashboard',
        };

        if ($routeName === 'kontingen.registrasi.join') {
            return redirect()->route('kontingen.registrasi.join', $event);
        }

        $params = ($routeName === 'admin.dashboard' && ! $isFullAdmin) ? ['event_id' => $event->id] : [];

        return redirect()->route($routeName, $params)
            ->with('success', "Berhasil beralih ke panel event: {$event->name}");
    }

    /**
     * Exit event tenant context and return to global admin mode.
     */
    public function exit(Request $request): RedirectResponse
    {
        $request->session()->forget(['tenant_event_id', 'tenant_event_slug']);

        if ($request->user() && ! $request->user()->hasAnyRole(['Super Admin', 'Admin'])
            && Event::query()->whereHas('contingents', fn ($query) => $query->where('user_id', $request->user()->id))->exists()) {
            return redirect()->route('kontingen.registrasi');
        }

        return redirect()->route('admin.master.event.index')
            ->with('success', 'Kembali ke mode Admin Utama.');
    }
}
