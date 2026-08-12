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
        $this->providerSettlementSyncsFullPayment();
        $this->providerSettlementSyncsDpPayment();
        $this->providerPendingSyncKeepsTransactionPending();
        $this->providerSyncFailureKeepsTransactionPending();
        $this->fullPaymentTransactionCannotBecomeDpPaid();
        $this->sellerCanViewDetailButCannotCreateCompletionPayment();
        $this->dpPaidRejectsCompletionPayment();
        $this->sellerCannotMarkTransactionCompleted();
        $this->buyerCanCompletePaidTransactionAfterChecklistIsDone();
        $this->dpPaidCannotBeMarkedCompleted();
        $this->dpPaidCannotBePromotedToPaid();
        $this->dpPaidCannotUpdateFulfillmentChecklist();
        $this->buyerCanCancelDpPaidTransactionWithRefundAccount();
        $this->buyerCannotCancelDpPaidTransactionWithoutRefundAccount();
        $this->sellerCanCancelDpPaidTransactionAndPublishListing();
        $this->paidTransactionCannotBeCancelled();
        $this->genericStatusUpdateCannotCancelTransaction();
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

    private function providerSettlementSyncsFullPayment(): void
    {
        [$pdo, $service] = $this->serviceWithSeedData(
            'full',
            'pending_payment',
            null,
            0,
            new StatusTransactionPaymentProvider([
                'transaction_status' => 'settlement',
                'gross_amount' => '150000000.00',
                'payment_type' => 'bank_transfer',
                'transaction_id' => 'MID-001',
            ]),
            'ORDER-TRX-001'
        );

        $result = $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);
        $transaction = $pdo->query('SELECT transaction_status, paid_at FROM transactions WHERE id = 1')->fetch();
        $car = $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetch();
        $log = $pdo->query('SELECT provider_order_id, transaction_status, payload_response_json FROM transaction_payment_logs WHERE transaction_id = 1')->fetch();

        $this->assertSame('paid', $transaction['transaction_status']);
        $this->assertNotNull($transaction['paid_at']);
        $this->assertSame('sold', $car['listing_status']);
        $this->assertSame('paid', $result['transaction_status']);
        $this->assertSame('ORDER-TRX-001', $log['provider_order_id']);
        $this->assertSame('settlement', $log['transaction_status']);
        $this->assertSame('settlement', json_decode((string) $log['payload_response_json'], true)['transaction_status']);
    }

    private function providerSettlementSyncsDpPayment(): void
    {
        [$pdo, $service] = $this->serviceWithSeedData(
            'dp',
            'pending_payment',
            50000000,
            100000000,
            new StatusTransactionPaymentProvider([
                'transaction_status' => 'capture',
                'gross_amount' => '50000000.00',
                'payment_type' => 'bank_transfer',
                'transaction_id' => 'MID-002',
            ]),
            'ORDER-TRX-002'
        );

        $result = $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);
        $transaction = $pdo->query('SELECT transaction_status, remaining_amount, paid_at FROM transactions WHERE id = 1')->fetch();
        $car = $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetch();

        $this->assertSame('dp_paid', $transaction['transaction_status']);
        $this->assertSame(100000000, (int) $transaction['remaining_amount']);
        $this->assertNotNull($transaction['paid_at']);
        $this->assertSame('sold', $car['listing_status']);
        $this->assertSame('dp_paid', $result['transaction_status']);
        $this->assertSame('dp_paid', FakeTransactionAffiliateService::$lastAccruedTransaction['transaction_status'] ?? null);
    }

    private function providerPendingSyncKeepsTransactionPending(): void
    {
        [$pdo, $service] = $this->serviceWithSeedData(
            'full',
            'pending_payment',
            null,
            0,
            new StatusTransactionPaymentProvider([
                'transaction_status' => 'pending',
                'gross_amount' => '150000000.00',
                'payment_type' => 'bank_transfer',
            ]),
            'ORDER-TRX-003'
        );

        $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);
        $transaction = $pdo->query('SELECT transaction_status, paid_at FROM transactions WHERE id = 1')->fetch();
        $log = $pdo->query('SELECT transaction_status FROM transaction_payment_logs WHERE transaction_id = 1')->fetch();

        $this->assertSame('pending_payment', $transaction['transaction_status']);
        $this->assertSame(null, $transaction['paid_at']);
        $this->assertSame('pending', $log['transaction_status']);
    }

    private function providerSyncFailureKeepsTransactionPending(): void
    {
        [$pdo, $service] = $this->serviceWithSeedData(
            'full',
            'pending_payment',
            null,
            0,
            new FailingTransactionPaymentProvider(),
            'ORDER-FAIL'
        );

        $this->expectException(PaymentProviderException::class, static function () use ($service): void {
            $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);
        });

        $transaction = $pdo->query('SELECT transaction_status, paid_at FROM transactions WHERE id = 1')->fetch();
        $this->assertSame('pending_payment', $transaction['transaction_status']);
        $this->assertSame(null, $transaction['paid_at']);
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

    private function dpPaidRejectsCompletionPayment(): void
    {
        [$pdo, $service] = $this->serviceWithSeedData(
            'dp',
            'dp_paid',
            50000000,
            100000000,
            new FailingTransactionPaymentProvider()
        );

        $this->expectException(ValidationException::class, static function () use ($service): void {
            $service->completePayment(['id' => 1, 'role' => 'buyer'], 1, [
                'payment_method' => 'bca_va',
            ]);
        }, 'transaction_status');

        $log = $pdo->query('SELECT provider_name, provider_order_id, transaction_status, payload_request_json, payload_response_json FROM transaction_payment_logs WHERE transaction_id = 1')->fetch();

        $this->assertSame(false, $log);
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

    private function dpPaidCannotBeMarkedCompleted(): void
    {
        [, $service] = $this->serviceWithSeedData('dp', 'dp_paid', 50000000, 100000000);

        $this->expectException(ValidationException::class, static function () use ($service): void {
            $service->updateStatus(['id' => 1, 'role' => 'buyer'], 1, [
                'transaction_status' => 'completed',
            ]);
        }, 'transaction_status');
    }

    private function dpPaidCannotUpdateFulfillmentChecklist(): void
    {
        [, $service] = $this->serviceWithSeedData('dp', 'dp_paid', 50000000, 100000000);

        $this->expectException(ValidationException::class, static function () use ($service): void {
            $service->updateFulfillmentChecklist(['id' => 2, 'role' => 'seller'], 1, [
                'items' => [],
            ]);
        }, 'transaction_status');
    }

    private function dpPaidCannotBePromotedToPaid(): void
    {
        [, $service] = $this->serviceWithSeedData('dp', 'dp_paid', 50000000, 100000000);

        $this->expectException(ValidationException::class, static function () use ($service): void {
            $service->updateStatus(['id' => 9, 'role' => 'admin'], 1, [
                'transaction_status' => 'paid',
            ]);
        }, 'transaction_status');
    }

    private function buyerCanCancelDpPaidTransactionWithRefundAccount(): void
    {
        [$pdo, $service] = $this->serviceWithSeedData('dp', 'dp_paid', 50000000, 100000000);
        $pdo->exec("UPDATE cars SET listing_status = 'reserved' WHERE id = 10");

        $result = $service->cancel(['id' => 1, 'role' => 'buyer'], 1, [
            'refund_bank_name' => 'BCA',
            'refund_account_number' => '1234567890',
            'refund_account_name' => 'Buyer',
            'cancel_reason' => 'Berubah pikiran',
        ]);

        $transaction = $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetch();
        $car = $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetch();
        $log = $pdo->query('SELECT provider_name, transaction_status, gross_amount, payload_request_json FROM transaction_payment_logs WHERE transaction_id = 1')->fetch();
        $payload = json_decode((string) $log['payload_request_json'], true);

        $this->assertSame('cancelled', $transaction['transaction_status']);
        $this->assertSame('published', $car['listing_status']);
        $this->assertSame('cancelled', $result['transaction_status']);
        $this->assertSame('internal', $log['provider_name']);
        $this->assertSame('refund_requested', $log['transaction_status']);
        $this->assertSame(45000000, (int) $log['gross_amount']);
        $this->assertSame(10, (int) $payload['refund_deduction_percent']);
    }

    private function buyerCannotCancelDpPaidTransactionWithoutRefundAccount(): void
    {
        [, $service] = $this->serviceWithSeedData('dp', 'dp_paid', 50000000, 100000000);

        $this->expectException(ValidationException::class, static function () use ($service): void {
            $service->cancel(['id' => 1, 'role' => 'buyer'], 1, [
                'refund_bank_name' => 'BCA',
            ]);
        }, 'refund_account_number');
    }

    private function sellerCanCancelDpPaidTransactionAndPublishListing(): void
    {
        [$pdo, $service] = $this->serviceWithSeedData('dp', 'dp_paid', 50000000, 100000000);
        $pdo->exec("UPDATE cars SET listing_status = 'reserved' WHERE id = 10");

        $result = $service->cancel(['id' => 2, 'role' => 'seller'], 1, [
            'cancel_reason' => 'Unit tidak tersedia',
        ]);

        $transaction = $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetch();
        $car = $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetch();

        $this->assertSame('cancelled', $transaction['transaction_status']);
        $this->assertSame('published', $car['listing_status']);
        $this->assertSame('cancelled', $result['transaction_status']);
    }

    private function paidTransactionCannotBeCancelled(): void
    {
        [, $service] = $this->serviceWithSeedData('full', 'paid', null, 0);

        $this->expectException(ValidationException::class, static function () use ($service): void {
            $service->cancel(['id' => 1, 'role' => 'buyer'], 1, [
                'cancel_reason' => 'Berubah pikiran',
            ]);
        }, 'transaction_status');
    }

    private function genericStatusUpdateCannotCancelTransaction(): void
    {
        [, $service] = $this->serviceWithSeedData('dp', 'dp_paid', 50000000, 100000000);

        $this->expectException(ValidationException::class, static function () use ($service): void {
            $service->updateStatus(['id' => 2, 'role' => 'seller'], 1, [
                'transaction_status' => 'cancelled',
            ]);
        }, 'transaction_status');
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
        ?PaymentProviderInterface $paymentProvider = null,
        ?string $providerOrderId = null
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
             :transaction_status, :midtrans_order_id, NULL, NULL, NULL, NULL, '2026-01-01 00:00:00', NULL, NULL)");
        $stmt->execute([
            'payment_type' => $paymentType,
            'dp_amount' => $dpAmount,
            'remaining_amount' => $remainingAmount,
            'transaction_status' => $status,
            'midtrans_order_id' => $providerOrderId,
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
            returned_at TEXT NULL,
            return_reason TEXT NULL,
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
    public static $lastAccruedTransaction = null;

    public function __construct()
    {
        self::$lastAccruedTransaction = null;
    }

    public function resolveTransactionAttribution(string $referralCode, int $sellerUserId): array
    {
        return [];
    }

    public function accrueCommissionForPaidTransaction(array $transaction): ?array
    {
        self::$lastAccruedTransaction = $transaction;

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

class StatusTransactionPaymentProvider implements PaymentProviderInterface
{
    private array $status;

    public function __construct(array $status)
    {
        $this->status = $status;
    }

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
        return array_merge(['order_id' => $providerOrderId], $this->status);
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
