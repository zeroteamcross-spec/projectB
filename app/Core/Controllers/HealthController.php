<?php

declare(strict_types=1);

namespace App\Core\Controllers;

use App\Core\JsonResponse;
use App\Core\Request;

class HealthController
{
    public function root(Request $request): JsonResponse
    {
        return JsonResponse::success([
            'app' => config('app.name', 'BeliMobil'),
            'status' => 'running',
        ], 'Application is running');
    }

    public function health(Request $request): JsonResponse
    {
        return JsonResponse::success([
            'app' => config('app.name', 'BeliMobil'),
            'status' => 'ok',
            'timestamp' => date(DATE_ATOM),
            'timezone' => config('app.timezone', date_default_timezone_get()),
        ], 'Health check OK');
    }
}
