<?php

namespace App\Http\Middleware;

use App\Models\Contingent;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureContingentUser
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        abort_unless(
            $user
            && $user->hasAnyRole(['kontingen', 'Contingent'])
            && Contingent::query()->where('user_id', $user->id)->exists(),
            403,
            'Portal ini hanya dapat diakses oleh akun kontingen.'
        );

        return $next($request);
    }
}
