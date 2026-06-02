<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;
use App\Modules\Sliders\Controllers\SliderController;

return static function (Router $router): void {
    $router->get('/api/sliders', [SliderController::class, 'publicIndex']);

    $router->group('/api/admin/sliders', static function (Router $router): void {
        $router->get('', [SliderController::class, 'adminIndex']);
        $router->get('/{id}', [SliderController::class, 'show']);
        $router->post('', [SliderController::class, 'create']);
        $router->post('/upload-image', [SliderController::class, 'uploadImage']);
        $router->post('/reorder', [SliderController::class, 'reorder']);
        $router->put('/{id}', [SliderController::class, 'update']);
        $router->patch('/{id}', [SliderController::class, 'update']);
        $router->post('/{id}/toggle', [SliderController::class, 'toggle']);
        $router->delete('/{id}', [SliderController::class, 'delete']);
    }, [AuthenticatedUserMiddleware::class]);
};
