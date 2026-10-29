<?php

use App\Http\Middleware\EnsureContingentUser;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ResolveEventTenant;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $trustedProxies = env('TRUSTED_PROXIES', '127.0.0.1,::1');
        $proxies = $trustedProxies === '*' ? '*' : array_filter(array_map('trim', explode(',', (string) $trustedProxies)));
        $middleware->trustProxies(at: $proxies);

        $middleware->alias([
            'contingent' => EnsureContingentUser::class,
            'event.tenant' => ResolveEventTenant::class,
        ]);

        $middleware->web(append: [
            SecurityHeaders::class,
            HandleInertiaRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
