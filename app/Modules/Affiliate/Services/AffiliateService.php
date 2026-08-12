<?php

declare(strict_types=1);

namespace App\Modules\Affiliate\Services;

use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\ValidationException;
use App\Modules\Affiliate\Mappers\AffiliateMapper;
use App\Modules\Affiliate\Policies\AffiliatePolicy;
use App\Modules\Affiliate\Repositories\AffiliateClickLogRepository;
use App\Modules\Affiliate\Repositories\AffiliateCommissionLedgerRepository;
use App\Modules\Affiliate\Repositories\AffiliateCommissionRuleRepository;
use App\Modules\Affiliate\Repositories\AffiliateRepository;
use App\Modules\Affiliate\Repositories\AffiliateSettlementRepository;
use App\Modules\Notifications\Services\NotificationService;
use PDO;
use Throwable;

class AffiliateService
{
    private PDO $pdo;

    private AffiliateRepository $repository;

    private AffiliateClickLogRepository $clickLogs;

    private AffiliateCommissionLedgerRepository $ledgers;

    private AffiliateCommissionRuleRepository $commissionRules;

    private AffiliateSettlementRepository $settlements;

    private ?NotificationService $notificationService;

    public function __construct(
        PDO $pdo,
        AffiliateRepository $repository,
        AffiliateClickLogRepository $clickLogs,
        AffiliateCommissionLedgerRepository $ledgers,
        AffiliateCommissionRuleRepository $commissionRules,
        AffiliateSettlementRepository $settlements,
        ?NotificationService $notificationService = null
    ) {
        $this->pdo = $pdo;
        $this->repository = $repository;
        $this->clickLogs = $clickLogs;
        $this->ledgers = $ledgers;
        $this->commissionRules = $commissionRules;
        $this->settlements = $settlements;
        $this->notificationService = $notificationService;
    }

    public function create(array $user, array $data): array
    {
        $sellerUserId = (int) ($data['seller_user_id'] ?? $user['id']);
        AffiliatePolicy::ensureCanCreate($user, $sellerUserId);
        $this->ensureValidUsers((int) $data['user_id'], $sellerUserId);

        if ($this->repository->relationExists((int) $data['user_id'], $sellerUserId)) {
            throw new ValidationException([
                'user_id' => 'Affiliate relation for this seller already exists.',
            ]);
        }

        $referralCode = isset($data['referral_code']) && $data['referral_code'] !== ''
            ? $this->normalizeCode($data['referral_code'])
            : $this->generateReferralCode();

        if ($this->repository->referralCodeExists($referralCode)) {
            throw new ValidationException([
                'referral_code' => 'Referral code already exists.',
            ]);
        }

        $affiliateId = $this->repository->create([
            'user_id' => (int) $data['user_id'],
            'seller_user_id' => $sellerUserId,
            'referral_code' => $referralCode,
            'commission_type' => $data['commission_type'],
            'commission_percent' => $data['commission_type'] === 'percent' ? (float) ($data['commission_percent'] ?? 0) : 0,
            'commission_flat' => $data['commission_type'] === 'flat' ? (float) ($data['commission_flat'] ?? 0) : 0,
            'status' => $data['status'] ?? 'active',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return AffiliateMapper::affiliate($this->requireAffiliate($affiliateId));
    }

    public function listBySeller(array $user, int $sellerUserId, array $filters): array
    {
        AffiliatePolicy::ensureCanViewSeller($user, $sellerUserId);
        $page = max(1, (int) ($filters['page'] ?? 1));
        $limit = max(1, min((int) ($filters['limit'] ?? 20), 100));
        $offset = ($page - 1) * $limit;

        return [
            'affiliates' => AffiliateMapper::affiliates($this->repository->listBySeller($sellerUserId, $limit, $offset)),
            'meta' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $this->repository->countBySeller($sellerUserId),
            ],
        ];
    }

    public function sellerDetail(array $user, int $affiliateId): array
    {
        $affiliate = $this->requireAffiliate($affiliateId);
        AffiliatePolicy::ensureCanManage($user, $affiliate);

        return AffiliateMapper::affiliate($affiliate);
    }

    public function createManaged(array $user, array $data): array
    {
        $sellerUserId = (int) $user['id'];
        AffiliatePolicy::ensureCanCreate($user, $sellerUserId);

        $referralCode = $this->normalizeCode((string) ($data['referral_code'] ?? ''));
        $this->assertReferralCodeFormat($referralCode);
        $email = strtolower(trim((string) ($data['email'] ?? '')));

        if ($this->repository->referralCodeExists($referralCode)) {
            throw new ValidationException([
                'referral_code' => 'Referral code already exists.',
            ]);
        }

        if ($this->repository->emailExists($email)) {
            throw new ValidationException([
                'email' => 'Email sudah terdaftar.',
            ]);
        }

        $now = date('Y-m-d H:i:s');
        $status = ($data['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active';

        try {
            $this->pdo->beginTransaction();
            $affiliateUserId = $this->repository->createAffiliateUser([
                'role' => 'affiliate_admin',
                'name' => trim((string) ($data['name'] ?? '')),
                'phone_number' => trim((string) ($data['phone_number'] ?? '')),
                'email' => $email,
                'password_hash' => password_hash((string) $data['password'], PASSWORD_DEFAULT),
                'address' => null,
                'account_status' => $status === 'active' ? 'active' : 'suspended',
                'is_approved' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $affiliateId = $this->repository->create([
                'user_id' => $affiliateUserId,
                'seller_user_id' => $sellerUserId,
                'referral_code' => $referralCode,
                'commission_type' => 'flat',
                'commission_percent' => 0,
                'commission_flat' => 0,
                'status' => $status,
                'created_at' => $now,
            ]);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return AffiliateMapper::affiliate($this->requireAffiliate($affiliateId));
    }

    public function updateManaged(array $user, int $affiliateId, array $data): array
    {
        $affiliate = $this->requireAffiliate($affiliateId);
        AffiliatePolicy::ensureCanManage($user, $affiliate);

        $referralCode = $this->normalizeCode((string) ($data['referral_code'] ?? $affiliate['referral_code']));
        $this->assertReferralCodeFormat($referralCode);
        $email = strtolower(trim((string) ($data['email'] ?? ($affiliate['user_email'] ?? ''))));

        if ($this->repository->referralCodeExists($referralCode, $affiliateId)) {
            throw new ValidationException([
                'referral_code' => 'Referral code already exists.',
            ]);
        }

        if ($this->repository->emailExists($email, (int) $affiliate['user_id'])) {
            throw new ValidationException([
                'email' => 'Email sudah terdaftar.',
            ]);
        }

        $now = date('Y-m-d H:i:s');
        $status = ($data['status'] ?? $affiliate['status']) === 'inactive' ? 'inactive' : 'active';
        $password = trim((string) ($data['password'] ?? ''));

        try {
            $this->pdo->beginTransaction();
            $this->repository->updateAffiliateUser((int) $affiliate['user_id'], [
                'name' => trim((string) ($data['name'] ?? ($affiliate['user_name'] ?? ''))),
                'phone_number' => trim((string) ($data['phone_number'] ?? ($affiliate['user_phone_number'] ?? ''))),
                'email' => $email,
                'password_hash' => $password !== '' ? password_hash($password, PASSWORD_DEFAULT) : null,
                'account_status' => $status === 'active' ? 'active' : 'suspended',
                'is_approved' => 1,
                'updated_at' => $now,
            ]);
            $this->repository->updateSettings($affiliateId, [
                'referral_code' => $referralCode,
                'commission_type' => $affiliate['commission_type'],
                'commission_percent' => (float) $affiliate['commission_percent'],
                'commission_flat' => (float) $affiliate['commission_flat'],
                'status' => $status,
                'updated_at' => $now,
            ]);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return AffiliateMapper::affiliate($this->requireAffiliate($affiliateId));
    }

    public function checkAvailability(array $user, string $referralCode, ?int $ignoreAffiliateId = null): array
    {
        AffiliatePolicy::ensureCanGenerateReferralCode($user);

        $normalized = $this->normalizeCode($referralCode);
        $this->assertReferralCodeFormat($normalized);

        return [
            'referral_code' => $normalized,
            'is_available' => ! $this->repository->referralCodeExists($normalized, $ignoreAffiliateId),
        ];
    }

    public function updateSettings(array $user, int $affiliateId, array $data): array
    {
        $affiliate = $this->requireAffiliate($affiliateId);
        AffiliatePolicy::ensureCanManage($user, $affiliate);
        $commissionType = $data['commission_type'] ?? $affiliate['commission_type'];
        $referralCode = isset($data['referral_code'])
            ? $this->normalizeCode($data['referral_code'])
            : $affiliate['referral_code'];

        if ($this->repository->referralCodeExists($referralCode, $affiliateId)) {
            throw new ValidationException([
                'referral_code' => 'Referral code already exists.',
            ]);
        }

        $this->repository->updateSettings($affiliateId, [
            'referral_code' => $referralCode,
            'commission_type' => $commissionType,
            'commission_percent' => $commissionType === 'percent'
                ? (float) ($data['commission_percent'] ?? $affiliate['commission_percent'])
                : 0,
            'commission_flat' => $commissionType === 'flat'
                ? (float) ($data['commission_flat'] ?? $affiliate['commission_flat'])
                : 0,
            'status' => $data['status'] ?? $affiliate['status'],
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return AffiliateMapper::affiliate($this->requireAffiliate($affiliateId));
    }

    public function generate(array $user, array $data = []): array
    {
        AffiliatePolicy::ensureCanGenerateReferralCode($user);

        $code = $this->generateReferralCode($data['prefix'] ?? null);

        return [
            'referral_code' => $code,
            'is_available' => true,
        ];
    }

    public function validateCode(string $referralCode): array
    {
        $normalized = $this->normalizeCode($referralCode);
        $affiliate = $this->repository->findPublicContextByReferralCode($normalized);

        return [
            'referral_code' => $normalized,
            'is_valid' => $affiliate !== null && ($affiliate['status'] ?? null) === 'active',
            'affiliate_id' => $affiliate ? (int) $affiliate['id'] : null,
            'seller_user_id' => $affiliate ? (int) $affiliate['seller_user_id'] : null,
            'contact_whatsapp' => $affiliate
                ? ($affiliate['affiliate_phone_number'] ?: ($affiliate['showroom_phone_number'] ?: $affiliate['seller_phone_number']))
                : null,
            'affiliate' => $affiliate
                ? [
                    'id' => (int) $affiliate['user_id'],
                    'name' => $affiliate['affiliate_name'] ?? null,
                    'email' => $affiliate['affiliate_email'] ?? null,
                    'phone_number' => $affiliate['affiliate_phone_number'] ?? null,
                ]
                : null,
            'seller' => $affiliate
                ? [
                    'id' => (int) $affiliate['seller_user_id'],
                    'name' => $affiliate['seller_name'] ?? null,
                    'email' => $affiliate['seller_email'] ?? null,
                    'phone_number' => $affiliate['seller_phone_number'] ?? null,
                ]
                : null,
            'showroom' => $affiliate && isset($affiliate['showroom_id']) && $affiliate['showroom_id'] !== null
                ? [
                    'id' => (int) $affiliate['showroom_id'],
                    'name' => $affiliate['showroom_name'] ?? null,
                    'address' => $affiliate['showroom_address'] ?? null,
                    'phone_number' => $affiliate['showroom_phone_number'] ?? null,
                ]
                : null,
        ];
    }

    public function recordClick(array $data, ?string $ipAddress, ?string $userAgent): array
    {
        $affiliate = $this->repository->findByReferralCode($this->normalizeCode($data['referral_code']));

        if (! $affiliate || ($affiliate['status'] ?? null) !== 'active') {
            throw new NotFoundException('Kode referral tidak ditemukan.');
        }

        try {
            $this->pdo->beginTransaction();
            $clickId = $this->clickLogs->create((int) $affiliate['id'], [
                'clicked_at' => date('Y-m-d H:i:s'),
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
                'landing_url' => $data['landing_url'] ?? null,
                'created_at' => date('Y-m-d H:i:s'),
            ]);
            $this->clickLogs->incrementAffiliateClicks((int) $affiliate['id']);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return [
            'id' => $clickId,
            'affiliate_id' => (int) $affiliate['id'],
            'referral_code' => $affiliate['referral_code'],
            'clicked_at' => date('Y-m-d H:i:s'),
        ];
    }

    public function createLedger(array $user, int $affiliateId, array $data): array
    {
        $affiliate = $this->requireAffiliate($affiliateId);
        AffiliatePolicy::ensureCanManage($user, $affiliate);

        $startedTransaction = ! $this->pdo->inTransaction();

        try {
            if ($startedTransaction) {
                $this->pdo->beginTransaction();
            }
            $ledgerId = $this->ledgers->create([
                'affiliate_id' => $affiliateId,
                'affiliate_user_id' => (int) $affiliate['user_id'],
                'transaction_id' => isset($data['transaction_id']) ? (int) $data['transaction_id'] : null,
                'seller_user_id' => $data['seller_user_id'] ?? null,
                'showroom_id' => $data['showroom_id'] ?? null,
                'buyer_user_id' => $data['buyer_user_id'] ?? null,
                'source_type' => $data['source_type'] ?? (isset($data['transaction_id']) ? 'transaction' : null),
                'source_id' => $data['source_id'] ?? (isset($data['transaction_id']) ? (string) $data['transaction_id'] : null),
                'entry_type' => $data['entry_type'],
                'rule_source' => $data['rule_source'] ?? null,
                'commission_type' => $data['commission_type'] ?? null,
                'commission_value_snapshot' => $data['commission_value_snapshot'] ?? null,
                'base_amount' => $data['base_amount'] ?? null,
                'commission_amount' => (float) $data['amount'],
                'amount' => (float) $data['amount'],
                'currency' => $data['currency'] ?? 'IDR',
                'ledger_status' => $data['ledger_status'] ?? null,
                'status_reason' => $data['status_reason'] ?? null,
                'settlement_id' => null,
                'finality_event' => $data['finality_event'] ?? null,
                'accrued_at' => ($data['ledger_status'] ?? null) === 'accrued' ? date('Y-m-d H:i:s') : null,
                'notes' => $data['notes'] ?? null,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
            $this->ledgers->syncAffiliateAggregate($affiliateId);
            if ($startedTransaction) {
                $this->pdo->commit();
            }
        } catch (Throwable $exception) {
            if ($startedTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return AffiliateMapper::ledger($this->ledgers->findById($ledgerId));
    }

    public function listLedgers(array $user, int $affiliateId, array $filters): array
    {
        $affiliate = $this->requireAffiliate($affiliateId);
        AffiliatePolicy::ensureCanManage($user, $affiliate);
        $page = max(1, (int) ($filters['page'] ?? 1));
        $limit = max(1, min((int) ($filters['limit'] ?? 20), 100));
        $offset = ($page - 1) * $limit;

        return [
            'ledgers' => AffiliateMapper::ledgers($this->ledgers->listByAffiliate($affiliateId, $limit, $offset)),
            'meta' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $this->ledgers->countByAffiliate($affiliateId),
            ],
        ];
    }

    public function resolveTransactionAttribution(string $referralCode, int $sellerUserId): array
    {
        $normalized = $this->normalizeCode($referralCode);
        $affiliate = $this->repository->findByReferralCode($normalized);

        if (! $affiliate || ($affiliate['status'] ?? null) !== 'active') {
            throw new ValidationException([
                'affiliate_referral_code' => 'Affiliate context tidak valid.',
            ]);
        }

        if ((int) $affiliate['seller_user_id'] !== $sellerUserId) {
            throw new ValidationException([
                'affiliate_referral_code' => 'Affiliate tidak sesuai dengan seller mobil yang dipilih.',
            ]);
        }

        return [
            'affiliate_id' => (int) $affiliate['id'],
            'affiliate_referral_code_snapshot' => $affiliate['referral_code'],
        ];
    }

    public function me(array $user): array
    {
        if (($user['role'] ?? null) !== 'affiliate_admin') {
            throw new ValidationException([
                'user' => 'Affiliate dashboard hanya tersedia untuk level user affiliate.',
            ]);
        }

        $affiliate = $this->repository->findByUserId((int) $user['id']);

        if (! $affiliate) {
            throw new NotFoundException('Affiliate tidak ditemukan.');
        }

        $result = AffiliateMapper::affiliate($affiliate);
        $recentLimit = 5;
        $recentLedgers = $this->ledgers->listByAffiliate((int) $affiliate['id'], $recentLimit, 0);

        return array_merge($result, [
            'seller' => [
                'id' => (int) $affiliate['seller_user_id'],
                'name' => $affiliate['seller_name'] ?? null,
                'email' => $affiliate['seller_email'] ?? null,
                'phone_number' => $affiliate['seller_phone_number'] ?? null,
            ],
            'showroom' => isset($affiliate['showroom_id']) && $affiliate['showroom_id'] !== null
                ? [
                    'id' => (int) $affiliate['showroom_id'],
                    'slug' => $affiliate['showroom_slug'] ?? null,
                    'name' => $affiliate['showroom_name'] ?? null,
                    'address' => $affiliate['showroom_address'] ?? null,
                    'phone_number' => $affiliate['showroom_phone_number'] ?? null,
                ]
                : null,
            'recent_ledgers' => AffiliateMapper::ledgers($recentLedgers),
            'ledger_meta' => [
                'page' => 1,
                'limit' => $recentLimit,
                'total' => $this->ledgers->countByAffiliate((int) $affiliate['id']),
            ],
            'summary' => [
                'total_clicks' => (int) ($affiliate['total_clicks'] ?? 0),
                'total_transactions' => (int) ($affiliate['total_transactions'] ?? 0),
                'total_commission' => (float) ($affiliate['total_commission'] ?? 0),
            ],
        ]);
    }

    public function myClicks(array $user, array $filters): array
    {
        if (($user['role'] ?? null) !== 'affiliate_admin') {
            throw new ValidationException([
                'user' => 'Aktivitas affiliate hanya tersedia untuk level user affiliate.',
            ]);
        }

        $affiliate = $this->repository->findByUserId((int) $user['id']);

        if (! $affiliate) {
            throw new NotFoundException('Affiliate tidak ditemukan.');
        }

        $page = max(1, (int) ($filters['page'] ?? 1));
        $limit = max(1, min((int) ($filters['limit'] ?? 20), 100));
        $offset = ($page - 1) * $limit;
        $clicks = $this->clickLogs->listByAffiliate((int) $affiliate['id'], $limit, $offset);
        $topLanding = $this->clickLogs->topLandingByAffiliate((int) $affiliate['id']);

        return [
            'clicks' => array_map(static fn (array $click): array => [
                'id' => (int) $click['id'],
                'affiliate_id' => (int) $click['affiliate_id'],
                'clicked_at' => $click['clicked_at'],
                'landing_url' => $click['landing_url'] ?? null,
                'created_at' => $click['created_at'] ?? null,
            ], $clicks),
            'summary' => [
                'total_clicks' => $this->clickLogs->countByAffiliate((int) $affiliate['id']),
                'today_clicks' => $this->clickLogs->todayCountByAffiliate((int) $affiliate['id']),
                'top_landing_url' => $topLanding['landing_url'] ?? null,
                'top_landing_clicks' => isset($topLanding['total']) ? (int) $topLanding['total'] : 0,
            ],
            'meta' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $this->clickLogs->countByAffiliate((int) $affiliate['id']),
            ],
        ];
    }

    public function myLedgers(array $user, array $filters): array
    {
        if (($user['role'] ?? null) !== 'affiliate_admin') {
            throw new ValidationException([
                'user' => 'Ledger affiliate hanya tersedia untuk level user affiliate.',
            ]);
        }

        $affiliate = $this->repository->findByUserId((int) $user['id']);

        if (! $affiliate) {
            throw new NotFoundException('Affiliate tidak ditemukan.');
        }

        $page = max(1, (int) ($filters['page'] ?? 1));
        $limit = max(1, min((int) ($filters['limit'] ?? 20), 100));
        $offset = ($page - 1) * $limit;
        $ledgers = AffiliateMapper::ledgers($this->ledgers->listDetailedByAffiliate((int) $affiliate['id'], $limit, $offset));
        $aggregate = $this->ledgers->aggregateByAffiliate((int) $affiliate['id']);

        return [
            'ledgers' => $ledgers,
            'summary' => [
                'total_commission' => (float) ($aggregate['total_commission'] ?? 0),
                'total_transactions' => (int) ($aggregate['total_transactions'] ?? 0),
                'pending_total' => (float) ($aggregate['pending_total'] ?? 0),
                'confirmed_total' => (float) ($aggregate['confirmed_total'] ?? 0),
                'status_available' => true,
            ],
            'meta' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $this->ledgers->countByAffiliate((int) $affiliate['id']),
            ],
        ];
    }

    public function mySettlements(array $user, array $filters): array
    {
        if (($user['role'] ?? null) !== 'affiliate_admin') {
            throw new ValidationException([
                'user' => 'Settlement affiliate hanya tersedia untuk level user affiliate.',
            ]);
        }

        $affiliate = $this->repository->findByUserId((int) $user['id']);

        if (! $affiliate) {
            throw new NotFoundException('Affiliate tidak ditemukan.');
        }

        $page = max(1, (int) ($filters['page'] ?? 1));
        $limit = max(1, min((int) ($filters['limit'] ?? 20), 100));
        $offset = ($page - 1) * $limit;
        $eligibleLimit = max(1, min((int) ($filters['eligible_limit'] ?? 10), 50));
        $eligibleOffset = max(0, (int) ($filters['eligible_offset'] ?? 0));

        return [
            'summary' => $this->normalizeSettlementAggregate($this->ledgers->settlementAggregateByAffiliate((int) $affiliate['id'])),
            'eligible_ledgers' => AffiliateMapper::ledgers(
                $this->ledgers->listEligibleDetailedByAffiliate((int) $affiliate['id'], $eligibleLimit, $eligibleOffset)
            ),
            'settlements' => AffiliateMapper::settlements(
                $this->settlements->listByAffiliate((int) $affiliate['id'], $limit, $offset)
            ),
            'meta' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $this->settlements->countByAffiliate((int) $affiliate['id']),
            ],
        ];
    }

    public function adminSettlements(array $user, array $filters): array
    {
        AffiliatePolicy::ensureCanManageSettlement($user);
        $page = max(1, (int) ($filters['page'] ?? 1));
        $limit = max(1, min((int) ($filters['limit'] ?? 20), 100));
        $offset = ($page - 1) * $limit;

        return [
            'settlements' => AffiliateMapper::settlements(
                $this->settlements->listAll($filters, $limit, $offset)
            ),
            'meta' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $this->settlements->countAll($filters),
            ],
        ];
    }

    public function adminLedgers(array $user, array $filters): array
    {
        AffiliatePolicy::ensureCanManageSettlement($user);
        $page = max(1, (int) ($filters['page'] ?? 1));
        $limit = max(1, min((int) ($filters['limit'] ?? 50), 100));
        $offset = ($page - 1) * $limit;

        return [
            'ledgers' => AffiliateMapper::ledgers(
                $this->ledgers->listAllDetailed($filters, $limit, $offset)
            ),
            'meta' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $this->ledgers->countAll($filters),
            ],
        ];
    }

    public function sellerCommissionRules(array $user, array $filters): array
    {
        $sellerUserId = (int) $user['id'];
        AffiliatePolicy::ensureCanManageCommission($user, $sellerUserId);

        $page = max(1, (int) ($filters['page'] ?? 1));
        $limit = max(1, min((int) ($filters['limit'] ?? 50), 100));
        $offset = ($page - 1) * $limit;
        $globalRule = $this->commissionRules->findGlobalRuleBySeller($sellerUserId);
        $overrides = $this->commissionRules->listOverridesBySeller($sellerUserId, $limit, $offset);

        return [
            'global_rule' => $globalRule ? $this->mapCommissionRule($globalRule, 'global') : null,
            'overrides' => array_map(fn (array $rule): array => $this->mapCommissionRule($rule, 'override'), $overrides),
            'meta' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $this->commissionRules->countOverridesBySeller($sellerUserId),
                'priority' => 'override_over_global',
            ],
        ];
    }

    public function upsertSellerGlobalCommissionRule(array $user, array $data): array
    {
        $sellerUserId = (int) $user['id'];
        AffiliatePolicy::ensureCanManageCommission($user, $sellerUserId);
        $normalized = $this->normalizeCommissionPayload($data, null);
        $current = $this->commissionRules->findGlobalRuleBySeller($sellerUserId);

        if ($current) {
            $this->commissionRules->update((int) $current['id'], array_merge($normalized, [
                'car_id' => null,
                'updated_at' => date('Y-m-d H:i:s'),
            ]));

            return $this->mapCommissionRule($this->requireCommissionRule((int) $current['id']), 'global');
        }

        $ruleId = $this->commissionRules->create(array_merge($normalized, [
            'seller_user_id' => $sellerUserId,
            'car_id' => null,
            'created_at' => date('Y-m-d H:i:s'),
        ]));

        return $this->mapCommissionRule($this->requireCommissionRule($ruleId), 'global');
    }

    public function createSellerCommissionOverride(array $user, array $data): array
    {
        $sellerUserId = (int) $user['id'];
        AffiliatePolicy::ensureCanManageCommission($user, $sellerUserId);
        $carId = (int) ($data['car_id'] ?? 0);
        $this->assertSellerCarExists($sellerUserId, $carId);

        if ($this->commissionRules->findOverrideByCar($sellerUserId, $carId) !== null) {
            throw new ValidationException([
                'car_id' => 'Override komisi untuk mobil ini sudah ada.',
            ]);
        }

        $ruleId = $this->commissionRules->create(array_merge($this->normalizeCommissionPayload($data, $carId), [
            'seller_user_id' => $sellerUserId,
            'car_id' => $carId,
            'created_at' => date('Y-m-d H:i:s'),
        ]));

        return $this->mapCommissionRule($this->requireCommissionRule($ruleId), 'override');
    }

    public function updateSellerCommissionOverride(array $user, int $ruleId, array $data): array
    {
        $sellerUserId = (int) $user['id'];
        AffiliatePolicy::ensureCanManageCommission($user, $sellerUserId);
        $rule = $this->requireCommissionRule($ruleId);

        if ((int) $rule['seller_user_id'] !== $sellerUserId || $rule['car_id'] === null) {
            throw new NotFoundException('Override komisi tidak ditemukan.');
        }

        $carId = (int) ($data['car_id'] ?? $rule['car_id']);
        $this->assertSellerCarExists($sellerUserId, $carId);

        $existing = $this->commissionRules->findOverrideByCar($sellerUserId, $carId, $ruleId);
        if ($existing !== null) {
            throw new ValidationException([
                'car_id' => 'Override komisi untuk mobil ini sudah ada.',
            ]);
        }

        $this->commissionRules->update($ruleId, array_merge($this->normalizeCommissionPayload($data, $carId), [
            'car_id' => $carId,
            'updated_at' => date('Y-m-d H:i:s'),
        ]));

        return $this->mapCommissionRule($this->requireCommissionRule($ruleId), 'override');
    }

    /**
     * Membatalkan komisi karena transaksinya diretur showroom.
     *
     * Menolak bila komisi sudah `paid_out`: uangnya sudah keluar lewat
     * settlement, jadi membatalkan ledger di sini akan membuat pembukuan tidak
     * cocok. Admin harus membatalkan batch-nya lebih dulu.
     */
    public function voidCommissionForReturnedTransaction(array $transaction, string $reason): ?array
    {
        $transactionId = (int) ($transaction['id'] ?? 0);
        if ($transactionId <= 0) {
            return null;
        }

        $ledger = $this->ledgers->findAccrualByTransactionId($transactionId);
        if (! $ledger) {
            return null;
        }

        $statusSekarang = (string) ($ledger['ledger_status'] ?? '');

        if ($statusSekarang === 'voided') {
            return AffiliateMapper::ledger($ledger);
        }

        if ($statusSekarang === 'paid_out') {
            throw new ValidationException([
                'commission_ledger' => 'Komisi transaksi ini sudah dibayarkan lewat settlement. '
                    . 'Batalkan batch settlement-nya lebih dulu sebelum meretur.',
            ]);
        }

        $this->ledgers->updateStatusesByIds([(int) $ledger['id']], 'voided', null, $reason);
        $this->ledgers->syncAffiliateAggregate((int) $ledger['affiliate_id']);

        return AffiliateMapper::ledger($this->ledgers->findById((int) $ledger['id']) ?? $ledger);
    }

    public function accrueCommissionForPaidTransaction(array $transaction): ?array
    {
        $transactionId = (int) ($transaction['id'] ?? 0);
        $affiliateId = isset($transaction['affiliate_id']) ? (int) $transaction['affiliate_id'] : 0;

        // Booking Fee menutup kewajiban bayar, jadi komisi terbit di `dp_paid`.
        // `paid` tetap diterima untuk transaksi lunas lama.
        $statusFinal = ['dp_paid', 'paid'];

        if ($transactionId <= 0 || $affiliateId <= 0
            || ! in_array($transaction['transaction_status'] ?? null, $statusFinal, true)) {
            return null;
        }

        $existing = $this->ledgers->findAccrualByTransactionId($transactionId);
        if ($existing) {
            $this->notifyCommissionAccrued($existing, $transaction);
            return AffiliateMapper::ledger($existing);
        }

        $rule = $this->resolveEffectiveCommissionRule((int) $transaction['seller_user_id'], (int) $transaction['car_id']);
        if ($rule === null) {
            return null;
        }

        $baseAmount = (float) ($transaction['car_price'] ?? 0);
        if ($baseAmount <= 0) {
            return null;
        }

        $commissionAmount = $this->calculateCommissionAmount($rule, $baseAmount);
        if ($commissionAmount <= 0) {
            return null;
        }

        $now = date('Y-m-d H:i:s');
        $startedTransaction = ! $this->pdo->inTransaction();

        try {
            if ($startedTransaction) {
                $this->pdo->beginTransaction();
            }
            $ledgerId = $this->ledgers->create([
                'affiliate_id' => $affiliateId,
                'affiliate_user_id' => isset($transaction['affiliate_user_id']) && $transaction['affiliate_user_id'] !== null
                    ? (int) $transaction['affiliate_user_id']
                    : (int) ($this->repository->findById($affiliateId)['user_id'] ?? 0),
                'transaction_id' => $transactionId,
                'seller_user_id' => (int) $transaction['seller_user_id'],
                'showroom_id' => isset($transaction['showroom_id']) && $transaction['showroom_id'] !== null
                    ? (int) $transaction['showroom_id']
                    : null,
                'buyer_user_id' => isset($transaction['buyer_user_id']) ? (int) $transaction['buyer_user_id'] : null,
                'source_type' => 'transaction',
                'source_id' => (string) $transactionId,
                'entry_type' => 'accrual',
                'rule_source' => $rule['car_id'] === null ? 'global' : 'car_override',
                'commission_type' => $rule['commission_type'],
                'commission_value_snapshot' => $rule['commission_type'] === 'percent'
                    ? (float) $rule['commission_percent']
                    : (float) $rule['commission_flat'],
                'base_amount' => $baseAmount,
                'commission_amount' => $commissionAmount,
                'amount' => $commissionAmount,
                'currency' => 'IDR',
                'ledger_status' => 'accrued',
                'status_reason' => 'transaction_paid',
                'settlement_id' => null,
                'finality_event' => 'paid',
                'accrued_at' => $now,
                'notes' => sprintf(
                    'Accrued automatically when transaction %s reached %s.',
                    $transaction['transaction_code'] ?? ('#' . $transactionId),
                    $transaction['transaction_status'] ?? 'paid'
                ),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $this->ledgers->syncAffiliateAggregate($affiliateId);
            if ($startedTransaction) {
                $this->pdo->commit();
            }
        } catch (Throwable $exception) {
            if ($startedTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        $ledger = $this->ledgers->findById($ledgerId);
        if ($ledger) {
            $this->notifyCommissionAccrued($ledger, $transaction);
        }

        return AffiliateMapper::ledger($ledger);
    }

    public function createSettlementBatch(array $user, array $data): array
    {
        AffiliatePolicy::ensureCanManageSettlement($user);
        $affiliateId = (int) $data['affiliate_id'];
        $affiliate = $this->requireAffiliate($affiliateId);
        $ledgerIds = array_values(array_unique(array_map('intval', $data['ledger_ids'] ?? [])));
        $eligibleLedgers = $this->ledgers->findEligibleAccrualsForAffiliate($affiliateId, $ledgerIds);

        if (count($eligibleLedgers) !== count($ledgerIds)) {
            throw new ValidationException([
                'ledger_ids' => 'Sebagian ledger tidak eligible untuk settlement.',
            ]);
        }

        $requestedAmount = array_reduce(
            $eligibleLedgers,
            static fn (float $carry, array $ledger): float => $carry + (float) ($ledger['amount'] ?? 0),
            0.0
        );
        $now = date('Y-m-d H:i:s');

        try {
            $this->pdo->beginTransaction();
            $batchId = $this->settlements->createBatch([
                'settlement_code' => $this->generateSettlementCode(),
                'affiliate_id' => $affiliateId,
                'affiliate_user_id' => (int) $affiliate['user_id'],
                'requested_amount' => $requestedAmount,
                'currency' => $data['currency'] ?? 'IDR',
                'ledger_count' => count($eligibleLedgers),
                'status' => 'pending',
                'payment_method' => $data['payment_method'] ?? null,
                'payment_reference' => $data['payment_reference'] ?? null,
                'payment_note' => $data['payment_note'] ?? ($data['notes'] ?? null),
                'proof_file_url' => $data['proof_file_url'] ?? null,
                'period_start' => $data['period_start'] ?? null,
                'period_end' => $data['period_end'] ?? null,
                'requested_by' => (int) $user['id'],
                'approved_by' => null,
                'paid_by' => null,
                'cancelled_by' => null,
                'notes' => $data['notes'] ?? ($data['payment_note'] ?? null),
                'requested_at' => $now,
                'settled_at' => null,
                'cancelled_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $this->settlements->attachItems($batchId, array_map(
                static fn (array $ledger): array => [
                    'ledger_id' => (int) $ledger['id'],
                    'amount_snapshot' => (float) ($ledger['amount'] ?? 0),
                    'created_at' => $now,
                ],
                $eligibleLedgers
            ));
            $this->ledgers->updateStatusesByIds($ledgerIds, 'pending', $batchId, 'settlement_pending');
            $this->settlements->createHistory($batchId, null, 'pending', $data['payment_note'] ?? ($data['notes'] ?? null), (int) $user['id']);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return AffiliateMapper::settlement($this->settlementWithRelations($batchId));
    }

    public function updateSettlementBatchStatus(array $user, int $batchId, array $data): array
    {
        AffiliatePolicy::ensureCanManageSettlement($user);
        $batch = $this->requireSettlementBatch($batchId);
        $status = (string) $data['status'];
        $now = date('Y-m-d H:i:s');

        if (($batch['status'] ?? null) === $status) {
            return AffiliateMapper::settlement($this->settlementWithRelations($batchId));
        }

        if (($batch['status'] ?? null) !== 'pending') {
            throw new ValidationException([
                'status' => 'Hanya settlement batch pending yang boleh diubah.',
            ]);
        }

        $ledgerIds = $this->settlementLedgerIds($batchId);
        $ledgerStatus = $status === 'settled' ? 'paid_out' : 'accrued';

        try {
            $this->pdo->beginTransaction();
            $this->settlements->updateBatchStatus($batchId, [
                'status' => $status,
                'notes' => $data['notes'] ?? ($data['payment_note'] ?? ($batch['notes'] ?? null)),
                'payment_method' => $data['payment_method'] ?? ($batch['payment_method'] ?? null),
                'payment_reference' => $data['payment_reference'] ?? ($batch['payment_reference'] ?? null),
                'payment_note' => $data['payment_note'] ?? ($data['notes'] ?? ($batch['payment_note'] ?? null)),
                'proof_file_url' => $data['proof_file_url'] ?? ($batch['proof_file_url'] ?? null),
                'paid_by' => $status === 'settled' ? (int) $user['id'] : ($batch['paid_by'] ?? null),
                'cancelled_by' => $status === 'cancelled' ? (int) $user['id'] : ($batch['cancelled_by'] ?? null),
                'settled_at' => $status === 'settled' ? $now : null,
                'cancelled_at' => $status === 'cancelled' ? $now : null,
                'updated_at' => $now,
            ]);
            $this->ledgers->updateStatusesByIds(
                $ledgerIds,
                $ledgerStatus,
                $status === 'cancelled' ? null : $batchId,
                $status === 'settled' ? 'settlement_settled' : 'settlement_cancelled'
            );
            $this->settlements->createHistory($batchId, (string) $batch['status'], $status, $data['payment_note'] ?? ($data['notes'] ?? null), (int) $user['id']);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        $updated = $this->settlementWithRelations($batchId);
        if ($status === 'settled') {
            $this->notifySettlementPaid($updated);
        }

        return AffiliateMapper::settlement($updated);
    }

    public function settlementDetail(array $user, int $batchId): array
    {
        $batch = $this->settlementWithRelations($batchId);

        if (($user['role'] ?? null) === 'affiliate_admin') {
            $affiliate = $this->repository->findByUserId((int) $user['id']);
            if (! $affiliate || (int) $affiliate['id'] !== (int) $batch['affiliate_id']) {
                throw new NotFoundException('Settlement affiliate tidak ditemukan.');
            }
        } else {
            AffiliatePolicy::ensureCanManageSettlement($user);
        }

        return AffiliateMapper::settlement($batch);
    }

    private function ensureValidUsers(int $affiliateUserId, int $sellerUserId): void
    {
        $affiliateUser = $this->repository->findUser($affiliateUserId);
        $sellerUser = $this->repository->findUser($sellerUserId);

        if (! $affiliateUser) {
            throw new ValidationException(['user_id' => 'Affiliate user not found.']);
        }

        if (! $sellerUser || ($sellerUser['role'] ?? null) !== 'seller') {
            throw new ValidationException(['seller_user_id' => 'Seller user is invalid.']);
        }
    }

    private function requireAffiliate(int $affiliateId): array
    {
        $affiliate = $this->repository->findById($affiliateId);

        if (! $affiliate) {
            throw new NotFoundException('Affiliate tidak ditemukan.');
        }

        return $affiliate;
    }

    private function notifyCommissionAccrued(array $ledger, array $transaction): void
    {
        if ($this->notificationService === null) {
            return;
        }

        $affiliateId = (int) ($ledger['affiliate_id'] ?? 0);
        if ($affiliateId <= 0) {
            return;
        }

        $affiliate = $this->repository->findById($affiliateId);
        if (! $affiliate) {
            return;
        }

        $this->notificationService->createCommissionAccruedNotification($ledger, $affiliate, $transaction);
    }

    private function notifySettlementPaid(array $settlement): void
    {
        if ($this->notificationService === null) {
            return;
        }

        $affiliateId = (int) ($settlement['affiliate_id'] ?? 0);
        if ($affiliateId <= 0) {
            return;
        }

        $affiliate = $this->repository->findById($affiliateId);
        if (! $affiliate) {
            return;
        }

        $this->notificationService->createSettlementPaidNotification($settlement, $affiliate);
    }

    private function requireCommissionRule(int $ruleId): array
    {
        $rule = $this->commissionRules->findById($ruleId);

        if (! $rule) {
            throw new NotFoundException('Rule komisi tidak ditemukan.');
        }

        return $rule;
    }

    private function requireSettlementBatch(int $batchId): array
    {
        $batch = $this->settlements->findBatchById($batchId);

        if (! $batch) {
            throw new NotFoundException('Settlement affiliate tidak ditemukan.');
        }

        return $batch;
    }

    private function settlementWithRelations(int $batchId): array
    {
        $batch = $this->requireSettlementBatch($batchId);
        $batch['items'] = $this->settlements->itemsByBatch($batchId);
        $batch['histories'] = $this->settlements->historiesByBatch($batchId);
        $batch['ledger_ids'] = array_map(
            static fn (array $item): int => (int) $item['ledger_id'],
            $batch['items']
        );

        return $batch;
    }

    private function generateReferralCode(?string $prefix = null): string
    {
        $base = $prefix ? $this->normalizeCode($prefix) : 'ref';

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $code = substr($base, 0, 20) . '-' . strtolower(bin2hex(random_bytes(3)));

            if (! $this->repository->referralCodeExists($code)) {
                return $code;
            }
        }

        throw new ValidationException(['referral_code' => 'Unable to generate unique referral code.']);
    }

    private function generateSettlementCode(): string
    {
        return 'AFS-' . date('Ymd-His') . '-' . strtoupper(bin2hex(random_bytes(3)));
    }

    private function normalizeCode(string $referralCode): string
    {
        return strtolower(trim($referralCode));
    }

    private function assertReferralCodeFormat(string $referralCode): void
    {
        if ($referralCode === '' || ! preg_match('/^[a-z0-9_-]+$/', $referralCode)) {
            throw new ValidationException([
                'referral_code' => 'Referral code may only contain letters, numbers, underscore, and dash.',
            ]);
        }
    }

    private function normalizeCommissionPayload(array $data, ?int $carId): array
    {
        $type = (string) ($data['commission_type'] ?? 'flat');
        $value = (float) ($data['commission_value'] ?? 0);

        if ($type === 'percent' && $value > 100) {
            throw new ValidationException([
                'commission_value' => 'Nilai komisi persen harus antara 0 dan 100.',
            ]);
        }

        return [
            'car_id' => $carId,
            'commission_type' => $type,
            'commission_percent' => $type === 'percent' ? $value : 0,
            'commission_flat' => $type === 'flat' ? $value : 0,
            'status' => ($data['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active',
        ];
    }

    private function assertSellerCarExists(int $sellerUserId, int $carId): void
    {
        if ($carId <= 0 || $this->commissionRules->findSellerCar($sellerUserId, $carId) === null) {
            throw new ValidationException([
                'car_id' => 'Mobil seller tidak ditemukan.',
            ]);
        }
    }

    private function resolveEffectiveCommissionRule(int $sellerUserId, int $carId): ?array
    {
        $override = $this->commissionRules->findOverrideByCar($sellerUserId, $carId, null, true);
        if ($override !== null) {
            return $override;
        }

        return $this->commissionRules->findGlobalRuleBySeller($sellerUserId, true);
    }

    private function calculateCommissionAmount(array $rule, float $baseAmount): float
    {
        if (($rule['commission_type'] ?? null) === 'percent') {
            return round($baseAmount * ((float) ($rule['commission_percent'] ?? 0) / 100), 2);
        }

        return round((float) ($rule['commission_flat'] ?? 0), 2);
    }

    private function settlementLedgerIds(int $batchId): array
    {
        return $this->settlements->ledgerIdsByBatch($batchId);
    }

    private function normalizeSettlementAggregate(array $aggregate): array
    {
        return [
            'total_accrued_commission' => (float) ($aggregate['total_accrued_commission'] ?? 0),
            'total_unsettled_commission' => (float) ($aggregate['total_unsettled_commission'] ?? 0),
            'total_settled_commission' => (float) ($aggregate['total_settled_commission'] ?? 0),
            'eligible_ledger_count' => (int) ($aggregate['eligible_ledger_count'] ?? 0),
            'pending_settlement_total' => (float) ($aggregate['pending_settlement_total'] ?? 0),
        ];
    }

    private function mapCommissionRule(array $rule, string $priority): array
    {
        return [
            'id' => (int) $rule['id'],
            'seller_user_id' => (int) $rule['seller_user_id'],
            'car_id' => isset($rule['car_id']) && $rule['car_id'] !== null ? (int) $rule['car_id'] : null,
            'scope' => $rule['car_id'] === null ? 'global' : 'car_override',
            'priority' => $priority,
            'commission_type' => $rule['commission_type'],
            'commission_value' => $rule['commission_type'] === 'percent'
                ? (float) $rule['commission_percent']
                : (float) $rule['commission_flat'],
            'commission_percent' => (float) ($rule['commission_percent'] ?? 0),
            'commission_flat' => (float) ($rule['commission_flat'] ?? 0),
            'status' => $rule['status'],
            'created_at' => $rule['created_at'] ?? null,
            'updated_at' => $rule['updated_at'] ?? null,
            'car' => isset($rule['car_id']) && $rule['car_id'] !== null
                ? [
                    'id' => (int) $rule['car_id'],
                    'brand_name' => $rule['brand_name'] ?? null,
                    'model_name' => $rule['model_name'] ?? null,
                    'sub_model_name' => $rule['sub_model_name'] ?? null,
                    'listing_status' => $rule['listing_status'] ?? null,
                    'price_cash' => isset($rule['price_cash']) ? (int) $rule['price_cash'] : null,
                ]
                : null,
        ];
    }
}
