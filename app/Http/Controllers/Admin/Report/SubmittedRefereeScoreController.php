<?php

namespace App\Http\Controllers\Admin\Report;

use App\Http\Controllers\Controller;
use App\Models\EmbuJudgeScore;
use App\Models\Event;
use App\Services\Referee\EmbuRefereeScoreService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SubmittedRefereeScoreController extends Controller
{
    public function __invoke(
        Request $request,
        Event $event,
        EmbuJudgeScore $embuJudgeScore,
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

        $scoreService->submitDraft($embuJudgeScore);

        return back()->with('success', 'Penilaian draft berhasil disimpan sebagai Sudah Dikirim.');
    }
}
