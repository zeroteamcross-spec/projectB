<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Services;

use App\Core\Exceptions\HttpException;
use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\ValidationException;
use App\Infrastructure\Payment\PaymentProviderException;
use App\Infrastructure\Payment\PaymentProviderInterface;
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

    public function __construct(
        PDO $pdo,
        TransactionRepository $transactions,
        PaymentLogService $paymentLogs,
        PaymentProviderInterface $paymentProvider,
        AffiliateService $affiliateService,
        ?NotificationService $notificationService = null
    ) {
        $this->pdo = $pdo;
        $this->transactions = $transactions;
        $this->paymentLogs = $paymentLogs;
        $this->paymentProvider = $paymentProvider;
        $this->affiliateService = $affiliateService;
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
        $dpAmount = $paymentType === 'dp' ? (int) $data['dp_amount'] : null;

        if ($paymentType === 'dp' && $dpAmount >= $carPrice) {
            throw new ValidationException(['dp_amount' => 'The dp_amount field must be lower than car_price.']);
        }

        $remainingAmount = $paymentType === 'dp' ? $carPrice - $dpAmount : 0;
        $transactionCode = $this->generateTransactionCode();
        $now = date('Y-m-d H:i:s');

        try {
            $this->pdo->beginTransaction();
            $transactionId = $this->transactions->create([
                'transaction_code' => $transactionCode,
                'buyer_user_id' => $buyerUserId,
                'seller_user_id' => (int) $car['seller_user_id'],
                'car_id' => (int) $car['id'],
                'car_price' => $carPrice,
                'payment_type' => $paymentType,
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

        $session = $this->createProviderSession(
            $transactionId,
            fn (): array => $this->paymentProvider->createInitialPayment($transaction, $buyer, $data['payment_method'])
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
        TransactionPolicy::ensureCanUpdateStatus($user, $transaction, $data['transaction_status']);
        $this->applyStatus($transaction, $data['transaction_status']);

        return $this->detail($user, $transactionId);
    }

    public function updateFulfillmentChecklist(array $user, int $transactionId, array $data): array
    {
        $transaction = $this->requireTransaction($transactionId);
        TransactionPolicy::ensureCanManageFulfillmentChecklist($user, $transaction);

        if (($transaction['transaction_status'] ?? null) !== 'paid') {
            throw new ValidationException([
                'transaction_status' => 'Checklist hanya bisa diproses setelah pembayaran lunas.',
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

    public function completePayment(array $user, int $transactionId, array $data): array
    {
        $transaction = $this->requireTransaction($transactionId);
        TransactionPolicy::ensureCanCompletePayment($user, $transaction);

        if (($transaction['payment_type'] ?? null) !== 'dp') {
            throw new ValidationException(['payment_type' => 'Only DP transactions can use complete payment.']);
        }

        if (($transaction['transaction_status'] ?? null) === 'paid') {
            throw new ValidationException(['transaction_status' => 'Transaction is already paid.']);
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

        $grossAmount = isset($payload['gross_amount']) ? (int) $payload['gross_amount'] : null;

        try {
            $this->pdo->beginTransaction();
            $log = $this->paymentLogs->record((int) $transaction['id'], [
                'provider_name' => $payload['provider_name'] ?? 'midtrans',
                'provider_order_id' => $providerOrderId,
                'provider_transaction_id' => $payload['transaction_id'] ?? null,
                'payment_method' => $payload['payment_type'] ?? null,
                'transaction_status' => $payload['transaction_status'],
                'gross_amount' => $grossAmount,
                'payload_callback' => $payload['payload_callback'] ?? $payload,
            ]);

            $nextStatus = $this->paymentLogs->providerStatusToCanon($transaction, $payload['transaction_status'], $grossAmount);

            if ($nextStatus !== null) {
                $this->applyStatus($transaction, $nextStatus);
            }

            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return [
            'transaction' => TransactionMapper::status($this->requireTransaction((int) $transaction['id'])),
            'payment_log' => $log,
        ];
    }

    public function expirePendingTransactions(): array
    {
        $now = date('Y-m-d H:i:s');
        $threshold = date('Y-m-d H:i:s', strtotime('-24 hours'));
        $expiredTransactionIds = [];

        foreach ($this->transactions->listStalePending($threshold) as $transaction) {
            $providerOrderId = trim((string) ($transaction['midtrans_order_id'] ?? ''));

            if ($providerOrderId !== '') {
                $providerStatus = $this->paymentProvider->checkStatus($providerOrderId);
                $grossAmount = isset($providerStatus['gross_amount']) ? (int) $providerStatus['gross_amount'] : null;

                try {
                    $this->pdo->beginTransaction();
                    $this->paymentLogs->record((int) $transaction['id'], [
                        'provider_name' => 'midtrans',
                        'provider_order_id' => $providerOrderId,
                        'provider_transaction_id' => $providerStatus['transaction_id'] ?? null,
                        'payment_method' => $providerStatus['payment_type'] ?? null,
                        'transaction_status' => $providerStatus['transaction_status'] ?? null,
                        'gross_amount' => $grossAmount,
                        'payload_callback' => $providerStatus,
                    ]);

                    $providerNextStatus = $this->paymentLogs->providerStatusToCanon(
                        $transaction,
                        $providerStatus['transaction_status'] ?? null,
                        $grossAmount
                    );
                    $nextStatus = in_array($providerNextStatus, ['dp_paid', 'paid', 'completed'], true)
                        ? $providerNextStatus
                        : 'expired';

                    $this->applyStatus($transaction, $nextStatus);

                    if ($nextStatus === 'expired') {
                        $expiredTransactionIds[] = (int) $transaction['id'];
                        $this->transactions->publishReservedCarsByIds([(int) $transaction['car_id']]);
                    }

                    $this->pdo->commit();
                } catch (Throwable $exception) {
                    if ($this->pdo->inTransaction()) {
                        $this->pdo->rollBack();
                    }

                    throw $exception;
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

    private function applyStatus(array $transaction, string $status): void
    {
        if ($status === 'dp_paid' && ($transaction['payment_type'] ?? null) !== 'dp') {
            throw new ValidationException(['transaction_status' => 'dp_paid is only valid for DP transactions.']);
        }

        if ($status === 'completed' && ($transaction['transaction_status'] ?? null) !== 'paid') {
            throw new ValidationException(['transaction_status' => 'Only paid transactions can be completed.']);
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
                $remainingAmount = max(0, (int) $transaction['car_price'] - (int) ($transaction['dp_amount'] ?? 0));
            }

            $this->transactions->updateStatus((int) $transaction['id'], [
                'transaction_status' => $status,
                'remaining_amount' => $remainingAmount,
                'paid_at' => $paidAt,
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            if ($status === 'paid') {
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
        $targetListingStatus = $status === 'paid' ? 'sold' : 'reserved';
        $allowedCurrentStatuses = $this->allowedListingStatusesForLock($status, $currentStatus);

        if (! $this->transactions->updateCarListingStatus($carId, $targetListingStatus, $allowedCurrentStatuses)) {
            throw new ValidationException([
                'car_id' => $status === 'dp_paid'
                    ? 'Mobil tidak bisa dikunci untuk DP karena status listing sudah berubah.'
                    : 'Mobil tidak bisa ditandai terjual karena status listing sudah berubah.',
            ]);
        }
    }

    private function allowedListingStatusesForLock(string $status, string $currentTransactionStatus): array
    {
        if ($status === 'dp_paid') {
            return $currentTransactionStatus === 'dp_paid'
                ? ['published', 'reserved']
                : ['published'];
        }

        if ($currentTransactionStatus === 'paid') {
            return ['published', 'reserved', 'sold'];
        }

        if ($currentTransactionStatus === 'dp_paid') {
            return ['published', 'reserved'];
        }

        return ['published'];
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
