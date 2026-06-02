<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;
use App\Modules\MasterData\Controllers\MasterAssetController;
use App\Modules\MasterData\Controllers\MasterDataController;
use App\Modules\MasterData\Controllers\ThemeRuntimeController;

return static function (Router $router): void {
    $router->get(
        '/api/theme/runtime-config.js',
        [ThemeRuntimeController::class, 'script']
    );

    $router->get(
        '/api/master-data/{master_key}',
        [MasterDataController::class, 'show']
    );

    $router->group('/api/master-data', static function (Router $router): void {
        $router->post('/assets/bank-icons', [MasterAssetController::class, 'uploadBankIcon']);
        $router->put('/{master_key}', [MasterDataController::class, 'upsert']);
        $router->patch('/{master_key}', [MasterDataController::class, 'upsert']);
    }, [AuthenticatedUserMiddleware::class]);
};
