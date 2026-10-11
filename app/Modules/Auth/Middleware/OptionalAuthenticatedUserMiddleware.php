<?php

declare(strict_types=1);

namespace App\Modules\Auth\Middleware;

use App\Core\Exceptions\UnauthorizedException;
use App\Core\Request;
use App\Core\Response;

/**
 * Hydrate the request user when a valid session is present without making
 * public resources require authentication. Consumers can then apply their
 * own policy for authenticated and anonymous access.
 */
class OptionalAuthenticatedUserMiddleware extends AuthenticatedUserMiddleware
{
    public function handle(Request $request, callable $next): Response
    {
        try {
            return parent::handle($request, $next);
        } catch (UnauthorizedException $exception) {
            return Response::from($next($request));
        }
    }
}
