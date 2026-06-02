<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;
use App\Modules\Images\Controllers\CarImageController;

return static function (Router $router): void {
    $router->get('/api/cars/{car_id}/images', [CarImageController::class, 'index']);

    $router->group('/api/cars/{car_id}/images', static function (Router $router): void {
        $router->post('', [CarImageController::class, 'upload']);
        $router->patch('/reorder', [CarImageController::class, 'reorder']);
        $router->patch('/{image_id}/cover', [CarImageController::class, 'setCover']);
        $router->delete('/{image_id}', [CarImageController::class, 'delete']);
    }, [AuthenticatedUserMiddleware::class]);
};
