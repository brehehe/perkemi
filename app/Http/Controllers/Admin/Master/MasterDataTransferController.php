<?php

namespace App\Http\Controllers\Admin\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Master\ImportMasterDataRequest;
use App\Services\Admin\Master\MasterDataTransferService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class MasterDataTransferController extends Controller
{
    public function template(
        string $type,
        MasterDataTransferService $transferService,
    ): Response {
        return $this->csvResponse(
            $transferService->template($type),
            "template-{$type}.csv",
        );
    }

    public function export(
        Request $request,
        string $type,
        MasterDataTransferService $transferService,
    ): Response {
        return $this->csvResponse(
            $transferService->export($type, $request),
            "export-{$type}-".now()->format('Y-m-d-His').'.csv',
        );
    }

    public function import(
        ImportMasterDataRequest $request,
        string $type,
        MasterDataTransferService $transferService,
    ): RedirectResponse {
        $importedRows = $transferService->import($type, $request->file('file'), $request);

        return back()->with('success', "{$importedRows} baris data berhasil diimpor.");
    }

    private function csvResponse(string $contents, string $filename): Response
    {
        return response($contents, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
        ]);
    }
}
