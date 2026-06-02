<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\ApiVersion\Controllers\ApiVersionController;

return static function (Router $router): void {
    $router->get(
        '/api/versions/{resource_name}',
        [ApiVersionController::class, 'show']
    );
};
