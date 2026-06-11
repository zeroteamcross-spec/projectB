<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Routes;

use App\Core\Router;
use App\Modules\DesignStudio\Controllers\DraftController;
use App\Modules\DesignStudio\Controllers\PublishController;
use App\Modules\DesignStudio\Controllers\RollbackController;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;

return static function (Router $router): void {
    $router->get('/api/design-studio-v2/published', [PublishController::class, 'loadPublished']);

    $router->group('/api/design-studio-v2', static function (Router $router): void {
        $router->get('/draft', [DraftController::class, 'load']);
        $router->post('/draft', [DraftController::class, 'store']);
        $router->post('/publish', [PublishController::class, 'publish']);
        $router->get('/history', [RollbackController::class, 'timeline']);
        $router->get('/rollback/preview', [RollbackController::class, 'preview']);
        $router->post('/rollback', [RollbackController::class, 'rollback']);
    }, [AuthenticatedUserMiddleware::class]);
};
