<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;
use App\Modules\Showrooms\Controllers\ShowroomController;

return static function (Router $router): void {
    $router->get(
        '/api/showrooms/slugs/{slug}/validate',
        [ShowroomController::class, 'validateSlug']
    );

    // Dipanggil server-to-server oleh Midtrans, bukan dari SPA -- di luar
    // AuthenticatedUserMiddleware, sama seperti pola callback transaksi mobil
    // di app/Modules/Transactions/Routes/api.php.
    $router->post(
        '/api/payments/midtrans/subscription-callbacks',
        [ShowroomController::class, 'providerCallback']
    );

    $router->group('/api/showrooms', static function (Router $router): void {
        $router->get('/me', [ShowroomController::class, 'mine']);
        $router->get('/subscriptions/due', [ShowroomController::class, 'dueSubscriptions']);
        $router->patch('/me', [ShowroomController::class, 'upsertMine']);
        $router->post('/me/branding-icon', [ShowroomController::class, 'uploadBrandingIcon']);
        $router->post('/me/branding-logo', [ShowroomController::class, 'uploadBrandingLogo']);
        $router->post('/me/subscription/proof', [ShowroomController::class, 'submitSubscriptionProof']);
        $router->post('/me/subscription/midtrans/charge', [ShowroomController::class, 'createSubscriptionMidtransPayment']);
        $router->get('/me/subscription/history', [ShowroomController::class, 'subscriptionHistory']);
        $router->post('/{id}/subscription/confirm', [ShowroomController::class, 'confirmSubscriptionPayment']);
        $router->post('/{id}/subscription/reject', [ShowroomController::class, 'rejectSubscriptionPayment']);
        $router->get('/{id}/subscription/history', [ShowroomController::class, 'subscriptionHistoryForAdmin']);
        $router->get('/{id}', [ShowroomController::class, 'show']);
    }, [AuthenticatedUserMiddleware::class]);
};
