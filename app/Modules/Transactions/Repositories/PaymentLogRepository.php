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
}
