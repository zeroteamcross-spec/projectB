<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Repositories;

use PDO;

class TransactionRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function findCarForTransaction(int $carId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, seller_user_id, listing_status, brand_name, model_name,
                    showroom_id, price_cash, price_discount, price_credit, dp_amount
             FROM cars
             WHERE id = :id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $carId]);
        $car = $stmt->fetch();

        return $car ?: null;
    }

    public function findUser(int $userId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, role, name, email, account_status, is_approved
             FROM users
             WHERE id = :id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function transactionCodeExists(string $transactionCode): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT id FROM transactions WHERE transaction_code = :transaction_code LIMIT 1'
        );
        $stmt->execute(['transaction_code' => $transactionCode]);

        return (bool) $stmt->fetch();
    }

    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO transactions
                (transaction_code, buyer_user_id, seller_user_id, car_id, car_price,
                 payment_type, payment_method, dp_amount, remaining_amount, transaction_status,
                 affiliate_id, affiliate_referral_code_snapshot,
                 midtrans_order_id, midtrans_token, midtrans_redirect_url,
                 expires_at, paid_at, created_at, updated_at, deleted_at)
             VALUES
                (:transaction_code, :buyer_user_id, :seller_user_id, :car_id, :car_price,
                 :payment_type, :payment_method, :dp_amount, :remaining_amount, :transaction_status,
                 :affiliate_id, :affiliate_referral_code_snapshot,
                 :midtrans_order_id, :midtrans_token, :midtrans_redirect_url,
                 :expires_at, :paid_at, :created_at, :updated_at, NULL)'
        );
        $stmt->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare($this->baseSelect() . ' WHERE t.id = :id AND t.deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);
        $transaction = $stmt->fetch();

        return $transaction ?: null;
    }

    public function findByCode(string $transactionCode): ?array
    {
        $stmt = $this->pdo->prepare(
            $this->baseSelect() . ' WHERE t.transaction_code = :transaction_code AND t.deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute(['transaction_code' => $transactionCode]);
        $transaction = $stmt->fetch();

        return $transaction ?: null;
    }

    public function findByProviderOrderId(string $providerOrderId): ?array
    {
        $stmt = $this->pdo->prepare(
            $this->baseSelect() . '
             WHERE t.deleted_at IS NULL
             AND (
                t.midtrans_order_id = :provider_order_id_transaction
                OR EXISTS (
                    SELECT 1
                    FROM transaction_payment_logs AS logs
                    WHERE logs.transaction_id = t.id
                    AND logs.provider_order_id = :provider_order_id_log
                    LIMIT 1
                )
             )
             LIMIT 1'
        );
        $stmt->execute([
            'provider_order_id_transaction' => $providerOrderId,
            'provider_order_id_log' => $providerOrderId,
        ]);
        $transaction = $stmt->fetch();

        return $transaction ?: null;
    }

    public function list(array $filters, int $limit, int $offset): array
    {
        [$where, $params] = $this->buildWhere($filters);
        $stmt = $this->pdo->prepare($this->baseSelect() . ' ' . $where . ' ORDER BY t.created_at DESC, t.id DESC LIMIT :limit OFFSET :offset');

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function count(array $filters): int
    {
        [$where, $params] = $this->buildWhere($filters);
        $stmt = $this->pdo->prepare('SELECT COUNT(*) AS total FROM transactions AS t ' . $where);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->execute();

        return (int) ($stmt->fetch()['total'] ?? 0);
    }

    public function updateStatus(int $id, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE transactions
             SET transaction_status = :transaction_status,
                 remaining_amount = :remaining_amount,
                 paid_at = :paid_at,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );
        $data['id'] = $id;
        $stmt->execute($data);
    }

    public function markReturned(int $id, string $reason): void
    {
        $now = date('Y-m-d H:i:s');
        $stmt = $this->pdo->prepare(
            "UPDATE transactions
             SET transaction_status = 'returned',
                 returned_at = :returned_at,
                 return_reason = :return_reason,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL"
        );
        $stmt->execute([
            'id' => $id,
            'returned_at' => $now,
            'return_reason' => $reason,
            'updated_at' => $now,
        ]);
    }

    public function listStalePending(string $threshold): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, car_id, transaction_code, payment_type, car_price, dp_amount, remaining_amount,
                    transaction_status, midtrans_order_id, paid_at
             FROM transactions
             WHERE transaction_status = :transaction_status
             AND created_at <= :threshold
             AND deleted_at IS NULL
             ORDER BY expires_at ASC, id ASC'
        );
        $stmt->execute([
            'transaction_status' => 'pending_payment',
            'threshold' => $threshold,
        ]);

        return $stmt->fetchAll();
    }

    public function expirePendingByIds(array $ids, string $now): int
    {
        if ($ids === []) {
            return 0;
        }

        $placeholders = [];
        $params = [
            'next_status' => 'expired',
            'current_status' => 'pending_payment',
            'updated_at' => $now,
        ];

        foreach (array_values($ids) as $index => $id) {
            $key = 'id_' . $index;
            $placeholders[] = ':' . $key;
            $params[$key] = (int) $id;
        }

        $stmt = $this->pdo->prepare(
            'UPDATE transactions
             SET transaction_status = :next_status,
                 updated_at = :updated_at
             WHERE transaction_status = :current_status
             AND deleted_at IS NULL
             AND id IN (' . implode(', ', $placeholders) . ')'
        );
        $stmt->execute($params);

        return $stmt->rowCount();
    }

    public function publishReservedCarsByIds(array $carIds): int
    {
        if ($carIds === []) {
            return 0;
        }

        $placeholders = [];
        $params = [
            'next_status' => 'published',
            'current_status' => 'reserved',
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        foreach (array_values(array_unique($carIds)) as $index => $id) {
            $key = 'car_id_' . $index;
            $placeholders[] = ':' . $key;
            $params[$key] = (int) $id;
        }

        $stmt = $this->pdo->prepare(
            'UPDATE cars
             SET listing_status = :next_status,
                 updated_at = :updated_at
             WHERE listing_status = :current_status
             AND deleted_at IS NULL
             AND id IN (' . implode(', ', $placeholders) . ')
             AND NOT EXISTS (
                SELECT 1
                FROM transactions AS active_locks
                WHERE active_locks.car_id = cars.id
                AND active_locks.transaction_status IN (\'dp_paid\', \'paid\')
                AND active_locks.deleted_at IS NULL
                LIMIT 1
             )'
        );
        $stmt->execute($params);

        return $stmt->rowCount();
    }

    public function publishCarForCancelledTransaction(int $carId): bool
    {
        $stmt = $this->pdo->prepare(
            'UPDATE cars
             SET listing_status = :next_status,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL
             AND listing_status IN (\'reserved\', \'published\')'
        );
        $stmt->execute([
            'next_status' => 'published',
            'updated_at' => date('Y-m-d H:i:s'),
            'id' => $carId,
        ]);

        if ($stmt->rowCount() > 0) {
            return true;
        }

        $check = $this->pdo->prepare(
            'SELECT listing_status
             FROM cars
             WHERE id = :id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $check->execute(['id' => $carId]);
        $car = $check->fetch();

        return ($car['listing_status'] ?? null) === 'published';
    }

    public function findActiveLockByCarId(int $carId, int $excludeTransactionId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, transaction_code, transaction_status
             FROM transactions
             WHERE car_id = :car_id
             AND id <> :exclude_transaction_id
             AND transaction_status IN (\'dp_paid\', \'paid\')
             AND deleted_at IS NULL
             ORDER BY updated_at DESC, id DESC
             LIMIT 1'
        );
        $stmt->execute([
            'car_id' => $carId,
            'exclude_transaction_id' => $excludeTransactionId,
        ]);
        $transaction = $stmt->fetch();

        return $transaction ?: null;
    }

    public function updateCarListingStatus(int $carId, string $listingStatus, array $allowedCurrentStatuses): bool
    {
        if ($allowedCurrentStatuses === []) {
            return false;
        }

        $placeholders = [];
        $params = [
            'listing_status' => $listingStatus,
            'updated_at' => date('Y-m-d H:i:s'),
            'id' => $carId,
        ];

        foreach (array_values($allowedCurrentStatuses) as $index => $status) {
            $key = 'current_status_' . $index;
            $placeholders[] = ':' . $key;
            $params[$key] = $status;
        }

        $stmt = $this->pdo->prepare(
            'UPDATE cars
             SET listing_status = :listing_status,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL
             AND listing_status IN (' . implode(', ', $placeholders) . ')'
        );
        $stmt->execute($params);

        if ($stmt->rowCount() > 0) {
            return true;
        }

        $check = $this->pdo->prepare(
            'SELECT listing_status
             FROM cars
             WHERE id = :id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $check->execute(['id' => $carId]);
        $car = $check->fetch();

        return in_array($listingStatus, $allowedCurrentStatuses, true)
            && ($car['listing_status'] ?? null) === $listingStatus;
    }

    public function updateProviderFields(int $id, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE transactions
             SET midtrans_order_id = :midtrans_order_id,
                 midtrans_token = :midtrans_token,
                 midtrans_redirect_url = :midtrans_redirect_url,
                 expires_at = :expires_at,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );
        $data['id'] = $id;
        $stmt->execute($data);
    }

    public function updateManualTransferSubmission(int $id, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE transactions
             SET manual_transfer_proof_path = :manual_transfer_proof_path,
                 manual_transfer_note = :manual_transfer_note,
                 manual_transfer_submitted_at = :manual_transfer_submitted_at,
                 manual_transfer_rejected_at = NULL,
                 manual_transfer_rejected_reason = NULL,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );
        $data['id'] = $id;
        $stmt->execute($data);
    }

    public function updateManualTransferConfirmation(int $id, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE transactions
             SET manual_transfer_confirmed_at = :manual_transfer_confirmed_at,
                 manual_transfer_confirmed_by = :manual_transfer_confirmed_by,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );
        $data['id'] = $id;
        $stmt->execute($data);
    }

    public function updateManualTransferRejection(int $id, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE transactions
             SET manual_transfer_proof_path = NULL,
                 manual_transfer_rejected_at = :manual_transfer_rejected_at,
                 manual_transfer_rejected_reason = :manual_transfer_rejected_reason,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );
        $data['id'] = $id;
        $stmt->execute($data);
    }

    public function listFulfillmentChecklistItems(int $transactionId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, transaction_id, checklist_key, label, is_required, is_completed,
                    completed_at, completed_by_user_id, notes, sort_order, created_at, updated_at
             FROM transaction_fulfillment_checklist_items
             WHERE transaction_id = :transaction_id
             ORDER BY sort_order ASC, id ASC'
        );
        $stmt->execute(['transaction_id' => $transactionId]);

        return $stmt->fetchAll();
    }

    public function upsertFulfillmentChecklistItem(int $transactionId, array $item): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO transaction_fulfillment_checklist_items
                (transaction_id, checklist_key, label, is_required, is_completed,
                 completed_at, completed_by_user_id, notes, sort_order, created_at, updated_at)
             VALUES
                (:transaction_id, :checklist_key, :label, :is_required, :is_completed,
                 :completed_at, :completed_by_user_id, :notes, :sort_order, :created_at, :updated_at)
             ON DUPLICATE KEY UPDATE
                label = VALUES(label),
                is_required = VALUES(is_required),
                is_completed = VALUES(is_completed),
                completed_at = VALUES(completed_at),
                completed_by_user_id = VALUES(completed_by_user_id),
                notes = VALUES(notes),
                sort_order = VALUES(sort_order),
                updated_at = VALUES(updated_at)'
        );
        $stmt->execute([
            'transaction_id' => $transactionId,
            'checklist_key' => $item['checklist_key'],
            'label' => $item['label'],
            'is_required' => (int) ($item['is_required'] ?? 1),
            'is_completed' => (int) ($item['is_completed'] ?? 0),
            'completed_at' => $item['completed_at'] ?? null,
            'completed_by_user_id' => $item['completed_by_user_id'] ?? null,
            'notes' => $item['notes'] ?? null,
            'sort_order' => (int) ($item['sort_order'] ?? 0),
            'created_at' => $item['created_at'] ?? date('Y-m-d H:i:s'),
            'updated_at' => $item['updated_at'] ?? date('Y-m-d H:i:s'),
        ]);
    }

    private function baseSelect(): string
    {
        return 'SELECT t.id, t.transaction_code, t.buyer_user_id, t.seller_user_id, t.car_id,
                       t.car_price, t.payment_type, t.payment_method, t.dp_amount, t.remaining_amount,
                       t.transaction_status, t.midtrans_order_id, t.midtrans_token,
                       t.midtrans_redirect_url, t.expires_at, t.paid_at,
                       t.returned_at, t.return_reason,
                       t.manual_transfer_proof_path, t.manual_transfer_note,
                       t.manual_transfer_submitted_at, t.manual_transfer_confirmed_at,
                       t.manual_transfer_confirmed_by, t.manual_transfer_rejected_at,
                       t.manual_transfer_rejected_reason,
                       t.affiliate_id, t.affiliate_referral_code_snapshot,
                       t.created_at, t.updated_at,
                       buyer.name AS buyer_name, buyer.email AS buyer_email,
                       seller.name AS seller_name, seller.email AS seller_email,
                       cars.brand_name, cars.model_name, cars.listing_status, cars.showroom_id,
                       cover_image.file_path AS car_cover_image,
                       showroom.name AS showroom_name,
                       showroom.bank_account_number AS showroom_bank_account_number,
                       showroom.bank_type AS showroom_bank_type,
                       showroom.bank_account_name AS showroom_bank_account_name,
                       affiliate_user.name AS affiliate_name, affiliate_user.email AS affiliate_email
                FROM transactions AS t
                INNER JOIN users AS buyer ON buyer.id = t.buyer_user_id
                INNER JOIN users AS seller ON seller.id = t.seller_user_id
                INNER JOIN cars ON cars.id = t.car_id
                LEFT JOIN car_images AS cover_image ON cover_image.id = (
                    SELECT ci.id
                    FROM car_images AS ci
                    WHERE ci.car_id = cars.id
                    AND ci.deleted_at IS NULL
                    ORDER BY ci.is_cover DESC, ci.sort_order ASC, ci.id ASC
                    LIMIT 1
                )
                LEFT JOIN showrooms AS showroom ON showroom.id = cars.showroom_id
                LEFT JOIN affiliates AS affiliate ON affiliate.id = t.affiliate_id
                LEFT JOIN users AS affiliate_user ON affiliate_user.id = affiliate.user_id';
    }

    private function buildWhere(array $filters): array
    {
        $conditions = ['t.deleted_at IS NULL'];
        $params = [];

        foreach ([
            'buyer_user_id',
            'seller_user_id',
            'car_id',
            'payment_type',
            'transaction_status',
            'affiliate_id',
        ] as $field) {
            if (isset($filters[$field]) && $filters[$field] !== '') {
                $conditions[] = 't.' . $field . ' = :' . $field;
                $params[$field] = $filters[$field];
            }
        }

        if (isset($filters['transaction_code']) && $filters['transaction_code'] !== '') {
            $conditions[] = 't.transaction_code = :transaction_code';
            $params['transaction_code'] = $filters['transaction_code'];
        }

        return ['WHERE ' . implode(' AND ', $conditions), $params];
    }
}
