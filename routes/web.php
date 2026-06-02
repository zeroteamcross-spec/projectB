<?php

declare(strict_types=1);

use App\Core\JsonResponse;
use App\Core\Request;
use App\Core\Router;

return static function (Router $router): void {
    $router->get('/', static function (Request $request) {
        return JsonResponse::success(
            message: 'ProjectB API is running',
            data: [
                'app' => 'projectB',
                'status' => 'ok',
                'docs_hint' => [
                    'cars' => '/api/cars',
                    'health' => '/health',
                ],
            ]
        );
    });

    $router->get('/health', static function (Request $request) {
        return JsonResponse::success(
            message: 'OK',
            data: [
                'status' => 'healthy',
                'timestamp' => date('c'),
                'php_version' => PHP_VERSION,
                'environment' => $_ENV['APP_ENV'] ?? $_SERVER['APP_ENV'] ?? 'unknown',
            ]
        );
    });
};