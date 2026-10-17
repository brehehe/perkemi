<?php

namespace App\Http\Controllers\Admin\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Master\ImportEventRefereeRequest;
use App\Models\Event;
use App\Services\Admin\Master\EventRefereeImportService;
use Illuminate\Http\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;

class EventRefereeImportController extends Controller
{
    public function template(Event $event, EventRefereeImportService $importService): Response
    {
        return response($importService->template(), 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="template-wasit-'.$event->slug.'.csv"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
        ]);
    }

    public function store(
        ImportEventRefereeRequest $request,
        Event $event,
        EventRefereeImportService $importService,
    ): RedirectResponse {
        $importedRows = $importService->import($event, $request->file('file'));

        return back()->with('success', "{$importedRows} baris wasit berhasil diimpor dan ditugaskan ke event.");
    }
}
