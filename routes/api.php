<?php

declare(strict_types=1);

use App\Core\Controllers\HealthController;
use App\Core\Router;

return static function (Router $router): void {
    $router->get('/', [HealthController::class, 'root']);
    $router->get('/health', [HealthController::class, 'health']);
    $router->get('/api/health', [HealthController::class, 'health']);

    $authRoutes = base_path('app/Modules/Auth/Routes/api.php');

    if (is_file($authRoutes)) {
        $registerAuthRoutes = require $authRoutes;
        $registerAuthRoutes($router);
    }

    foreach ([
        base_path('app/Modules/Profile/Routes/api.php'),
        base_path('app/Modules/Users/Routes/api.php'),
        base_path('app/Modules/Showrooms/Routes/api.php'),
        base_path('app/Modules/Cars/Routes/api.php'),
        base_path('app/Modules/Images/Routes/api.php'),
        base_path('app/Modules/Inspection/Routes/api.php'),
        base_path('app/Modules/Favorites/Routes/api.php'),
        base_path('app/Modules/Affiliate/Routes/api.php'),
        base_path('app/Modules/Transactions/Routes/api.php'),
        base_path('app/Modules/Notifications/Routes/api.php'),
        base_path('app/Modules/Sliders/Routes/api.php'),
        base_path('app/Modules/Admin/Routes/api.php'),
        base_path('app/Modules/MasterData/Routes/api.php'),
        base_path('app/Modules/ApiVersion/Routes/api.php'),
        base_path('app/Modules/Migration/Routes/api.php'),
        base_path('app/Modules/DesignStudio/Routes/api.php'),
    ] as $moduleRoutes) {
        if (is_file($moduleRoutes)) {
            $registerModuleRoutes = require $moduleRoutes;
            $registerModuleRoutes($router);
        }
    }
};
