<?php

namespace App\Http\Controllers\Admin\Arbitration;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Services\Referee\RefereeEvaluationService;
use App\Services\Reports\ReportWorkbook;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ArbitrationEvaluationController extends Controller
{
    public function index(Request $request, RefereeEvaluationService $evaluationService): Response
    {
        $event = $this->eventForRequest($request);
        abort_unless($event instanceof Event, 404, 'Event belum tersedia.');

        $search = $request->string('search')->trim()->toString();
        $certification = $request->string('certification')->trim()->toString();
        $status = $request->string('status')->trim()->toString();
        $status = in_array($status, ['all', 'flagged_only', 'normal_only'], true) ? $status : 'all';

        $data = $evaluationService->evaluate($event, [
            'search' => $search,
            'certification' => $certification,
            'status' => $status,
        ]);

        return Inertia::render('Admin/Arbitration/Evaluation', [
            'activeEvent' => $event->only(['id', 'name', 'city', 'venue']),
            'events' => $this->eventOptions($request),
            'filters' => [
                'search' => $search,
                'certification' => $certification,
                'status' => $status,
            ],
            'summary' => $data['summary'],
            'referees' => $data['referees'],
            'heatmap' => $data['heatmap'],
            'certificationOptions' => $data['certification_options'],
        ]);
    }

    public function export(
        Request $request,
        RefereeEvaluationService $evaluationService,
        ReportWorkbook $workbook,
    ): HttpResponse {
        $event = $this->eventForRequest($request);
        abort_unless($event instanceof Event, 404, 'Event belum tersedia.');

        $data = $evaluationService->evaluate($event, [
            'search' => $request->string('search')->trim()->toString(),
            'certification' => $request->string('certification')->trim()->toString(),
            'status' => $request->string('status')->trim()->toString(),
        ]);

        $title = 'Laporan Evaluasi & Analisis Perwasitan (Anti-Bias)';
        $subtitle = 'Kejuaraan: '.$event->name.' — Data Diekspor: '.now()->translatedFormat('d F Y, H:i').' WIB';

        $headers = [
            'No.',
            'Nama Wasit / Juri',
            'Tingkatan Dan',
            'Nomor Lisensi',
            'Sertifikasi Wasit',
            'Asal Daerah Wasit',
            'Jumlah Partai Dinilai',
            'Rata-rata Skor (Mean)',
            'Standar Deviasi (Std Dev)',
            'Skor Minimum',
            'Skor Maksimum',
            'Rentang Skor',
            '% Skor Terbuang (Trimmed)',
            'Partai Kontingen Daerah Asal',
            'Deviasi Skor Daerah Asal (Δ)',
            'Status Objektivitas',
            'Evaluasi Konsistensi',
            'Analisis Bias Kedaerahan',
            'Rekomendasi Dewan Wasit',
        ];

        $rows = collect($data['referees'])->values()->map(function (array $ref, int $index): array {
            $narrative = $ref['narrative'] ?? [];

            return [
                $index + 1,
                $ref['name'],
                $ref['dan_grade'] ?: '—',
                $ref['license_number'] ?: '—',
                $ref['certification_level'],
                $ref['region'],
                $ref['matches_judged_count'],
                $ref['average_score'],
                $ref['std_dev'],
                $ref['min_score'],
                $ref['max_score'],
                $ref['score_range'],
                $ref['trimmed_rate'].'%',
                $ref['same_origin_count'],
                ($ref['regional_delta'] > 0 ? '+'.$ref['regional_delta'] : (string) $ref['regional_delta']),
                $ref['status_label'],
                $narrative['consistency'] ?? '—',
                $narrative['regional_bias'] ?? '—',
                $narrative['recommendation'] ?? '—',
            ];
        })->all();

        $contents = $workbook->build($title, $subtitle, $headers, $rows);

        return response($contents, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$workbook->filename('Evaluasi Wasit Anti-Bias', $event->name).'"',
        ]);
    }

    private function eventForRequest(Request $request): ?Event
    {
        $tenantEvent = $request->attributes->get('tenantEvent');
        $requestedEventId = $this->requestedEventId($request);

        if ($tenantEvent instanceof Event) {
            abort_if($requestedEventId !== null && $requestedEventId !== $tenantEvent->id, 404);

            return $tenantEvent;
        }

        if ($requestedEventId !== null) {
            return Event::query()->findOrFail($requestedEventId);
        }

        return Event::query()->where('is_active', true)->orderByDesc('start_date')->orderByDesc('id')->first()
            ?? Event::query()->orderByDesc('start_date')->orderByDesc('id')->first();
    }

    private function requestedEventId(Request $request): ?string
    {
        $eventId = $request->input('event_id');
        abort_unless($eventId === null || is_string($eventId), 404, 'Event tidak ditemukan.');

        $eventId = trim((string) $eventId);
        if ($eventId === '' || $eventId === 'all') {
            return null;
        }

        abort_unless(Str::isUuid($eventId), 404, 'Event tidak ditemukan.');

        return $eventId;
    }

    /** @return Collection<int, array<string, mixed>> */
    private function eventOptions(Request $request): Collection
    {
        $tenantEvent = $request->attributes->get('tenantEvent');
        $events = $tenantEvent instanceof Event
            ? Event::query()->whereKey($tenantEvent->id)
            : Event::query();

        return $events
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->get(['id', 'name', 'city', 'start_date', 'end_date', 'status', 'is_active'])
            ->map(fn (Event $event): array => [
                'id' => $event->id,
                'name' => $event->name,
                'city' => $event->city,
                'date_label' => $event->start_date?->translatedFormat('d M Y').' – '.$event->end_date?->translatedFormat('d M Y'),
                'status_label' => $event->status->label(),
                'is_active' => (bool) $event->is_active,
            ]);
    }
}
