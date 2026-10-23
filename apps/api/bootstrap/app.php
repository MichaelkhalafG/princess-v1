<?php

use App\Http\Middleware\ResolveClientIp;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api/v1',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            Illuminate\Support\Facades\Route::group([], __DIR__.'/../routes/photos.php');
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // first, so every rate limit and log sees the visitor's address (config princess.client_ip)
        $middleware->prepend(ResolveClientIp::class);
        // the web app's requests (Sanctum's stateful domains) get a session cookie; the app uses tokens
        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // {"errors": {"field": "code"}}: one code per field, which the clients turn into words.
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['errors' => array_map(fn (array $codes) => $codes[0], $e->errors())], 422);
            }
        });

        // One answer for anything that is not there, whatever the reason.
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['error' => 'not_found'], 404);
            }
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['error' => 'unauthenticated'], 401);
            }
        });

        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if ($request->is('api/*')) {
                $wait = (int) ($e->getHeaders()['Retry-After'] ?? 60);

                return response()->json(['error' => 'too_many_attempts', 'retry_after' => $wait], 429, $e->getHeaders());
            }
        });
    })->create();
