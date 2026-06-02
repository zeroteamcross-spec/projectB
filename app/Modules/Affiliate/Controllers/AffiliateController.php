<?php

declare(strict_types=1);

namespace App\Modules\Affiliate\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Core\Exceptions\ValidationException;
use App\Modules\Affiliate\Requests\CreateAffiliateRequest;
use App\Modules\Affiliate\Requests\CreateCommissionLedgerRequest;
use App\Modules\Affiliate\Requests\CreateAffiliateSettlementRequest;
use App\Modules\Affiliate\Requests\GenerateReferralCodeRequest;
use App\Modules\Affiliate\Requests\RecordClickRequest;
use App\Modules\Affiliate\Requests\UpdateAffiliateSettlementStatusRequest;
use App\Modules\Affiliate\Requests\UpsertCommissionRuleRequest;
use App\Modules\Affiliate\Requests\UpsertSellerAffiliateRequest;
use App\Modules\Affiliate\Requests\UpdateAffiliateSettingRequest;
use App\Modules\Affiliate\Services\AffiliateService;

class AffiliateController extends Controller
{
    private AffiliateService $service;

    public function __construct(AffiliateService $service)
    {
        parent::__construct();

        $this->service = $service;
    }

    public function create(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new CreateAffiliateRequest($request))->validate();

        return JsonResponse::success([
            'affiliate' => $this->service->create($user, $payload),
        ], 'Affiliate berhasil dibuat.', [], 201);
    }

    public function listMine(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $sellerUserId = (int) ($request->query('seller_user_id') ?? $user['id']);
        $result = $this->service->listBySeller($user, $sellerUserId, $request->query());

        return JsonResponse::success([
            'affiliates' => $result['affiliates'],
        ], 'Daftar affiliate berhasil diambil.', $result['meta']);
    }

    public function sellerDetail(Request $request): JsonResponse
    {
        $user = $this->user($request);

        return JsonResponse::success([
            'affiliate' => $this->service->sellerDetail($user, (int) $request->routeParam('affiliate_id')),
        ], 'Detail affiliate berhasil diambil.');
    }

    public function sellerCreate(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new UpsertSellerAffiliateRequest($request))->validate();

        return JsonResponse::success([
            'affiliate' => $this->service->createManaged($user, $payload),
        ], 'Affiliate berhasil dibuat.', [], 201);
    }

    public function sellerUpdate(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new UpsertSellerAffiliateRequest($request))->validate();

        return JsonResponse::success([
            'affiliate' => $this->service->updateManaged($user, (int) $request->routeParam('affiliate_id'), $payload),
        ], 'Affiliate berhasil diperbarui.');
    }

    public function sellerCheckAvailability(Request $request): JsonResponse
    {
        $user = $this->user($request);

        return JsonResponse::success([
            'availability' => $this->service->checkAvailability(
                $user,
                (string) $request->routeParam('slug'),
                $request->query('ignore_affiliate_id') !== null
                    ? (int) $request->query('ignore_affiliate_id')
                    : null
            ),
        ], 'Pengecekan slug affiliate selesai.');
    }

    public function sellerCommissionRules(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $result = $this->service->sellerCommissionRules($user, $request->query());

        return JsonResponse::success([
            'global_rule' => $result['global_rule'],
            'overrides' => $result['overrides'],
        ], 'Rule komisi affiliate berhasil diambil.', $result['meta']);
    }

    public function upsertSellerGlobalCommissionRule(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new UpsertCommissionRuleRequest($request))->validate();

        return JsonResponse::success([
            'rule' => $this->service->upsertSellerGlobalCommissionRule($user, $payload),
        ], 'Rule komisi global berhasil disimpan.');
    }

    public function createSellerCommissionOverride(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new UpsertCommissionRuleRequest($request))->validate();

        return JsonResponse::success([
            'rule' => $this->service->createSellerCommissionOverride($user, $payload),
        ], 'Override komisi per mobil berhasil dibuat.', [], 201);
    }

    public function updateSellerCommissionOverride(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new UpsertCommissionRuleRequest($request))->validate();

        return JsonResponse::success([
            'rule' => $this->service->updateSellerCommissionOverride($user, (int) $request->routeParam('rule_id'), $payload),
        ], 'Override komisi per mobil berhasil diperbarui.');
    }

    public function listBySeller(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $result = $this->service->listBySeller(
            $user,
            (int) $request->routeParam('seller_user_id'),
            $request->query()
        );

        return JsonResponse::success([
            'affiliates' => $result['affiliates'],
        ], 'Daftar affiliate berhasil diambil.', $result['meta']);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new UpdateAffiliateSettingRequest($request))->validate();

        return JsonResponse::success([
            'affiliate' => $this->service->updateSettings($user, (int) $request->routeParam('affiliate_id'), $payload),
        ], 'Pengaturan affiliate berhasil diperbarui.');
    }

    public function generateReferralCode(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new GenerateReferralCodeRequest($request))->validate();

        return JsonResponse::success(
            $this->service->generate($user, $payload),
            'Kode referral berhasil dibuat.'
        );
    }

    public function validateReferralCode(Request $request): JsonResponse
    {
        return JsonResponse::success([
            'referral_code' => $this->service->validateCode((string) $request->routeParam('referral_code')),
        ], 'Validasi kode referral selesai.');
    }

    public function me(Request $request): JsonResponse
    {
        $user = $this->user($request);

        return JsonResponse::success([
            'affiliate' => $this->service->me($user),
        ], 'Profil affiliate berhasil diambil.');
    }

    public function myClicks(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $result = $this->service->myClicks($user, $request->query());

        return JsonResponse::success([
            'clicks' => $result['clicks'],
            'summary' => $result['summary'],
        ], 'Aktivitas click affiliate berhasil diambil.', $result['meta']);
    }

    public function myLedgers(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $result = $this->service->myLedgers($user, $request->query());

        return JsonResponse::success([
            'ledgers' => $result['ledgers'],
            'summary' => $result['summary'],
        ], 'Ledger affiliate berhasil diambil.', $result['meta']);
    }

    public function mySettlements(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $result = $this->service->mySettlements($user, $request->query());

        return JsonResponse::success([
            'summary' => $result['summary'],
            'eligible_ledgers' => $result['eligible_ledgers'],
            'settlements' => $result['settlements'],
        ], 'Settlement affiliate berhasil diambil.', $result['meta']);
    }

    public function mySettlementDetail(Request $request): JsonResponse
    {
        $user = $this->user($request);

        return JsonResponse::success([
            'settlement' => $this->service->settlementDetail($user, (int) $request->routeParam('settlement_batch_id')),
        ], 'Detail settlement affiliate berhasil diambil.');
    }

    public function adminSettlements(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $result = $this->service->adminSettlements($user, $request->query());

        return JsonResponse::success([
            'settlements' => $result['settlements'],
        ], 'Daftar settlement affiliate berhasil diambil.', $result['meta']);
    }

    public function adminLedgers(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $result = $this->service->adminLedgers($user, $request->query());

        return JsonResponse::success([
            'ledgers' => $result['ledgers'],
        ], 'Daftar ledger affiliate berhasil diambil.', $result['meta']);
    }

    public function adminSettlementDetail(Request $request): JsonResponse
    {
        $user = $this->user($request);

        return JsonResponse::success([
            'settlement' => $this->service->settlementDetail($user, (int) $request->routeParam('settlement_batch_id')),
        ], 'Detail settlement affiliate berhasil diambil.');
    }

    public function recordClick(Request $request): JsonResponse
    {
        $payload = (new RecordClickRequest($request))->validate();

        return JsonResponse::success([
            'click' => $this->service->recordClick(
                $payload,
                $this->clientIp($request),
                $this->userAgent($request)
            ),
        ], 'Click referral berhasil dicatat.', [], 201);
    }

    public function createLedger(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new CreateCommissionLedgerRequest($request))->validate();

        return JsonResponse::success([
            'ledger' => $this->service->createLedger($user, (int) $request->routeParam('affiliate_id'), $payload),
        ], 'Ledger komisi berhasil dicatat.', [], 201);
    }

    public function listLedgers(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $result = $this->service->listLedgers($user, (int) $request->routeParam('affiliate_id'), $request->query());

        return JsonResponse::success([
            'ledgers' => $result['ledgers'],
        ], 'Ledger komisi berhasil diambil.', $result['meta']);
    }

    public function createSettlement(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new CreateAffiliateSettlementRequest($request))->validate();

        return JsonResponse::success([
            'settlement' => $this->service->createSettlementBatch($user, $payload),
        ], 'Settlement affiliate berhasil dibuat.', [], 201);
    }

    public function updateSettlementStatus(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new UpdateAffiliateSettlementStatusRequest($request))->validate();
        if (! isset($payload['status']) || $payload['status'] === '') {
            throw new ValidationException(['status' => 'Status settlement wajib diisi.']);
        }

        return JsonResponse::success([
            'settlement' => $this->service->updateSettlementBatchStatus($user, (int) $request->routeParam('settlement_batch_id'), $payload),
        ], 'Status settlement affiliate berhasil diperbarui.');
    }

    public function settleSettlement(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new UpdateAffiliateSettlementStatusRequest($request))->validate();
        $payload['status'] = 'settled';

        return JsonResponse::success([
            'settlement' => $this->service->updateSettlementBatchStatus($user, (int) $request->routeParam('settlement_batch_id'), $payload),
        ], 'Settlement affiliate berhasil ditandai dibayar.');
    }

    public function cancelSettlement(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new UpdateAffiliateSettlementStatusRequest($request))->validate();
        $payload['status'] = 'cancelled';

        return JsonResponse::success([
            'settlement' => $this->service->updateSettlementBatchStatus($user, (int) $request->routeParam('settlement_batch_id'), $payload),
        ], 'Settlement affiliate berhasil dibatalkan.');
    }

    private function clientIp(Request $request): ?string
    {
        $forwardedFor = $request->header('x-forwarded-for');

        if (is_string($forwardedFor) && $forwardedFor !== '') {
            return trim(explode(',', $forwardedFor)[0]);
        }

        $remoteAddr = $request->server('REMOTE_ADDR');

        return is_string($remoteAddr) ? $remoteAddr : null;
    }

    private function userAgent(Request $request): ?string
    {
        $userAgent = $request->header('user-agent');

        return is_string($userAgent) ? $userAgent : null;
    }
}
