<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;
use App\Modules\Profile\Controllers\ProfileController;

return static function (Router $router): void {
    $router->group('/api/profile', static function (Router $router): void {
        $router->get('', [ProfileController::class, 'index']);
        $router->patch('', [ProfileController::class, 'update']);
        $router->patch('/password', [ProfileController::class, 'changePassword']);
        $router->post('/logout', [ProfileController::class, 'logout']);
    }, [AuthenticatedUserMiddleware::class]);
};
