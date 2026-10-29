<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * Handle an incoming request and apply production-ready security HTTP headers.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Prevent MIME type sniffing
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // Prevent clickjacking via iframes while allowing same-origin embedding if needed
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');

        // Control referrer information sent in requests
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Modern browsers: disable legacy buggy XSS auditor in favor of CSP
        $response->headers->set('X-XSS-Protection', '0');

        // Restrict sensitive browser permissions (allow camera on same-origin for QR code scanning)
        $response->headers->set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');

        return $response;
    }
}
