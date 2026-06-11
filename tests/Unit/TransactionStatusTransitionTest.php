<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Exceptions\ValidationException;
use App\Core\Exceptions\ForbiddenException;
use App\Modules\Affiliate\Services\AffiliateService;
use App\Infrastructure\Payment\PaymentProviderException;
use App\Infrastructure\Payment\PaymentProviderInterface;
use App\Modules\Transactions\Repositories\PaymentLogRepository;
use App\Modules\Transactions\Repositories\TransactionRepository;
use App\Modules\Transactions\Services\PaymentLogService;
use App\Modules\Transactions\Services\TransactionService;
use Tests\TestCase;

class TransactionStatusTransitionTest extends TestCase
{
    public function run(): void
    {
        $this->paidStatusClearsRemainingAmountAndSetsPaidAt();
        $this->fullPaymentTransactionCannotBecomeDpPaid();
        $this->sellerCanViewDetailButCannotCreateCompletionPayment();
        $this->providerFailureIsLoggedForCompletionPayment();
        $this->sellerCannotMarkTransactionCompleted();
        $this->buyerCanCompletePaidTransactionAfterChecklistIsDone();
    }

    private function paidStatusClearsRemainingAmountAndSetsPaidAt(): void
    {
        [$pdo, $service] = $this->serviceWithSeedData('dp', 'pending_payment', 50000000, 100000000);

        $result = $service->updateStatus(['id' => 9, 'role' => 'admin'], 1, [
            'transaction_status' => 'paid',
        ]);

        $row = $pdo->query('SELECT transaction_status, remaining_amount, paid_at FROM transactions WHERE id = 1')->fetch();

        $this->assertSame('paid', $row['transaction_status']);
        $this->assertSame(0, (int) $row['remaining_amount']);
        $this->assertNotNull($row['paid_at']);
        $this->assertSame('paid', $result['transaction_status']);
    }

    private function fullPaymentTransactionCannotBecomeDpPaid(): void
    {
        [, $service] = $this->serviceWithSeedData('full', 'pending_payment', null, 0);

        $this->expectException(ValidationException::class, static function () use ($service): void {
            $service->updateStatus(['id' => 9, 'role' => 'admin'], 1, [
                'transaction_status' => 'dp_paid',
            ]);
        }, 'transaction_status');
    }

    private function sellerCanViewDetailButCannotCreateCompletionPayment(): void
    {
        [, $service] = $this->serviceWithSeedData('dp', 'dp_paid', 50000000, 100000000);

        $detail = $service->detail(['id' => 2, 'role' => 'seller'], 1);

        $this->assertSame(2, $detail['seller_user_id']);

        $this->expectException(ForbiddenException::class, static function () use ($service): void {
            $service->completePayment(['id' => 2, 'role' => 'seller'], 1, [
                'payment_method' => 'bca_va',
            ]);
        });
    }

    private function providerFailureIsLoggedForCompletionPayment(): void
    {
        [$pdo, $service] = $this->serviceWithSeedData(
            'dp',
            'dp_paid',
            50000000,
            100000000,
            new FailingTransactionPaymentProvider()
        );

        $this->expectException(PaymentProviderException::class, static function () use ($service): void {
            $service->completePayment(['id' => 1, 'role' => 'buyer'], 1, [
                'payment_method' => 'bca_va',
            ]);
        });

        $log = $pdo->query('SELECT provider_name, provider_order_id, transaction_status, payload_request_json, payload_response_json FROM transaction_payment_logs WHERE transaction_id = 1')->fetch();

        $this->assertSame('midtrans', $log['provider_name']);
        $this->assertSame('ORDER-FAIL', $log['provider_order_id']);
        $this->assertSame('create_session_failed', $log['transaction_status']);
        $this->assertNotNull($log['payload_request_json']);
        $this->assertNotNull($log['payload_response_json']);
    }

    private function sellerCannotMarkTransactionCompleted(): void
    {
        [$pdo, $service] = $this->serviceWithSeedData('full', 'paid', null, 0);
        $this->markChecklistComplete($pdo);

        $this->expectException(ForbiddenException::class, static function () use ($service): void {
            $service->updateStatus(['id' => 2, 'role' => 'seller'], 1, [
                'transaction_status' => 'completed',
            ]);
        });
    }

    private function buyerCanCompletePaidTransactionAfterChecklistIsDone(): void
    {
        [$pdo, $service] = $this->serviceWithSeedData('full', 'paid', null, 0);
        $this->markChecklistComplete($pdo);

        $result = $service->updateStatus(['id' => 1, 'role' => 'buyer'], 1, [
            'transaction_status' => 'completed',
        ]);

        $row = $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetch();
        $this->assertSame('completed', $row['transaction_status']);
        $this->assertSame('completed', $result['transaction_status']);
    }

    private function markChecklistComplete(\PDO $pdo): void
    {
        foreach (['vehicle_documents', 'invoice_receipt', 'unit_final_check', 'handover_schedule', 'handover_done'] as $index => $key) {
            $stmt = $pdo->prepare("INSERT INTO transaction_fulfillment_checklist_items
                (transaction_id, checklist_key, label, is_required, is_completed, completed_at,
                 completed_by_user_id, notes, sort_order, created_at, updated_at)
                VALUES
                (1, :checklist_key, :label, 1, 1, '2026-01-01 01:00:00',
                 2, NULL, :sort_order, '2026-01-01 00:00:00', '2026-01-01 01:00:00')");
            $stmt->execute([
                'checklist_key' => $key,
                'label' => $key,
                'sort_order' => ($index + 1) * 10,
            ]);
        }
    }

    private function serviceWithSeedData(
        string $paymentType,
        string $status,
        ?int $dpAmount,
        int $remainingAmount,
        ?PaymentProviderInterface $paymentProvider = null
    ): array
    {
        $pdo = $this->sqlite();
        $this->createTables($pdo);
        $pdo->exec("INSERT INTO users (id, role, name, email, account_status, is_approved, deleted_at) VALUES
            (1, 'buyer', 'Buyer', 'buyer@example.test', 'active', 1, NULL),
            (2, 'seller', 'Seller', 'seller@example.test', 'active', 1, NULL)");
        $pdo->exec("INSERT INTO cars (id, seller_user_id, listing_status, brand_name, model_name, deleted_at)
            VALUES (10, 2, 'published', 'Toyota', 'Avanza', NULL)");

        $stmt = $pdo->prepare("INSERT INTO transactions
            (id, transaction_code, buyer_user_id, seller_user_id, car_id, car_price, payment_type,
             dp_amount, remaining_amount, transaction_status, midtrans_order_id, midtrans_token,
             midtrans_redirect_url, expires_at, paid_at, created_at, updated_at, deleted_at)
            VALUES
            (1, 'TRX-001', 1, 2, 10, 150000000, :payment_type, :dp_amount, :remaining_amount,
             :transaction_status, NULL, NULL, NULL, NULL, NULL, '2026-01-01 00:00:00', NULL, NULL)");
        $stmt->execute([
            'payment_type' => $paymentType,
            'dp_amount' => $dpAmount,
            'remaining_amount' => $remainingAmount,
            'transaction_status' => $status,
        ]);

        $service = new TransactionService(
            $pdo,
            new TransactionRepository($pdo),
            new PaymentLogService(new PaymentLogRepository($pdo)),
            $paymentProvider ?? new FakeTransactionPaymentProvider(),
            new FakeTransactionAffiliateService()
        );

        return [$pdo, $service];
    }

    private function createTables(\PDO $pdo): void
    {
        $pdo->exec('CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            role TEXT,
            name TEXT,
            email TEXT,
            account_status TEXT,
            is_approved INTEGER,
            deleted_at TEXT NULL
        )');
        $pdo->exec('CREATE TABLE cars (
            id INTEGER PRIMARY KEY,
            seller_user_id INTEGER,
            showroom_id INTEGER NULL,
            listing_status TEXT,
            brand_name TEXT,
            model_name TEXT,
            updated_at TEXT NULL,
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
            created_at TEXT,
            updated_at TEXT NULL,
            deleted_at TEXT NULL
        )');
        $pdo->exec('CREATE TABLE transaction_payment_logs (
            id INTEGER PRIMARY KEY,
            transaction_id INTEGER,
            provider_name TEXT,
            provider_order_id TEXT NULL,
            provider_transaction_id TEXT NULL,
            payment_method TEXT NULL,
            transaction_status TEXT NULL,
            gross_amount INTEGER NULL,
            payload_request_json TEXT NULL,
            payload_response_json TEXT NULL,
            payload_callback_json TEXT NULL,
            logged_at TEXT,
            created_at TEXT
        )');
        $pdo->exec('CREATE TABLE affiliates (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            seller_user_id INTEGER,
            referral_code TEXT,
            status TEXT
        )');
        $pdo->exec('CREATE TABLE transaction_fulfillment_checklist_items (
            id INTEGER PRIMARY KEY,
            transaction_id INTEGER,
            checklist_key TEXT,
            label TEXT,
            is_required INTEGER,
            is_completed INTEGER,
            completed_at TEXT NULL,
            completed_by_user_id INTEGER NULL,
            notes TEXT NULL,
            sort_order INTEGER,
            created_at TEXT,
            updated_at TEXT NULL
        )');
    }
}

class FakeTransactionAffiliateService extends AffiliateService
{
    public function __construct()
    {
    }

    public function resolveTransactionAttribution(string $referralCode, int $sellerUserId): array
    {
        return [];
    }

    public function accrueCommissionForPaidTransaction(array $transaction): ?array
    {
        return null;
    }
}

class FakeTransactionPaymentProvider implements PaymentProviderInterface
{
    public function createInitialPayment(array $transaction, array $customer, string $paymentMethod): array
    {
        return [];
    }

    public function createCompletionPayment(array $transaction, array $customer, string $paymentMethod): array
    {
        return [];
    }

    public function checkStatus(string $providerOrderId): array
    {
        return [];
    }
}

class FailingTransactionPaymentProvider implements PaymentProviderInterface
{
    public function createInitialPayment(array $transaction, array $customer, string $paymentMethod): array
    {
        throw $this->failure($paymentMethod);
    }

    public function createCompletionPayment(array $transaction, array $customer, string $paymentMethod): array
    {
        throw $this->failure($paymentMethod);
    }

    public function checkStatus(string $providerOrderId): array
    {
        throw $this->failure('');
    }

    private function failure(string $paymentMethod): PaymentProviderException
    {
        return new PaymentProviderException('Provider failed.', [
            'provider_name' => 'midtrans',
            'provider_order_id' => 'ORDER-FAIL',
            'provider_transaction_id' => null,
            'payment_method' => $paymentMethod,
            'transaction_status' => 'create_session_failed',
            'gross_amount' => 100000000,
            'payload_request' => ['order_id' => 'ORDER-FAIL'],
            'payload_response' => ['error' => 'Provider failed.'],
        ]);
    }
}
