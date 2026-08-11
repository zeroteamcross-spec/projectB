<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Admin\Controllers\AdminImpersonationController;
use App\Modules\Admin\Controllers\AdminUserController;
use App\Modules\Admin\Controllers\WebConfigController;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;

return static function (Router $router): void {
    $router->group('/api/admin', static function (Router $router): void {
        $router->get('/users', [AdminUserController::class, 'index']);
        // Khusus super admin; dijaga di AdminUserService, bukan di rute --
        // grup ini hanya memeriksa "sudah login".
        $router->post('/accounts', [AdminUserController::class, 'store']);
        $router->post('/sellers/{seller_user_id}/impersonate', [AdminImpersonationController::class, 'startSeller']);
        $router->post('/affiliates/{affiliate_user_id}/impersonate', [AdminImpersonationController::class, 'startAffiliate']);
        $router->post('/impersonations', [AdminImpersonationController::class, 'start']);
        $router->post('/impersonations/stop', [AdminImpersonationController::class, 'stop']);
        $router->get('/web-config', [WebConfigController::class, 'show']);
        $router->put('/web-config', [WebConfigController::class, 'update']);
        $router->patch('/web-config', [WebConfigController::class, 'update']);
    }, [AuthenticatedUserMiddleware::class]);
};
