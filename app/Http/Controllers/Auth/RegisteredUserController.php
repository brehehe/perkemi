<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\RegisterContingentAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register', [
            'year' => (int) date('Y'),
        ]);
    }

    /**
     * Handle an incoming registration request.
     */
    public function store(RegisterRequest $request, RegisterContingentAction $action): RedirectResponse
    {
        $user = $action->execute($request->validated());

        return redirect()->route('login')->with([
            'status' => 'Pendaftaran kontingen berhasil! Password telah dibuat dan sedang dikirimkan ke email '.$user->email.' melalui antrean. Silakan periksa kotak masuk (inbox/spam) Anda untuk login.',
            'registered_email' => $user->email,
        ]);
    }
}
