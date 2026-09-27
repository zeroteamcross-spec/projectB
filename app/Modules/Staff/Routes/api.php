<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;
use App\Modules\Staff\Controllers\StaffController;

return static function (Router $router): void {
    // Mengelola staf adalah keputusan pemilik showroom -- StaffService
    // menegakkan owner-only lewat ShowroomPolicy::ensureOwnedByUser(),
    // sama seperti endpoint ".../{id}/mine/..." Multi-Cabang.
    $router->group('/api/showrooms', static function (Router $router): void {
        $router->get('/{id}/staff', [StaffController::class, 'listMine']);
        $router->post('/{id}/staff', [StaffController::class, 'create']);
        $router->patch('/{id}/staff/{staff_id}', [StaffController::class, 'update']);
    }, [AuthenticatedUserMiddleware::class]);
};
