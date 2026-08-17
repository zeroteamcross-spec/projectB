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
        $this->repositoryFindsTransactionByProviderOrderIdFromLogs();
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

    private function repositoryFindsTransactionByProviderOrderIdFromLogs(): void
    {
        $pdo = $this->sqlite();
        $pdo->exec('CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT,
            email TEXT
        )');
        $pdo->exec('CREATE TABLE cars (
            id INTEGER PRIMARY KEY,
            seller_user_id INTEGER,
            showroom_id INTEGER NULL,
            brand_name TEXT,
            model_name TEXT,
            listing_status TEXT
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
            dp_amount INTEGER,
            remaining_amount INTEGER,
            transaction_status TEXT,
            affiliate_id INTEGER NULL,
            affiliate_referral_code_snapshot TEXT NULL,
            midtrans_order_id TEXT,
            midtrans_token TEXT,
            midtrans_redirect_url TEXT,
            expires_at TEXT,
            paid_at TEXT,
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
            updated_at TEXT,
            deleted_at TEXT
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
            provider_order_id TEXT
        )');
        $pdo->exec('CREATE TABLE affiliates (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            seller_user_id INTEGER,
            referral_code TEXT,
            status TEXT
        )');
        $pdo->exec("INSERT INTO users (id, name, email) VALUES (1, 'Buyer', 'buyer@example.test')");
        $pdo->exec("INSERT INTO users (id, name, email) VALUES (2, 'Seller', 'seller@example.test')");
        $pdo->exec("INSERT INTO cars (id, seller_user_id, brand_name, model_name, listing_status) VALUES (10, 2, 'Toyota', 'Avanza', 'published')");
        $pdo->exec("INSERT INTO transactions (
            id, transaction_code, buyer_user_id, seller_user_id, car_id, car_price,
            payment_type, dp_amount, remaining_amount, transaction_status,
            midtrans_order_id, midtrans_token, midtrans_redirect_url, expires_at,
            paid_at, created_at, updated_at, deleted_at
        ) VALUES (
            100, 'TRX-100', 1, 2, 10, 200000000,
            'dp', 50000000, 150000000, 'pending_payment',
            NULL, NULL, NULL, NULL, NULL, '2026-04-16 10:00:00', NULL, NULL
        )");
        $pdo->exec("INSERT INTO transaction_payment_logs (id, transaction_id, provider_order_id)
            VALUES (1, 100, 'ORDER-FROM-LOG')");

        $transaction = (new TransactionRepository($pdo))->findByProviderOrderId('ORDER-FROM-LOG');

        $this->assertNotNull($transaction);
        $this->assertSame(100, (int) $transaction['id']);
    }

    private function projectPath(string $path): string
    {
        return dirname(__DIR__, 2) . '/' . str_replace('\\', '/', $path);
    }
}

class FailingMidtransHttpClient extends MidtransHttpClient
{
    public function post(string $path, array $payload): array
    {
        throw new HttpException('Midtrans timeout.', 502, [], [
            'provider_status_code' => 0,
        ]);
    }
}
