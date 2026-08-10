<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;
use App\Modules\Favorites\Controllers\FavoriteController;

return static function (Router $router): void {
    $router->group('/api/favorites', static function (Router $router): void {
        $router->get('', [FavoriteController::class, 'index']);
        $router->post('', [FavoriteController::class, 'store']);
        $router->delete('/{car_id}', [FavoriteController::class, 'destroy']);
    }, [AuthenticatedUserMiddleware::class]);
};
