<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\ValidationException;
use App\Core\Request;
use App\Infrastructure\Payment\PaymentProviderInterface;
use App\Infrastructure\Storage\StorageServiceInterface;
use App\Modules\Affiliate\Services\AffiliateService;
use App\Modules\Transactions\Repositories\PaymentLogRepository;
use App\Modules\Transactions\Repositories\TransactionRepository;
use App\Modules\Transactions\Requests\RejectManualTransferRequest;
use App\Modules\Transactions\Services\PaymentLogService;
use App\Modules\Transactions\Services\TransactionService;
use Tests\TestCase;

class ManualTransferPaymentTest extends TestCase
{
    public function run(): void
    {
        $this->rejectRequestRequiresMeaningfulReason();
        $this->createSkipsMidtransAndRecordsPendingManualTransfer();
        $this->buyerCannotConfirmOwnManualTransfer();
        $this->confirmingWithoutProofFails();
        $this->submitConfirmSettlesTransactionAsDpPaid();
        $this->rejectClearsProofAndKeepsTransactionPending();
    }

    private function rejectRequestRequiresMeaningfulReason(): void
    {
        foreach (['', '   ', 'ab'] as $reason) {
            $request = new Request('POST', '/api/transactions/1/manual-transfer/reject', '/api/transactions/1/manual-transfer/reject', [], [
                'reason' => $reason,
            ]);

            $this->expectException(ValidationException::class, static function () use ($request): void {
                (new RejectManualTransferRequest($request))->validate();
            }, 'reason');
        }

        $valid = new Request('POST', '/api/transactions/1/manual-transfer/reject', '/api/transactions/1/manual-transfer/reject', [], [
            'reason' => 'Nominal tidak sesuai Booking Fee.',
        ]);
        $payload = (new RejectManualTransferRequest($valid))->validate();
        $this->assertSame('Nominal tidak sesuai Booking Fee.', $payload['reason']);
    }

    private function createSkipsMidtransAndRecordsPendingManualTransfer(): void
    {
        [$pdo, $service] = $this->serviceWithSeedData();

        $transaction = $service->create(['id' => 1, 'role' => 'buyer'], [
            'car_id' => 10,
            'payment_type' => 'dp',
            'payment_method' => 'manual_transfer',
        ]);

        $this->assertSame('manual_transfer', $transaction['payment_method']);
        $this->assertSame('pending_payment', $transaction['transaction_status']);
        $this->assertNull($transaction['midtrans_order_id']);
        $this->assertNull($transaction['manual_transfer']['proof_path']);
        $this->assertSame('BCA', $transaction['manual_transfer']['bank']['bank_type']);

        $row = $pdo->query('SELECT midtrans_order_id, midtrans_token FROM transactions WHERE id = ' . (int) $transaction['id'])->fetch();
        $this->assertNull($row['midtrans_order_id']);
        $this->assertNull($row['midtrans_token']);
    }

    private function buyerCannotConfirmOwnManualTransfer(): void
    {
        [, $service] = $this->serviceWithSeedData();

        $transaction = $service->create(['id' => 1, 'role' => 'buyer'], [
            'car_id' => 10,
            'payment_type' => 'dp',
            'payment_method' => 'manual_transfer',
        ]);

        $this->expectException(ForbiddenException::class, static function () use ($service, $transaction): void {
            $service->confirmManualTransfer(['id' => 1, 'role' => 'buyer'], (int) $transaction['id']);
        });
    }

    private function confirmingWithoutProofFails(): void
    {
        [, $service] = $this->serviceWithSeedData();

        $transaction = $service->create(['id' => 1, 'role' => 'buyer'], [
            'car_id' => 10,
            'payment_type' => 'dp',
            'payment_method' => 'manual_transfer',
        ]);

        $this->expectException(ValidationException::class, static function () use ($service, $transaction): void {
            $service->confirmManualTransfer(['id' => 2, 'role' => 'seller'], (int) $transaction['id']);
        }, 'manual_transfer_proof_path');
    }

    private function submitConfirmSettlesTransactionAsDpPaid(): void
    {
        [$pdo, $service] = $this->serviceWithSeedData();

        $transaction = $service->create(['id' => 1, 'role' => 'buyer'], [
            'car_id' => 10,
            'payment_type' => 'dp',
            'payment_method' => 'manual_transfer',
        ]);
        $transactionId = (int) $transaction['id'];

        $withProof = $service->submitManualTransferProof(['id' => 1, 'role' => 'buyer'], $transactionId, [
            'proof' => ['tmp_name' => 'fake', 'name' => 'bukti.jpg', 'size' => 10, 'error' => 0],
            'note' => 'Transfer dari BCA a.n. Buyer Uji',
        ]);
        $this->assertNotNull($withProof['manual_transfer']['proof_path']);
        $this->assertSame('Transfer dari BCA a.n. Buyer Uji', $withProof['manual_transfer']['note']);

        $confirmed = $service->confirmManualTransfer(['id' => 2, 'role' => 'seller'], $transactionId);
        $this->assertSame('dp_paid', $confirmed['transaction_status']);
        $this->assertNotNull($confirmed['manual_transfer']['confirmed_at']);
        $this->assertSame(2, $confirmed['manual_transfer']['confirmed_by']);

        $row = $pdo->query('SELECT paid_at, remaining_amount FROM transactions WHERE id = ' . $transactionId)->fetch();
        $this->assertNotNull($row['paid_at']);
        $this->assertSame(195000000, (int) $row['remaining_amount']);
        $this->assertNotNull(FakeManualTransferAffiliateService::$lastAccruedTransaction);
    }

    private function rejectClearsProofAndKeepsTransactionPending(): void
    {
        [, $service] = $this->serviceWithSeedData();

        $transaction = $service->create(['id' => 1, 'role' => 'buyer'], [
            'car_id' => 10,
            'payment_type' => 'dp',
            'payment_method' => 'manual_transfer',
        ]);
        $transactionId = (int) $transaction['id'];

        $service->submitManualTransferProof(['id' => 1, 'role' => 'buyer'], $transactionId, [
            'proof' => ['tmp_name' => 'fake', 'name' => 'bukti.jpg', 'size' => 10, 'error' => 0],
            'note' => '',
        ]);

        $rejected = $service->rejectManualTransfer(['id' => 2, 'role' => 'seller'], $transactionId, [
            'reason' => 'Nominal tidak sesuai Booking Fee.',
        ]);

        $this->assertSame('pending_payment', $rejected['transaction_status']);
        $this->assertNull($rejected['manual_transfer']['proof_path']);
        $this->assertSame('Nominal tidak sesuai Booking Fee.', $rejected['manual_transfer']['rejected_reason']);

        // Buyer bisa unggah ulang setelah ditolak.
        $resubmitted = $service->submitManualTransferProof(['id' => 1, 'role' => 'buyer'], $transactionId, [
            'proof' => ['tmp_name' => 'fake', 'name' => 'bukti-2.jpg', 'size' => 10, 'error' => 0],
            'note' => '',
        ]);
        $this->assertNotNull($resubmitted['manual_transfer']['proof_path']);
        $this->assertNull($resubmitted['manual_transfer']['rejected_reason']);
    }

    private function assertNull($value, string $message = 'Expected null.'): void
    {
        $this->assertTrue($value === null, $message);
    }

    /**
     * @return array{0: \PDO, 1: TransactionService}
     */
    private function serviceWithSeedData(): array
    {
        $pdo = $this->sqlite();
        $this->createTables($pdo);

        $pdo->exec("INSERT INTO users (id, role, name, email, account_status, is_approved, deleted_at) VALUES
            (1, 'buyer', 'Buyer Uji', 'buyer@example.test', 'active', 1, NULL),
            (2, 'seller', 'Seller Uji', 'seller@example.test', 'active', 1, NULL)");
        $pdo->exec("INSERT INTO showrooms (id, name, bank_account_number, bank_type, bank_account_name) VALUES
            (1, 'Showroom Uji', '1234567890', 'BCA', 'Showroom Uji')");
        $pdo->exec("INSERT INTO cars (id, seller_user_id, showroom_id, listing_status, brand_name, model_name, price_cash, dp_amount, deleted_at) VALUES
            (10, 2, 1, 'published', 'Toyota', 'Avanza', 200000000, 5000000, NULL)");

        FakeManualTransferAffiliateService::$lastAccruedTransaction = null;

        $service = new TransactionService(
            $pdo,
            new TransactionRepository($pdo),
            new PaymentLogService(new PaymentLogRepository($pdo)),
            new FakeManualTransferPaymentProvider(),
            new FakeManualTransferAffiliateService(),
            new FakeManualTransferStorageService()
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
        $pdo->exec('CREATE TABLE showrooms (
            id INTEGER PRIMARY KEY,
            name TEXT NULL,
            bank_account_number TEXT NULL,
            bank_type TEXT NULL,
            bank_account_name TEXT NULL
        )');
        $pdo->exec('CREATE TABLE cars (
            id INTEGER PRIMARY KEY,
            seller_user_id INTEGER,
            showroom_id INTEGER NULL,
            listing_status TEXT,
            brand_name TEXT,
            model_name TEXT,
            price_cash INTEGER NULL,
            price_discount INTEGER NULL,
            price_credit INTEGER NULL,
            dp_amount INTEGER NULL,
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

class FakeManualTransferAffiliateService extends AffiliateService
{
    public static $lastAccruedTransaction = null;

    public function __construct()
    {
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

class FakeManualTransferPaymentProvider implements PaymentProviderInterface
{
    public function createInitialPayment(array $transaction, array $customer, string $paymentMethod): array
    {
        throw new \RuntimeException('Manual transfer transactions must never call the payment provider.');
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

class FakeManualTransferStorageService implements StorageServiceInterface
{
    public function storeUploadedFile(array $file, string $directory): array
    {
        return [
            'file_path' => '/storage/uploads/' . $directory . '/' . ($file['name'] ?? 'fake.jpg'),
            'storage_path' => $directory . '/' . ($file['name'] ?? 'fake.jpg'),
            'file_name' => $file['name'] ?? 'fake.jpg',
        ];
    }

    public function delete(string $relativePath): bool
    {
        return true;
    }
}
