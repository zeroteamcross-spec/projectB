<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\TesterCredentials\Controllers\TesterCredentialsController;

return static function (Router $router): void {
    $router->group('/api/tester-credentials', static function (Router $router): void {
        $router->post('/unlock', [TesterCredentialsController::class, 'unlock']);
        $router->get('/accounts', [TesterCredentialsController::class, 'accounts']);
        $router->post('/lock', [TesterCredentialsController::class, 'lock']);
    });
};
