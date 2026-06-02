<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;
use App\Modules\Notifications\Controllers\NotificationController;

return static function (Router $router): void {
    $router->group('/api/notifications', static function (Router $router): void {
        $router->get('/snapshot', [NotificationController::class, 'snapshot']);
        $router->get('', [NotificationController::class, 'list']);
        $router->post('/read-all', [NotificationController::class, 'markAllRead']);
        $router->post('/{notification_id}/read', [NotificationController::class, 'markRead']);
    }, [AuthenticatedUserMiddleware::class]);
};
