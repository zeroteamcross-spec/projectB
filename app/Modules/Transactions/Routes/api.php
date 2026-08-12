<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;
use App\Modules\Transactions\Controllers\TransactionController;
use App\Modules\Transactions\Controllers\TransactionCronController;

return static function (Router $router): void {
    $router->post(
        '/api/payments/midtrans/callbacks',
        [TransactionController::class, 'providerCallback']
    );

    $router->get(
        '/api/internal/cron/transactions/expire',
        [TransactionCronController::class, 'expirePending']
    );

    $router->group('/api/transactions', static function (Router $router): void {
        $router->get('', [TransactionController::class, 'list']);
        $router->post('', [TransactionController::class, 'create']);
        $router->get('/{transaction_id}', [TransactionController::class, 'detail']);
        $router->get('/{transaction_id}/status', [TransactionController::class, 'status']);
        $router->post('/{transaction_id}/payment-status/sync', [TransactionController::class, 'syncPaymentStatus']);
        $router->get('/{transaction_id}/payment-qr', [TransactionController::class, 'downloadPaymentQr']);
        $router->patch('/{transaction_id}/status', [TransactionController::class, 'updateStatus']);
        $router->patch('/{transaction_id}/fulfillment-checklist', [TransactionController::class, 'updateFulfillmentChecklist']);
        $router->post('/{transaction_id}/complete-payment', [TransactionController::class, 'completePayment']);
        $router->post('/{transaction_id}/cancel', [TransactionController::class, 'cancel']);
        $router->post('/{transaction_id}/return', [TransactionController::class, 'returnTransaction']);
    }, [AuthenticatedUserMiddleware::class]);
};
