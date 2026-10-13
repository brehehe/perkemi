<?php

namespace App\Http\Controllers\Admin\Arbitration;

use App\Http\Controllers\Controller;
use App\Models\EmbuJudgeScore;
use App\Models\Event;
use App\Models\RandoriScore;
use App\Services\Reports\ScoreReportFormatter;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ArbitrationScorePrintController extends Controller
{
    public function embu(
        Request $request,
        EmbuJudgeScore $embuJudgeScore,
        ScoreReportFormatter $formatter,
    ): View {
        $event = $this->eventForRequest($request);
        abort_unless($embuJudgeScore->event_id === $event->id, 404);
        $embuJudgeScore->load([
            'referee:id,name,license_number,certification_level',
            'court:id,name',
            'tournamentMatch:id,event_id,event_match_category_id,event_court_id,participant_entry_id,round_label,pool,match_sequence,participant_label,scheduled_start_at,metadata',
            'tournamentMatch.matchCategory:id,name,type',
        ]);

        return view('reports.score-detail', [
            'event' => $event,
            'type' => 'embu',
            'score' => $formatter->embu($embuJudgeScore, $event),
        ]);
    }

    public function randori(
        Request $request,
        RandoriScore $randoriScore,
        ScoreReportFormatter $formatter,
    ): View {
        $event = $this->eventForRequest($request);
        abort_unless($randoriScore->event_id === $event->id, 404);
        $randoriScore->load([
            'submitter:id,name',
            'verifier:id,name',
            'tournamentMatch:id,event_id,event_match_category_id,event_court_id,round_label,pool,match_sequence,red_label,blue_label,scheduled_start_at,metadata',
            'tournamentMatch.matchCategory:id,name,type',
            'tournamentMatch.court:id,name',
        ]);

        return view('reports.score-detail', [
            'event' => $event,
            'type' => 'randori',
            'score' => $formatter->randori($randoriScore, $event),
        ]);
    }

    private function eventForRequest(Request $request): Event
    {
        $tenantEvent = $request->attributes->get('tenantEvent');

        if ($tenantEvent instanceof Event) {
            $requestedEventId = $request->string('event_id')->toString();
            abort_if($requestedEventId !== '' && $requestedEventId !== $tenantEvent->id, 404);

            return $tenantEvent;
        }

        return Event::query()->findOrFail($request->string('event_id')->toString());
    }
}
