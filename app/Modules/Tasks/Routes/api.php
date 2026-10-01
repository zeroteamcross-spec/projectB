<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;
use App\Modules\Tasks\Controllers\TaskController;

return static function (Router $router): void {
    $router->group('/api/admin/tasks', static function (Router $router): void {
        $router->get('', [TaskController::class, 'index']);
        $router->patch('/{task_id}', [TaskController::class, 'update']);
    }, [AuthenticatedUserMiddleware::class]);
};
