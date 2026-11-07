<?php

namespace App\Http\Controllers\Admin\Report;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Services\Referee\EmbuRefereeScoreService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SubmittedRefereeScoresController extends Controller
{
    public function __invoke(
        Request $request,
        Event $event,
        EmbuRefereeScoreService $scoreService,
    ): RedirectResponse {
        $user = $request->user();
        $hasManagementRole = $user?->hasAnyRole(['Super Admin', 'Admin', 'Arbitrase', 'Panitera']) ?? false;
        $hasEventManagementAccess = ! $hasManagementRole && $user !== null && in_array(
            $event->accessRoleFor($user),
            [Event::AccessRoleResponsible, Event::AccessRoleAdmin],
            true,
        );

        abort_unless($hasManagementRole || $hasEventManagementAccess, 403);

        $submittedCount = $scoreService->submitCompleteDrafts($event)->count();

        if ($submittedCount === 0) {
            return back()->with('info', 'Tidak ada draft dengan 10 aspek nilai lengkap yang perlu dikirim.');
        }

        return back()->with('success', "{$submittedCount} penilaian draft berhasil disimpan sebagai Sudah Dikirim.");
    }
}
