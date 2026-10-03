<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TenantAccessController extends Controller
{
    /**
     * Enter event tenant context by slug.
     */
    public function enter(Request $request, string $slug): RedirectResponse
    {
        $event = Event::query()->where('slug', $slug)->firstOrFail();

        $user = $request->user();

        if (! $user) {
            return redirect()->guest(route('login'))
                ->with('status', "Silakan login terlebih dahulu untuk mengakses panel event: {$event->name}");
        }

        $isFullAdmin = $user->hasAnyRole(['Super Admin', 'Admin']);
        $eventAccessRole = $event->accessRoleFor($user);
        $isResponsibleUser = $eventAccessRole === Event::AccessRoleResponsible;
        $isContingentOwner = $event->contingents()->where('user_id', $user->id)->exists();
        $hasTenantAccess = $isFullAdmin || $isResponsibleUser || ($eventAccessRole !== null) || $isContingentOwner;

        abort_unless($hasTenantAccess, 403, 'Anda tidak memiliki hak akses untuk mengelola event ini.');

        $request->session()->put('tenant_event_id', $event->id);
        $request->session()->put('tenant_event_slug', $event->slug);

        return redirect()->route($isContingentOwner && ! $isFullAdmin && ! $isResponsibleUser && $eventAccessRole === null
            ? 'kontingen.registrasi' : 'admin.dashboard')
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
