<?php

declare(strict_types=1);

namespace App\Modules\Auth\Middleware;

use App\Core\Exceptions\UnauthorizedException;
use App\Core\Middleware\MiddlewareInterface;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\Services\AuthSessionService;

class AuthenticatedUserMiddleware implements MiddlewareInterface
{
    private AuthSessionService $service;

    public function __construct(AuthSessionService $service)
    {
        $this->service = $service;
    }

    public function handle(Request $request, callable $next): Response
    {
        $cookieName = (string) config('auth.remember_cookie.name', 'remember_me');
        $rawToken = $request->cookie($cookieName);

        if (! is_string($rawToken) || $rawToken === '') {
            throw new UnauthorizedException('Autentikasi diperlukan.');
        }

        $impersonationCookieName = (string) config('auth.impersonation_cookie.name', 'admin_impersonation');
        $impersonationToken = $request->cookie($impersonationCookieName);
        $auth = $this->service->authenticate($rawToken, is_string($impersonationToken) ? $impersonationToken : null);
        $authContext = $request->auth();

        if ($authContext) {
            $authContext->setSession($auth['user'], $auth['actor'] ?? $auth['user'], $auth['impersonation'] ?? null);
        }

        return Response::from($next($request->withAttribute('auth_user', $auth['user'])));
    }
}
