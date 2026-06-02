<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Affiliate\Controllers\AffiliateController;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;

return static function (Router $router): void {
    $router->get(
        '/api/affiliate/referral-codes/{referral_code}/validate',
        [AffiliateController::class, 'validateReferralCode']
    );

    $router->post(
        '/api/affiliate/clicks',
        [AffiliateController::class, 'recordClick']
    );

    $router->group('/api/affiliates', static function (Router $router): void {
        $router->post('', [AffiliateController::class, 'create']);
        $router->patch('/{affiliate_id}/settings', [AffiliateController::class, 'updateSettings']);
        $router->get('/{affiliate_id}/commission-ledgers', [AffiliateController::class, 'listLedgers']);
        $router->post('/{affiliate_id}/commission-ledgers', [AffiliateController::class, 'createLedger']);
    }, [AuthenticatedUserMiddleware::class]);

    $router->group('/api/affiliate/referral-codes', static function (Router $router): void {
        $router->post('/generate', [AffiliateController::class, 'generateReferralCode']);
    }, [AuthenticatedUserMiddleware::class]);

    $router->group('/api/affiliate', static function (Router $router): void {
        $router->get('/me', [AffiliateController::class, 'me']);
        $router->get('/me/clicks', [AffiliateController::class, 'myClicks']);
        $router->get('/me/ledgers', [AffiliateController::class, 'myLedgers']);
        $router->get('/me/settlements', [AffiliateController::class, 'mySettlements']);
        $router->get('/me/settlements/{settlement_batch_id}', [AffiliateController::class, 'mySettlementDetail']);
    }, [AuthenticatedUserMiddleware::class]);

    $router->group('/api/seller/affiliates', static function (Router $router): void {
        $router->get('', [AffiliateController::class, 'listMine']);
        $router->post('', [AffiliateController::class, 'sellerCreate']);
        $router->get('/{affiliate_id}', [AffiliateController::class, 'sellerDetail']);
        $router->patch('/{affiliate_id}', [AffiliateController::class, 'sellerUpdate']);
    }, [AuthenticatedUserMiddleware::class]);

    $router->group('/api/seller/affiliate-slugs', static function (Router $router): void {
        $router->get('/{slug}/availability', [AffiliateController::class, 'sellerCheckAvailability']);
    }, [AuthenticatedUserMiddleware::class]);

    $router->group('/api/seller/affiliate-commission-rules', static function (Router $router): void {
        $router->get('', [AffiliateController::class, 'sellerCommissionRules']);
        $router->patch('/global', [AffiliateController::class, 'upsertSellerGlobalCommissionRule']);
        $router->post('/overrides', [AffiliateController::class, 'createSellerCommissionOverride']);
        $router->patch('/overrides/{rule_id}', [AffiliateController::class, 'updateSellerCommissionOverride']);
    }, [AuthenticatedUserMiddleware::class]);

    $router->group('/api/admin/sellers/{seller_user_id}/affiliates', static function (Router $router): void {
        $router->get('', [AffiliateController::class, 'listBySeller']);
    }, [AuthenticatedUserMiddleware::class]);

    $router->group('/api/admin/affiliate-settlements', static function (Router $router): void {
        $router->get('', [AffiliateController::class, 'adminSettlements']);
        $router->post('', [AffiliateController::class, 'createSettlement']);
        $router->get('/{settlement_batch_id}', [AffiliateController::class, 'adminSettlementDetail']);
        $router->post('/{settlement_batch_id}/settle', [AffiliateController::class, 'settleSettlement']);
        $router->post('/{settlement_batch_id}/cancel', [AffiliateController::class, 'cancelSettlement']);
        $router->patch('/{settlement_batch_id}/status', [AffiliateController::class, 'updateSettlementStatus']);
    }, [AuthenticatedUserMiddleware::class]);

    $router->group('/api/admin/affiliate-ledgers', static function (Router $router): void {
        $router->get('', [AffiliateController::class, 'adminLedgers']);
    }, [AuthenticatedUserMiddleware::class]);
};
