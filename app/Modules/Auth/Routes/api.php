<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\Controllers\AuthController;
use App\Modules\Auth\Controllers\GoogleAuthController;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;

return static function (Router $router): void {
    $router->group('/api/auth', static function (Router $router): void {
        $router->post('/register', [AuthController::class, 'register']);
        $router->post('/login', [AuthController::class, 'login']);
        $router->post('/logout', [AuthController::class, 'logout']);
        $router->get('/autologin', [AuthController::class, 'autologin']);
        $router->get('/google/status', [GoogleAuthController::class, 'status']);
        $router->get('/google/redirect', [GoogleAuthController::class, 'redirect']);
        $router->get('/google/callback', [GoogleAuthController::class, 'callback']);
        $router->post('/google/complete-profile', [GoogleAuthController::class, 'completeProfile']);
        $router->post('/otp/confirm', [AuthController::class, 'confirmOtp']);
        $router->get('/pending-users', [AuthController::class, 'pendingUsers'], [AuthenticatedUserMiddleware::class]);
        $router->post('/approve-users', [AuthController::class, 'approveUsers'], [AuthenticatedUserMiddleware::class]);
    });
};
