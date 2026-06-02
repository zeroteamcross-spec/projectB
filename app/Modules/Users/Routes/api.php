<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;
use App\Modules\Users\Controllers\UserController;

return static function (Router $router): void {
    $router->group('/api/users', static function (Router $router): void {
        $router->get('/me', [UserController::class, 'me']);
        $router->patch('/me', [UserController::class, 'updateMe']);
        $router->patch('/me/password', [UserController::class, 'changePassword']);
        $router->get('/{id}', [UserController::class, 'show']);
        $router->get('/{id}/approval-status', [UserController::class, 'approvalStatus']);
    }, [AuthenticatedUserMiddleware::class]);
};
