<?php

declare(strict_types=1);

namespace App\Core\Middleware;

use App\Core\Request;
use App\Core\Response;

abstract class AbstractMiddleware implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        return Response::from($next($request));
    }
}
