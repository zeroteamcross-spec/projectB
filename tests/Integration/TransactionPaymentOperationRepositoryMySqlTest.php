<?php

declare(strict_types=1);

/**
 * Standalone, opt-in MySQL/InnoDB integration test for payment-operation
 * persistence, row locking, leases, and fencing. It is intentionally not part
 * of tests/run.php.
 *
 * PowerShell invocation (use a disposable MySQL server and an account allowed
 * to CREATE/DROP DATABASE):
 *   $env:PAYMENT_TEST_MYSQL_DSN = 'mysql:host=127.0.0.1;port=3306;dbname=payment_test;charset=utf8mb4'
 *   $env:PAYMENT_TEST_MYSQL_USER = 'payment_test_user'
 *   $env:PAYMENT_TEST_MYSQL_PASSWORD = '...'
 *   $env:PAYMENT_TEST_MYSQL_ISOLATED = '1'
 *   php tests/Integration/TransactionPaymentOperationRepositoryMySqlTest.php
 *
 * The DSN database is used only to open a connection and create one randomly
 * named test schema. Tables are created in that new schema, then only that
 * schema is dropped. The DSN must include an explicit port and use only
 * localhost or 127.0.0.1. The isolation acknowledgement and production-name
 * checks are required before the first connection is opened. No app DB config
 * or default credentials are read.
 */

use App\Modules\Transactions\Repositories\TransactionPaymentOperationRepository;
function paymentOperationTestFail(string $message): void
{
    fwrite(STDERR, '[FAIL] ' . $message . PHP_EOL);
    exit(1);
}

function paymentOperationTestAssert(bool $condition, string $message): void
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
}

function paymentOperationTestParseDsn(string $dsn): array
{
    if (stripos($dsn, 'mysql:') !== 0) {
        throw new RuntimeException('PAYMENT_TEST_MYSQL_DSN must use the mysql: PDO driver.');
    }

    $values = [];
    foreach (explode(';', substr($dsn, 6)) as $segment) {
        if ($segment === '') {
            continue;
        }
        $parts = explode('=', $segment, 2);
        if (count($parts) !== 2) {
            throw new RuntimeException('PAYMENT_TEST_MYSQL_DSN contains an invalid option.');
        }
        $key = strtolower(trim($parts[0]));
        $value = trim($parts[1]);
        if ($key === '' || $value === '' || array_key_exists($key, $values)) {
            throw new RuntimeException('PAYMENT_TEST_MYSQL_DSN contains an empty or repeated option.');
        }
        $values[$key] = $value;
    }

    if (! isset($values['host'], $values['port'], $values['dbname'])) {
        throw new RuntimeException('PAYMENT_TEST_MYSQL_DSN must explicitly include host=, port=, and dbname=.');
    }
    if (! in_array(strtolower($values['host']), ['localhost', '127.0.0.1'], true)) {
        throw new RuntimeException('PAYMENT_TEST_MYSQL_DSN host must be localhost or 127.0.0.1; remote hosts are refused.');
    }
    if (! preg_match('/^[A-Za-z0-9_]+$/', $values['dbname']) || strlen($values['dbname']) > 64) {
        throw new RuntimeException('The DSN database name must be a simple MySQL identifier.');
    }
    if (! ctype_digit($values['port']) || (int) $values['port'] < 1 || (int) $values['port'] > 65535) {
        throw new RuntimeException('The DSN port is invalid.');
    }

    return $values;
}

function paymentOperationTestRejectProductionLabel(string $kind, string $value): void
{
    if (preg_match('/prod(?:uction)?|live|primary|master/i', $value)) {
        throw new RuntimeException('Refusing a production-like ' . $kind . ' value.');
    }
}

function paymentOperationTestDsnForDatabase(string $dsn, string $database): string
{
    $segments = explode(';', substr($dsn, 6));
    $replaced = false;
    foreach ($segments as &$segment) {
        $parts = explode('=', $segment, 2);
        if (count($parts) === 2 && strtolower(trim($parts[0])) === 'dbname') {
            $segment = trim($parts[0]) . '=' . $database;
            $replaced = true;
        }
    }
    unset($segment);

    if (! $replaced) {
        throw new RuntimeException('Could not select the generated test schema.');
    }

    return 'mysql:' . implode(';', $segments);
}

function paymentOperationTestUuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);

    return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-'
        . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
}

function paymentOperationTestCreateTables(PDO $pdo): void
{
    $pdo->exec('CREATE TABLE transactions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

    $pdo->exec('CREATE TABLE transaction_payment_operations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        transaction_id BIGINT UNSIGNED NOT NULL,
        parent_operation_id BIGINT UNSIGNED DEFAULT NULL,
        operation_key VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
        operation_type VARCHAR(40) COLLATE utf8mb4_unicode_ci NOT NULL,
        provider_order_id VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        payment_method VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        gross_amount BIGINT DEFAULT NULL,
        idempotency_key VARCHAR(46) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        operation_status VARCHAR(24) COLLATE utf8mb4_unicode_ci NOT NULL,
        provider_status VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        fence BIGINT UNSIGNED NOT NULL DEFAULT 0,
        lease_token CHAR(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        lease_expires_at DATETIME DEFAULT NULL,
        first_attempt_at DATETIME DEFAULT NULL,
        request_payload_json LONGTEXT COLLATE utf8mb4_unicode_ci,
        response_payload_json LONGTEXT COLLATE utf8mb4_unicode_ci,
        error_payload_json LONGTEXT COLLATE utf8mb4_unicode_ci,
        late_success_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT NULL,
        completed_at DATETIME DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_payment_operation_key (transaction_id, operation_key),
        KEY idx_payment_operation_order (provider_order_id),
        KEY idx_payment_operation_state (transaction_id, operation_type, operation_status),
        KEY idx_payment_operation_parent (parent_operation_id),
        CONSTRAINT fk_payment_operation_transaction
            FOREIGN KEY (transaction_id) REFERENCES transactions (id)
            ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_payment_operation_parent
            FOREIGN KEY (parent_operation_id) REFERENCES transaction_payment_operations (id)
            ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
}

$dsn = getenv('PAYMENT_TEST_MYSQL_DSN');
if ($dsn === false || trim($dsn) === '') {
    fwrite(STDOUT, "[SKIP] Set PAYMENT_TEST_MYSQL_DSN, PAYMENT_TEST_MYSQL_USER, PAYMENT_TEST_MYSQL_PASSWORD, and PAYMENT_TEST_MYSQL_ISOLATED=1 to opt in.\n");
    exit(0);
}

$username = getenv('PAYMENT_TEST_MYSQL_USER');
$password = getenv('PAYMENT_TEST_MYSQL_PASSWORD');
if ($username === false || $username === '' || $password === false) {
    paymentOperationTestFail('Both PAYMENT_TEST_MYSQL_USER and PAYMENT_TEST_MYSQL_PASSWORD must be explicitly set.');
}
if (getenv('PAYMENT_TEST_MYSQL_ISOLATED') !== '1') {
    paymentOperationTestFail('Set PAYMENT_TEST_MYSQL_ISOLATED=1 only after confirming the target MySQL server is isolated for tests.');
}

try {
    $dsnValues = paymentOperationTestParseDsn($dsn);
    paymentOperationTestRejectProductionLabel('host', $dsnValues['host']);
    paymentOperationTestRejectProductionLabel('database name', $dsnValues['dbname']);
    if (in_array(strtolower($dsnValues['dbname']), ['mysql', 'information_schema', 'performance_schema', 'sys'], true)) {
        throw new RuntimeException('Refusing to use a MySQL system database as the connection database.');
    }
} catch (Throwable $exception) {
    paymentOperationTestFail($exception->getMessage());
}

if (! in_array('mysql', PDO::getAvailableDrivers(), true)) {
    paymentOperationTestFail('The PHP pdo_mysql driver is required; no database connection was opened.');
}

require_once dirname(__DIR__, 2) . '/app/Modules/Transactions/Repositories/TransactionPaymentOperationRepository.php';

$basePdo = null;
$pdoOne = null;
$pdoTwo = null;
$repositoryOne = null;
$repositoryTwo = null;
$schemaName = null;
$schemaCreated = false;
$failureMessage = null;
$cleanupMessages = [];

try {
    $pdoOptions = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_TIMEOUT => 5,
    ];
    $basePdo = new PDO($dsn, $username, $password, $pdoOptions);
    if ($basePdo->getAttribute(PDO::ATTR_DRIVER_NAME) !== 'mysql') {
        throw new RuntimeException('The configured connection did not use MySQL.');
    }

    $serverInfo = $basePdo->query('SELECT @@hostname AS server_hostname, DATABASE() AS selected_database')->fetch();
    paymentOperationTestRejectProductionLabel('server hostname', (string) ($serverInfo['server_hostname'] ?? ''));
    paymentOperationTestRejectProductionLabel('selected database', (string) ($serverInfo['selected_database'] ?? ''));
    if ((string) ($serverInfo['selected_database'] ?? '') !== $dsnValues['dbname']) {
        throw new RuntimeException('The server selected a database different from PAYMENT_TEST_MYSQL_DSN.');
    }

    $schemaName = 'payment_it_' . gmdate('Ymd_His') . '_' . bin2hex(random_bytes(8));
    $basePdo->exec('CREATE DATABASE `' . $schemaName . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $schemaCreated = true;

    $isolatedDsn = paymentOperationTestDsnForDatabase($dsn, $schemaName);
    $pdoOne = new PDO($isolatedDsn, $username, $password, $pdoOptions);
    $pdoTwo = new PDO($isolatedDsn, $username, $password, $pdoOptions);
    paymentOperationTestAssert(
        ! (bool) $pdoTwo->getAttribute(PDO::ATTR_EMULATE_PREPARES),
        'The competing connection must exercise native PDO prepares.'
    );
    $pdoOne->exec("SET SESSION time_zone = '+00:00'");
    $pdoTwo->exec("SET SESSION time_zone = '+00:00'");
    $pdoTwo->exec('SET SESSION innodb_lock_wait_timeout = 1');

    paymentOperationTestCreateTables($pdoOne);
    $engine = $pdoOne->query("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transaction_payment_operations'")->fetchColumn();
    paymentOperationTestAssert(strcasecmp((string) $engine, 'InnoDB') === 0, 'The operation table must use InnoDB for this integration test.');

    $repositoryOne = new TransactionPaymentOperationRepository($pdoOne);
    $repositoryTwo = new TransactionPaymentOperationRepository($pdoTwo);
    $repositoryOne->assertAvailable();

    $pdoOne->exec('INSERT INTO transactions () VALUES ()');
    $transactionId = (int) $pdoOne->lastInsertId();
    $nowDate = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $now = $nowDate->format('Y-m-d H:i:s');
    $leaseUntil = $nowDate->modify('+2 minutes')->format('Y-m-d H:i:s');
    $orderId = 'payment-it-' . bin2hex(random_bytes(8));
    $operationId = $repositoryOne->create([
        'transaction_id' => $transactionId,
        'operation_key' => 'test-' . bin2hex(random_bytes(8)),
        'operation_type' => 'completion_session',
        'provider_order_id' => $orderId,
        'payment_method' => 'gopay',
        'gross_amount' => 125000,
        'idempotency_key' => bin2hex(random_bytes(16)),
        'operation_status' => 'prepared',
        'fence' => 0,
        'request_payload' => ['purpose' => 'integration_test'],
        'created_at' => $now,
    ]);

    paymentOperationTestAssert($operationId > 0, 'create() must return the inserted operation id.');
    paymentOperationTestAssert((int) ($repositoryOne->findById($operationId)['transaction_id'] ?? 0) === $transactionId, 'findById() must read the inserted operation.');
    paymentOperationTestAssert((int) ($repositoryOne->latestSession($transactionId, 'completion_session')['id'] ?? 0) === $operationId, 'latestSession() must find the inserted session.');
    paymentOperationTestAssert((int) ($repositoryTwo->findSessionByOrderId($orderId)['id'] ?? 0) === $operationId, 'A second connection must read the durable provider order.');
    paymentOperationTestAssert(count($repositoryOne->sessions($transactionId)) === 1, 'sessions() must return the inserted payment session.');
    paymentOperationTestAssert($repositoryOne->knownOrderIds($transactionId) === [$orderId], 'knownOrderIds() must return the persisted order id.');

    $firstLeaseToken = paymentOperationTestUuid();
    $firstFence = $repositoryOne->nextFence($transactionId);
    paymentOperationTestAssert($firstFence === 1, 'The first fence must advance from zero to one.');

    paymentOperationTestAssert($pdoOne->beginTransaction(), 'The first MySQL connection must begin a transaction.');
    try {
        paymentOperationTestAssert($repositoryOne->findById($operationId, true) !== null, 'findById(..., true) must lock the operation row.');
        $waitStartedAt = microtime(true);
        $lockWaitException = null;
        try {
            $repositoryTwo->claim($operationId, $firstLeaseToken, $leaseUntil, $now, $firstFence);
        } catch (PDOException $exception) {
            $lockWaitException = $exception;
        }
        $lockWaitSeconds = microtime(true) - $waitStartedAt;

        paymentOperationTestAssert($lockWaitException instanceof PDOException, 'A competing claim must wait on the row lock held by the other MySQL connection.');
        paymentOperationTestAssert(
            ($lockWaitException->errorInfo[0] ?? null) !== 'HY093',
            'A placeholder/bind error is not evidence of MySQL row-lock contention.'
        );
        paymentOperationTestAssert(
            (int) ($lockWaitException->errorInfo[1] ?? 0) === 1205,
            'The competing claim must fail specifically with InnoDB lock-wait timeout 1205. PDO code: '
                . $lockWaitException->getCode()
                . '; errorInfo: ' . var_export($lockWaitException->errorInfo, true)
                . '; message: ' . $lockWaitException->getMessage()
        );
        paymentOperationTestAssert($lockWaitSeconds >= 0.75, 'The competing claim must have waited for the InnoDB row lock.');
        $pdoOne->commit();
    } catch (Throwable $exception) {
        if ($pdoOne->inTransaction()) {
            $pdoOne->rollBack();
        }
        throw $exception;
    }

    paymentOperationTestAssert($repositoryTwo->claim($operationId, $firstLeaseToken, $leaseUntil, $now, $firstFence), 'A prepared operation must be claimable after the row lock is released.');
    $claimed = $repositoryOne->findById($operationId);
    paymentOperationTestAssert(($claimed['operation_status'] ?? null) === 'in_flight', 'A successful claim must move the operation to in_flight.');
    paymentOperationTestAssert(($claimed['lease_token'] ?? null) === $firstLeaseToken, 'A successful claim must persist its lease token.');
    paymentOperationTestAssert((int) ($claimed['fence'] ?? 0) === $firstFence, 'A successful claim must persist its fence.');
    paymentOperationTestAssert(($claimed['first_attempt_at'] ?? null) === $now, 'A successful claim must persist the first attempt timestamp.');

    $secondFence = $repositoryOne->nextFence($transactionId);
    paymentOperationTestAssert($secondFence === 2, 'The next fence must increase monotonically after the first claim.');
    paymentOperationTestAssert(! $repositoryOne->claim($operationId, paymentOperationTestUuid(), $leaseUntil, $now, $secondFence), 'An in-flight operation must reject a duplicate claim.');
    paymentOperationTestAssert($repositoryOne->hasActiveSessionCall($transactionId, $now), 'An unexpired in-flight session must hold the active-session gate.');
    $afterLeaseExpiry = $nowDate->modify('+3 minutes')->format('Y-m-d H:i:s');
    paymentOperationTestAssert(! $repositoryOne->hasActiveSessionCall($transactionId, $afterLeaseExpiry), 'An expired lease must no longer hold the active-session gate.');

    paymentOperationTestAssert($repositoryOne->update($operationId, [
        'operation_status' => 'unknown',
        'lease_token' => null,
        'lease_expires_at' => null,
        'updated_at' => $now,
    ], $firstLeaseToken), 'The current lease owner must be able to persist an unknown provider outcome.');

    $retryLeaseToken = paymentOperationTestUuid();
    $retryLeaseUntil = $nowDate->modify('+4 minutes')->format('Y-m-d H:i:s');
    paymentOperationTestAssert($repositoryTwo->claim($operationId, $retryLeaseToken, $retryLeaseUntil, $now, $secondFence), 'An unknown operation must be claimable for a fenced retry.');
    paymentOperationTestAssert(! $repositoryOne->update($operationId, [
        'operation_status' => 'completed',
        'response_payload_json' => '{"writer":"stale"}',
        'updated_at' => $now,
    ], $firstLeaseToken), 'A stale lease token must not write over the newer claim.');
    paymentOperationTestAssert($repositoryOne->update($operationId, [
        'operation_status' => 'completed',
        'provider_status' => 'pending',
        'response_payload_json' => '{"writer":"current"}',
        'lease_token' => null,
        'lease_expires_at' => null,
        'completed_at' => $now,
        'updated_at' => $now,
    ], $retryLeaseToken), 'The current lease owner must be able to finish the operation.');

    $completed = $repositoryTwo->findById($operationId);
    paymentOperationTestAssert(($completed['operation_status'] ?? null) === 'completed', 'The completed status must be durable across connections.');
    paymentOperationTestAssert((int) ($completed['fence'] ?? 0) === $secondFence, 'The retry must persist the newer fence.');
    paymentOperationTestAssert(($completed['lease_token'] ?? null) === null, 'Finishing must clear the current lease token.');
    paymentOperationTestAssert(($completed['first_attempt_at'] ?? null) === $now, 'A retry must preserve the original first attempt timestamp.');
    paymentOperationTestAssert(json_decode((string) ($completed['response_payload_json'] ?? ''), true) === ['writer' => 'current'], 'Only the current lease owner response must be persisted.');
    paymentOperationTestAssert($repositoryOne->nextFence($transactionId) === 3, 'The next fence after retry must advance to three.');
} catch (Throwable $exception) {
    $failureMessage = $exception->getMessage();
} finally {
    $repositoryOne = null;
    $repositoryTwo = null;
    if ($pdoOne instanceof PDO && $pdoOne->inTransaction()) {
        try {
            $pdoOne->rollBack();
        } catch (Throwable $exception) {
            $cleanupMessages[] = 'Could not roll back the test transaction: ' . $exception->getMessage();
        }
    }
    $pdoOne = null;
    $pdoTwo = null;

    if ($schemaCreated && $basePdo instanceof PDO && $schemaName !== null) {
        try {
            $basePdo->exec('DROP DATABASE `' . $schemaName . '`');
        } catch (Throwable $exception) {
            $cleanupMessages[] = 'Could not drop generated test schema ' . $schemaName . ': ' . $exception->getMessage();
        }
    }
    $basePdo = null;
}

if ($failureMessage !== null || $cleanupMessages !== []) {
    $messages = array_filter(array_merge([$failureMessage], $cleanupMessages), static function ($message): bool {
        return $message !== null && $message !== '';
    });
    paymentOperationTestFail(implode(' | ', $messages));
}

fwrite(STDOUT, '[PASS] MySQL/InnoDB payment-operation persistence, row-lock wait, lease claim, and fencing verified.' . PHP_EOL);
