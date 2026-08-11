<?php

declare(strict_types=1);

namespace App\Core\Controllers;

use App\Core\Container;
use App\Core\JsonResponse;
use App\Core\Request;
use PDO;
use Throwable;

class HealthController
{
    private Container $container;

    public function __construct(Container $container)
    {
        $this->container = $container;
    }

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
            'database' => $this->statusDatabase(),
        ], 'Health check OK');
    }

    /**
     * Hanya "ok" atau "unreachable". Endpoint ini publik, jadi tidak boleh
     * membocorkan nama database, host, atau pesan galat -- semuanya memberi
     * tahu penyerang lebih banyak daripada yang dibutuhkan pemiliknya.
     * Rinciannya ada di /api/diagnostics/database, yang bertoken.
     */
    private function statusDatabase(): string
    {
        try {
            /** @var PDO $pdo */
            $pdo = $this->container->make(PDO::class);
            $pdo->query('SELECT 1');

            return 'ok';
        } catch (Throwable $exception) {
            return 'unreachable';
        }
    }
}
