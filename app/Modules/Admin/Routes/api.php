<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Admin\Controllers\AdminImpersonationController;
use App\Modules\Admin\Controllers\AdminUserController;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;

return static function (Router $router): void {
    $router->group('/api/admin', static function (Router $router): void {
        $router->get('/users', [AdminUserController::class, 'index']);
        $router->post('/sellers/{seller_user_id}/impersonate', [AdminImpersonationController::class, 'startSeller']);
        $router->post('/affiliates/{affiliate_user_id}/impersonate', [AdminImpersonationController::class, 'startAffiliate']);
        $router->post('/impersonations', [AdminImpersonationController::class, 'start']);
        $router->post('/impersonations/stop', [AdminImpersonationController::class, 'stop']);
    }, [AuthenticatedUserMiddleware::class]);
};
