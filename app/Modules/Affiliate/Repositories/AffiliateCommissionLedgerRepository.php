<?php

declare(strict_types=1);

namespace App\Modules\Affiliate\Repositories;

use PDO;

class AffiliateCommissionLedgerRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function create(array $data): int
    {
        $data += [
            'affiliate_user_id' => null,
            'seller_user_id' => null,
            'showroom_id' => null,
            'buyer_user_id' => null,
            'source_type' => null,
            'source_id' => null,
            'rule_source' => null,
            'commission_type' => null,
            'commission_value_snapshot' => null,
            'base_amount' => null,
            'commission_amount' => $data['amount'] ?? 0,
            'currency' => 'IDR',
            'ledger_status' => null,
            'status_reason' => null,
            'settlement_id' => null,
            'finality_event' => null,
            'accrued_at' => null,
            'pending_at' => null,
            'paid_out_at' => null,
            'voided_at' => null,
            'notes' => null,
            'updated_at' => null,
        ];

        $stmt = $this->pdo->prepare(
            'INSERT INTO affiliate_commission_ledgers
                (affiliate_id, affiliate_user_id, transaction_id, seller_user_id, showroom_id,
                 buyer_user_id, source_type, source_id,
                 entry_type, rule_source, commission_type, commission_value_snapshot,
                 base_amount, commission_amount, amount, currency, ledger_status, status_reason,
                 settlement_id, finality_event, accrued_at, pending_at, paid_out_at, voided_at,
                 notes, created_at, updated_at, deleted_at)
             VALUES
                (:affiliate_id, :affiliate_user_id, :transaction_id, :seller_user_id, :showroom_id,
                 :buyer_user_id, :source_type, :source_id,
                 :entry_type, :rule_source, :commission_type, :commission_value_snapshot,
                 :base_amount, :commission_amount, :amount, :currency, :ledger_status, :status_reason,
                 :settlement_id, :finality_event, :accrued_at, :pending_at, :paid_out_at, :voided_at,
                 :notes, :created_at, :updated_at, NULL)'
        );
        $stmt->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    public function findById(int $ledgerId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, affiliate_id, transaction_id, seller_user_id, showroom_id,
                    entry_type, rule_source, commission_type, commission_value_snapshot,
                    base_amount, commission_amount, amount, ledger_status, finality_event,
                    notes, created_at, updated_at
             FROM affiliate_commission_ledgers
             WHERE id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $ledgerId]);
        $ledger = $stmt->fetch();

        return $ledger ?: null;
    }

    public function listByAffiliate(int $affiliateId, int $limit, int $offset): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, affiliate_id, transaction_id, seller_user_id, showroom_id,
                    entry_type, rule_source, commission_type, commission_value_snapshot,
                    base_amount, commission_amount, amount, ledger_status, finality_event,
                    notes, created_at, updated_at
             FROM affiliate_commission_ledgers
             WHERE affiliate_id = :affiliate_id
             ORDER BY created_at DESC, id DESC
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':affiliate_id', $affiliateId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function listDetailedByAffiliate(int $affiliateId, int $limit, int $offset): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT l.id, l.affiliate_id, l.transaction_id, l.seller_user_id, l.showroom_id,
                    l.entry_type, l.rule_source, l.commission_type, l.commission_value_snapshot,
                    l.base_amount, l.commission_amount, l.amount, l.ledger_status, l.finality_event,
                    l.notes, l.created_at, l.updated_at,
                    t.transaction_code, t.payment_type, t.transaction_status, t.car_price,
                    c.id AS car_id, c.brand_name, c.model_name, c.sub_model_name,
                    seller.name AS seller_name, seller.email AS seller_email,
                    sh.name AS showroom_name
             FROM affiliate_commission_ledgers AS l
             LEFT JOIN transactions AS t ON t.id = l.transaction_id AND t.deleted_at IS NULL
             LEFT JOIN cars AS c ON c.id = t.car_id AND c.deleted_at IS NULL
             LEFT JOIN users AS seller ON seller.id = l.seller_user_id AND seller.deleted_at IS NULL
             LEFT JOIN showrooms AS sh ON sh.id = l.showroom_id AND sh.deleted_at IS NULL
             WHERE l.affiliate_id = :affiliate_id
             ORDER BY l.created_at DESC, l.id DESC
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':affiliate_id', $affiliateId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function countByAffiliate(int $affiliateId): int
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) AS total FROM affiliate_commission_ledgers WHERE affiliate_id = :affiliate_id'
        );
        $stmt->execute(['affiliate_id' => $affiliateId]);

        return (int) ($stmt->fetch()['total'] ?? 0);
    }

    public function aggregateByAffiliate(int $affiliateId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT
                COUNT(DISTINCT CASE WHEN entry_type = \'accrual\' AND transaction_id IS NOT NULL THEN transaction_id END) AS total_transactions,
                COALESCE(SUM(CASE
                    WHEN entry_type IN (\'accrual\', \'adjustment\') THEN amount
                    WHEN entry_type = \'payout\' THEN -amount
                    ELSE 0
                END), 0) AS total_commission,
                COALESCE(SUM(CASE
                    WHEN ledger_status IN (\'accrued\', \'paid_out\') THEN amount
                    ELSE 0
                END), 0) AS confirmed_total,
                COALESCE(SUM(CASE
                    WHEN ledger_status = \'pending\' THEN amount
                    ELSE 0
                END), 0) AS pending_total
             FROM affiliate_commission_ledgers
             WHERE affiliate_id = :affiliate_id'
        );
        $stmt->execute(['affiliate_id' => $affiliateId]);

        return $stmt->fetch() ?: [
            'total_transactions' => 0,
            'total_commission' => '0.00',
            'confirmed_total' => '0.00',
            'pending_total' => '0.00',
        ];
    }

    public function settlementAggregateByAffiliate(int $affiliateId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT
                COALESCE(SUM(CASE WHEN entry_type = \'accrual\' THEN amount ELSE 0 END), 0) AS total_accrued_commission,
                COALESCE(SUM(CASE WHEN entry_type = \'accrual\' AND ledger_status IN (\'accrued\', \'pending\') THEN amount ELSE 0 END), 0) AS total_unsettled_commission,
                COALESCE(SUM(CASE WHEN entry_type = \'accrual\' AND ledger_status = \'paid_out\' THEN amount ELSE 0 END), 0) AS total_settled_commission,
                COUNT(CASE WHEN entry_type = \'accrual\' AND ledger_status = \'accrued\' THEN 1 END) AS eligible_ledger_count,
                COALESCE(SUM(CASE WHEN entry_type = \'accrual\' AND ledger_status = \'pending\' THEN amount ELSE 0 END), 0) AS pending_settlement_total
             FROM affiliate_commission_ledgers
             WHERE affiliate_id = :affiliate_id'
        );
        $stmt->execute(['affiliate_id' => $affiliateId]);

        return $stmt->fetch() ?: [
            'total_accrued_commission' => '0.00',
            'total_unsettled_commission' => '0.00',
            'total_settled_commission' => '0.00',
            'eligible_ledger_count' => 0,
            'pending_settlement_total' => '0.00',
        ];
    }

    public function findAccrualByTransactionId(int $transactionId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, affiliate_id, transaction_id, seller_user_id, showroom_id,
                    entry_type, rule_source, commission_type, commission_value_snapshot,
                    base_amount, commission_amount, amount, ledger_status, finality_event,
                    notes, created_at, updated_at
             FROM affiliate_commission_ledgers
             WHERE transaction_id = :transaction_id
             AND entry_type = \'accrual\'
             ORDER BY id DESC
             LIMIT 1'
        );
        $stmt->execute(['transaction_id' => $transactionId]);
        $ledger = $stmt->fetch();

        return $ledger ?: null;
    }

    public function listEligibleDetailedByAffiliate(int $affiliateId, int $limit, int $offset): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT l.id, l.affiliate_id, l.transaction_id, l.seller_user_id, l.showroom_id,
                    l.entry_type, l.rule_source, l.commission_type, l.commission_value_snapshot,
                    l.base_amount, l.commission_amount, l.amount, l.ledger_status, l.finality_event,
                    l.notes, l.created_at, l.updated_at,
                    t.transaction_code, t.payment_type, t.transaction_status,
                    c.id AS car_id, c.brand_name, c.model_name, c.sub_model_name,
                    seller.name AS seller_name, seller.email AS seller_email,
                    sh.name AS showroom_name
             FROM affiliate_commission_ledgers AS l
             LEFT JOIN transactions AS t ON t.id = l.transaction_id AND t.deleted_at IS NULL
             LEFT JOIN cars AS c ON c.id = t.car_id AND c.deleted_at IS NULL
             LEFT JOIN users AS seller ON seller.id = l.seller_user_id AND seller.deleted_at IS NULL
             LEFT JOIN showrooms AS sh ON sh.id = l.showroom_id AND sh.deleted_at IS NULL
             WHERE l.affiliate_id = :affiliate_id
             AND l.entry_type = \'accrual\'
             AND l.ledger_status = \'accrued\'
             ORDER BY l.created_at DESC, l.id DESC
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':affiliate_id', $affiliateId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function findEligibleAccrualsForAffiliate(int $affiliateId, array $ledgerIds): array
    {
        if ($ledgerIds === []) {
            return [];
        }

        $placeholders = implode(', ', array_fill(0, count($ledgerIds), '?'));
        $params = array_merge([$affiliateId], array_map('intval', $ledgerIds));
        $stmt = $this->pdo->prepare(
            'SELECT id, affiliate_id, transaction_id, seller_user_id, showroom_id,
                    entry_type, rule_source, commission_type, commission_value_snapshot,
                    base_amount, commission_amount, amount, ledger_status, finality_event,
                    notes, created_at, updated_at
             FROM affiliate_commission_ledgers
             WHERE affiliate_id = ?
             AND entry_type = \'accrual\'
             AND ledger_status = \'accrued\'
             AND id IN (' . $placeholders . ')'
        );
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    public function updateStatusesByIds(array $ledgerIds, string $status, ?int $settlementId = null, ?string $reason = null): void
    {
        if ($ledgerIds === []) {
            return;
        }

        $now = date('Y-m-d H:i:s');
        $timestampField = null;
        if ($status === 'accrued') {
            $timestampField = 'accrued_at';
        } elseif ($status === 'pending') {
            $timestampField = 'pending_at';
        } elseif ($status === 'paid_out') {
            $timestampField = 'paid_out_at';
        } elseif ($status === 'voided') {
            $timestampField = 'voided_at';
        }
        $sets = [
            'ledger_status = ?',
            'status_reason = ?',
            'settlement_id = ?',
            'updated_at = ?',
        ];
        $params = [$status, $reason, $settlementId, $now];

        if ($timestampField !== null) {
            $sets[] = $timestampField . ' = ?';
            $params[] = $now;
        }

        $placeholders = implode(', ', array_fill(0, count($ledgerIds), '?'));
        $params = array_merge($params, array_map('intval', $ledgerIds));
        $stmt = $this->pdo->prepare(
            'UPDATE affiliate_commission_ledgers
             SET ' . implode(', ', $sets) . '
             WHERE id IN (' . $placeholders . ')'
        );
        $stmt->execute($params);
    }

    public function listAllDetailed(array $filters, int $limit, int $offset): array
    {
        [$where, $params] = $this->adminWhere($filters);
        $stmt = $this->pdo->prepare(
            'SELECT l.id, l.affiliate_id, l.affiliate_user_id, l.transaction_id, l.seller_user_id, l.showroom_id,
                    l.buyer_user_id, l.source_type, l.source_id,
                    l.entry_type, l.rule_source, l.commission_type, l.commission_value_snapshot,
                    l.base_amount, l.commission_amount, l.amount, l.currency, l.ledger_status, l.status_reason,
                    l.settlement_id, l.finality_event, l.accrued_at, l.pending_at, l.paid_out_at, l.voided_at,
                    l.notes, l.created_at, l.updated_at,
                    t.transaction_code, t.payment_type, t.transaction_status, t.car_price,
                    c.id AS car_id, c.brand_name, c.model_name, c.sub_model_name,
                    seller.name AS seller_name, seller.email AS seller_email,
                    sh.name AS showroom_name,
                    a.referral_code, affiliate_user.name AS affiliate_name, affiliate_user.email AS affiliate_email
             FROM affiliate_commission_ledgers AS l
             INNER JOIN affiliates AS a ON a.id = l.affiliate_id AND a.deleted_at IS NULL
             INNER JOIN users AS affiliate_user ON affiliate_user.id = a.user_id AND affiliate_user.deleted_at IS NULL
             LEFT JOIN transactions AS t ON t.id = l.transaction_id AND t.deleted_at IS NULL
             LEFT JOIN cars AS c ON c.id = t.car_id AND c.deleted_at IS NULL
             LEFT JOIN users AS seller ON seller.id = l.seller_user_id AND seller.deleted_at IS NULL
             LEFT JOIN showrooms AS sh ON sh.id = l.showroom_id AND sh.deleted_at IS NULL
             WHERE ' . implode(' AND ', $where) . '
             ORDER BY l.created_at DESC, l.id DESC
             LIMIT :limit OFFSET :offset'
        );

        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function countAll(array $filters = []): int
    {
        [$where, $params] = $this->adminWhere($filters);
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) AS total
             FROM affiliate_commission_ledgers AS l
             INNER JOIN affiliates AS a ON a.id = l.affiliate_id AND a.deleted_at IS NULL
             LEFT JOIN transactions AS t ON t.id = l.transaction_id AND t.deleted_at IS NULL
             WHERE ' . implode(' AND ', $where)
        );
        $stmt->execute($params);

        return (int) ($stmt->fetch()['total'] ?? 0);
    }

    public function syncAffiliateAggregate(int $affiliateId): void
    {
        $aggregate = $this->aggregateByAffiliate($affiliateId);
        $stmt = $this->pdo->prepare(
            'UPDATE affiliates
             SET total_transactions = :total_transactions,
                 total_commission = :total_commission,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );
        $stmt->execute([
            'id' => $affiliateId,
            'total_transactions' => (int) $aggregate['total_transactions'],
            'total_commission' => (string) $aggregate['total_commission'],
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    private function adminWhere(array $filters): array
    {
        $where = ['l.deleted_at IS NULL'];
        $params = [];

        foreach ([
            'affiliate_id' => 'l.affiliate_id',
            'ledger_status' => 'l.ledger_status',
            'transaction_id' => 'l.transaction_id',
            'settlement_id' => 'l.settlement_id',
        ] as $key => $column) {
            if (isset($filters[$key]) && $filters[$key] !== '') {
                $where[] = $column . ' = :' . $key;
                $params[$key] = $filters[$key];
            }
        }

        if (isset($filters['status']) && $filters['status'] !== '') {
            $where[] = 'l.ledger_status = :status';
            $params['status'] = $filters['status'];
        }

        if (isset($filters['period_start']) && $filters['period_start'] !== '') {
            $where[] = 'DATE(l.created_at) >= :period_start';
            $params['period_start'] = $filters['period_start'];
        }

        if (isset($filters['period_end']) && $filters['period_end'] !== '') {
            $where[] = 'DATE(l.created_at) <= :period_end';
            $params['period_end'] = $filters['period_end'];
        }

        return [$where, $params];
    }
}
