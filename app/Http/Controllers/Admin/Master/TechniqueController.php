<?php

namespace App\Http\Controllers\Admin\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Master\StoreTechniqueRequest;
use App\Http\Requests\Admin\Master\UpdateTechniqueRequest;
use App\Models\Kyu;
use App\Models\Technique;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TechniqueController extends Controller
{
    public function index(Request $request): Response
    {
        $techniques = Technique::query()->with('kyu:id,name')->orderBy('order')->paginate(15)->withQueryString();

        return Inertia::render('Admin/Master/Technique/Index', ['techniques' => $techniques, 'kyus' => Kyu::where('is_active', true)->orderBy('order')->get(['id', 'name'])]);
    }

    public function store(StoreTechniqueRequest $request): RedirectResponse
    {
        Technique::create($request->validated());

        return back()->with('success', 'Master Teknik berhasil ditambahkan.');
    }

    public function update(UpdateTechniqueRequest $request, Technique $technique): RedirectResponse
    {
        $technique->update($request->validated());

        return back()->with('success', 'Master Teknik berhasil diperbarui.');
    }

    public function destroy(Technique $technique): RedirectResponse
    {
        $technique->delete();

        return back()->with('success', 'Master Teknik berhasil dihapus.');
    }
}
