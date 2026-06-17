<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\ApiVersion\Controllers\ApiVersionController;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;

return static function (Router $router): void {
    $router->get(
        '/api/versions',
        [ApiVersionController::class, 'index']
    );

    $router->get(
        '/api/versions/{resource_name}',
        [ApiVersionController::class, 'show']
    );

    $router->post(
        '/api/admin/versions/{resource_name}/bump',
        [ApiVersionController::class, 'bump'],
        [AuthenticatedUserMiddleware::class]
    );
};
