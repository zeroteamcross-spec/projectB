<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Repositories;

use PDO;

class PaymentLogRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO transaction_payment_logs
                (transaction_id, provider_name, provider_order_id, provider_transaction_id,
                 payment_method, transaction_status, gross_amount, payload_request_json,
                 payload_response_json, payload_callback_json, logged_at, created_at)
             VALUES
                (:transaction_id, :provider_name, :provider_order_id, :provider_transaction_id,
                 :payment_method, :transaction_status, :gross_amount, :payload_request_json,
                 :payload_response_json, :payload_callback_json, :logged_at, :created_at)'
        );
        $stmt->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, transaction_id, provider_name, provider_order_id,
                    provider_transaction_id, payment_method, transaction_status,
                    gross_amount, payload_request_json, payload_response_json,
                    payload_callback_json, logged_at, created_at
             FROM transaction_payment_logs
             WHERE id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $log = $stmt->fetch();

        return $log ?: null;
    }

    public function latestByTransaction(int $transactionId, int $limit = 10): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, transaction_id, provider_name, provider_order_id,
                    provider_transaction_id, payment_method, transaction_status,
                    gross_amount, payload_request_json, payload_response_json,
                    payload_callback_json, logged_at, created_at
             FROM transaction_payment_logs
             WHERE transaction_id = :transaction_id
             ORDER BY logged_at DESC, id DESC
             LIMIT :limit'
        );
        $stmt->bindValue(':transaction_id', $transactionId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function midtransOrderIds(int $transactionId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT DISTINCT provider_order_id FROM transaction_payment_logs
             WHERE transaction_id = :transaction_id AND provider_name = 'midtrans'
             AND provider_order_id IS NOT NULL AND provider_order_id <> ''"
        );
        $stmt->execute(['transaction_id' => $transactionId]);

        return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    public function hasSuccessfulPayment(int $transactionId): bool
    {
        $stmt = $this->pdo->prepare(
            "SELECT 1 FROM transaction_payment_operations
             WHERE transaction_id = :transaction_id
             AND operation_type IN ('initial_session', 'completion_session', 'legacy_session')
             AND LOWER(COALESCE(provider_status, '')) IN ('settlement', 'capture', 'paid')
             LIMIT 1"
        );
        $stmt->execute(['transaction_id' => $transactionId]);
        if ($stmt->fetchColumn() !== false) {
            return true;
        }

        // Raw Midtrans observations are audit evidence, not verified payment
        // state. Keep application-recorded offline payments as trusted markers.
        $offlineStmt = $this->pdo->prepare(
            "SELECT 1 FROM transaction_payment_logs
             WHERE transaction_id = :transaction_id
             AND provider_name = 'offline'
             AND LOWER(transaction_status) IN ('settlement', 'capture', 'paid', 'dp_paid')
             LIMIT 1"
        );
        $offlineStmt->execute(['transaction_id' => $transactionId]);

        return $offlineStmt->fetchColumn() !== false;
    }
}
