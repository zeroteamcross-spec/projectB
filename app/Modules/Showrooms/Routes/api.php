<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;
use App\Modules\Showrooms\Controllers\ShowroomController;

return static function (Router $router): void {
    $router->group('/api/showrooms', static function (Router $router): void {
        $router->get('/me', [ShowroomController::class, 'mine']);
        $router->patch('/me', [ShowroomController::class, 'upsertMine']);
        $router->get('/{id}', [ShowroomController::class, 'show']);
    }, [AuthenticatedUserMiddleware::class]);
};
