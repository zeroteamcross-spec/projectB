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
        // Endpoint singular lama -- dipertahankan apa adanya untuk
        // kompatibilitas mundur (resolve ke "cabang pertama", lihat
        // ShowroomRepository::findByUserId()). Seller satu-cabang tidak
        // pernah menyentuh endpoint di bawah ini sama sekali.
        $router->get('/me', [ShowroomController::class, 'mine']);
        $router->get('/subscriptions/due', [ShowroomController::class, 'dueSubscriptions']);
        $router->patch('/me', [ShowroomController::class, 'upsertMine']);
        $router->post('/me/branding-icon', [ShowroomController::class, 'uploadBrandingIcon']);
        $router->post('/me/branding-logo', [ShowroomController::class, 'uploadBrandingLogo']);
        $router->post('/me/subscription/proof', [ShowroomController::class, 'submitSubscriptionProof']);
        $router->post('/me/subscription/midtrans/charge', [ShowroomController::class, 'createSubscriptionMidtransPayment']);
        $router->get('/me/subscription/history', [ShowroomController::class, 'subscriptionHistory']);

        // Fitur multi-cabang: daftar & tambah cabang, lalu satu set endpoint
        // per cabang tertentu (".../{id}/mine/...", bukan "/{id}/..." polos)
        // supaya tidak bentrok dengan endpoint ADMIN di bawah yang sama-sama
        // pakai {id} tapi model otorisasinya beda (admin boleh showroom
        // manapun, di sini cuma showroom milik sendiri -- lihat
        // ShowroomPolicy::ensureOwnedByUser()).
        $router->get('/mine', [ShowroomController::class, 'mineList']);
        $router->post('/', [ShowroomController::class, 'createBranch']);
        $router->get('/{id}/mine', [ShowroomController::class, 'showMine']);
        $router->patch('/{id}/mine', [ShowroomController::class, 'updateBranch']);
        $router->post('/{id}/mine/branding-icon', [ShowroomController::class, 'uploadBrandingIconFor']);
        $router->post('/{id}/mine/branding-logo', [ShowroomController::class, 'uploadBrandingLogoFor']);
        $router->post('/{id}/mine/subscription/proof', [ShowroomController::class, 'submitSubscriptionProofFor']);
        $router->post('/{id}/mine/subscription/midtrans/charge', [ShowroomController::class, 'createSubscriptionMidtransPaymentFor']);
        $router->get('/{id}/mine/subscription/history', [ShowroomController::class, 'subscriptionHistoryForOwned']);

        $router->post('/{id}/deactivate', [ShowroomController::class, 'deactivate']);
        $router->post('/{id}/activate', [ShowroomController::class, 'activate']);
        $router->post('/{id}/subscription/confirm', [ShowroomController::class, 'confirmSubscriptionPayment']);
        $router->post('/{id}/subscription/reject', [ShowroomController::class, 'rejectSubscriptionPayment']);
        $router->get('/{id}/subscription/history', [ShowroomController::class, 'subscriptionHistoryForAdmin']);
        $router->get('/{id}', [ShowroomController::class, 'show']);
    }, [AuthenticatedUserMiddleware::class]);
};
