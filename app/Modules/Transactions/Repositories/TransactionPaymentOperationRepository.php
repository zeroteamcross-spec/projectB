<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Repositories;

use PDO;

/** Durable, fenced journal for every outbound payment-provider operation. */
class TransactionPaymentOperationRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO transaction_payment_operations
                (transaction_id, parent_operation_id, operation_key, operation_type,
                 provider_order_id, payment_method, gross_amount, idempotency_key,
                 operation_status, provider_status, fence, lease_token, lease_expires_at,
                 first_attempt_at, request_payload_json, response_payload_json,
                 error_payload_json, late_success_at, created_at, updated_at, completed_at)
             VALUES
                (:transaction_id, :parent_operation_id, :operation_key, :operation_type,
                 :provider_order_id, :payment_method, :gross_amount, :idempotency_key,
                 :operation_status, :provider_status, :fence, :lease_token, :lease_expires_at,
                 :first_attempt_at, :request_payload_json, :response_payload_json,
                 :error_payload_json, :late_success_at, :created_at, :updated_at, :completed_at)'
        );
        $stmt->execute([
            'transaction_id' => $data['transaction_id'],
            'parent_operation_id' => $data['parent_operation_id'] ?? null,
            'operation_key' => $data['operation_key'],
            'operation_type' => $data['operation_type'],
            'provider_order_id' => $data['provider_order_id'] ?? null,
            'payment_method' => $data['payment_method'] ?? null,
            'gross_amount' => $data['gross_amount'] ?? null,
            'idempotency_key' => $data['idempotency_key'] ?? null,
            'operation_status' => $data['operation_status'],
            'provider_status' => $data['provider_status'] ?? null,
            'fence' => $data['fence'],
            'lease_token' => $data['lease_token'] ?? null,
            'lease_expires_at' => $data['lease_expires_at'] ?? null,
            'first_attempt_at' => $data['first_attempt_at'] ?? null,
            'request_payload_json' => $this->encode($data['request_payload'] ?? null),
            'response_payload_json' => $this->encode($data['response_payload'] ?? null),
            'error_payload_json' => $this->encode($data['error_payload'] ?? null),
            'late_success_at' => $data['late_success_at'] ?? null,
            'created_at' => $data['created_at'],
            'updated_at' => $data['updated_at'] ?? $data['created_at'],
            'completed_at' => $data['completed_at'] ?? null,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function assertAvailable(): void
    {
        $this->pdo->query('SELECT 1 FROM transaction_payment_operations LIMIT 0');
    }

    public function findById(int $id, bool $forUpdate = false): ?array
    {
        $suffix = $forUpdate && $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : '';
        $stmt = $this->pdo->prepare(
            'SELECT * FROM transaction_payment_operations WHERE id = :id LIMIT 1' . $suffix
        );
        $stmt->execute(['id' => $id]);
        $operation = $stmt->fetch(PDO::FETCH_ASSOC);

        return $operation ?: null;
    }

    public function latestSession(int $transactionId, string $operationType): ?array
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM transaction_payment_operations
             WHERE transaction_id = :transaction_id AND operation_type = :operation_type
             ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute(['transaction_id' => $transactionId, 'operation_type' => $operationType]);
        $operation = $stmt->fetch(PDO::FETCH_ASSOC);

        return $operation ?: null;
    }

    public function findByOperationKey(int $transactionId, string $operationKey, bool $forUpdate = false): ?array
    {
        $suffix = $forUpdate && $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : '';
        $stmt = $this->pdo->prepare(
            'SELECT * FROM transaction_payment_operations
             WHERE transaction_id = :transaction_id AND operation_key = :operation_key
             LIMIT 1' . $suffix
        );
        $stmt->execute([
            'transaction_id' => $transactionId,
            'operation_key' => $operationKey,
        ]);
        $operation = $stmt->fetch(PDO::FETCH_ASSOC);

        return $operation ?: null;
    }

    public function sessions(int $transactionId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM transaction_payment_operations
             WHERE transaction_id = :transaction_id
             AND operation_type IN ('initial_session', 'completion_session', 'legacy_session')
             ORDER BY id ASC"
        );
        $stmt->execute(['transaction_id' => $transactionId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function sessionsForOrder(int $transactionId, string $providerOrderId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM transaction_payment_operations
             WHERE transaction_id = :transaction_id
             AND provider_order_id = :provider_order_id
             AND operation_type IN ('initial_session', 'completion_session', 'legacy_session')
             ORDER BY id ASC"
        );
        $stmt->execute([
            'transaction_id' => $transactionId,
            'provider_order_id' => $providerOrderId,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function statusChecksForOrder(int $transactionId, string $providerOrderId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM transaction_payment_operations
             WHERE transaction_id = :transaction_id
             AND provider_order_id = :provider_order_id
             AND operation_type = 'status_check'
             ORDER BY id DESC"
        );
        $stmt->execute([
            'transaction_id' => $transactionId,
            'provider_order_id' => $providerOrderId,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findSessionByOrderId(string $providerOrderId): ?array
    {
        $resolution = $this->resolveSessionByOrderId($providerOrderId);

        return $resolution['status'] === 'unique' ? $resolution['operation'] : null;
    }

    /**
     * Resolve a session order without arbitrarily choosing between transactions.
     * Multiple operation rows for one transaction remain a unique owner; callers
     * receive that transaction's latest session row for the order ID.
     *
     * @return array{status: 'not_found'|'unique'|'ambiguous', transaction_id: ?int, operation: ?array}
     */
    public function resolveSessionByOrderId(string $providerOrderId): array
    {
        $providerOrderId = trim($providerOrderId);
        if ($providerOrderId === '') {
            return ['status' => 'not_found', 'transaction_id' => null, 'operation' => null];
        }

        $stmt = $this->pdo->prepare(
            "SELECT DISTINCT transaction_id
             FROM transaction_payment_operations
             WHERE provider_order_id = :provider_order_id
             AND operation_type IN ('initial_session', 'completion_session', 'legacy_session')
             ORDER BY transaction_id ASC"
        );
        $stmt->execute(['provider_order_id' => $providerOrderId]);
        $transactionIds = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));

        if ($transactionIds === []) {
            return ['status' => 'not_found', 'transaction_id' => null, 'operation' => null];
        }

        if (count($transactionIds) !== 1) {
            return ['status' => 'ambiguous', 'transaction_id' => null, 'operation' => null];
        }

        $operationStmt = $this->pdo->prepare(
            "SELECT * FROM transaction_payment_operations
             WHERE transaction_id = :transaction_id
             AND provider_order_id = :provider_order_id
             AND operation_type IN ('initial_session', 'completion_session', 'legacy_session')
             ORDER BY id DESC LIMIT 1"
        );
        $operationStmt->execute([
            'transaction_id' => $transactionIds[0],
            'provider_order_id' => $providerOrderId,
        ]);
        $operation = $operationStmt->fetch(PDO::FETCH_ASSOC);

        return [
            'status' => $operation ? 'unique' : 'not_found',
            'transaction_id' => $operation ? $transactionIds[0] : null,
            'operation' => $operation ?: null,
        ];
    }

    public function knownOrderIds(int $transactionId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT DISTINCT provider_order_id FROM transaction_payment_operations
             WHERE transaction_id = :transaction_id
             AND operation_type IN ('initial_session', 'completion_session', 'legacy_session')
             AND provider_order_id IS NOT NULL AND provider_order_id <> ''"
        );
        $stmt->execute(['transaction_id' => $transactionId]);

        return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    public function nextFence(int $transactionId): int
    {
        $stmt = $this->pdo->prepare(
            'SELECT COALESCE(MAX(fence), 0) + 1 FROM transaction_payment_operations WHERE transaction_id = :transaction_id'
        );
        $stmt->execute(['transaction_id' => $transactionId]);

        return (int) $stmt->fetchColumn();
    }

    public function hasActiveOfflineGate(int $transactionId, string $now): bool
    {
        $stmt = $this->pdo->prepare(
            "SELECT 1 FROM transaction_payment_operations
             WHERE transaction_id = :transaction_id
             AND operation_type = 'offline_conversion'
             AND operation_status = 'in_flight'
             AND lease_expires_at > :now LIMIT 1"
        );
        $stmt->execute(['transaction_id' => $transactionId, 'now' => $now]);

        return $stmt->fetchColumn() !== false;
    }

    /**
     * Return offline-conversion gates newest first. MySQL callers may request
     * row locks while inside a transaction; SQLite intentionally omits FOR UPDATE.
     */
    public function offlineConversionOperations(int $transactionId, bool $forUpdate = false): array
    {
        $suffix = $forUpdate && $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql'
            ? ' FOR UPDATE'
            : '';
        $stmt = $this->pdo->prepare(
            "SELECT * FROM transaction_payment_operations
             WHERE transaction_id = :transaction_id
             AND operation_type = 'offline_conversion'
             ORDER BY id DESC" . $suffix
        );
        $stmt->execute(['transaction_id' => $transactionId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Fence one expired offline-conversion lease exactly once.
     * Lease validity/shape must be checked by the service before this CAS.
     */
    public function fenceExpiredOfflineConversionGate(
        int $transactionId,
        int $id,
        string $leaseToken,
        int $fence,
        string $expectedLeaseExpiresAt,
        string $now
    ): bool {
        $stmt = $this->pdo->prepare(
            "UPDATE transaction_payment_operations
             SET operation_status = 'unknown', lease_token = NULL, lease_expires_at = NULL,
                 fence = fence + 1, updated_at = :updated_at
             WHERE transaction_id = :transaction_id AND id = :id
             AND operation_type = 'offline_conversion' AND operation_status = 'in_flight'
             AND lease_token = :expected_lease_token AND fence = :expected_fence
             AND lease_expires_at = :expected_lease_expires_at
             AND lease_expires_at <= :expired_at_limit"
        );
        $stmt->execute([
            'updated_at' => $now,
            'transaction_id' => $transactionId,
            'id' => $id,
            'expected_lease_token' => $leaseToken,
            'expected_fence' => $fence,
            'expected_lease_expires_at' => $expectedLeaseExpiresAt,
            'expired_at_limit' => $now,
        ]);

        return $stmt->rowCount() === 1;
    }

    /**
     * Renew a live parent gate only if it is still the newest gate for its transaction.
     * Call inside a transaction after locking the owning transaction and gate rows.
     */
    public function renewOfflineConversionGateLease(
        int $transactionId,
        int $id,
        string $leaseToken,
        int $fence,
        string $now,
        string $newLeaseExpiresAt
    ): bool {
        // The aggregate derived table is materialized by MySQL, allowing this
        // UPDATE to compare against the newest row from its own target table.
        $stmt = $this->pdo->prepare(
            "UPDATE transaction_payment_operations
             SET lease_expires_at = :new_lease_expires_at, updated_at = :updated_at
             WHERE transaction_id = :transaction_id AND id = :id
             AND operation_type = 'offline_conversion' AND operation_status = 'in_flight'
             AND lease_token = :expected_lease_token AND fence = :expected_fence
             AND lease_expires_at IS NOT NULL AND lease_expires_at > :lease_now
             AND :new_lease_after_now > :new_lease_now
             AND id = (
                 SELECT latest_gate.latest_id
                 FROM (
                     SELECT MAX(id) AS latest_id
                     FROM transaction_payment_operations
                     WHERE transaction_id = :latest_transaction_id
                     AND operation_type = 'offline_conversion'
                 ) AS latest_gate
             )"
        );
        $stmt->execute([
            'new_lease_expires_at' => $newLeaseExpiresAt,
            'updated_at' => $now,
            'transaction_id' => $transactionId,
            'id' => $id,
            'expected_lease_token' => $leaseToken,
            'expected_fence' => $fence,
            'lease_now' => $now,
            'new_lease_after_now' => $newLeaseExpiresAt,
            'new_lease_now' => $now,
            'latest_transaction_id' => $transactionId,
        ]);

        if ($stmt->rowCount() === 1) {
            return true;
        }

        // PDO MySQL may report changed rows rather than matched rows. A valid
        // renewal that writes the same second-resolution DATETIME can therefore
        // affect zero rows. Re-read the full CAS predicate before treating that
        // as success; this also keeps stale/superseded gates fail-closed.
        $verify = $this->pdo->prepare(
            "SELECT 1
             FROM transaction_payment_operations AS gate
             WHERE gate.transaction_id = :transaction_id AND gate.id = :id
             AND gate.operation_type = 'offline_conversion' AND gate.operation_status = 'in_flight'
             AND gate.lease_token = :expected_lease_token AND gate.fence = :expected_fence
             AND gate.lease_expires_at IS NOT NULL AND gate.lease_expires_at > :lease_now
             AND :new_lease_after_now > :new_lease_now
             AND gate.id = (
                 SELECT latest_gate.latest_id
                 FROM (
                     SELECT MAX(id) AS latest_id
                     FROM transaction_payment_operations
                     WHERE transaction_id = :latest_transaction_id
                     AND operation_type = 'offline_conversion'
                 ) AS latest_gate
             )
             LIMIT 1"
        );
        $verify->execute([
            'transaction_id' => $transactionId,
            'id' => $id,
            'expected_lease_token' => $leaseToken,
            'expected_fence' => $fence,
            'lease_now' => $now,
            'new_lease_after_now' => $newLeaseExpiresAt,
            'new_lease_now' => $now,
            'latest_transaction_id' => $transactionId,
        ]);

        return $verify->fetchColumn() !== false;
    }

    /**
     * Close a live parent gate only if no newer offline-conversion gate supersedes it.
     */
    public function closeOfflineConversionGate(
        int $transactionId,
        int $id,
        string $leaseToken,
        int $fence,
        string $now,
        string $operationStatus,
        ?string $responsePayloadJson = null,
        ?string $errorPayloadJson = null
    ): bool {
        // Keep the aggregate in a derived table for MySQL's same-table UPDATE rule.
        $stmt = $this->pdo->prepare(
            "UPDATE transaction_payment_operations
             SET operation_status = :operation_status,
                 response_payload_json = :response_payload_json,
                 error_payload_json = :error_payload_json,
                 lease_token = NULL, lease_expires_at = NULL,
                 completed_at = :completed_at, updated_at = :updated_at
             WHERE transaction_id = :transaction_id AND id = :id
             AND operation_type = 'offline_conversion' AND operation_status = 'in_flight'
             AND lease_token = :expected_lease_token AND fence = :expected_fence
             AND lease_expires_at IS NOT NULL AND lease_expires_at > :lease_now
             AND id = (
                 SELECT latest_gate.latest_id
                 FROM (
                     SELECT MAX(id) AS latest_id
                     FROM transaction_payment_operations
                     WHERE transaction_id = :latest_transaction_id
                     AND operation_type = 'offline_conversion'
                 ) AS latest_gate
             )"
        );
        $stmt->execute([
            'operation_status' => $operationStatus,
            'response_payload_json' => $responsePayloadJson,
            'error_payload_json' => $errorPayloadJson,
            'completed_at' => $now,
            'updated_at' => $now,
            'transaction_id' => $transactionId,
            'id' => $id,
            'expected_lease_token' => $leaseToken,
            'expected_fence' => $fence,
            'lease_now' => $now,
            'latest_transaction_id' => $transactionId,
        ]);

        return $stmt->rowCount() === 1;
    }

    public function hasActiveSessionCall(int $transactionId, string $now): bool
    {
        $stmt = $this->pdo->prepare(
            "SELECT 1 FROM transaction_payment_operations
             WHERE transaction_id = :transaction_id
             AND operation_type IN ('initial_session', 'completion_session')
             AND (operation_status = 'prepared'
                  OR (operation_status = 'in_flight' AND lease_expires_at > :now))
             LIMIT 1"
        );
        $stmt->execute(['transaction_id' => $transactionId, 'now' => $now]);

        return $stmt->fetchColumn() !== false;
    }

    public function claim(int $id, string $leaseToken, string $leaseExpiresAt, string $now, int $fence): bool
    {
        $stmt = $this->pdo->prepare(
            "UPDATE transaction_payment_operations
             SET operation_status = 'in_flight', lease_token = :lease_token,
                 lease_expires_at = :lease_expires_at, first_attempt_at = COALESCE(first_attempt_at, :first_attempt_now),
                 fence = :fence, updated_at = :updated_at_now
             WHERE id = :id AND operation_status IN ('prepared', 'unknown')"
        );
        $stmt->execute([
            'lease_token' => $leaseToken,
            'lease_expires_at' => $leaseExpiresAt,
            'first_attempt_now' => $now,
            'updated_at_now' => $now,
            'fence' => $fence,
            'id' => $id,
        ]);

        return $stmt->rowCount() === 1;
    }

    public function update(int $id, array $data, ?string $leaseToken = null): bool
    {
        $columns = [
            'operation_status' => 'operation_status',
            'provider_status' => 'provider_status',
            'lease_token' => 'lease_token',
            'lease_expires_at' => 'lease_expires_at',
            'response_payload_json' => 'response_payload_json',
            'error_payload_json' => 'error_payload_json',
            'late_success_at' => 'late_success_at',
            'completed_at' => 'completed_at',
            'updated_at' => 'updated_at',
            'fence' => 'fence',
        ];
        $sets = [];
        $params = ['id' => $id];
        foreach ($data as $key => $value) {
            if (! isset($columns[$key])) {
                continue;
            }
            $sets[] = $columns[$key] . ' = :' . $key;
            $params[$key] = $value;
        }
        if ($sets === []) {
            return false;
        }

        $where = ' WHERE id = :id';
        if ($leaseToken !== null) {
            $where .= ' AND lease_token = :expected_lease_token';
            $params['expected_lease_token'] = $leaseToken;
        }

        $stmt = $this->pdo->prepare('UPDATE transaction_payment_operations SET ' . implode(', ', $sets) . $where);
        $stmt->execute($params);

        return $stmt->rowCount() === 1;
    }

    public function updateWithLiveLease(
        int $id,
        string $operationType,
        string $leaseToken,
        int $fence,
        string $now,
        array $data
    ): bool {
        $columns = [
            'operation_status' => 'operation_status',
            'provider_status' => 'provider_status',
            'lease_token' => 'lease_token',
            'lease_expires_at' => 'lease_expires_at',
            'response_payload_json' => 'response_payload_json',
            'error_payload_json' => 'error_payload_json',
            'late_success_at' => 'late_success_at',
            'completed_at' => 'completed_at',
            'updated_at' => 'updated_at',
        ];
        $sets = [];
        $params = [
            'id' => $id,
            'operation_type' => $operationType,
            'expected_lease_token' => $leaseToken,
            'expected_fence' => $fence,
            'lease_now' => $now,
        ];
        foreach ($data as $key => $value) {
            if (! isset($columns[$key])) {
                continue;
            }
            $sets[] = $columns[$key] . ' = :' . $key;
            $params[$key] = $value;
        }
        if ($sets === []) {
            return false;
        }

        $stmt = $this->pdo->prepare(
            'UPDATE transaction_payment_operations SET ' . implode(', ', $sets) . '
             WHERE id = :id AND operation_type = :operation_type
             AND operation_status = \'in_flight\' AND lease_token = :expected_lease_token
             AND fence = :expected_fence AND lease_expires_at IS NOT NULL
             AND lease_expires_at > :lease_now'
        );
        $stmt->execute($params);

        return $stmt->rowCount() === 1;
    }

    public function fenceExpiredSessionLease(
        int $id,
        string $leaseToken,
        int $fence,
        string $expectedLeaseExpiresAt,
        string $now
    ): bool {
        $stmt = $this->pdo->prepare(
            "UPDATE transaction_payment_operations
             SET operation_status = 'unknown', lease_token = NULL, lease_expires_at = NULL,
                 fence = fence + 1, updated_at = :updated_at
             WHERE id = :id
             AND operation_type IN ('initial_session', 'legacy_session', 'completion_session')
             AND operation_status = 'in_flight' AND lease_token = :expected_lease_token
             AND fence = :expected_fence AND lease_expires_at = :expected_lease_expires_at
             AND lease_expires_at <= :expired_at_limit"
        );
        $stmt->execute([
            'updated_at' => $now,
            'id' => $id,
            'expected_lease_token' => $leaseToken,
            'expected_fence' => $fence,
            'expected_lease_expires_at' => $expectedLeaseExpiresAt,
            'expired_at_limit' => $now,
        ]);

        return $stmt->rowCount() === 1;
    }

    public function fenceStaleStatusCheck(
        int $id,
        string $leaseToken,
        int $fence,
        ?string $expectedLeaseExpiresAt,
        bool $leaseWasValidButExpired,
        string $now
    ): bool {
        $leaseCondition = $expectedLeaseExpiresAt === null
            ? 'lease_expires_at IS NULL'
            : 'lease_expires_at = :expected_lease_expires_at';
        if ($leaseWasValidButExpired) {
            $leaseCondition .= ' AND lease_expires_at <= :expired_at_limit';
        }
        $stmt = $this->pdo->prepare(
            "UPDATE transaction_payment_operations
             SET operation_status = 'unknown', lease_token = NULL, lease_expires_at = NULL,
                 fence = fence + 1, updated_at = :updated_at
             WHERE id = :id AND operation_type = 'status_check'
             AND operation_status = 'in_flight' AND lease_token = :expected_lease_token
             AND fence = :expected_fence AND " . $leaseCondition
        );
        $params = [
            'updated_at' => $now,
            'id' => $id,
            'expected_lease_token' => $leaseToken,
            'expected_fence' => $fence,
        ];
        if ($expectedLeaseExpiresAt !== null) {
            $params['expected_lease_expires_at'] = $expectedLeaseExpiresAt;
        }
        if ($leaseWasValidButExpired) {
            $params['expired_at_limit'] = $now;
        }
        $stmt->execute($params);

        return $stmt->rowCount() === 1;
    }

    public function recordProviderEvent(
        string $providerOrderId,
        string $providerStatus,
        bool $lateSuccess,
        bool $successValidated = false
    ): void
    {
        $providerOrderId = trim($providerOrderId);
        if ($providerOrderId === '') {
            return;
        }

        $resolution = (new TransactionRepository($this->pdo))->resolveMidtransOrderId($providerOrderId);
        if ($resolution['status'] !== 'unique' || $resolution['transaction_id'] === null) {
            return;
        }

        $this->recordProviderEventForTransaction(
            $resolution['transaction_id'],
            $providerOrderId,
            $providerStatus,
            $lateSuccess,
            $successValidated
        );
    }

    /** Update provider state only for the explicitly resolved transaction/order pair. */
    public function recordProviderEventForTransaction(
        int $transactionId,
        string $providerOrderId,
        string $providerStatus,
        bool $lateSuccess,
        bool $successValidated = false
    ): void {
        $providerOrderId = trim($providerOrderId);
        if ($transactionId < 1 || $providerOrderId === '') {
            return;
        }

        $providerStatus = strtolower(trim($providerStatus));
        $isSuccessStatus = in_array($providerStatus, ['settlement', 'capture', 'paid'], true);
        if ($isSuccessStatus && ! $successValidated) {
            $providerStatus = 'unverified_' . $providerStatus;
        }
        $lateSuccess = $lateSuccess && $isSuccessStatus && $successValidated;
        $now = date('Y-m-d H:i:s');
        $stmt = $this->pdo->prepare(
            "UPDATE transaction_payment_operations
             SET provider_status = CASE
                    WHEN LOWER(COALESCE(provider_status, '')) IN ('settlement', 'capture', 'paid') THEN provider_status
                    ELSE :provider_status
                 END,
                 late_success_at = CASE WHEN :late_success = 1 THEN COALESCE(late_success_at, :late_success_at_now) ELSE late_success_at END,
                 updated_at = :updated_at_now
             WHERE transaction_id = :transaction_id
             AND provider_order_id = :provider_order_id
             AND operation_type IN ('initial_session', 'completion_session', 'legacy_session')"
        );
        $stmt->execute([
            'transaction_id' => $transactionId,
            'provider_status' => $providerStatus,
            'late_success' => $lateSuccess ? 1 : 0,
            'late_success_at_now' => $now,
            'updated_at_now' => $now,
            'provider_order_id' => $providerOrderId,
        ]);
    }

    private function encode($value): ?string
    {
        if ($value === null) {
            return null;
        }

        return json_encode($value, JSON_UNESCAPED_SLASHES);
    }
}
