<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;
use App\Modules\Migration\Controllers\MigrationManagerController;

return static function (Router $router): void {
    $router->group('/api/admin/migrations', static function (Router $router): void {
        $router->get('', [MigrationManagerController::class, 'index']);
        $router->post('/run', [MigrationManagerController::class, 'run']);
        $router->post('/{name}/mark-applied', [MigrationManagerController::class, 'markApplied']);
    }, [AuthenticatedUserMiddleware::class]);
};
