<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Services;

use App\Core\Exceptions\HttpException;
use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\ValidationException;
use App\Infrastructure\Payment\PaymentProviderException;
use App\Infrastructure\Payment\PaymentProviderInterface;
use App\Infrastructure\Storage\StorageServiceInterface;
use App\Modules\Affiliate\Services\AffiliateService;
use App\Modules\Notifications\Services\NotificationService;
use App\Modules\Transactions\Mappers\TransactionMapper;
use App\Modules\Transactions\Policies\TransactionPolicy;
use App\Modules\Transactions\Repositories\TransactionRepository;
use PDO;
use Throwable;

class TransactionService
{
    private PDO $pdo;

    private TransactionRepository $transactions;

    private PaymentLogService $paymentLogs;

    private PaymentProviderInterface $paymentProvider;

    private AffiliateService $affiliateService;

    private ?NotificationService $notificationService;

    private StorageServiceInterface $storage;

    public function __construct(
        PDO $pdo,
        TransactionRepository $transactions,
        PaymentLogService $paymentLogs,
        PaymentProviderInterface $paymentProvider,
        AffiliateService $affiliateService,
        StorageServiceInterface $storage,
        ?NotificationService $notificationService = null
    ) {
        $this->pdo = $pdo;
        $this->transactions = $transactions;
        $this->paymentLogs = $paymentLogs;
        $this->paymentProvider = $paymentProvider;
        $this->affiliateService = $affiliateService;
        $this->storage = $storage;
        $this->notificationService = $notificationService;
    }

    public function create(array $user, array $data): array
    {
        $buyerUserId = (int) ($data['buyer_user_id'] ?? $user['id']);
        TransactionPolicy::ensureCanCreate($user, $buyerUserId);
        $buyer = $this->transactions->findUser($buyerUserId);

        if (! $buyer || ($buyer['role'] ?? null) !== 'buyer') {
            throw new ValidationException(['buyer_user_id' => 'Buyer user is invalid.']);
        }

        $car = $this->transactions->findCarForTransaction((int) $data['car_id']);

        if (! $car || ($car['listing_status'] ?? null) !== 'published') {
            throw new NotFoundException('Mobil tidak tersedia untuk transaksi.');
        }

        if ((int) $car['seller_user_id'] === $buyerUserId) {
            throw new ValidationException(['car_id' => 'Buyer cannot buy their own car.']);
        }

        $seller = $this->transactions->findUser((int) $car['seller_user_id']);

        if (! $seller || ($seller['role'] ?? null) !== 'seller') {
            throw new ValidationException(['seller_user_id' => 'Seller user is invalid.']);
        }

        $affiliateAttribution = null;
        if (isset($data['affiliate_referral_code']) && trim((string) $data['affiliate_referral_code']) !== '') {
            $affiliateAttribution = $this->affiliateService->resolveTransactionAttribution(
                (string) $data['affiliate_referral_code'],
                (int) $car['seller_user_id']
            );
        }

        $carPrice = $this->resolveCarPrice($car);
        $paymentType = $data['payment_type'];

        // Booking Fee ditentukan showroom pada mobilnya. Nominal dari client
        // sengaja diabaikan supaya buyer tidak bisa menawar lewat payload.
        $dpAmount = null;
        if ($paymentType === 'dp') {
            $dpAmount = isset($car['dp_amount']) && $car['dp_amount'] !== null ? (int) $car['dp_amount'] : 0;

            if ($dpAmount <= 0) {
                throw new ValidationException([
                    'car_id' => 'Mobil ini belum memiliki Booking Fee. Hubungi showroom.',
                ]);
            }

            if ($dpAmount >= $carPrice) {
                throw new ValidationException([
                    'car_id' => 'Booking Fee mobil ini tidak valid karena melebihi harga.',
                ]);
            }
        }

        $remainingAmount = $paymentType === 'dp' ? $carPrice - $dpAmount : 0;
        $transactionCode = $this->generateTransactionCode();
        $now = date('Y-m-d H:i:s');
        $paymentMethod = trim((string) ($data['payment_method'] ?? 'bca_va'));
        $isManualTransfer = $paymentMethod === 'manual_transfer';

        if ($isManualTransfer && $paymentType !== 'dp') {
            throw new ValidationException([
                'payment_method' => 'Transfer manual hanya tersedia untuk pembayaran Booking Fee.',
            ]);
        }

        try {
            $this->pdo->beginTransaction();
            $transactionId = $this->transactions->create([
                'transaction_code' => $transactionCode,
                'buyer_user_id' => $buyerUserId,
                'seller_user_id' => (int) $car['seller_user_id'],
                'car_id' => (int) $car['id'],
                'car_price' => $carPrice,
                'payment_type' => $paymentType,
                'payment_method' => $paymentMethod,
                'dp_amount' => $dpAmount,
                'remaining_amount' => $remainingAmount,
                'transaction_status' => 'pending_payment',
                'affiliate_id' => $affiliateAttribution['affiliate_id'] ?? null,
                'affiliate_referral_code_snapshot' => $affiliateAttribution['affiliate_referral_code_snapshot'] ?? null,
                'midtrans_order_id' => null,
                'midtrans_token' => null,
                'midtrans_redirect_url' => null,
                'expires_at' => date('Y-m-d H:i:s', strtotime('+1 day')),
                'paid_at' => null,
                'created_at' => $now,
                'updated_at' => null,
            ]);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        $transaction = $this->transactions->findById($transactionId);
        if (! $transaction) {
            throw new NotFoundException('Transaksi tidak ditemukan setelah dibuat.');
        }

        // Transfer manual tidak punya provider -- buyer transfer langsung ke
        // rekening showroom dan upload buktinya sendiri, tidak ada sesi
        // Midtrans untuk dibuat sama sekali.
        if ($isManualTransfer) {
            $session = [
                'provider_name' => 'manual_transfer',
                'provider_order_id' => $transactionCode,
                'provider_transaction_id' => null,
                'payment_method' => 'manual_transfer',
                'transaction_status' => 'pending_payment',
                'gross_amount' => $dpAmount,
                'payment_data' => null,
                'payload_response' => null,
            ];

            try {
                $this->pdo->beginTransaction();
                $this->paymentLogs->record($transactionId, $session);
                $this->pdo->commit();
            } catch (Throwable $exception) {
                if ($this->pdo->inTransaction()) {
                    $this->pdo->rollBack();
                }

                throw $exception;
            }

            $result = $this->detail($user, $transactionId);
            $result['payment_session'] = [
                'provider_name' => 'manual_transfer',
                'provider_order_id' => $transactionCode,
                'provider_transaction_id' => null,
                'payment_method' => 'manual_transfer',
                'transaction_status' => 'pending_payment',
                'gross_amount' => $dpAmount,
                'payment_data' => null,
                'payload_response' => null,
                'redirect_url' => null,
                'expires_at' => $transaction['expires_at'],
            ];

            return $result;
        }

        $session = $this->createProviderSession(
            $transactionId,
            fn (): array => $this->paymentProvider->createInitialPayment($transaction, $buyer, $paymentMethod)
        );

        try {
            $this->pdo->beginTransaction();
            $this->transactions->updateProviderFields($transactionId, [
                'midtrans_order_id' => $session['provider_order_id'],
                'midtrans_token' => $session['midtrans_token'],
                'midtrans_redirect_url' => $session['midtrans_redirect_url'],
                'expires_at' => $session['expires_at'],
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
            $this->paymentLogs->record($transactionId, $session);

            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        $result = $this->detail($user, $transactionId);
        $result['payment_session'] = [
            'provider_name' => $session['provider_name'],
            'provider_order_id' => $session['provider_order_id'],
            'provider_transaction_id' => $session['provider_transaction_id'],
            'payment_method' => $session['payment_method'],
            'transaction_status' => $session['transaction_status'],
            'gross_amount' => $session['gross_amount'],
            'payment_data' => $session['payment_data'],
            'payload_response' => $session['payload_response'] ?? null,
            'redirect_url' => $session['midtrans_redirect_url'],
            'expires_at' => $session['expires_at'],
        ];

        return $result;
    }

    public function list(array $user, array $filters): array
    {
        $page = max(1, (int) ($filters['page'] ?? 1));
        $limit = max(1, min((int) ($filters['limit'] ?? 20), 100));
        $offset = ($page - 1) * $limit;
        $scopedFilters = TransactionPolicy::scopeFilters($user, $filters);

        $transactions = $this->transactions->list($scopedFilters, $limit, $offset);

        return [
            'transactions' => array_map(fn (array $transaction): array => $this->mapTransaction($transaction), $transactions),
            'meta' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $this->transactions->count($scopedFilters),
            ],
        ];
    }

    public function detail(array $user, int $transactionId): array
    {
        $transaction = $this->requireTransaction($transactionId);
        TransactionPolicy::ensureCanView($user, $transaction);

        return $this->mapTransaction($transaction, $this->paymentLogs->latestByTransaction($transactionId));
    }

    public function status(array $user, int $transactionId): array
    {
        $transaction = $this->requireTransaction($transactionId);
        TransactionPolicy::ensureCanView($user, $transaction);

        return TransactionMapper::status($transaction);
    }

    public function syncPaymentStatus(array $user, int $transactionId): array
    {
        $transaction = $this->requireTransaction($transactionId);
        TransactionPolicy::ensureCanView($user, $transaction);

        if (($transaction['transaction_status'] ?? null) !== 'pending_payment') {
            return $this->detail($user, $transactionId);
        }

        $providerOrderId = $this->providerOrderId($transaction);
        if ($providerOrderId === '') {
            return $this->detail($user, $transactionId);
        }

        $providerStatus = $this->paymentProvider->checkStatus($providerOrderId);
        $this->processProviderStatus($transaction, $providerOrderId, $providerStatus, 'response');

        return $this->detail($user, $transactionId);
    }

    public function downloadPaymentQr(array $user, int $transactionId): array
    {
        $transaction = $this->requireTransaction($transactionId);
        TransactionPolicy::ensureCanView($user, $transaction);

        $logs = $this->paymentLogs->latestByTransaction($transactionId, 10);
        if ($logs === []) {
            throw new NotFoundException('QR pembayaran tidak ditemukan.');
        }

        $log = $this->latestQrisPaymentLogWithQr($logs);
        if ($log === null) {
            throw new ValidationException([
                'payment_method' => 'Download QR hanya tersedia untuk pembayaran QRIS.',
            ]);
        }

        $qrCodeUrl = (string) $log['qr_code_url'];

        $download = $this->fetchPaymentQr(trim($qrCodeUrl));

        return [
            'body' => $download['body'],
            'content_type' => $download['content_type'],
            'filename' => $this->paymentQrFilename($transaction),
        ];
    }

    public function updateStatus(array $user, int $transactionId, array $data): array
    {
        $transaction = $this->requireTransaction($transactionId);

        if (($data['transaction_status'] ?? null) === 'cancelled') {
            throw new ValidationException([
                'transaction_status' => 'Gunakan endpoint pembatalan transaksi.',
            ]);
        }

        TransactionPolicy::ensureCanUpdateStatus($user, $transaction, $data['transaction_status']);
        $this->applyStatus($transaction, $data['transaction_status']);

        return $this->detail($user, $transactionId);
    }

    public function updateFulfillmentChecklist(array $user, int $transactionId, array $data): array
    {
        $transaction = $this->requireTransaction($transactionId);
        TransactionPolicy::ensureCanManageFulfillmentChecklist($user, $transaction);

        // dp_paid is now the terminal transaction state. Fulfillment checklist
        // updates remain available only for legacy paid transactions.
        if (($transaction['transaction_status'] ?? null) === 'dp_paid') {
            throw new ValidationException([
                'transaction_status' => 'Transaksi dp_paid sudah selesai dan tidak memerlukan checklist lanjutan.',
            ]);
        }

        if (($transaction['transaction_status'] ?? null) !== 'paid') {
            throw new ValidationException([
                'transaction_status' => 'Checklist hanya bisa diproses setelah Booking Fee dibayar.',
            ]);
        }

        $currentItems = $this->fulfillmentChecklist($transaction);
        $incomingByKey = [];

        foreach ($data['items'] ?? [] as $item) {
            $incomingByKey[(string) ($item['key'] ?? '')] = $item;
        }

        $now = date('Y-m-d H:i:s');

        try {
            $this->pdo->beginTransaction();

            foreach ($currentItems as $item) {
                $incoming = $incomingByKey[$item['key']] ?? [];
                $isCompleted = array_key_exists('is_completed', $incoming)
                    ? (bool) $incoming['is_completed']
                    : (bool) $item['is_completed'];

                $this->transactions->upsertFulfillmentChecklistItem($transactionId, [
                    'checklist_key' => $item['key'],
                    'label' => $item['label'],
                    'is_required' => $item['is_required'],
                    'is_completed' => $isCompleted,
                    'completed_at' => $isCompleted ? ($item['completed_at'] ?: $now) : null,
                    'completed_by_user_id' => $isCompleted ? (int) $user['id'] : null,
                    'notes' => array_key_exists('notes', $incoming) ? ($incoming['notes'] ?: null) : ($item['notes'] ?? null),
                    'sort_order' => $item['sort_order'],
                    'created_at' => $item['created_at'] ?? $now,
                    'updated_at' => $now,
                ]);
            }

            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return $this->detail($user, $transactionId);
    }

    /**
     * Retur transaksi oleh showroom setelah Booking Fee dibayar.
     *
     * Tiga hal terjadi sekaligus dan harus atomik: transaksi menjadi
     * `returned`, mobil kembali dijual, dan komisi marketing dibatalkan.
     * Bila komisinya sudah dibayarkan, seluruh retur dibatalkan.
     */
    public function returnTransaction(array $user, int $transactionId, array $data): array
    {
        $transaction = $this->requireTransaction($transactionId);
        TransactionPolicy::ensureCanReturn($user, $transaction);

        $statusSekarang = (string) ($transaction['transaction_status'] ?? '');

        if ($statusSekarang === 'returned') {
            throw new ValidationException([
                'transaction_status' => 'Transaksi ini sudah diretur.',
            ]);
        }

        if ($statusSekarang !== 'dp_paid') {
            throw new ValidationException([
                'transaction_status' => 'Retur hanya bisa dilakukan pada transaksi yang Booking Fee-nya sudah dibayar.',
            ]);
        }

        $reason = trim((string) ($data['return_reason'] ?? ''));
        $startedTransaction = ! $this->pdo->inTransaction();

        try {
            if ($startedTransaction) {
                $this->pdo->beginTransaction();
            }

            // Dijalankan lebih dulu supaya retur batal seluruhnya bila komisi
            // sudah paid_out.
            $this->affiliateService->voidCommissionForReturnedTransaction($transaction, 'Transaksi diretur: ' . $reason);

            $this->transactions->markReturned($transactionId, $reason);
            $this->transactions->updateCarListingStatus(
                (int) $transaction['car_id'],
                'published',
                ['sold', 'reserved']
            );

            if ($startedTransaction) {
                $this->pdo->commit();
            }
        } catch (Throwable $exception) {
            if ($startedTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return $this->detail($user, $transactionId);
    }

    /**
     * Buyer mengunggah bukti transfer bank manual. Bisa dipanggil ulang
     * selama transaksi masih pending_payment -- upload baru menimpa bukti
     * lama dan mencabut penolakan sebelumnya, supaya alur "ditolak lalu
     * upload ulang" tidak butuh endpoint terpisah.
     */
    public function submitManualTransferProof(array $user, int $transactionId, array $data): array
    {
        $transaction = $this->requireTransaction($transactionId);
        TransactionPolicy::ensureCanSubmitManualTransferProof($user, $transaction);

        if (($transaction['payment_method'] ?? null) !== 'manual_transfer') {
            throw new ValidationException([
                'payment_method' => 'Transaksi ini bukan transfer manual.',
            ]);
        }

        if (($transaction['transaction_status'] ?? null) !== 'pending_payment') {
            throw new ValidationException([
                'transaction_status' => 'Bukti transfer hanya bisa diunggah selama transaksi menunggu pembayaran.',
            ]);
        }

        $stored = $this->storage->storeUploadedFile($data['proof'], 'transactions/' . $transactionId . '/manual-transfer');
        $now = date('Y-m-d H:i:s');

        try {
            $this->pdo->beginTransaction();
            $this->transactions->updateManualTransferSubmission($transactionId, [
                'manual_transfer_proof_path' => $stored['file_path'],
                'manual_transfer_note' => $data['note'] !== '' ? $data['note'] : null,
                'manual_transfer_submitted_at' => $now,
                'updated_at' => $now,
            ]);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            $this->storage->delete($stored['file_path']);
            throw $exception;
        }

        if ($this->notificationService !== null) {
            $this->notificationService->createManualTransferSubmittedNotification(
                $this->requireTransaction($transactionId)
            );
        }

        return $this->detail($user, $transactionId);
    }

    /**
     * Showroom mengonfirmasi bukti transfer sudah dicek di mutasi rekening.
     * Menuntun ke status yang sama persis dengan pembayaran Midtrans yang
     * berhasil (dp_paid), lewat applyStatus() yang sama -- accrual komisi dan
     * notifikasi pembayaran ikut jalan tanpa perlu ditulis ulang di sini.
     */
    public function confirmManualTransfer(array $user, int $transactionId): array
    {
        $transaction = $this->requireTransaction($transactionId);
        TransactionPolicy::ensureCanConfirmManualTransfer($user, $transaction);

        if (($transaction['payment_method'] ?? null) !== 'manual_transfer') {
            throw new ValidationException([
                'payment_method' => 'Transaksi ini bukan transfer manual.',
            ]);
        }

        if (trim((string) ($transaction['manual_transfer_proof_path'] ?? '')) === '') {
            throw new ValidationException([
                'manual_transfer_proof_path' => 'Buyer belum mengunggah bukti transfer.',
            ]);
        }

        if (($transaction['transaction_status'] ?? null) !== 'pending_payment') {
            throw new ValidationException([
                'transaction_status' => 'Transaksi ini sudah tidak menunggu konfirmasi pembayaran.',
            ]);
        }

        $now = date('Y-m-d H:i:s');

        try {
            $this->pdo->beginTransaction();
            $this->transactions->updateManualTransferConfirmation($transactionId, [
                'manual_transfer_confirmed_at' => $now,
                'manual_transfer_confirmed_by' => (int) $user['id'],
                'updated_at' => $now,
            ]);
            $this->applyStatus($transaction, 'dp_paid');
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return $this->detail($user, $transactionId);
    }

    /**
     * Showroom menolak bukti yang diunggah -- nominal tidak cocok, bukti
     * tidak jelas, dsb. Transaksi tetap pending_payment, bukti lama dihapus
     * dari kolomnya supaya buyer harus unggah yang baru, bukan sekadar
     * menimpa bukti yang sama.
     */
    public function rejectManualTransfer(array $user, int $transactionId, array $data): array
    {
        $transaction = $this->requireTransaction($transactionId);
        TransactionPolicy::ensureCanConfirmManualTransfer($user, $transaction);

        if (($transaction['payment_method'] ?? null) !== 'manual_transfer') {
            throw new ValidationException([
                'payment_method' => 'Transaksi ini bukan transfer manual.',
            ]);
        }

        if (trim((string) ($transaction['manual_transfer_proof_path'] ?? '')) === '') {
            throw new ValidationException([
                'manual_transfer_proof_path' => 'Buyer belum mengunggah bukti transfer.',
            ]);
        }

        $reason = trim((string) ($data['reason'] ?? ''));
        if ($reason === '') {
            throw new ValidationException([
                'reason' => 'Alasan penolakan wajib diisi.',
            ]);
        }

        $proofPath = (string) $transaction['manual_transfer_proof_path'];
        $now = date('Y-m-d H:i:s');

        $this->transactions->updateManualTransferRejection($transactionId, [
            'manual_transfer_rejected_at' => $now,
            'manual_transfer_rejected_reason' => $reason,
            'updated_at' => $now,
        ]);
        $this->storage->delete($proofPath);

        $rejected = $this->requireTransaction($transactionId);

        if ($this->notificationService !== null) {
            $this->notificationService->createManualTransferRejectedNotification($rejected);
        }

        return $this->detail($user, $transactionId);
    }

    public function completePayment(array $user, int $transactionId, array $data): array
    {
        $transaction = $this->requireTransaction($transactionId);
        TransactionPolicy::ensureCanCompletePayment($user, $transaction);

        if (($transaction['payment_type'] ?? null) !== 'dp') {
            throw new ValidationException(['payment_type' => 'Only DP transactions can use complete payment.']);
        }

        if (in_array(($transaction['transaction_status'] ?? null), ['dp_paid', 'paid', 'completed'], true)) {
            throw new ValidationException(['transaction_status' => 'Transaksi sudah selesai dan tidak memiliki pelunasan lanjutan.']);
        }

        $remainingAmount = (int) ($transaction['remaining_amount'] ?? 0);

        if ($remainingAmount <= 0) {
            throw new ValidationException(['remaining_amount' => 'Transaction has no remaining amount.']);
        }

        $session = $this->createProviderSession(
            $transactionId,
            fn (): array => $this->paymentProvider->createCompletionPayment($transaction, [
                'name' => $user['name'] ?? 'Customer',
                'email' => $user['email'] ?? null,
                'phone_number' => $user['phone_number'] ?? null,
            ], $data['payment_method'])
        );

        try {
            $this->pdo->beginTransaction();
            $this->paymentLogs->record($transactionId, $session);

            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        $result = $this->detail($user, $transactionId);
        $result['payment_session'] = [
            'provider_name' => $session['provider_name'],
            'provider_order_id' => $session['provider_order_id'],
            'provider_transaction_id' => $session['provider_transaction_id'],
            'payment_method' => $session['payment_method'],
            'transaction_status' => $session['transaction_status'],
            'gross_amount' => $session['gross_amount'],
            'payment_data' => $session['payment_data'],
            'payload_response' => $session['payload_response'] ?? null,
            'redirect_url' => $session['midtrans_redirect_url'],
            'expires_at' => $session['expires_at'],
        ];

        return $result;
    }

    public function cancel(array $user, int $transactionId, array $data): array
    {
        $transaction = $this->requireTransaction($transactionId);
        TransactionPolicy::ensureCanCancel($user, $transaction);
        $this->ensureCanCancelStatus($user, $transaction, $data);

        $refund = $this->refundPayload($user, $transaction, $data);

        try {
            $this->pdo->beginTransaction();

            $this->applyStatus($transaction, 'cancelled');

            if (! $this->transactions->publishCarForCancelledTransaction((int) $transaction['car_id'])) {
                throw new ValidationException([
                    'car_id' => 'Listing mobil tidak bisa dikembalikan ke published.',
                ]);
            }

            if ($refund !== null) {
                $this->paymentLogs->record($transactionId, $refund);
            }

            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return $this->detail($user, $transactionId);
    }

    public function handleProviderCallback(array $payload): array
    {
        $providerOrderId = $payload['order_id'];
        $transaction = $this->transactions->findByProviderOrderId($providerOrderId)
            ?: $this->transactions->findByCode($providerOrderId);

        if (! $transaction) {
            return [
                'acknowledged' => true,
                'processed' => false,
                'order_id' => $providerOrderId,
            ];
        }

        $processed = $this->processProviderStatus($transaction, $providerOrderId, $payload, 'callback');

        return [
            'transaction' => TransactionMapper::status($this->requireTransaction((int) $transaction['id'])),
            'payment_log' => $processed['log'],
        ];
    }

    public function expirePendingTransactions(): array
    {
        $now = date('Y-m-d H:i:s');
        $threshold = date('Y-m-d H:i:s', strtotime('-24 hours'));
        $expiredTransactionIds = [];

        foreach ($this->transactions->listStalePending($threshold) as $transaction) {
            $providerOrderId = $this->providerOrderId($transaction);

            if ($providerOrderId !== '') {
                $providerStatus = $this->paymentProvider->checkStatus($providerOrderId);

                $processed = $this->processProviderStatus(
                    $transaction,
                    $providerOrderId,
                    $providerStatus,
                    'response',
                    true
                );

                if ($processed['next_status'] === 'expired') {
                    $expiredTransactionIds[] = (int) $transaction['id'];
                }

                continue;
            }

            try {
                $this->pdo->beginTransaction();
                $expiredCount = $this->transactions->expirePendingByIds([(int) $transaction['id']], $now);
                $this->transactions->publishReservedCarsByIds([(int) $transaction['car_id']]);
                $this->pdo->commit();
            } catch (Throwable $exception) {
                if ($this->pdo->inTransaction()) {
                    $this->pdo->rollBack();
                }

                throw $exception;
            }

            if ($expiredCount > 0) {
                $expiredTransactionIds[] = (int) $transaction['id'];
            }
        }

        return [
            'expired_count' => count($expiredTransactionIds),
            'expired_transaction_ids' => $expiredTransactionIds,
        ];
    }

    private function processProviderStatus(
        array $transaction,
        string $providerOrderId,
        array $providerPayload,
        string $payloadType,
        bool $expireUnresolved = false
    ): array {
        $providerStatus = isset($providerPayload['transaction_status'])
            ? (string) $providerPayload['transaction_status']
            : null;
        $grossAmount = isset($providerPayload['gross_amount'])
            ? (int) $providerPayload['gross_amount']
            : null;
        $logData = [
            'provider_name' => $providerPayload['provider_name'] ?? 'midtrans',
            'provider_order_id' => $providerOrderId,
            'provider_transaction_id' => $providerPayload['transaction_id'] ?? null,
            'payment_method' => $providerPayload['payment_type'] ?? null,
            'transaction_status' => $providerStatus,
            'gross_amount' => $grossAmount,
        ];

        if ($payloadType === 'callback') {
            $logData['payload_callback'] = $providerPayload['payload_callback'] ?? $providerPayload;
        } else {
            $logData['payload_response'] = $providerPayload;
        }

        try {
            $this->pdo->beginTransaction();
            $log = $this->paymentLogs->record((int) $transaction['id'], $logData);
            $providerNextStatus = $this->paymentLogs->providerStatusToCanon(
                $transaction,
                $providerStatus,
                $grossAmount
            );
            $nextStatus = $expireUnresolved
                ? (in_array($providerNextStatus, ['dp_paid', 'paid', 'completed'], true)
                    ? $providerNextStatus
                    : 'expired')
                : $providerNextStatus;

            if ($nextStatus !== null && $nextStatus !== ($transaction['transaction_status'] ?? null)) {
                $this->applyStatus($transaction, $nextStatus);
            }

            if ($expireUnresolved && $nextStatus === 'expired') {
                $this->transactions->publishReservedCarsByIds([(int) $transaction['car_id']]);
            }

            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return [
            'log' => $log,
            'next_status' => $nextStatus,
        ];
    }

    private function providerOrderId(array $transaction): string
    {
        $providerOrderId = trim((string) ($transaction['midtrans_order_id'] ?? ''));
        if ($providerOrderId !== '') {
            return $providerOrderId;
        }

        foreach ($this->paymentLogs->latestByTransaction((int) $transaction['id'], 10) as $log) {
            if (($log['provider_name'] ?? 'midtrans') !== 'midtrans') {
                continue;
            }

            $providerOrderId = trim((string) ($log['provider_order_id'] ?? ''));
            if ($providerOrderId !== '') {
                return $providerOrderId;
            }
        }

        return '';
    }

    private function applyStatus(array $transaction, string $status): void
    {
        if ($status === 'dp_paid' && ($transaction['payment_type'] ?? null) !== 'dp') {
            throw new ValidationException(['transaction_status' => 'dp_paid is only valid for DP transactions.']);
        }

        if (($transaction['transaction_status'] ?? null) === 'dp_paid' && $status === 'paid') {
            throw new ValidationException([
                'transaction_status' => 'Transaksi dp_paid sudah selesai dan tidak boleh dipromosikan ke status paid.',
            ]);
        }

        // dp_paid is the terminal transaction state. `completed` remains
        // accepted only for legacy records that already reached `paid`.
        if ($status === 'completed' && ($transaction['transaction_status'] ?? null) !== 'paid') {
            throw new ValidationException([
                'transaction_status' => ($transaction['transaction_status'] ?? null) === 'dp_paid'
                    ? 'Transaksi dp_paid sudah selesai.'
                    : 'Hanya transaksi legacy berstatus paid yang bisa diselesaikan.',
            ]);
        }

        if ($status === 'completed' && ! $this->isFulfillmentChecklistComplete($transaction)) {
            throw new ValidationException([
                'fulfillment_checklist' => 'Checklist fulfillment belum lengkap.',
            ]);
        }

        $startedTransaction = ! $this->pdo->inTransaction();

        try {
            if ($startedTransaction) {
                $this->pdo->beginTransaction();
            }

            $this->lockListingForPaymentStatus($transaction, $status);

            $remainingAmount = (int) ($transaction['remaining_amount'] ?? 0);
            $paidAt = $transaction['paid_at'] ?? null;

            if ($status === 'paid') {
                $remainingAmount = 0;
                $paidAt = $paidAt ?: date('Y-m-d H:i:s');
            }

            if ($status === 'completed') {
                $remainingAmount = 0;
                $paidAt = $paidAt ?: date('Y-m-d H:i:s');
            }

            if ($status === 'dp_paid') {
                // Sisa harga tetap dicatat sebagai informasi, tetapi tidak
                // ditagih lagi lewat sistem. Booking Fee menutup kewajiban.
                $remainingAmount = max(0, (int) $transaction['car_price'] - (int) ($transaction['dp_amount'] ?? 0));
                $paidAt = $paidAt ?: date('Y-m-d H:i:s');
            }

            $this->transactions->updateStatus((int) $transaction['id'], [
                'transaction_status' => $status,
                'remaining_amount' => $remainingAmount,
                'paid_at' => $paidAt,
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            // Komisi terbit saat kewajiban bayar selesai. Sejak Booking Fee
            // menjadi pembayaran terakhir, titik itu adalah `dp_paid`.
            // `paid` tetap ditangani demi transaksi lunas lama; accrual sudah
            // idempoten sehingga transisi dp_paid -> paid tidak menggandakan.
            if ($status === 'dp_paid' || $status === 'paid') {
                $paidTransaction = $this->requireTransaction((int) $transaction['id']);
                $this->affiliateService->accrueCommissionForPaidTransaction($paidTransaction);
                if ($this->notificationService !== null) {
                    $this->notificationService->createTransactionPaidNotifications($paidTransaction);
                }
            }

            if ($status === 'completed' && $this->notificationService !== null) {
                $this->notificationService->createTransactionCompletedNotifications(
                    $this->requireTransaction((int) $transaction['id'])
                );
            }

            if ($startedTransaction) {
                $this->pdo->commit();
            }
        } catch (Throwable $exception) {
            if ($startedTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }
    }

    private function ensureCanCancelStatus(array $user, array $transaction, array $data): void
    {
        $status = (string) ($transaction['transaction_status'] ?? '');

        if (! in_array($status, ['pending_payment', 'dp_paid'], true)) {
            throw new ValidationException([
                'transaction_status' => 'Transaksi hanya bisa dibatalkan sebelum pembayaran lunas.',
            ]);
        }

        if (($user['role'] ?? null) === 'buyer' && $status === 'dp_paid') {
            foreach ([
                'refund_bank_name' => 'Nama bank refund wajib diisi.',
                'refund_account_number' => 'Nomor rekening refund wajib diisi.',
                'refund_account_name' => 'Nama pemilik rekening refund wajib diisi.',
            ] as $field => $message) {
                if (trim((string) ($data[$field] ?? '')) === '') {
                    throw new ValidationException([$field => $message]);
                }
            }
        }
    }

    private function refundPayload(array $user, array $transaction, array $data): ?array
    {
        if (($transaction['transaction_status'] ?? null) !== 'dp_paid') {
            return null;
        }

        $dpAmount = (int) ($transaction['dp_amount'] ?? 0);
        if ($dpAmount <= 0) {
            return null;
        }

        $feeAmount = (int) floor($dpAmount * 0.1);
        $refundAmount = max(0, $dpAmount - $feeAmount);

        return [
            'provider_name' => 'internal',
            'provider_order_id' => $transaction['transaction_code'] ?? null,
            'provider_transaction_id' => null,
            'payment_method' => 'bank_transfer',
            'transaction_status' => 'refund_requested',
            'gross_amount' => $refundAmount,
            'payload_request' => [
                'requested_by_user_id' => (int) ($user['id'] ?? 0),
                'requested_by_role' => $user['role'] ?? null,
                'refund_bank_name' => trim((string) ($data['refund_bank_name'] ?? '')),
                'refund_account_number' => trim((string) ($data['refund_account_number'] ?? '')),
                'refund_account_name' => trim((string) ($data['refund_account_name'] ?? '')),
                'cancel_reason' => trim((string) ($data['cancel_reason'] ?? '')),
                'dp_amount' => $dpAmount,
                'refund_deduction_percent' => 10,
                'refund_deduction_amount' => $feeAmount,
                'refund_amount' => $refundAmount,
                'note' => 'Refund DP dipotong 10%.',
            ],
            'payload_response' => [
                'message' => 'Refund DP menunggu proses internal. Nominal refund dipotong 10%.',
            ],
        ];
    }

    private function lockListingForPaymentStatus(array $transaction, string $status): void
    {
        if (! in_array($status, ['dp_paid', 'paid'], true)) {
            return;
        }

        $transactionId = (int) $transaction['id'];
        $carId = (int) $transaction['car_id'];
        $otherLock = $this->transactions->findActiveLockByCarId($carId, $transactionId);

        if ($otherLock !== null) {
            throw new ValidationException([
                'car_id' => sprintf(
                    'Mobil sudah dikunci oleh transaksi %s.',
                    $otherLock['transaction_code'] ?? ('#' . $otherLock['id'])
                ),
            ]);
        }

        $currentStatus = (string) ($transaction['transaction_status'] ?? '');
        // Booking Fee sudah menutup pembayaran, jadi mobil langsung terjual.
        // Tidak ada lagi tahap `reserved` menunggu pelunasan.
        $targetListingStatus = 'sold';
        $allowedCurrentStatuses = $this->allowedListingStatusesForLock($status, $currentStatus);

        if (! $this->transactions->updateCarListingStatus($carId, $targetListingStatus, $allowedCurrentStatuses)) {
            throw new ValidationException([
                'car_id' => 'Mobil tidak bisa ditandai terjual karena status listing sudah berubah.',
            ]);
        }
    }

    private function allowedListingStatusesForLock(string $status, string $currentTransactionStatus): array
    {
        // `reserved` tetap diterima sebagai status asal demi data lama yang
        // sempat dikunci DP sebelum Booking Fee langsung menjadikannya sold.
        if ($currentTransactionStatus === 'paid') {
            return ['published', 'reserved', 'sold'];
        }

        if ($currentTransactionStatus === 'dp_paid') {
            return ['published', 'reserved', 'sold'];
        }

        return ['published', 'reserved'];
    }

    private function createProviderSession(int $transactionId, callable $callback): array
    {
        try {
            return $this->assertPaymentSession($callback());
        } catch (PaymentProviderException $exception) {
            $this->recordProviderFailure($transactionId, $exception);

            throw $exception;
        }
    }

    private function mapTransaction(array $transaction, array $paymentLogs = []): array
    {
        return TransactionMapper::transaction(
            $transaction,
            $paymentLogs,
            $this->fulfillmentChecklist($transaction)
        );
    }

    private function fulfillmentChecklist(array $transaction): array
    {
        $storedItems = $this->transactions->listFulfillmentChecklistItems((int) $transaction['id']);
        $storedByKey = [];

        foreach ($storedItems as $item) {
            $storedByKey[(string) $item['checklist_key']] = $item;
        }

        return array_map(static function (array $default) use ($storedByKey, $transaction): array {
            $stored = $storedByKey[$default['checklist_key']] ?? [];

            return array_merge($default, $stored, [
                'transaction_id' => (int) $transaction['id'],
                'is_completed' => (int) ($stored['is_completed'] ?? 0),
            ]);
        }, $this->defaultFulfillmentChecklist());
    }

    private function defaultFulfillmentChecklist(): array
    {
        return [
            [
                'checklist_key' => 'vehicle_documents',
                'key' => 'vehicle_documents',
                'label' => 'Dokumen kendaraan disiapkan',
                'is_required' => 1,
                'sort_order' => 10,
            ],
            [
                'checklist_key' => 'invoice_receipt',
                'key' => 'invoice_receipt',
                'label' => 'Kwitansi atau invoice disiapkan',
                'is_required' => 1,
                'sort_order' => 20,
            ],
            [
                'checklist_key' => 'unit_final_check',
                'key' => 'unit_final_check',
                'label' => 'Kondisi unit dicek ulang',
                'is_required' => 1,
                'sort_order' => 30,
            ],
            [
                'checklist_key' => 'handover_schedule',
                'key' => 'handover_schedule',
                'label' => 'Jadwal serah terima dikonfirmasi',
                'is_required' => 1,
                'sort_order' => 40,
            ],
            [
                'checklist_key' => 'handover_done',
                'key' => 'handover_done',
                'label' => 'Serah terima kendaraan selesai',
                'is_required' => 1,
                'sort_order' => 50,
            ],
        ];
    }

    private function isFulfillmentChecklistComplete(array $transaction): bool
    {
        $items = $this->fulfillmentChecklist($transaction);

        foreach ($items as $item) {
            if ((bool) ($item['is_required'] ?? true) && ! (bool) ($item['is_completed'] ?? false)) {
                return false;
            }
        }

        return $items !== [];
    }

    private function assertPaymentSession(array $session): array
    {
        foreach ([
            'provider_name',
            'provider_order_id',
            'payment_method',
            'transaction_status',
            'gross_amount',
            'expires_at',
            'payment_data',
            'payload_request',
            'payload_response',
        ] as $field) {
            if (! array_key_exists($field, $session)) {
                throw new ValidationException([
                    'payment_session' => 'Payment provider response is missing ' . $field . '.',
                ]);
            }
        }

        $session += [
            'provider_transaction_id' => null,
            'midtrans_token' => null,
            'midtrans_redirect_url' => null,
        ];

        return $session;
    }

    private function recordProviderFailure(int $transactionId, PaymentProviderException $exception): void
    {
        try {
            $this->pdo->beginTransaction();
            $this->paymentLogs->record($transactionId, $exception->logPayload());
            $this->pdo->commit();
        } catch (Throwable $logException) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
        }
    }

    private function requireTransaction(int $transactionId): array
    {
        $transaction = $this->transactions->findById($transactionId);

        if (! $transaction) {
            throw new NotFoundException('Transaksi tidak ditemukan.');
        }

        return $transaction;
    }

    private function resolveCarPrice(array $car): int
    {
        foreach (['price_discount', 'price_cash', 'price_credit'] as $field) {
            if (isset($car[$field]) && (int) $car[$field] > 0) {
                return (int) $car[$field];
            }
        }

        throw new ValidationException(['car_id' => 'Car price is not available.']);
    }

    private function generateTransactionCode(): string
    {
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $code = 'TRX-' . date('Ymd-His') . '-' . strtoupper(bin2hex(random_bytes(3)));

            if (! $this->transactions->transactionCodeExists($code)) {
                return $code;
            }
        }

        throw new ValidationException(['transaction_code' => 'Unable to generate unique transaction code.']);
    }

    private function fetchPaymentQr(string $source): array
    {
        if (preg_match('/^data:image\/([a-z0-9.+-]+);base64,(.+)$/i', $source, $matches) === 1) {
            $decoded = base64_decode($matches[2], true);
            if ($decoded === false) {
                throw new HttpException('QR pembayaran tidak valid.', 422);
            }

            return [
                'body' => $decoded,
                'content_type' => 'image/' . strtolower($matches[1]),
            ];
        }

        if (! filter_var($source, FILTER_VALIDATE_URL)) {
            throw new HttpException('Sumber QR pembayaran tidak valid.', 422);
        }

        $parts = parse_url($source);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = strtolower((string) ($parts['host'] ?? ''));

        if (! in_array($scheme, ['http', 'https'], true) || $host === '' || $this->isPrivateHost($host)) {
            throw new HttpException('Sumber QR pembayaran tidak diizinkan.', 422);
        }

        if (function_exists('curl_init')) {
            return $this->fetchPaymentQrWithCurl($source);
        }

        return $this->fetchPaymentQrWithStream($source);
    }

    private function fetchPaymentQrWithCurl(string $url): array
    {
        $headers = [];
        $curl = curl_init($url);

        curl_setopt_array($curl, [
            CURLOPT_HTTPGET => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_HTTPHEADER => ['Accept: image/png,image/jpeg,image/webp,image/*'],
            CURLOPT_HEADERFUNCTION => static function ($curlHandle, string $headerLine) use (&$headers): int {
                $length = strlen($headerLine);
                $parts = explode(':', $headerLine, 2);

                if (count($parts) === 2) {
                    $headers[strtolower(trim($parts[0]))] = trim($parts[1]);
                }

                return $length;
            },
        ]);

        $body = curl_exec($curl);
        $statusCode = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $contentType = (string) curl_getinfo($curl, CURLINFO_CONTENT_TYPE);
        $error = curl_error($curl);
        curl_close($curl);

        if ($body === false) {
            throw new HttpException('Gagal mengambil QR pembayaran: ' . $error, 502);
        }

        return $this->normalizePaymentQrDownload((string) $body, $statusCode, $contentType ?: ($headers['content-type'] ?? ''));
    }

    private function fetchPaymentQrWithStream(string $url): array
    {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => "Accept: image/png,image/jpeg,image/webp,image/*\r\n",
                'timeout' => 20,
                'ignore_errors' => true,
            ],
        ]);

        $body = @file_get_contents($url, false, $context);
        if ($body === false) {
            throw new HttpException('Gagal mengambil QR pembayaran.', 502);
        }

        $statusCode = 200;
        $contentType = '';
        foreach ($http_response_header ?? [] as $headerLine) {
            if (preg_match('/\s(\d{3})\s/', $headerLine, $matches) === 1) {
                $statusCode = (int) $matches[1];
            }

            if (stripos($headerLine, 'Content-Type:') === 0) {
                $contentType = trim(substr($headerLine, strlen('Content-Type:')));
            }
        }

        return $this->normalizePaymentQrDownload((string) $body, $statusCode, $contentType);
    }

    private function normalizePaymentQrDownload(string $body, int $statusCode, string $contentType): array
    {
        if ($statusCode >= 400) {
            throw new HttpException('QR pembayaran tidak bisa diunduh dari provider.', 502);
        }

        $normalizedType = strtolower(trim(explode(';', $contentType)[0] ?? ''));
        if ($normalizedType === '' || strpos($normalizedType, 'image/') !== 0) {
            $normalizedType = $this->detectPaymentQrContentType($body);
        }

        if ($normalizedType === null) {
            throw new HttpException('Provider tidak mengembalikan file gambar QR.', 502);
        }

        return [
            'body' => $body,
            'content_type' => $normalizedType,
        ];
    }

    private function latestQrisPaymentLogWithQr(array $logs): ?array
    {
        foreach ($logs as $rawLog) {
            $log = TransactionMapper::paymentLog($rawLog);
            $method = (string) ($log['payment_method'] ?? '');
            $qrCodeUrl = $log['qr_code_url'] ?? null;

            if ($method === 'qris' && is_string($qrCodeUrl) && trim($qrCodeUrl) !== '') {
                return $log;
            }
        }

        return null;
    }

    private function detectPaymentQrContentType(string $body): ?string
    {
        if (strncmp($body, "\x89PNG\r\n\x1a\n", 8) === 0) {
            return 'image/png';
        }

        if (strncmp($body, "\xff\xd8\xff", 3) === 0) {
            return 'image/jpeg';
        }

        if (strncmp($body, 'RIFF', 4) === 0 && substr($body, 8, 4) === 'WEBP') {
            return 'image/webp';
        }

        if (stripos(ltrim($body), '<svg') === 0) {
            return 'image/svg+xml';
        }

        return null;
    }

    private function paymentQrFilename(array $transaction): string
    {
        $code = preg_replace('/[^A-Za-z0-9_-]+/', '-', (string) ($transaction['transaction_code'] ?? $transaction['id'] ?? 'payment'));
        $code = trim((string) $code, '-');

        return 'qris-payment-' . ($code !== '' ? $code : 'transaction') . '.png';
    }

    private function isPrivateHost(string $host): bool
    {
        if (in_array($host, ['localhost', '127.0.0.1', '::1'], true)) {
            return true;
        }

        if (filter_var($host, FILTER_VALIDATE_IP) === false) {
            return false;
        }

        return preg_match('/^(10\.|127\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/', $host) === 1;
    }

}
