<?php

declare(strict_types=1);

namespace App\Modules\Affiliate\Repositories;

use PDO;

class AffiliateSettlementRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function createBatch(array $data): int
    {
        $data += [
            'settlement_code' => null,
            'affiliate_user_id' => null,
            'currency' => 'IDR',
            'payment_method' => null,
            'payment_reference' => null,
            'payment_note' => null,
            'proof_file_url' => null,
            'period_start' => null,
            'period_end' => null,
            'requested_by' => null,
            'approved_by' => null,
            'paid_by' => null,
            'cancelled_by' => null,
        ];
        $stmt = $this->pdo->prepare(
            'INSERT INTO affiliate_settlement_batches
                (settlement_code, affiliate_id, affiliate_user_id, requested_amount, currency,
                 ledger_count, status, payment_method, payment_reference, payment_note, proof_file_url,
                 period_start, period_end, requested_by, approved_by, paid_by, cancelled_by, notes,
                 requested_at, settled_at, cancelled_at, created_at, updated_at, deleted_at)
             VALUES
                (:settlement_code, :affiliate_id, :affiliate_user_id, :requested_amount, :currency,
                 :ledger_count, :status, :payment_method, :payment_reference, :payment_note, :proof_file_url,
                 :period_start, :period_end, :requested_by, :approved_by, :paid_by, :cancelled_by, :notes,
                 :requested_at, :settled_at, :cancelled_at, :created_at, :updated_at, NULL)'
        );
        $stmt->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    public function attachItems(int $batchId, array $items): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO affiliate_settlement_items
                (settlement_batch_id, ledger_id, amount_snapshot, created_at)
             VALUES
                (:settlement_batch_id, :ledger_id, :amount_snapshot, :created_at)'
        );

        foreach ($items as $item) {
            $stmt->execute([
                'settlement_batch_id' => $batchId,
                'ledger_id' => $item['ledger_id'],
                'amount_snapshot' => $item['amount_snapshot'],
                'created_at' => $item['created_at'],
            ]);
        }
    }

    public function findBatchById(int $batchId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT b.id, b.settlement_code, b.affiliate_id, b.affiliate_user_id, b.requested_amount, b.currency,
                    b.ledger_count, b.status, b.payment_method, b.payment_reference, b.payment_note, b.proof_file_url,
                    b.period_start, b.period_end, b.requested_by, b.approved_by, b.paid_by, b.cancelled_by, b.notes,
                    b.requested_at, b.settled_at, b.cancelled_at, b.created_at, b.updated_at,
                    a.referral_code, affiliate_user.name AS affiliate_name, affiliate_user.email AS affiliate_email
             FROM affiliate_settlement_batches AS b
             INNER JOIN affiliates AS a ON a.id = b.affiliate_id AND a.deleted_at IS NULL
             INNER JOIN users AS affiliate_user ON affiliate_user.id = a.user_id AND affiliate_user.deleted_at IS NULL
             WHERE b.id = :id
             AND b.deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $batchId]);
        $batch = $stmt->fetch();

        return $batch ?: null;
    }

    public function updateBatchStatus(int $batchId, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE affiliate_settlement_batches
             SET status = :status,
                 notes = :notes,
                 payment_method = :payment_method,
                 payment_reference = :payment_reference,
                 payment_note = :payment_note,
                 proof_file_url = :proof_file_url,
                 paid_by = :paid_by,
                 cancelled_by = :cancelled_by,
                 settled_at = :settled_at,
                 cancelled_at = :cancelled_at,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );
        $data['id'] = $batchId;
        $stmt->execute($data);
    }

    public function listByAffiliate(int $affiliateId, int $limit, int $offset): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, settlement_code, affiliate_id, affiliate_user_id, requested_amount, currency,
                    ledger_count, status, payment_method, payment_reference, payment_note, proof_file_url,
                    period_start, period_end, requested_by, approved_by, paid_by, cancelled_by, notes,
                    requested_at, settled_at, cancelled_at, created_at, updated_at
             FROM affiliate_settlement_batches
             WHERE affiliate_id = :affiliate_id
             AND deleted_at IS NULL
             ORDER BY requested_at DESC, id DESC
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':affiliate_id', $affiliateId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function listAll(array $filters, int $limit, int $offset): array
    {
        $conditions = ['b.deleted_at IS NULL'];
        $params = [];

        if (isset($filters['status']) && $filters['status'] !== '') {
            $conditions[] = 'b.status = :status';
            $params['status'] = $filters['status'];
        }

        $sql = 'SELECT b.id, b.settlement_code, b.affiliate_id, b.affiliate_user_id, b.requested_amount, b.currency,
                       b.ledger_count, b.status, b.payment_method, b.payment_reference, b.payment_note, b.proof_file_url,
                       b.period_start, b.period_end, b.requested_by, b.approved_by, b.paid_by, b.cancelled_by, b.notes,
                       b.requested_at, b.settled_at, b.cancelled_at, b.created_at, b.updated_at,
                       a.referral_code, affiliate_user.name AS affiliate_name, affiliate_user.email AS affiliate_email
                FROM affiliate_settlement_batches AS b
                INNER JOIN affiliates AS a ON a.id = b.affiliate_id AND a.deleted_at IS NULL
                INNER JOIN users AS affiliate_user ON affiliate_user.id = a.user_id AND affiliate_user.deleted_at IS NULL
                WHERE ' . implode(' AND ', $conditions) . '
                ORDER BY b.requested_at DESC, b.id DESC
                LIMIT :limit OFFSET :offset';

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function countByAffiliate(int $affiliateId): int
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) AS total
             FROM affiliate_settlement_batches
             WHERE affiliate_id = :affiliate_id'
        );
        $stmt->execute(['affiliate_id' => $affiliateId]);

        return (int) ($stmt->fetch()['total'] ?? 0);
    }

    public function countAll(array $filters = []): int
    {
        $conditions = ['deleted_at IS NULL'];
        $params = [];

        if (isset($filters['status']) && $filters['status'] !== '') {
            $conditions[] = 'status = :status';
            $params['status'] = $filters['status'];
        }

        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) AS total
             FROM affiliate_settlement_batches
             WHERE ' . implode(' AND ', $conditions)
        );
        $stmt->execute($params);

        return (int) ($stmt->fetch()['total'] ?? 0);
    }

    public function ledgerIdsByBatch(int $batchId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT ledger_id
             FROM affiliate_settlement_items
             WHERE settlement_batch_id = :settlement_batch_id
             ORDER BY id ASC'
        );
        $stmt->execute(['settlement_batch_id' => $batchId]);

        return array_map(
            static fn (array $row): int => (int) $row['ledger_id'],
            $stmt->fetchAll()
        );
    }

    public function itemsByBatch(int $batchId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT i.id, i.settlement_batch_id, i.ledger_id, i.amount_snapshot, i.created_at,
                    l.ledger_status, l.transaction_id, t.transaction_code
             FROM affiliate_settlement_items AS i
             INNER JOIN affiliate_commission_ledgers AS l ON l.id = i.ledger_id AND l.deleted_at IS NULL
             LEFT JOIN transactions AS t ON t.id = l.transaction_id AND t.deleted_at IS NULL
             WHERE i.settlement_batch_id = :settlement_batch_id
             ORDER BY i.id ASC'
        );
        $stmt->execute(['settlement_batch_id' => $batchId]);

        return $stmt->fetchAll();
    }

    public function createHistory(int $batchId, ?string $fromStatus, string $toStatus, ?string $note, ?int $actorUserId): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO affiliate_settlement_histories
                (settlement_id, from_status, to_status, note, actor_user_id, created_at)
             VALUES
                (:settlement_id, :from_status, :to_status, :note, :actor_user_id, :created_at)'
        );
        $stmt->execute([
            'settlement_id' => $batchId,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'note' => $note,
            'actor_user_id' => $actorUserId,
            'created_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function historiesByBatch(int $batchId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT h.id, h.settlement_id, h.from_status, h.to_status, h.note, h.actor_user_id,
                    h.created_at, actor.name AS actor_name, actor.email AS actor_email
             FROM affiliate_settlement_histories AS h
             LEFT JOIN users AS actor ON actor.id = h.actor_user_id
             WHERE h.settlement_id = :settlement_id
             ORDER BY h.created_at ASC, h.id ASC'
        );
        $stmt->execute(['settlement_id' => $batchId]);

        return $stmt->fetchAll();
    }
}
