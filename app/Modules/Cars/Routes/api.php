<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;
use App\Modules\Cars\Controllers\CarController;

return static function (Router $router): void {
    $router->get('/api/cars', [CarController::class, 'index']);
    $router->get('/api/cars/{id}', [CarController::class, 'show']);

    $router->group('/api/seller/cars', static function (Router $router): void {
        $router->get('', [CarController::class, 'sellerIndex']);
        $router->get('/{id}', [CarController::class, 'show']);
        $router->post('', [CarController::class, 'create']);
        $router->patch('/{id}', [CarController::class, 'update']);
        $router->delete('/{id}', [CarController::class, 'archive']);
    }, [AuthenticatedUserMiddleware::class]);

    $router->group('/api/admin/cars', static function (Router $router): void {
        $router->get('', [CarController::class, 'adminIndex']);
        $router->get('/{id}', [CarController::class, 'show']);
        $router->post('', [CarController::class, 'create']);
        $router->patch('/{id}', [CarController::class, 'update']);
        $router->delete('/{id}', [CarController::class, 'archive']);
        $router->post('/{id}/mark-sold-external', [CarController::class, 'markSoldExternal']);
    }, [AuthenticatedUserMiddleware::class]);
};
