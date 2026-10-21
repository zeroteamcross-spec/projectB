<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\HttpException;
use App\Core\Exceptions\UnauthorizedException;
use App\Infrastructure\Payment\Midtrans\MidtransCallbackHandler;
use App\Infrastructure\Payment\Midtrans\MidtransConfig;
use App\Infrastructure\Payment\Midtrans\MidtransHttpClient;
use App\Infrastructure\Payment\Midtrans\MidtransPaymentAdapter;
use App\Infrastructure\Payment\PaymentProviderException;
use App\Infrastructure\Payment\PaymentProviderInterface;
use App\Modules\Transactions\Controllers\TransactionController;
use App\Modules\Transactions\Policies\TransactionPolicy;
use App\Modules\Transactions\Repositories\TransactionPaymentOperationRepository;
use App\Modules\Transactions\Repositories\TransactionRepository;
use App\Modules\Transactions\Services\PaymentLogService;
use App\Modules\Transactions\Services\TransactionService;
use PDO;
use ReflectionClass;
use Tests\TestCase;

class TransactionFoundationHardeningTest extends TestCase
{
    public function run(): void
    {
        $this->routesUseClassHandlers();
        $this->controllerUsesConstructorInjection();
        $this->serviceDependsOnPaymentProviderInterface();
        $this->policyScopesFiltersAndCompletionAccess();
        $this->midtransCallbackRequiresValidSignature();
        $this->midtransAdapterWrapsChargeFailureForAuditLog();
        $this->migrationMarksHistoricalProviderSuccessesUnverified();
        $this->repositoryRejectsAmbiguousProviderOrderIds();
        $this->repositoryIgnoresManualTransferTransactionCodeCollisions();
        $this->repositoryKeepsRepeatedRowsForOneOwnerUnique();
        $this->paymentOperationEventUpdatesAreOwnerScoped();
        $this->offlineConversionOperationsAreListedNewestFirst();
        $this->expiredOfflineConversionGateIsFencedOnlyOnce();
        $this->offlineConversionGateLeaseCasRejectsStaleOrSupersededRows();
        $this->offlineConversionGateRenewalAcceptsAnUnchangedLiveLease();
    }

    private function routesUseClassHandlers(): void
    {
        $routes = file_get_contents($this->projectPath('app/Modules/Transactions/Routes/api.php'));

        $this->assertTrue(strpos($routes, '[TransactionController::class') !== false);
        $this->assertTrue(strpos($routes, '/{transaction_id}/payment-status/sync') !== false);
        $this->assertTrue(strpos($routes, '(new TransactionController') === false);
        $this->assertTrue(strpos($routes, 'static fn') === false);
    }

    private function controllerUsesConstructorInjection(): void
    {
        $constructor = (new ReflectionClass(TransactionController::class))->getConstructor();

        $this->assertNotNull($constructor);

        $types = array_map(
            static fn ($parameter): string => $parameter->getType()->getName(),
            $constructor->getParameters()
        );

        $this->assertTrue(in_array(TransactionService::class, $types, true));
    }

    private function serviceDependsOnPaymentProviderInterface(): void
    {
        $constructor = (new ReflectionClass(TransactionService::class))->getConstructor();

        $this->assertNotNull($constructor);

        $types = array_map(
            static fn ($parameter): string => $parameter->getType()->getName(),
            $constructor->getParameters()
        );

        $this->assertTrue(in_array(PDO::class, $types, true));
        $this->assertTrue(in_array(PaymentLogService::class, $types, true));
        $this->assertTrue(in_array(PaymentProviderInterface::class, $types, true));

        $service = file_get_contents($this->projectPath('app/Modules/Transactions/Services/TransactionService.php'));

        $this->assertTrue(strpos($service, 'MidtransPaymentAdapter') === false);
        $this->assertTrue(strpos($service, 'new Midtrans') === false);
    }

    private function policyScopesFiltersAndCompletionAccess(): void
    {
        $sellerFilters = TransactionPolicy::scopeFilters(['id' => 2, 'role' => 'seller'], [
            'buyer_user_id' => 1,
            'transaction_status' => 'pending_payment',
        ]);

        $this->assertSame(2, $sellerFilters['seller_user_id']);
        $this->assertTrue(! isset($sellerFilters['buyer_user_id']));

        TransactionPolicy::ensureCanCompletePayment(['id' => 1, 'role' => 'buyer'], ['buyer_user_id' => 1]);

        $this->expectException(ForbiddenException::class, static function (): void {
            TransactionPolicy::ensureCanCompletePayment(['id' => 2, 'role' => 'seller'], [
                'buyer_user_id' => 1,
                'seller_user_id' => 2,
            ]);
        });
    }

    private function midtransCallbackRequiresValidSignature(): void
    {
        $payload = [
            'order_id' => 'ORDER-TRX-001',
            'status_code' => '200',
            'gross_amount' => '150000000.00',
            'transaction_status' => 'settlement',
        ];

        $payload['signature_key'] = hash(
            'sha512',
            $payload['order_id'] . $payload['status_code'] . $payload['gross_amount'] . 'server-key'
        );

        $handler = new MidtransCallbackHandler(new MidtransConfig([
            'server_key' => 'server-key',
            'verify_signature' => true,
        ]));
        $normalized = $handler->normalize($payload);

        $this->assertSame('ORDER-TRX-001', $normalized['order_id']);

        $this->expectException(UnauthorizedException::class, static function () use ($payload): void {
            $invalidPayload = $payload;
            $invalidPayload['signature_key'] = 'invalid';

            (new MidtransCallbackHandler(new MidtransConfig([
                'server_key' => 'server-key',
                'verify_signature' => true,
            ])))->normalize($invalidPayload);
        });

        $this->expectException(UnauthorizedException::class, static function () use ($payload): void {
            (new MidtransCallbackHandler(new MidtransConfig([
                'server_key' => '',
                'verify_signature' => true,
            ])))->normalize($payload);
        });
    }

    private function midtransAdapterWrapsChargeFailureForAuditLog(): void
    {
        $config = new MidtransConfig([
            'server_key' => 'server-key',
            'callback_url' => 'http://localhost/callback',
        ]);
        $adapter = new MidtransPaymentAdapter($config, new FailingMidtransHttpClient($config));
        $caught = null;

        try {
            $adapter->createInitialPayment([
                'id' => 1,
                'transaction_code' => 'TRX-001',
                'car_id' => 10,
                'payment_type' => 'full',
                'car_price' => 150000000,
            ], [
                'name' => 'Buyer',
                'email' => 'buyer@example.test',
            ], 'bca_va');
        } catch (PaymentProviderException $exception) {
            $caught = $exception;
        }

        $this->assertNotNull($caught);
        $payload = $caught->logPayload();

        $this->assertSame('midtrans', $payload['provider_name']);
        $this->assertSame('create_session_failed', $payload['transaction_status']);
        $this->assertSame('bca_va', $payload['payment_method']);
        $this->assertTrue(isset($payload['payload_request']['transaction_details']['order_id']));
        $this->assertTrue(isset($payload['payload_response']['error']));
    }

    private function repositoryRejectsAmbiguousProviderOrderIds(): void
    {
        $pdo = $this->transactionRepositoryFixture();
        $this->insertTransaction($pdo, 100, 'TRX-100', 'ORDER-DUPLICATE');
        $this->insertTransaction($pdo, 101, 'TRX-101');
        $this->insertPaymentLog($pdo, 1, 101, 'midtrans', 'ORDER-DUPLICATE');

        $repository = new TransactionRepository($pdo);
        $resolution = $repository->resolveMidtransOrderId('ORDER-DUPLICATE');

        $this->assertSame('ambiguous', $resolution['status']);
        $this->assertSame([100, 101], $resolution['transaction_ids']);
        $this->assertSame(null, $resolution['transaction_id']);
        $this->assertSame(null, $repository->findByProviderOrderId('ORDER-DUPLICATE'));
    }

    private function repositoryIgnoresManualTransferTransactionCodeCollisions(): void
    {
        $pdo = $this->transactionRepositoryFixture();
        $this->insertTransaction($pdo, 100, 'ORDER-MANUAL', null, 'manual_transfer');
        $this->insertPaymentLog($pdo, 1, 100, 'manual_transfer', 'ORDER-MANUAL');

        $repository = new TransactionRepository($pdo);
        $resolution = $repository->resolveMidtransOrderId('ORDER-MANUAL');

        $this->assertSame('not_found', $resolution['status']);
        $this->assertSame([], $resolution['transaction_ids']);
        $this->assertSame(null, $repository->findByProviderOrderId('ORDER-MANUAL'));
    }

    private function repositoryKeepsRepeatedRowsForOneOwnerUnique(): void
    {
        $pdo = $this->transactionRepositoryFixture();
        $this->insertTransaction($pdo, 100, 'TRX-100');
        $this->insertPaymentLog($pdo, 1, 100, 'midtrans', 'ORDER-UNIQUE');
        $this->insertPaymentLog($pdo, 2, 100, 'midtrans', 'ORDER-UNIQUE');
        $this->insertPaymentOperation($pdo, 1, 100, 'initial_session', 'ORDER-UNIQUE');
        $this->insertPaymentOperation($pdo, 2, 100, 'completion_session', 'ORDER-UNIQUE');

        $repository = new TransactionRepository($pdo);
        $resolution = $repository->resolveMidtransOrderId('ORDER-UNIQUE');
        $transaction = $repository->findByProviderOrderId('ORDER-UNIQUE');

        $this->assertSame('unique', $resolution['status']);
        $this->assertSame(100, $resolution['transaction_id']);
        $this->assertSame([100], $resolution['transaction_ids']);
        $this->assertNotNull($transaction);
        $this->assertSame(100, (int) $transaction['id']);
    }

    private function paymentOperationEventUpdatesAreOwnerScoped(): void
    {
        $pdo = $this->transactionRepositoryFixture();
        $this->insertTransaction($pdo, 100, 'TRX-100');
        $this->insertTransaction($pdo, 101, 'TRX-101');
        $this->insertPaymentOperation($pdo, 1, 100, 'initial_session', 'ORDER-SHARED');
        $this->insertPaymentOperation($pdo, 2, 100, 'completion_session', 'ORDER-SHARED');
        $this->insertPaymentOperation($pdo, 3, 101, 'initial_session', 'ORDER-SHARED');
        $this->insertPaymentOperation($pdo, 4, 100, 'initial_session', 'ORDER-OTHER');

        $repository = new \App\Modules\Transactions\Repositories\TransactionPaymentOperationRepository($pdo);
        $repository->recordProviderEvent('ORDER-SHARED', 'settlement', true);
        $unchanged = $pdo->query('SELECT provider_status, late_success_at FROM transaction_payment_operations ORDER BY id')->fetchAll();

        $this->assertSame(null, $unchanged[0]['provider_status']);
        $this->assertSame(null, $unchanged[1]['provider_status']);
        $this->assertSame(null, $unchanged[2]['provider_status']);

        $repository->recordProviderEventForTransaction(100, 'ORDER-SHARED', 'settlement', true, true);
        $repository->recordProviderEvent('ORDER-OTHER', 'capture', false);
        $rows = $pdo->query('SELECT transaction_id, provider_order_id, provider_status, late_success_at FROM transaction_payment_operations ORDER BY id')->fetchAll();

        $this->assertSame(100, (int) $rows[0]['transaction_id']);
        $this->assertSame('settlement', $rows[0]['provider_status']);
        $this->assertSame('settlement', $rows[1]['provider_status']);
        $this->assertSame(null, $rows[2]['provider_status']);
        $this->assertSame('ORDER-OTHER', $rows[3]['provider_order_id']);
        $this->assertSame('unverified_capture', $rows[3]['provider_status']);
        $repository->recordProviderEventForTransaction(100, 'ORDER-OTHER', 'deny', false);
        $this->assertSame('deny', $repository->findById(4)['provider_status']);
        $repository->recordProviderEventForTransaction(100, 'ORDER-SHARED', 'deny', false);
        $this->assertSame('settlement', $repository->findById(1)['provider_status']);
    }

    private function migrationMarksHistoricalProviderSuccessesUnverified(): void
    {
        $migration = file_get_contents($this->projectPath('scripts/sql/20261020_transaction_payment_operation_fencing.sql'));

        $this->assertTrue(is_string($migration));
        $this->assertTrue(strpos(
            $migration,
            "CONCAT('unverified_', LOWER(logs.`transaction_status`))"
        ) !== false);
    }

    private function offlineConversionOperationsAreListedNewestFirst(): void
    {
        [$pdo, $repository] = $this->offlineGateRepositoryFixture([100, 101]);
        $this->insertOfflineConversionGate($pdo, 5, 100, 'blocked', 1, null, null);
        $this->insertPaymentOperation($pdo, 6, 100, 'status_check', 'ORDER-100');
        $this->insertOfflineConversionGate($pdo, 8, 100, 'in_flight', 2, 'gate-8', '2026-04-16 10:10:00');
        $this->insertOfflineConversionGate($pdo, 9, 101, 'in_flight', 3, 'gate-9', '2026-04-16 10:10:00');

        $operations = $repository->offlineConversionOperations(100);
        $lockedOperations = $repository->offlineConversionOperations(100, true);

        $this->assertSame([8, 5], array_map('intval', array_column($operations, 'id')));
        $this->assertSame([8, 5], array_map('intval', array_column($lockedOperations, 'id')));
    }

    private function expiredOfflineConversionGateIsFencedOnlyOnce(): void
    {
        [$pdo, $repository] = $this->offlineGateRepositoryFixture([100]);
        $this->insertOfflineConversionGate(
            $pdo,
            20,
            100,
            'in_flight',
            4,
            'expired-gate-token',
            '2026-04-16 09:59:00'
        );

        $this->assertSame(false, $repository->fenceExpiredOfflineConversionGate(
            100, 20, 'expired-gate-token', 4, '2026-04-16 09:58:00', '2026-04-16 10:00:00'
        ));
        $this->assertSame(false, $repository->fenceExpiredOfflineConversionGate(
            100, 20, 'wrong-token', 4, '2026-04-16 09:59:00', '2026-04-16 10:00:00'
        ));
        $this->assertSame(false, $repository->fenceExpiredOfflineConversionGate(
            100, 20, 'expired-gate-token', 5, '2026-04-16 09:59:00', '2026-04-16 10:00:00'
        ));
        $this->assertSame(false, $repository->fenceExpiredOfflineConversionGate(
            101, 20, 'expired-gate-token', 4, '2026-04-16 09:59:00', '2026-04-16 10:00:00'
        ));

        $this->assertTrue($repository->fenceExpiredOfflineConversionGate(
            100, 20, 'expired-gate-token', 4, '2026-04-16 09:59:00', '2026-04-16 10:00:00'
        ));
        $this->assertSame(false, $repository->fenceExpiredOfflineConversionGate(
            100, 20, 'expired-gate-token', 4, '2026-04-16 09:59:00', '2026-04-16 10:00:00'
        ));

        $operation = $repository->findById(20);
        $this->assertSame('unknown', $operation['operation_status']);
        $this->assertSame(null, $operation['lease_token']);
        $this->assertSame(null, $operation['lease_expires_at']);
        $this->assertSame(5, (int) $operation['fence']);
        $this->assertSame('2026-04-16 10:00:00', $operation['updated_at']);
    }

    private function offlineConversionGateLeaseCasRejectsStaleOrSupersededRows(): void
    {
        [$pdo, $repository] = $this->offlineGateRepositoryFixture([100, 101, 102, 103]);
        $now = '2026-04-16 10:00:00';
        $liveUntil = '2026-04-16 10:05:00';

        $this->insertOfflineConversionGate($pdo, 30, 100, 'in_flight', 7, 'renew-token', $liveUntil);
        $this->assertSame(false, $repository->renewOfflineConversionGateLease(100, 30, 'wrong-token', 7, $now, '2026-04-16 10:15:00'));
        $this->assertSame(false, $repository->renewOfflineConversionGateLease(100, 30, 'renew-token', 8, $now, '2026-04-16 10:15:00'));
        $this->assertTrue($repository->renewOfflineConversionGateLease(100, 30, 'renew-token', 7, $now, '2026-04-16 10:15:00'));
        $renewed = $repository->findById(30);
        $this->assertSame('2026-04-16 10:15:00', $renewed['lease_expires_at']);
        $this->assertSame('2026-04-16 10:00:00', $renewed['updated_at']);

        $this->insertOfflineConversionGate($pdo, 31, 101, 'in_flight', 2, 'expired-renew-token', '2026-04-16 09:59:00');
        $this->assertSame(false, $repository->renewOfflineConversionGateLease(101, 31, 'expired-renew-token', 2, $now, '2026-04-16 10:15:00'));
        $this->assertSame(false, $repository->closeOfflineConversionGate(101, 31, 'expired-renew-token', 2, $now, 'blocked'));

        $this->insertOfflineConversionGate($pdo, 32, 102, 'in_flight', 3, 'close-token', $liveUntil);
        $this->assertSame(false, $repository->closeOfflineConversionGate(102, 32, 'wrong-token', 3, $now, 'converted'));
        $this->assertSame(false, $repository->closeOfflineConversionGate(102, 32, 'close-token', 4, $now, 'converted'));
        $this->assertTrue($repository->closeOfflineConversionGate(
            102,
            32,
            'close-token',
            3,
            $now,
            'converted',
            '{"transaction_status":"dp_paid"}'
        ));
        $closed = $repository->findById(32);
        $this->assertSame('converted', $closed['operation_status']);
        $this->assertSame(null, $closed['lease_token']);
        $this->assertSame(null, $closed['lease_expires_at']);
        $this->assertSame($now, $closed['completed_at']);
        $this->assertSame('{"transaction_status":"dp_paid"}', $closed['response_payload_json']);

        $this->insertOfflineConversionGate($pdo, 33, 103, 'in_flight', 5, 'old-gate-token', $liveUntil);
        $this->insertOfflineConversionGate($pdo, 34, 103, 'in_flight', 6, 'new-gate-token', '2026-04-16 10:20:00');
        $this->assertSame(false, $repository->renewOfflineConversionGateLease(103, 33, 'old-gate-token', 5, $now, '2026-04-16 10:30:00'));
        $this->assertSame(false, $repository->closeOfflineConversionGate(103, 33, 'old-gate-token', 5, $now, 'blocked'));
        $this->assertTrue($repository->renewOfflineConversionGateLease(103, 34, 'new-gate-token', 6, $now, '2026-04-16 10:30:00'));
    }

    private function offlineConversionGateRenewalAcceptsAnUnchangedLiveLease(): void
    {
        [$pdo, $repository] = $this->offlineGateRepositoryFixture([100]);
        $now = '2026-04-16 10:00:00';
        $leaseExpiresAt = '2026-04-16 10:20:00';
        $this->insertOfflineConversionGate($pdo, 35, 100, 'in_flight', 8, 'same-second-token', $leaseExpiresAt);
        $pdo->prepare('UPDATE transaction_payment_operations SET updated_at = :updated_at WHERE id = :id')
            ->execute(['updated_at' => $now, 'id' => 35]);

        $this->assertTrue($repository->renewOfflineConversionGateLease(
            100,
            35,
            'same-second-token',
            8,
            $now,
            $leaseExpiresAt
        ));
        $this->assertSame($leaseExpiresAt, $pdo->query("SELECT lease_expires_at FROM transaction_payment_operations
            WHERE transaction_id = 100 AND operation_type = 'offline_conversion'")->fetchColumn());
        $this->assertSame(false, $repository->renewOfflineConversionGateLease(
            100,
            35,
            'same-second-token',
            8,
            $now,
            '2026-04-15 10:00:00'
        ));
    }

    private function offlineGateRepositoryFixture(array $transactionIds): array
    {
        $pdo = $this->transactionRepositoryFixture();
        foreach ($transactionIds as $transactionId) {
            $this->insertTransaction($pdo, $transactionId, 'TRX-' . $transactionId);
        }

        return [$pdo, new TransactionPaymentOperationRepository($pdo)];
    }

    private function insertOfflineConversionGate(
        PDO $pdo,
        int $id,
        int $transactionId,
        string $status,
        int $fence,
        ?string $leaseToken,
        ?string $leaseExpiresAt
    ): void {
        $stmt = $pdo->prepare(
            'INSERT INTO transaction_payment_operations (
                id, transaction_id, operation_type, operation_status, fence,
                lease_token, lease_expires_at, created_at, updated_at
             ) VALUES (
                :id, :transaction_id, \'offline_conversion\', :operation_status, :fence,
                :lease_token, :lease_expires_at, :created_at, :updated_at
             )'
        );
        $stmt->execute([
            'id' => $id,
            'transaction_id' => $transactionId,
            'operation_status' => $status,
            'fence' => $fence,
            'lease_token' => $leaseToken,
            'lease_expires_at' => $leaseExpiresAt,
            'created_at' => '2026-04-16 09:00:00',
            'updated_at' => '2026-04-16 09:00:00',
        ]);
    }

    private function transactionRepositoryFixture(): PDO
    {
        $pdo = $this->sqlite();
        $pdo->exec('CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            role TEXT,
            name TEXT,
            email TEXT,
            deleted_at TEXT NULL
        )');
        $pdo->exec('CREATE TABLE cars (
            id INTEGER PRIMARY KEY,
            seller_user_id INTEGER,
            showroom_id INTEGER NULL,
            brand_name TEXT,
            model_name TEXT,
            listing_status TEXT,
            deleted_at TEXT NULL
        )');
        $pdo->exec('CREATE TABLE car_images (
            id INTEGER PRIMARY KEY,
            car_id INTEGER,
            file_path TEXT,
            is_cover INTEGER,
            sort_order INTEGER,
            deleted_at TEXT NULL
        )');
        $pdo->exec('CREATE TABLE transactions (
            id INTEGER PRIMARY KEY,
            transaction_code TEXT,
            buyer_user_id INTEGER,
            seller_user_id INTEGER,
            car_id INTEGER,
            car_price INTEGER,
            payment_type TEXT,
            payment_method TEXT NULL,
            dp_amount INTEGER NULL,
            remaining_amount INTEGER NULL,
            transaction_status TEXT,
            affiliate_id INTEGER NULL,
            affiliate_referral_code_snapshot TEXT NULL,
            midtrans_order_id TEXT NULL,
            midtrans_token TEXT NULL,
            midtrans_redirect_url TEXT NULL,
            expires_at TEXT NULL,
            paid_at TEXT NULL,
            returned_at TEXT NULL,
            return_reason TEXT NULL,
            manual_transfer_proof_path TEXT NULL,
            manual_transfer_note TEXT NULL,
            manual_transfer_submitted_at TEXT NULL,
            manual_transfer_confirmed_at TEXT NULL,
            manual_transfer_confirmed_by INTEGER NULL,
            manual_transfer_rejected_at TEXT NULL,
            manual_transfer_rejected_reason TEXT NULL,
            created_at TEXT,
            updated_at TEXT NULL,
            deleted_at TEXT NULL
        )');
        $pdo->exec('CREATE TABLE showrooms (
            id INTEGER PRIMARY KEY,
            name TEXT NULL,
            bank_account_number TEXT NULL,
            bank_type TEXT NULL,
            bank_account_name TEXT NULL
        )');
        $pdo->exec('CREATE TABLE transaction_payment_logs (
            id INTEGER PRIMARY KEY,
            transaction_id INTEGER,
            provider_name TEXT,
            provider_order_id TEXT,
            logged_at TEXT,
            created_at TEXT
        )');
        $pdo->exec('CREATE TABLE transaction_payment_operations (
            id INTEGER PRIMARY KEY,
            transaction_id INTEGER,
            operation_type TEXT,
            operation_status TEXT NOT NULL DEFAULT \'prepared\',
            fence INTEGER NOT NULL DEFAULT 0,
            lease_token TEXT NULL,
            lease_expires_at TEXT NULL,
            provider_order_id TEXT,
            provider_status TEXT NULL,
            late_success_at TEXT NULL,
            response_payload_json TEXT NULL,
            error_payload_json TEXT NULL,
            completed_at TEXT NULL,
            created_at TEXT NULL,
            updated_at TEXT NULL
        )');
        $pdo->exec('CREATE TABLE affiliates (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            seller_user_id INTEGER,
            referral_code TEXT,
            status TEXT
        )');
        $pdo->exec("INSERT INTO users (id, role, name, email, deleted_at) VALUES
            (1, 'buyer', 'Buyer', 'buyer@example.test', NULL),
            (2, 'seller', 'Seller', 'seller@example.test', NULL)");
        $pdo->exec("INSERT INTO cars (id, seller_user_id, showroom_id, brand_name, model_name, listing_status, deleted_at)
            VALUES (10, 2, NULL, 'Toyota', 'Avanza', 'published', NULL)");

        return $pdo;
    }

    private function insertTransaction(PDO $pdo, int $id, string $code, ?string $midtransOrderId = null, ?string $paymentMethod = null): void
    {
        $stmt = $pdo->prepare(
            "INSERT INTO transactions (
                id, transaction_code, buyer_user_id, seller_user_id, car_id, car_price,
                payment_type, payment_method, dp_amount, remaining_amount, transaction_status,
                affiliate_id, affiliate_referral_code_snapshot, midtrans_order_id, midtrans_token,
                midtrans_redirect_url, expires_at, paid_at, returned_at, return_reason,
                manual_transfer_proof_path, manual_transfer_note, manual_transfer_submitted_at,
                manual_transfer_confirmed_at, manual_transfer_confirmed_by, manual_transfer_rejected_at,
                manual_transfer_rejected_reason, created_at, updated_at, deleted_at
            ) VALUES (
                :id, :transaction_code, 1, 2, 10, 200000000,
                'dp', :payment_method, 50000000, 150000000, 'pending_payment',
                NULL, NULL, :midtrans_order_id, NULL, NULL, NULL, NULL, NULL, NULL,
                NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-16 10:00:00', NULL, NULL
            )"
        );
        $stmt->execute([
            'id' => $id,
            'transaction_code' => $code,
            'payment_method' => $paymentMethod,
            'midtrans_order_id' => $midtransOrderId,
        ]);
    }

    private function insertPaymentLog(PDO $pdo, int $id, int $transactionId, string $providerName, string $providerOrderId): void
    {
        $stmt = $pdo->prepare(
            'INSERT INTO transaction_payment_logs (id, transaction_id, provider_name, provider_order_id, logged_at, created_at)
             VALUES (:id, :transaction_id, :provider_name, :provider_order_id, :logged_at, :created_at)'
        );
        $stmt->execute([
            'id' => $id,
            'transaction_id' => $transactionId,
            'provider_name' => $providerName,
            'provider_order_id' => $providerOrderId,
            'logged_at' => '2026-04-16 10:00:00',
            'created_at' => '2026-04-16 10:00:00',
        ]);
    }

    private function insertPaymentOperation(PDO $pdo, int $id, int $transactionId, string $operationType, string $providerOrderId): void
    {
        $stmt = $pdo->prepare(
            'INSERT INTO transaction_payment_operations (id, transaction_id, operation_type, provider_order_id)
             VALUES (:id, :transaction_id, :operation_type, :provider_order_id)'
        );
        $stmt->execute([
            'id' => $id,
            'transaction_id' => $transactionId,
            'operation_type' => $operationType,
            'provider_order_id' => $providerOrderId,
        ]);
    }

    private function projectPath(string $path): string
    {
        return dirname(__DIR__, 2) . '/' . str_replace('\\', '/', $path);
    }
}

class FailingMidtransHttpClient extends MidtransHttpClient
{
    public function post(string $path, array $payload, ?string $idempotencyKey = null): array
    {
        throw new HttpException('Midtrans timeout.', 502, [], [
            'provider_status_code' => 0,
        ]);
    }
}
