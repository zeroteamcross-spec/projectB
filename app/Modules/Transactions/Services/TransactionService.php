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
use App\Modules\Auth\Services\AuthService;
use App\Modules\Notifications\Services\NotificationService;
use App\Modules\Transactions\Mappers\TransactionMapper;
use App\Modules\Transactions\Policies\TransactionPolicy;
use App\Modules\Transactions\Repositories\TransactionRepository;
use App\Modules\Transactions\Repositories\TransactionPaymentOperationRepository;
use PDO;
use DateTimeImmutable;
use DateTimeZone;
use Throwable;

class TransactionService
{
    private PDO $pdo;

    private TransactionRepository $transactions;

    private TransactionPaymentOperationRepository $paymentOperations;

    private PaymentLogService $paymentLogs;

    private PaymentProviderInterface $paymentProvider;

    private AffiliateService $affiliateService;

    private ?NotificationService $notificationService;

    private StorageServiceInterface $storage;

    private ?AuthService $authService;

    public function __construct(
        PDO $pdo,
        TransactionRepository $transactions,
        PaymentLogService $paymentLogs,
        PaymentProviderInterface $paymentProvider,
        AffiliateService $affiliateService,
        StorageServiceInterface $storage,
        ?NotificationService $notificationService = null,
        ?AuthService $authService = null
    ) {
        $this->pdo = $pdo;
        $this->transactions = $transactions;
        $this->paymentOperations = new TransactionPaymentOperationRepository($pdo);
        $this->paymentLogs = $paymentLogs;
        $this->paymentProvider = $paymentProvider;
        $this->affiliateService = $affiliateService;
        $this->storage = $storage;
        $this->notificationService = $notificationService;
        $this->authService = $authService;
    }

    public function createOfflineBooking(array $user, array $data): array
    {
        $car = $this->transactions->findCarForTransaction((int) ($data['car_id'] ?? 0));
        if ($car === null) {
            throw new NotFoundException('Mobil tidak ditemukan.');
        }
        TransactionPolicy::ensureCanCreateOfflineBooking($user, $car);
        if (($car['listing_status'] ?? null) !== 'published') {
            throw new ValidationException(['car_id' => 'Mobil tidak tersedia untuk booking.']);
        }
        if ($this->authService === null) {
            throw new HttpException('Auth service belum tersedia.', 500);
        }

        $carPrice = $this->resolveCarPrice($car);
        $fee = (int) ($car['dp_amount'] ?? 0);
        $this->validateOfflineFee($data['payment_amount'] ?? null, $fee, $carPrice);
        $paidAt = $this->offlinePaidAt($data['paid_at'] ?? null);
        $note = $this->offlineNote($data['note'] ?? null);
        $now = date('Y-m-d H:i:s');

        try {
            $this->pdo->beginTransaction();
            if (! $this->transactions->updateCarListingStatus((int) $car['id'], 'reserved', ['published'])) {
                throw new ValidationException(['car_id' => 'Mobil sudah dipesan pembeli lain.']);
            }

            $buyerId = $this->authService->createBuyerForOfflineBooking(
                (string) ($data['buyer_name'] ?? ''),
                isset($data['buyer_phone_number']) ? (string) $data['buyer_phone_number'] : null,
                (string) ($data['buyer_username'] ?? ''),
                (string) ($data['buyer_password'] ?? ''),
                isset($data['buyer_email']) ? (string) $data['buyer_email'] : null
            );
            $transactionId = $this->transactions->create([
                'transaction_code' => $this->generateTransactionCode(),
                'buyer_user_id' => $buyerId,
                'seller_user_id' => (int) $user['id'],
                'car_id' => (int) $car['id'],
                'car_price' => $carPrice,
                'payment_type' => 'dp',
                'payment_method' => 'offline_payment',
                'dp_amount' => $fee,
                'remaining_amount' => $carPrice - $fee,
                'transaction_status' => 'pending_payment',
                'affiliate_id' => null,
                'affiliate_referral_code_snapshot' => null,
                'midtrans_order_id' => null,
                'midtrans_token' => null,
                'midtrans_redirect_url' => null,
                'expires_at' => null,
                'paid_at' => null,
                'created_at' => $now,
                'updated_at' => null,
            ]);
            $transaction = $this->requireTransaction($transactionId);
            $transaction['paid_at'] = $paidAt;
            $this->applyStatus($transaction, 'dp_paid');
            $this->recordOfflinePaymentLog($transactionId, $transaction['transaction_code'], $fee, $paidAt, $note, (int) $user['id']);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }

        $result = $this->detail($user, $transactionId);
        $result['buyer']['buyer_username'] = strtolower(trim((string) $data['buyer_username']));

        return $result;
    }

    public function recordOfflinePayment(array $user, int $transactionId, array $data): array
    {
        $transaction = $this->requireTransaction($transactionId);
        TransactionPolicy::ensureCanRecordOfflinePayment($user, $transaction);
        $paidAt = $this->offlinePaidAt($data['paid_at'] ?? null);
        $note = $this->offlineNote($data['note'] ?? null);
        $gate = $this->beginOfflineConversion($user, $transactionId, $data);

        try {
            $providerPayment = $this->verifyUnpaidProviderOrders($transactionId, $gate);
            if ($providerPayment !== null) {
                $current = $this->requireTransaction($transactionId);
                $this->processProviderStatus($current, (string) $providerPayment['order_id'], $providerPayment, 'response');
                throw new ValidationException(['transaction_status' => 'Midtrans sudah menerima pembayaran.']);
            }
            $this->finishOfflineConversion($user, $transactionId, $data, $paidAt, $note, $gate);
        } catch (Throwable $exception) {
            $this->closeOfflineGate($gate, $exception);
            throw $exception;
        }

        return $this->detail($user, $transactionId);
    }

    private function validateOfflineFee($amount, int $fee, int $carPrice): void
    {
        if ($fee <= 0 || $fee >= $carPrice) {
            throw new ValidationException(['car_id' => 'Booking Fee mobil tidak valid.']);
        }
        if (filter_var($amount, FILTER_VALIDATE_INT) === false || (int) $amount !== $fee) {
            throw new ValidationException(['payment_amount' => 'Nominal pembayaran harus sama persis dengan Booking Fee.']);
        }
    }

    private function offlinePaidAt($value): string
    {
        if (! is_string($value)) {
            throw new ValidationException(['paid_at' => 'Tanggal pembayaran harus berformat YYYY-MM-DDTHH:mm.']);
        }
        $date = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i', $value, new DateTimeZone('Asia/Jakarta'));
        $errors = DateTimeImmutable::getLastErrors();
        if ($date === false || $date->format('Y-m-d\TH:i') !== $value
            || ($errors !== false && ($errors['warning_count'] > 0 || $errors['error_count'] > 0))) {
            throw new ValidationException(['paid_at' => 'Tanggal pembayaran harus berformat YYYY-MM-DDTHH:mm.']);
        }

        if ($date > new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta'))) {
            throw new ValidationException(['paid_at' => 'Tanggal pembayaran tidak boleh di masa depan.']);
        }

        return $date->format('Y-m-d H:i:s');
    }

    private function offlineNote($value): ?string
    {
        if ($value !== null && ! is_string($value)) {
            throw new ValidationException(['note' => 'Catatan pembayaran tidak valid.']);
        }
        $note = $value !== null ? trim($value) : '';
        if (strlen($note) > 500) {
            throw new ValidationException(['note' => 'Catatan pembayaran maksimal 500 karakter.']);
        }

        return $note !== '' ? $note : null;
    }

    private function ensureOfflineConvertible(array $transaction, array $data): void
    {
        if (($transaction['transaction_status'] ?? null) !== 'pending_payment'
            || ($transaction['payment_type'] ?? null) !== 'dp'
            || ($transaction['paid_at'] ?? null) !== null
            || ($transaction['payment_method'] ?? null) === 'offline_payment') {
            throw new ValidationException(['transaction_status' => 'Hanya Booking Fee yang belum dibayar dapat dicatat offline.']);
        }
        if (trim((string) ($transaction['manual_transfer_proof_path'] ?? '')) !== '') {
            throw new ValidationException(['transaction_status' => 'Bukti transfer sudah ada; verifikasi pembayaran terlebih dahulu.']);
        }
        $this->validateOfflineFee($data['payment_amount'] ?? null, (int) ($transaction['dp_amount'] ?? 0), (int) $transaction['car_price']);
        if ($this->paymentLogs->hasSuccessfulPayment((int) $transaction['id'])) {
            throw new ValidationException(['transaction_status' => 'Pembayaran lain sudah tercatat.']);
        }
    }

    private function beginOfflineConversion(array $user, int $transactionId, array $data): array
    {
        $this->assertPaymentOperationStorageAvailable();
        $this->pdo->beginTransaction();
        try {
            $transaction = $this->transactions->lockById($transactionId);
            if ($transaction === null) {
                throw new NotFoundException('Transaksi tidak ditemukan.');
            }
            TransactionPolicy::ensureCanRecordOfflinePayment($user, $transaction);
            $this->ensureOfflineConvertible($transaction, $data);

            $offlineGates = $this->paymentOperations->offlineConversionOperations($transactionId, true);
            // Take the clock reading only after the transaction/gate locks are held.
            $now = date('Y-m-d H:i:s');
            $nowTimestamp = strtotime($now);
            $newestGate = $offlineGates[0] ?? null;
            if (($newestGate['operation_status'] ?? null) === 'in_flight') {
                $leaseToken = $newestGate['lease_token'] ?? null;
                $leaseExpiresAt = $newestGate['lease_expires_at'] ?? null;
                $leaseExpiry = $this->leaseExpiryTimestamp($leaseExpiresAt);
                if (! is_string($leaseToken) || trim($leaseToken) === '' || $leaseExpiry === null) {
                    throw new HttpException('Lease pengalihan offline tidak dapat diverifikasi; proses ditolak.', 409);
                }
                if ($nowTimestamp === false || $leaseExpiry > $nowTimestamp) {
                    throw new HttpException('Pemeriksaan pembayaran lain masih berjalan.', 409);
                }
                if (! $this->paymentOperations->fenceExpiredOfflineConversionGate(
                    $transactionId,
                    (int) $newestGate['id'],
                    $leaseToken,
                    (int) ($newestGate['fence'] ?? -1),
                    (string) $leaseExpiresAt,
                    $now
                )) {
                    throw new HttpException('Lease pengalihan offline berubah saat diperiksa; proses ditolak.', 409);
                }
            }
            if ($this->paymentOperations->hasActiveOfflineGate($transactionId, $now)) {
                throw new HttpException('Pemeriksaan pembayaran lain masih berjalan.', 409);
            }

            foreach ($this->paymentOperations->sessions($transactionId) as $sessionOperation) {
                if (($sessionOperation['operation_status'] ?? null) === 'prepared') {
                    // A prepared row has not been claimed and therefore has not
                    // been sent to Midtrans. The offline gate fences its worker.
                    $this->paymentOperations->update((int) $sessionOperation['id'], [
                        'operation_status' => 'failed',
                        'error_payload_json' => json_encode(['reason' => 'Superseded before provider request.']),
                        'completed_at' => $now,
                        'updated_at' => $now,
                    ]);
                } elseif (($sessionOperation['operation_status'] ?? null) === 'in_flight') {
                    $leaseExpiresAt = $sessionOperation['lease_expires_at'] ?? null;
                    $leaseExpiry = is_string($leaseExpiresAt) ? strtotime($leaseExpiresAt) : false;
                    if ($leaseExpiry === false) {
                        throw new HttpException('Lease sesi pembayaran tidak dapat diverifikasi; pengalihan offline ditolak.', 409);
                    }
                    if ($leaseExpiry > time()) {
                        throw new HttpException('Sesi pembayaran sedang dibuat; pengalihan offline ditolak.', 409);
                    }
                    $leaseToken = $sessionOperation['lease_token'] ?? null;
                    if (! is_string($leaseToken) || $leaseToken === ''
                        || ! $this->paymentOperations->fenceExpiredSessionLease(
                            (int) $sessionOperation['id'],
                            $leaseToken,
                            (int) ($sessionOperation['fence'] ?? -1),
                            (string) $leaseExpiresAt,
                            $now
                        )) {
                        throw new HttpException('Lease sesi pembayaran berubah saat diperiksa; pengalihan offline ditolak.', 409);
                    }
                }
            }

            $orders = array_values(array_unique(array_merge(
                $this->paymentLogs->midtransOrderIds($transactionId),
                $this->paymentOperations->knownOrderIds($transactionId),
                [trim((string) ($transaction['midtrans_order_id'] ?? ''))]
            )));
            $orders = array_values(array_filter($orders, static fn (string $orderId): bool => $orderId !== ''));
            if ($orders === [] && ($transaction['payment_method'] ?? null) !== 'manual_transfer') {
                throw new ValidationException(['payment_method' => 'Sesi provider tidak dapat diverifikasi.']);
            }

            $leaseToken = $this->newOperationToken();
            $operationId = $this->paymentOperations->create([
                'transaction_id' => $transactionId,
                'operation_key' => $this->newOperationToken(),
                'operation_type' => 'offline_conversion',
                'operation_status' => 'in_flight',
                'fence' => $this->paymentOperations->nextFence($transactionId),
                'lease_token' => $leaseToken,
                'lease_expires_at' => date('Y-m-d H:i:s', time() + 1200),
                'request_payload' => [
                    'order_ids' => $orders,
                    'payment_amount' => (int) $data['payment_amount'],
                ],
                'created_at' => $now,
            ]);
            $operation = $this->paymentOperations->findById($operationId);
            $operation['_orders'] = $orders;
            $this->pdo->commit();

            return $operation;
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    private function verifyUnpaidProviderOrders(int $transactionId, array $gate): ?array
    {
        $orders = $gate['_orders'] ?? [];
        foreach ($orders as $orderId) {
            $before = $this->runProviderOperation(
                $transactionId,
                $gate,
                'status_check',
                $orderId,
                fn (): array => $this->paymentProvider->checkStatus($orderId),
                null,
                'status_before_cancel'
            );
            $status = $this->verifiedProviderStatus($orderId, $before);
            if ($this->providerStatusIsPaid($status, $before)) {
                return $before;
            }

            if ($status === 'pending') {
                $cancelKey = $this->newOperationToken();
                $cancel = $this->runProviderOperation(
                    $transactionId,
                    $gate,
                    'cancel',
                    $orderId,
                    fn (): array => $this->paymentProvider->cancelPending($orderId, $cancelKey),
                    $cancelKey,
                    'cancel_pending'
                );
                $cancelStatus = $this->verifiedProviderStatus($orderId, $cancel);
                if ($this->providerStatusIsPaid($cancelStatus, $cancel)) {
                    return $cancel;
                }
                if ($cancelStatus !== 'cancel') {
                    throw new ValidationException(['payment_method' => 'Midtrans tidak mengonfirmasi pembatalan.']);
                }

                $after = $this->runProviderOperation(
                    $transactionId,
                    $gate,
                    'status_check',
                    $orderId,
                    fn (): array => $this->paymentProvider->checkStatus($orderId),
                    null,
                    'status_after_cancel'
                );
                $status = $this->verifiedProviderStatus($orderId, $after);
                if ($this->providerStatusIsPaid($status, $after)) {
                    return $after;
                }
            }

            if (! in_array($status, ['cancel', 'expire', 'deny', 'failure', 'failed'], true)) {
                throw new ValidationException(['payment_method' => 'Status Midtrans belum memastikan pembayaran tidak terjadi.']);
            }
        }

        return null;
    }

    private function runProviderOperation(
        int $transactionId,
        array $gate,
        string $operationType,
        string $providerOrderId,
        callable $call,
        ?string $idempotencyKey = null,
        ?string $observationAction = null
    ): array {
        $now = date('Y-m-d H:i:s');
        $this->pdo->beginTransaction();
        try {
            $transaction = $this->transactions->lockById($transactionId);
            if ($transaction === null) {
                throw new NotFoundException('Transaksi tidak ditemukan.');
            }
            $parent = $this->lockCurrentOfflineGate($transactionId, $gate);
            $gateRequest = $this->decodeOperationJson($parent['request_payload_json'] ?? null);
            if (filter_var($gateRequest['payment_amount'] ?? null, FILTER_VALIDATE_INT) === false) {
                throw new HttpException('Data nominal pada operasi pengalihan offline tidak dapat diverifikasi.', 409);
            }
            $this->ensureOfflineConvertible($transaction, ['payment_amount' => (int) $gateRequest['payment_amount']]);
            $now = date('Y-m-d H:i:s');
            $this->assertOfflineGateLeaseLive($parent, $now);
            $leaseUntil = date('Y-m-d H:i:s', strtotime($now) + 1200);
            if (! $this->paymentOperations->renewOfflineConversionGateLease(
                $transactionId,
                (int) $parent['id'],
                (string) $parent['lease_token'],
                (int) $parent['fence'],
                $now,
                $leaseUntil
            )) {
                throw new HttpException('Lease pengalihan offline sudah kedaluwarsa atau tersisih.', 409);
            }
            $parent['lease_expires_at'] = $leaseUntil;
            $childToken = $this->newOperationToken();
            $childId = $this->paymentOperations->create([
                'transaction_id' => $transactionId,
                'parent_operation_id' => (int) $parent['id'],
                'operation_key' => $this->newOperationToken(),
                'operation_type' => $operationType,
                'provider_order_id' => $providerOrderId,
                'idempotency_key' => $idempotencyKey,
                'operation_status' => 'in_flight',
                'fence' => (int) $parent['fence'],
                'lease_token' => $childToken,
                'lease_expires_at' => date('Y-m-d H:i:s', time() + 90),
                'first_attempt_at' => $now,
                'request_payload' => ['action' => $operationType, 'order_id' => $providerOrderId],
                'created_at' => $now,
            ]);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }

        try {
            $response = $call();
        } catch (Throwable $exception) {
            try {
                $this->finishOfflineProviderOperation(
                    $transactionId,
                    $gate,
                    $childId,
                    $childToken,
                    $operationType,
                    $providerOrderId,
                    null,
                    null,
                    [
                        'exception' => get_class($exception),
                        'message' => $exception->getMessage(),
                    ]
                );
            } catch (Throwable $journalException) {
                // Preserve the original provider failure if the lease was lost or journaling fails.
            }
            throw $exception;
        }

        try {
            $this->verifiedProviderStatus($providerOrderId, $response);
        } catch (Throwable $exception) {
            try {
                $this->finishOfflineProviderOperation(
                    $transactionId,
                    $gate,
                    $childId,
                    $childToken,
                    $operationType,
                    $providerOrderId,
                    null,
                    null,
                    [
                        'reason' => 'Provider response order_id did not match the requested order.',
                    ]
                );
            } catch (Throwable $journalException) {
                // Keep the original invalid-response exception visible.
            }
            throw $exception;
        }

        $this->finishOfflineProviderOperation(
            $transactionId,
            $gate,
            $childId,
            $childToken,
            $operationType,
            $providerOrderId,
            $observationAction,
            $response,
            null
        );

        return $response;
    }

    private function runUnparentedProviderOperation(
        int $transactionId,
        string $providerOrderId,
        ?array $sessionOperation = null,
        bool $allowTerminalState = false,
        ?array $callbackOwnerContext = null
    ): ?array
    {
        $this->assertPaymentOperationStorageAvailable();
        $now = date('Y-m-d H:i:s');
        $leaseToken = $this->newOperationToken();
        $this->pdo->beginTransaction();
        try {
            $transaction = $this->transactions->lockById($transactionId);
            if ($transaction === null) {
                throw new NotFoundException('Transaksi tidak ditemukan.');
            }
            $transactionStatus = (string) ($transaction['transaction_status'] ?? '');
            $statusCanBeChecked = $transactionStatus === 'pending_payment'
                || ($allowTerminalState && in_array($transactionStatus, [
                    'dp_paid', 'paid', 'completed', 'cancelled', 'expired', 'returned',
                ], true));
            if (! $statusCanBeChecked
                || (($transaction['payment_method'] ?? null) === 'offline_payment' && ! $allowTerminalState)) {
                $this->pdo->commit();

                return null;
            }
            if ($callbackOwnerContext !== null
                && ! $this->callbackOwnerIsCurrent(
                    $transactionId,
                    (string) ($transaction['transaction_code'] ?? ''),
                    $providerOrderId,
                    $callbackOwnerContext
                )) {
                $this->pdo->commit();

                return null;
            }

            $latestSession = $this->latestSessionOperation($transactionId);
            if ($sessionOperation !== null) {
                $storedSession = $latestSession === null
                    ? null
                    : $this->paymentOperations->findById((int) ($latestSession['id'] ?? 0), true);
                if ($storedSession === null
                    || (int) ($latestSession['id'] ?? 0) !== (int) ($sessionOperation['id'] ?? 0)
                    || (string) ($latestSession['operation_status'] ?? '') !== (string) ($sessionOperation['operation_status'] ?? '')
                    || (int) ($latestSession['fence'] ?? -1) !== (int) ($sessionOperation['fence'] ?? -2)
                    || ($latestSession['lease_token'] ?? null) !== ($sessionOperation['lease_token'] ?? null)
                    || ! in_array($storedSession['operation_type'] ?? null, ['initial_session', 'legacy_session', 'completion_session'], true)
                    || (string) ($storedSession['provider_order_id'] ?? '') !== $providerOrderId
                    || (string) ($storedSession['operation_type'] ?? '') !== (string) ($sessionOperation['operation_type'] ?? '')
                    || (string) ($storedSession['operation_status'] ?? '') !== (string) ($sessionOperation['operation_status'] ?? '')
                    || (int) ($storedSession['fence'] ?? -1) !== (int) ($sessionOperation['fence'] ?? -2)
                    || ($storedSession['lease_token'] ?? null) !== ($sessionOperation['lease_token'] ?? null)
                    || ($storedSession['lease_expires_at'] ?? null) !== ($sessionOperation['lease_expires_at'] ?? null)) {
                    $this->pdo->commit();

                    return null;
                }

                $sessionStatus = (string) ($storedSession['operation_status'] ?? '');
                if ($sessionStatus === 'in_flight') {
                    $leaseExpiresAt = $storedSession['lease_expires_at'] ?? null;
                    $leaseExpiry = is_string($leaseExpiresAt) ? strtotime($leaseExpiresAt) : false;
                    if ($leaseExpiry === false || $leaseExpiry > time()) {
                        $this->pdo->commit();

                        return null;
                    }
                    $sessionLeaseToken = $storedSession['lease_token'] ?? null;
                    if (! is_string($sessionLeaseToken) || $sessionLeaseToken === ''
                        || ! $this->paymentOperations->fenceExpiredSessionLease(
                            (int) $storedSession['id'],
                            $sessionLeaseToken,
                            (int) ($storedSession['fence'] ?? -1),
                            (string) $leaseExpiresAt,
                            $now
                        )) {
                        $this->pdo->commit();

                        return null;
                    }
                } elseif (! in_array($sessionStatus, ['unknown', 'completed', 'failed'], true)) {
                    $this->pdo->commit();

                    return null;
                }
            } elseif ($this->paymentOperations->sessions($transactionId) !== []
                || $this->providerOrderId($transaction) !== $providerOrderId) {
                // The legacy transaction/log fallback is usable only while no
                // durable session exists and the locked transaction still points
                // at the same provider order selected by the earlier scan.
                $this->pdo->commit();

                return null;
            }

            foreach ($this->paymentOperations->statusChecksForOrder($transactionId, $providerOrderId) as $existingCheck) {
                if (($existingCheck['operation_status'] ?? null) !== 'in_flight') {
                    continue;
                }
                $checkLeaseExpiresAt = $existingCheck['lease_expires_at'] ?? null;
                $checkLeaseExpiry = is_string($checkLeaseExpiresAt) ? strtotime($checkLeaseExpiresAt) : false;
                if ($checkLeaseExpiry !== false && $checkLeaseExpiry > time()) {
                    $this->pdo->commit();

                    return null;
                }

                $checkLeaseToken = $existingCheck['lease_token'] ?? null;
                if (! is_string($checkLeaseToken) || $checkLeaseToken === ''
                    || ! $this->paymentOperations->fenceStaleStatusCheck(
                        (int) $existingCheck['id'],
                        $checkLeaseToken,
                        (int) ($existingCheck['fence'] ?? -1),
                        is_string($checkLeaseExpiresAt) ? $checkLeaseExpiresAt : null,
                        $checkLeaseExpiry !== false,
                        $now
                    )) {
                    $this->pdo->commit();

                    return null;
                }
            }

            $operationFence = $this->paymentOperations->nextFence($transactionId);
            $operationId = $this->paymentOperations->create([
                'transaction_id' => $transactionId,
                'operation_key' => $this->newOperationToken(),
                'operation_type' => 'status_check',
                'provider_order_id' => $providerOrderId,
                'operation_status' => 'in_flight',
                'fence' => $operationFence,
                'lease_token' => $leaseToken,
                'lease_expires_at' => date('Y-m-d H:i:s', time() + 90),
                'first_attempt_at' => $now,
                'request_payload' => ['action' => 'status_check', 'order_id' => $providerOrderId],
                'created_at' => $now,
            ]);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }

        try {
            $response = $this->paymentProvider->checkStatus($providerOrderId);
        } catch (Throwable $exception) {
            try {
                $this->finishProviderOperation(
                    $transactionId,
                    $operationId,
                    $leaseToken,
                    $operationFence,
                    'status_check',
                    ! $allowTerminalState,
                    'unknown',
                    null,
                    [
                        'exception' => get_class($exception),
                        'message' => $exception->getMessage(),
                    ]
                );
            } catch (Throwable $journalException) {
                // Preserve the provider failure if operation journaling also fails.
            }
            throw $exception;
        }

        try {
            $this->verifiedProviderStatus($providerOrderId, $response);
        } catch (ValidationException $exception) {
            try {
                $this->finishProviderOperation(
                    $transactionId,
                    $operationId,
                    $leaseToken,
                    $operationFence,
                    'status_check',
                    ! $allowTerminalState,
                    'unknown',
                    $response,
                    [
                        'reason' => 'Provider status response order_id did not match the requested order.',
                    ]
                );
            } catch (Throwable $journalException) {
                // Keep the mismatch failure visible; never apply an unverified response.
            }

            throw $exception;
        }

        $this->finishProviderOperation(
            $transactionId,
            $operationId,
            $leaseToken,
            $operationFence,
            'status_check',
            ! $allowTerminalState,
            'completed',
            $response,
            null
        );

        return [
            'provider_payload' => $response,
            'status_check' => [
                'id' => $operationId,
                'fence' => $operationFence,
                'provider_order_id' => $providerOrderId,
            ],
            'session_operation_id' => $sessionOperation === null
                ? null
                : (int) ($sessionOperation['id'] ?? 0),
        ];
    }

    private function finishProviderOperation(
        int $transactionId,
        int $operationId,
        string $leaseToken,
        int $fence,
        string $operationType,
        bool $mustRemainPending,
        string $status,
        ?array $response,
        ?array $error
    ): void {
        $this->pdo->beginTransaction();
        try {
            $transaction = $this->transactions->lockById($transactionId);
            if ($transaction === null) {
                throw new NotFoundException('Transaksi tidak ditemukan.');
            }
            if ($mustRemainPending
                && (($transaction['transaction_status'] ?? null) !== 'pending_payment'
                    || ($transaction['payment_method'] ?? null) === 'offline_payment')) {
                throw new HttpException('Hasil status pembayaran tidak dapat diterapkan karena transaksi sudah berubah.', 409);
            }
            $rawProviderStatus = isset($response['transaction_status'])
                ? strtolower(trim((string) $response['transaction_status']))
                : null;
            $providerOrderId = is_string($response['order_id'] ?? null) ? $response['order_id'] : '';
            $expectedGrossAmount = $providerOrderId !== ''
                ? $this->expectedProviderOrderAmount($transaction, $providerOrderId)
                : null;
            $providerStatus = $rawProviderStatus === null
                ? null
                : $this->providerStatusForOperation($rawProviderStatus, $response ?? [], $expectedGrossAmount);
            if (! $this->paymentOperations->updateWithLiveLease($operationId, $operationType, $leaseToken, $fence, date('Y-m-d H:i:s'), [
                'operation_status' => $status,
                'provider_status' => $providerStatus,
                'response_payload_json' => $response === null ? null : json_encode($response, JSON_UNESCAPED_SLASHES),
                'error_payload_json' => $error === null ? null : json_encode($error, JSON_UNESCAPED_SLASHES),
                'lease_token' => null,
                'lease_expires_at' => null,
                'completed_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ])) {
                throw new HttpException('Hasil provider diabaikan karena lease operasi sudah berubah atau kedaluwarsa.', 409);
            }
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    /** Validate and lock the latest live offline-conversion gate. */
    private function lockCurrentOfflineGate(int $transactionId, array $gate): array
    {
        $gateId = (int) ($gate['id'] ?? 0);
        $expectedToken = $gate['lease_token'] ?? null;
        $expectedFence = (int) ($gate['fence'] ?? -1);
        if ($gateId < 1 || (int) ($gate['transaction_id'] ?? 0) !== $transactionId
            || ! is_string($expectedToken) || trim($expectedToken) === '') {
            throw new HttpException('Operasi pengalihan offline tidak valid.', 409);
        }

        $gates = $this->paymentOperations->offlineConversionOperations($transactionId, true);
        if ((int) ($gates[0]['id'] ?? 0) !== $gateId) {
            throw new HttpException('Operasi pengalihan offline telah tersisih.', 409);
        }
        $storedGate = $this->paymentOperations->findById($gateId, true);
        if ($storedGate === null
            || (int) ($storedGate['transaction_id'] ?? 0) !== $transactionId
            || ($storedGate['operation_type'] ?? null) !== 'offline_conversion'
            || ($storedGate['operation_status'] ?? null) !== 'in_flight'
            || ($storedGate['lease_token'] ?? null) !== $expectedToken
            || (int) ($storedGate['fence'] ?? -1) !== $expectedFence) {
            throw new HttpException('Lease pengalihan offline sudah tidak berlaku.', 409);
        }
        $this->assertOfflineGateLeaseLive($storedGate, date('Y-m-d H:i:s'));

        return $storedGate;
    }

    private function assertOfflineGateLeaseLive(array $gate, string $now): void
    {
        $leaseExpiry = $this->leaseExpiryTimestamp($gate['lease_expires_at'] ?? null);
        $nowTimestamp = strtotime($now);
        if ($leaseExpiry === null || $nowTimestamp === false || $leaseExpiry <= $nowTimestamp) {
            throw new HttpException('Lease pengalihan offline sudah tidak berlaku.', 409);
        }
    }

    private function finishOfflineProviderOperation(
        int $transactionId,
        array $gate,
        int $childId,
        string $childToken,
        string $operationType,
        string $providerOrderId,
        ?string $observationAction,
        ?array $response,
        ?array $error
    ): void {
        $now = date('Y-m-d H:i:s');
        $nowTimestamp = strtotime($now);
        $this->pdo->beginTransaction();
        try {
            $transaction = $this->transactions->lockById($transactionId);
            if ($transaction === null) {
                throw new NotFoundException('Transaksi tidak ditemukan.');
            }

            $parent = $this->lockCurrentOfflineGate($transactionId, $gate);
            $request = $this->decodeOperationJson($parent['request_payload_json'] ?? null);
            if (filter_var($request['payment_amount'] ?? null, FILTER_VALIDATE_INT) === false) {
                throw new HttpException('Data nominal pada operasi pengalihan offline tidak dapat diverifikasi.', 409);
            }
            $this->ensureOfflineConvertible($transaction, ['payment_amount' => (int) $request['payment_amount']]);
            $child = $this->paymentOperations->findById($childId, true);
            $childExpiry = $this->leaseExpiryTimestamp($child['lease_expires_at'] ?? null);
            // Refresh after both parent and child rows have been locked.
            $now = date('Y-m-d H:i:s');
            $nowTimestamp = strtotime($now);
            $this->assertOfflineGateLeaseLive($parent, $now);
            if ($child === null
                || (int) ($child['transaction_id'] ?? 0) !== $transactionId
                || (int) ($child['parent_operation_id'] ?? 0) !== (int) $parent['id']
                || ($child['operation_type'] ?? null) !== $operationType
                || (string) ($child['provider_order_id'] ?? '') !== $providerOrderId
                || (int) ($child['fence'] ?? -1) !== (int) $parent['fence']
                || ($child['operation_status'] ?? null) !== 'in_flight'
                || ($child['lease_token'] ?? null) !== $childToken
                || $childExpiry === null || $nowTimestamp === false || $childExpiry <= $nowTimestamp) {
                throw new HttpException('Lease operasi provider sudah berubah atau kedaluwarsa.', 409);
            }

            $newParentExpiry = date('Y-m-d H:i:s', $nowTimestamp + 1200);
            if (! $this->paymentOperations->renewOfflineConversionGateLease(
                $transactionId,
                (int) $parent['id'],
                (string) $parent['lease_token'],
                (int) $parent['fence'],
                $now,
                $newParentExpiry
            )) {
                throw new HttpException('Lease pengalihan offline sudah kedaluwarsa atau tersisih.', 409);
            }
            $parent['lease_expires_at'] = $newParentExpiry;

            $providerStatus = null;
            if ($response !== null) {
                if ($observationAction === null || trim($observationAction) === '') {
                    throw new HttpException('Jenis observasi provider tidak valid.', 409);
                }
                $rawProviderStatus = $this->verifiedProviderStatus($providerOrderId, $response);
                $expectedGrossAmount = $this->expectedProviderOrderAmount($transaction, $providerOrderId);
                $providerSuccessValidated = $this->providerSuccessIsValidated(
                    $rawProviderStatus,
                    $response,
                    $expectedGrossAmount
                );
                $providerStatus = $this->providerStatusForOperation(
                    $rawProviderStatus,
                    $response,
                    $expectedGrossAmount
                );
                $this->recordOfflineProviderObservation($transactionId, $providerOrderId, $observationAction, $response);
                $this->paymentOperations->recordProviderEventForTransaction(
                    $transactionId,
                    $providerOrderId,
                    $providerStatus,
                    false,
                    $providerSuccessValidated
                );
            }

            // The journal writes above may take time. Refresh and fence once
            // more immediately before committing the child result.
            $finalNow = date('Y-m-d H:i:s');
            $finalNowTimestamp = strtotime($finalNow);
            $this->assertOfflineGateLeaseLive($parent, $finalNow);
            if ($childExpiry === null || $finalNowTimestamp === false || $childExpiry <= $finalNowTimestamp) {
                throw new HttpException('Lease operasi provider sudah kedaluwarsa.', 409);
            }
            $finalParentExpiry = date('Y-m-d H:i:s', $finalNowTimestamp + 1200);
            if (! $this->paymentOperations->renewOfflineConversionGateLease(
                $transactionId,
                (int) $parent['id'],
                (string) $parent['lease_token'],
                (int) $parent['fence'],
                $finalNow,
                $finalParentExpiry
            )) {
                throw new HttpException('Lease pengalihan offline sudah kedaluwarsa atau tersisih.', 409);
            }

            $operationStatus = $response === null ? 'unknown' : 'completed';
            if (! $this->paymentOperations->updateWithLiveLease(
                $childId,
                $operationType,
                $childToken,
                (int) $parent['fence'],
                $finalNow,
                [
                    'operation_status' => $operationStatus,
                    'provider_status' => $providerStatus,
                    'response_payload_json' => $response === null ? null : json_encode($response, JSON_UNESCAPED_SLASHES),
                    'error_payload_json' => $error === null ? null : json_encode($error, JSON_UNESCAPED_SLASHES),
                    'lease_token' => null,
                    'lease_expires_at' => null,
                    'completed_at' => $finalNow,
                    'updated_at' => $finalNow,
                ]
            )) {
                throw new HttpException('Hasil provider diabaikan karena lease operasi sudah berubah atau kedaluwarsa.', 409);
            }

            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    private function finishOfflineConversion(
        array $user,
        int $transactionId,
        array $data,
        string $paidAt,
        ?string $note,
        array $gate
    ): void {
        $now = date('Y-m-d H:i:s');
        $this->pdo->beginTransaction();
        try {
            $current = $this->transactions->lockById($transactionId);
            if ($current === null) {
                throw new NotFoundException('Transaksi tidak ditemukan.');
            }
            $storedGate = $this->lockCurrentOfflineGate($transactionId, $gate);
            TransactionPolicy::ensureCanRecordOfflinePayment($user, $current);
            $this->ensureOfflineConvertible($current, $data);
            $now = date('Y-m-d H:i:s');
            $this->assertOfflineGateLeaseLive($storedGate, $now);
            $newLeaseExpiry = date('Y-m-d H:i:s', strtotime($now) + 1200);
            if (! $this->paymentOperations->renewOfflineConversionGateLease(
                $transactionId,
                (int) $storedGate['id'],
                (string) $storedGate['lease_token'],
                (int) $storedGate['fence'],
                $now,
                $newLeaseExpiry
            )) {
                throw new HttpException('Lease pengalihan offline sudah kedaluwarsa atau tersisih; pembayaran tidak dicatat.', 409);
            }
            $storedGate['lease_expires_at'] = $newLeaseExpiry;

            $knownOrders = array_values(array_unique(array_merge(
                $this->paymentLogs->midtransOrderIds($transactionId),
                $this->paymentOperations->knownOrderIds($transactionId),
                [trim((string) ($current['midtrans_order_id'] ?? ''))]
            )));
            $knownOrders = array_values(array_filter($knownOrders, static fn (string $orderId): bool => $orderId !== ''));
            $verified = [];
            foreach ($this->paymentOperations->sessions($transactionId) as $sessionOperation) {
                $orderId = trim((string) ($sessionOperation['provider_order_id'] ?? ''));
                if ($orderId !== '') {
                    $verified[$orderId] = strtolower((string) ($sessionOperation['provider_status'] ?? ''));
                }
            }
            foreach ($knownOrders as $orderId) {
                if (! isset($verified[$orderId])
                    || ! in_array($verified[$orderId], ['cancel', 'expire', 'deny', 'failure', 'failed'], true)) {
                    throw new ValidationException(['payment_method' => 'Semua order Midtrans harus terkonfirmasi terminal dan belum dibayar.']);
                }
            }
            if ($this->paymentLogs->hasSuccessfulPayment($transactionId)) {
                throw new ValidationException(['transaction_status' => 'Pembayaran lain sudah tercatat.']);
            }
            if (! $this->transactions->convertToOfflinePayment($transactionId)) {
                throw new ValidationException(['transaction_status' => 'Transaksi tidak lagi menunggu pembayaran.']);
            }
            $current['payment_method'] = 'offline_payment';
            $current['paid_at'] = $paidAt;
            $this->applyStatus($current, 'dp_paid');
            $this->recordOfflinePaymentLog(
                $transactionId,
                (string) $current['transaction_code'],
                (int) $current['dp_amount'],
                $paidAt,
                $note,
                (int) $user['id']
            );
            $closeNow = date('Y-m-d H:i:s');
            $this->assertOfflineGateLeaseLive($storedGate, $closeNow);
            if (! $this->paymentOperations->closeOfflineConversionGate(
                $transactionId,
                (int) $storedGate['id'],
                (string) $storedGate['lease_token'],
                (int) $storedGate['fence'],
                $closeNow,
                'converted',
                json_encode(['payment_method' => 'offline_payment', 'transaction_status' => 'dp_paid'], JSON_UNESCAPED_SLASHES),
                null
            )) {
                throw new HttpException('Operasi pengalihan offline telah berubah; pembayaran tidak dicatat.', 409);
            }
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    private function closeOfflineGate(array $gate, Throwable $exception): void
    {
        try {
            $now = date('Y-m-d H:i:s');
            $this->pdo->beginTransaction();
            $transactionId = (int) ($gate['transaction_id'] ?? 0);
            if ($transactionId < 1 || $this->transactions->lockById($transactionId) === null) {
                $this->pdo->rollBack();
                return;
            }
            $gates = $this->paymentOperations->offlineConversionOperations($transactionId, true);
            $gateId = (int) ($gate['id'] ?? 0);
            $latest = $gates[0] ?? null;
            $stored = $gateId > 0 ? $this->paymentOperations->findById($gateId, true) : null;
            // Refresh after the transaction, newest-gate, and target-gate locks.
            $now = date('Y-m-d H:i:s');
            $leaseExpiry = $this->leaseExpiryTimestamp($stored['lease_expires_at'] ?? null);
            $nowTimestamp = strtotime($now);
            if ((int) ($latest['id'] ?? 0) !== $gateId
                || $stored === null
                || (int) ($stored['transaction_id'] ?? 0) !== $transactionId
                || ($stored['operation_type'] ?? null) !== 'offline_conversion'
                || ($stored['operation_status'] ?? null) !== 'in_flight'
                || ! is_string($gate['lease_token'] ?? null)
                || trim((string) $gate['lease_token']) === ''
                || ($stored['lease_token'] ?? null) !== $gate['lease_token']
                || (int) ($stored['fence'] ?? -1) !== (int) ($gate['fence'] ?? -2)
                || $leaseExpiry === null || $nowTimestamp === false || $leaseExpiry <= $nowTimestamp) {
                $this->pdo->commit();
                return;
            }
            $closed = $this->paymentOperations->closeOfflineConversionGate(
                $transactionId,
                $gateId,
                (string) $stored['lease_token'],
                (int) $stored['fence'],
                $now,
                $exception instanceof ValidationException ? 'blocked' : 'unknown',
                null,
                json_encode([
                    'exception' => get_class($exception),
                    'message' => $exception->getMessage(),
                ], JSON_UNESCAPED_SLASHES)
            );
            if (! $closed) {
                $this->pdo->rollBack();
                return;
            }
            $this->pdo->commit();
        } catch (Throwable $persistException) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
        }
    }

    private function verifiedProviderStatus(string $orderId, array $payload): string
    {
        if (! is_string($payload['order_id'] ?? null) || $payload['order_id'] !== $orderId) {
            throw new ValidationException(['payment_method' => 'Identitas order Midtrans tidak cocok.']);
        }

        return strtolower(trim((string) ($payload['transaction_status'] ?? '')));
    }

    private function leaseExpiryTimestamp($value): ?int
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }
        $expiry = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', $value);
        $errors = DateTimeImmutable::getLastErrors();
        if ($expiry === false || $expiry->format('Y-m-d H:i:s') !== $value
            || ($errors !== false && ($errors['warning_count'] > 0 || $errors['error_count'] > 0))) {
            return null;
        }

        return $expiry->getTimestamp();
    }

    private function providerStatusIsPaid(string $status, array $providerPayload = []): bool
    {
        $status = strtolower(trim($status));
        if ($status === 'capture') {
            return array_key_exists('fraud_status', $providerPayload)
                && strtolower(trim((string) $providerPayload['fraud_status'])) === 'accept';
        }

        return in_array($status, ['settlement', 'capture', 'paid'], true);
    }

    private function providerSuccessIsValidated(
        string $providerStatus,
        array $providerPayload,
        ?int $expectedGrossAmount
    ): bool {
        $providerStatus = strtolower(trim($providerStatus));
        if (! in_array($providerStatus, ['settlement', 'capture', 'paid'], true)
            || $expectedGrossAmount === null) {
            return false;
        }

        if ($providerStatus === 'capture'
            && (! array_key_exists('fraud_status', $providerPayload)
                || strtolower(trim((string) $providerPayload['fraud_status'])) !== 'accept')) {
            return false;
        }

        $grossAmount = $this->parseProviderAmount($providerPayload['gross_amount'] ?? null);

        return $grossAmount !== null && $grossAmount === $expectedGrossAmount;
    }

    private function providerStatusForOperation(
        string $providerStatus,
        array $providerPayload,
        ?int $expectedGrossAmount
    ): string {
        $providerStatus = strtolower(trim($providerStatus));
        if (in_array($providerStatus, ['settlement', 'capture', 'paid'], true)
            && ! $this->providerSuccessIsValidated($providerStatus, $providerPayload, $expectedGrossAmount)) {
            return 'unverified_' . $providerStatus;
        }

        return $providerStatus;
    }

    private function recordOfflineProviderObservation(int $transactionId, string $orderId, string $action, array $payload): void
    {
        $this->paymentLogs->record($transactionId, [
            'provider_name' => 'midtrans',
            'provider_order_id' => $orderId,
            'provider_transaction_id' => $payload['transaction_id'] ?? null,
            'payment_method' => $payload['payment_type'] ?? null,
            'transaction_status' => $payload['transaction_status'] ?? null,
            'gross_amount' => $payload['gross_amount'] ?? null,
            'payload_request' => ['action' => $action, 'order_id' => $orderId],
            'payload_response' => $payload,
        ]);
    }

    private function recordLateTerminalPaymentRefundReview(
        array $transaction,
        string $providerOrderId,
        string $providerStatus,
        array $providerPayload,
        ?int $verifiedAmount
    ): void {
        $transactionId = (int) ($transaction['id'] ?? 0);
        $operationKey = 'late-refund-review-' . substr(hash('sha256', $providerOrderId), 0, 40);
        if ($this->paymentOperations->findByOperationKey($transactionId, $operationKey, true) !== null) {
            return;
        }

        $now = date('Y-m-d H:i:s');
        $review = [
            'reason' => 'verified_provider_payment_after_transaction_terminalization',
            'terminal_transaction_status' => (string) ($transaction['transaction_status'] ?? ''),
            'provider_order_id' => $providerOrderId,
            'provider_transaction_id' => $providerPayload['transaction_id'] ?? null,
            'provider_status' => $providerStatus,
            'verified_paid_amount' => $verifiedAmount,
            'refund_amount' => null,
            'requires_manual_review' => true,
            'requires_buyer_refund_account' => true,
        ];
        $this->paymentOperations->create([
            'transaction_id' => $transactionId,
            'operation_key' => $operationKey,
            'operation_type' => 'late_payment_refund_review',
            'provider_order_id' => $providerOrderId,
            'payment_method' => $transaction['payment_method'] ?? null,
            'gross_amount' => $verifiedAmount,
            'operation_status' => 'completed',
            'provider_status' => 'refund_review_required',
            'fence' => 0,
            'request_payload' => $review,
            'response_payload' => ['review_required' => true],
            'created_at' => $now,
            'updated_at' => $now,
            'completed_at' => $now,
        ]);
        $this->paymentLogs->record($transactionId, [
            'provider_name' => 'internal',
            'provider_order_id' => $providerOrderId,
            'provider_transaction_id' => $providerPayload['transaction_id'] ?? null,
            'payment_method' => 'manual_bank_transfer',
            'transaction_status' => 'refund_review_required',
            'gross_amount' => null,
            'payload_request' => $review,
            'payload_response' => [
                'message' => 'Pembayaran provider terverifikasi setelah transaksi berstatus terminal; tinjau dan proses refund secara manual.',
            ],
        ]);
    }

    private function recordOfflinePaymentLog(int $transactionId, string $transactionCode, int $fee, string $paidAt, ?string $note, int $ownerId): void
    {
        $this->paymentLogs->record($transactionId, [
            'provider_name' => 'offline',
            'provider_order_id' => $transactionCode,
            'payment_method' => 'offline_payment',
            'transaction_status' => 'dp_paid',
            'gross_amount' => $fee,
            'payload_request' => [
                'paid_at' => $paidAt,
                'note' => $note,
                'recorded_by_user_id' => $ownerId,
            ],
        ]);
    }

    private function assertPaymentOperationStorageAvailable(): void
    {
        try {
            $this->paymentOperations->assertAvailable();
        } catch (Throwable $exception) {
            throw new HttpException(
                'Payment operation migration must be applied before accepting provider payments.',
                503
            );
        }
    }

    private function prepareSessionOperation(
        int $transactionId,
        string $operationType,
        array $transaction,
        array $customer,
        string $paymentMethod
    ): array {
        $this->assertPaymentOperationStorageAvailable();
        $now = date('Y-m-d H:i:s');
        $this->pdo->beginTransaction();
        try {
            $current = $this->transactions->lockById($transactionId);
            if ($current === null) {
                throw new NotFoundException('Transaksi tidak ditemukan.');
            }
            if ($operationType === 'completion_session') {
                throw new ValidationException([
                    'transaction_status' => 'Sesi pelunasan in-app tidak tersedia. Pembayaran Booking Fee mengakhiri alur pembayaran dalam aplikasi.',
                ]);
            }
            if ($this->paymentOperations->hasActiveOfflineGate($transactionId, $now)) {
                throw new HttpException('Pembayaran sedang dialihkan ke proses offline. Coba kembali sebentar lagi.', 409);
            }
            $latest = $this->paymentOperations->latestSession($transactionId, $operationType);
            if ($latest !== null) {
                $status = (string) ($latest['operation_status'] ?? 'unknown');
                $providerStatus = strtolower((string) ($latest['provider_status'] ?? ''));
                $request = $this->decodeOperationJson($latest['request_payload_json'] ?? null);
                $storedMethod = (string) ($request['payment_method'] ?? $latest['payment_method'] ?? '');
                if ($status === 'in_flight') {
                    $leaseExpiresAt = $latest['lease_expires_at'] ?? null;
                    $leaseExpiry = is_string($leaseExpiresAt) ? strtotime($leaseExpiresAt) : false;
                    if ($leaseExpiry === false) {
                        throw new HttpException('Lease sesi pembayaran tidak dapat diverifikasi; coba lagi setelah statusnya dipastikan.', 409);
                    }
                    if ($leaseExpiry > time()) {
                        throw new HttpException('Pembuatan sesi pembayaran sedang diproses.', 409);
                    }
                    $leaseToken = $latest['lease_token'] ?? null;
                    if (! is_string($leaseToken) || $leaseToken === ''
                        || ! $this->paymentOperations->fenceExpiredSessionLease(
                            (int) $latest['id'],
                            $leaseToken,
                            (int) ($latest['fence'] ?? -1),
                            (string) $leaseExpiresAt,
                            $now
                        )) {
                        throw new HttpException('Lease sesi pembayaran berubah saat diperiksa.', 409);
                    }
                    $latest['operation_status'] = 'unknown';
                    $latest['fence'] = (int) ($latest['fence'] ?? 0) + 1;
                    $latest['lease_token'] = null;
                    $latest['lease_expires_at'] = null;
                    $status = 'unknown';
                }

                if ($status === 'completed'
                    && ! in_array($providerStatus, ['cancel', 'expire', 'deny', 'failure', 'failed'], true)) {
                    if ($storedMethod !== $paymentMethod) {
                        throw new ValidationException(['payment_method' => 'Sesi pembayaran sebelumnya masih aktif; gunakan metode yang sama atau tunggu sampai sesi berakhir.']);
                    }
                    $session = $this->decodeOperationJson($latest['response_payload_json'] ?? null);
                    if ($session === []) {
                        throw new HttpException('Hasil sesi pembayaran belum dapat dipastikan.', 409);
                    }
                    $this->pdo->commit();
                    $latest['_reused_session'] = $session;

                    return $latest;
                }

                if ($status === 'unknown') {
                    $firstAttempt = strtotime((string) ($latest['first_attempt_at'] ?? ''));
                    if ($storedMethod !== $paymentMethod
                        || $firstAttempt === false
                        || $firstAttempt > time()
                        || time() - $firstAttempt > 300) {
                        throw new HttpException('Hasil Midtrans belum pasti. Sesi baru diblokir agar tidak terjadi pembayaran ganda.', 409);
                    }
                    $operation = $latest;
                    $operation['_request'] = $request;
                } else {
                    $operation = null;
                }
            } else {
                $operation = null;
            }

            if ($operation === null) {
                $amount = $operationType === 'completion_session'
                    ? (int) ($current['remaining_amount'] ?? 0)
                    : (($current['payment_type'] ?? null) === 'dp'
                        ? (int) ($current['dp_amount'] ?? 0)
                        : (int) ($current['car_price'] ?? 0));
                $orderId = $this->newProviderOrderId($operationType, $current);
                $request = [
                    'payment_method' => $paymentMethod,
                    'customer' => [
                        'name' => (string) ($customer['name'] ?? 'Customer'),
                        'email' => $customer['email'] ?? null,
                        'phone_number' => $customer['phone_number'] ?? null,
                    ],
                    'transaction' => [
                        'id' => (int) $current['id'],
                        'transaction_code' => (string) $current['transaction_code'],
                        'car_id' => (int) $current['car_id'],
                        'car_price' => (int) $current['car_price'],
                        'payment_type' => (string) $current['payment_type'],
                        'dp_amount' => isset($current['dp_amount']) ? (int) $current['dp_amount'] : null,
                        'remaining_amount' => isset($current['remaining_amount']) ? (int) $current['remaining_amount'] : null,
                    ],
                ];
                $operationId = $this->paymentOperations->create([
                    'transaction_id' => $transactionId,
                    'operation_key' => $this->newOperationToken(),
                    'operation_type' => $operationType,
                    'provider_order_id' => $orderId,
                    'payment_method' => $paymentMethod,
                    'gross_amount' => $amount,
                    'idempotency_key' => $this->newOperationToken(),
                    'operation_status' => 'prepared',
                    'fence' => $this->paymentOperations->nextFence($transactionId),
                    'request_payload' => $request,
                    'created_at' => $now,
                ]);
                $operation = $this->paymentOperations->findById($operationId);
                $operation['_request'] = $request;
            } elseif (! isset($operation['_request'])) {
                $operation['_request'] = $request;
            }

            $leaseToken = $this->newOperationToken();
            $fence = $this->paymentOperations->nextFence($transactionId);
            if (! $this->paymentOperations->claim(
                (int) $operation['id'],
                $leaseToken,
                date('Y-m-d H:i:s', time() + 90),
                $now,
                $fence
            )) {
                throw new HttpException('Operasi pembayaran telah diambil request lain.', 409);
            }
            $operation['lease_token'] = $leaseToken;
            $operation['operation_status'] = 'in_flight';
            $operation['fence'] = $fence;
            $operation['first_attempt_at'] = $operation['first_attempt_at'] ?: $now;
            $this->pdo->commit();

            return $operation;
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    private function executeSessionOperation(int $transactionId, array $operation, bool $initial): array
    {
        if (isset($operation['_reused_session']) && is_array($operation['_reused_session'])) {
            return $operation['_reused_session'];
        }
        $request = $operation['_request'] ?? $this->decodeOperationJson($operation['request_payload_json'] ?? null);
        $transaction = $request['transaction'] ?? [];
        $customer = $request['customer'] ?? [];
        $paymentMethod = (string) ($request['payment_method'] ?? $operation['payment_method'] ?? '');
        $providerOrderId = (string) ($operation['provider_order_id'] ?? '');
        $idempotencyKey = (string) ($operation['idempotency_key'] ?? '');

        try {
            $session = $initial
                ? $this->paymentProvider->createInitialPayment($transaction, $customer, $paymentMethod, $providerOrderId, $idempotencyKey)
                : $this->paymentProvider->createCompletionPayment($transaction, $customer, $paymentMethod, $providerOrderId, $idempotencyKey);
        } catch (Throwable $exception) {
            $this->finishSessionOperationFailure($transactionId, $operation, $exception, $initial);
            throw $exception;
        }

        try {
            $session = $this->assertPaymentSession($session);
            $sessionGrossAmount = $this->parseProviderAmount($session['gross_amount'] ?? null);
            $operationGrossAmount = $this->parseProviderAmount($operation['gross_amount'] ?? null);
            if ((string) $session['provider_order_id'] !== $providerOrderId
                || $sessionGrossAmount === null
                || $operationGrossAmount === null
                || $sessionGrossAmount !== $operationGrossAmount) {
                throw new ValidationException(['payment_session' => 'Respons Midtrans tidak cocok dengan operasi pembayaran yang tersimpan.']);
            }
        } catch (Throwable $exception) {
            $this->finishSessionOperationFailure($transactionId, $operation, $exception, $initial);
            throw $exception;
        }

        try {
            $this->pdo->beginTransaction();
            $current = $this->transactions->lockById($transactionId);
            $storedOperation = $this->paymentOperations->findById((int) $operation['id'], true);
            if ($current === null
                || ($current['transaction_status'] ?? null) !== 'pending_payment'
                || ($current['payment_method'] ?? null) === 'offline_payment'
                || $storedOperation === null
                || ! $this->sessionOperationLeaseMatches($storedOperation, $operation, $initial)) {
                throw new HttpException('Hasil Midtrans tidak dapat diterapkan karena operasi telah berubah.', 409);
            }

            $storedProviderStatus = $storedOperation['provider_status'] ?? null;
            if (is_string($storedProviderStatus) && trim($storedProviderStatus) !== '') {
                // A callback/status check may have recorded a normalized value
                // while the session request was still in flight. Preserve that
                // stronger observation rather than normalizing it a second time.
                $providerStatus = strtolower(trim($storedProviderStatus));
            } else {
                $providerPayload = is_array($session['payload_response'] ?? null)
                    ? $session['payload_response']
                    : [];
                if (! array_key_exists('gross_amount', $providerPayload)) {
                    $providerPayload['gross_amount'] = $session['gross_amount'] ?? null;
                }
                $providerStatus = $this->providerStatusForOperation(
                    strtolower(trim((string) $session['transaction_status'])),
                    $providerPayload,
                    $operationGrossAmount
                );
            }
            $now = date('Y-m-d H:i:s');
            if (! $this->paymentOperations->updateWithLiveLease(
                (int) $operation['id'],
                (string) $operation['operation_type'],
                (string) $operation['lease_token'],
                (int) $operation['fence'],
                $now,
                [
                'operation_status' => 'completed',
                'provider_status' => $providerStatus,
                'response_payload_json' => json_encode($session, JSON_UNESCAPED_SLASHES),
                'lease_token' => null,
                'lease_expires_at' => null,
                'completed_at' => $now,
                'updated_at' => $now,
                ]
            )) {
                throw new HttpException('Hasil Midtrans tidak dapat diterapkan karena lease operasi telah berubah atau kedaluwarsa.', 409);
            }
            $this->paymentLogs->record($transactionId, $session);
            if ($initial) {
                $this->transactions->updateProviderFields($transactionId, [
                    'midtrans_order_id' => $providerOrderId,
                    'midtrans_token' => $session['midtrans_token'],
                    'midtrans_redirect_url' => $session['midtrans_redirect_url'],
                    'expires_at' => $session['expires_at'],
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

        return $session;
    }

    private function finishSessionOperationFailure(
        int $transactionId,
        array $operation,
        Throwable $exception,
        bool $initial
    ): void
    {
        try {
            $this->pdo->beginTransaction();
            $current = $this->transactions->lockById($transactionId);
            $storedOperation = $this->paymentOperations->findById((int) ($operation['id'] ?? 0), true);
            if ($current === null
                || ($current['transaction_status'] ?? null) !== 'pending_payment'
                || ($current['payment_method'] ?? null) === 'offline_payment'
                || $storedOperation === null
                || ! $this->sessionOperationLeaseMatches($storedOperation, $operation, $initial)) {
                $this->pdo->rollBack();

                return;
            }

            $state = $exception instanceof ValidationException ? 'failed' : 'unknown';
            $now = date('Y-m-d H:i:s');
            if (! $this->paymentOperations->updateWithLiveLease(
                (int) $operation['id'],
                (string) $operation['operation_type'],
                (string) $operation['lease_token'],
                (int) $operation['fence'],
                $now,
                [
                    'operation_status' => $state,
                    'error_payload_json' => json_encode([
                        'exception' => get_class($exception),
                        'message' => $exception->getMessage(),
                    ], JSON_UNESCAPED_SLASHES),
                    'lease_token' => null,
                    'lease_expires_at' => null,
                    'completed_at' => $now,
                    'updated_at' => $now,
                ]
            )) {
                throw new HttpException('Kegagalan Midtrans tidak dicatat karena lease operasi telah berubah atau kedaluwarsa.', 409);
            }
            if ($exception instanceof PaymentProviderException) {
                $this->paymentLogs->record($transactionId, $exception->logPayload());
            }
            $this->pdo->commit();
        } catch (Throwable $persistException) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            // The operation remains durably in-flight and is fenced by its lease.
        }
    }

    private function sessionOperationLeaseMatches(array $storedOperation, array $operation, bool $initial): bool
    {
        $operationId = (int) ($operation['id'] ?? 0);
        $operationType = (string) ($operation['operation_type'] ?? '');
        $allowedTypes = $initial ? ['initial_session', 'legacy_session'] : ['completion_session'];
        $leaseToken = $operation['lease_token'] ?? null;
        $fence = $operation['fence'] ?? null;
        $leaseExpiresAt = $storedOperation['lease_expires_at'] ?? null;
        $leaseExpiry = is_string($leaseExpiresAt) && trim($leaseExpiresAt) !== ''
            ? strtotime($leaseExpiresAt)
            : false;

        return $operationId > 0
            && (int) ($storedOperation['id'] ?? 0) === $operationId
            && in_array($operationType, $allowedTypes, true)
            && (string) ($storedOperation['operation_type'] ?? '') === $operationType
            && ($storedOperation['operation_status'] ?? null) === 'in_flight'
            && is_string($leaseToken)
            && $leaseToken !== ''
            && ($storedOperation['lease_token'] ?? null) === $leaseToken
            && is_numeric($fence)
            && is_numeric($storedOperation['fence'] ?? null)
            && (int) $storedOperation['fence'] === (int) $fence
            && $leaseExpiry !== false
            && $leaseExpiry > time();
    }

    private function newProviderOrderId(string $operationType, array $transaction): string
    {
        $prefix = $operationType === 'completion_session' ? 'PELUNASAN' : 'ORDER';
        $code = preg_replace('/[^A-Za-z0-9_-]+/', '-', (string) ($transaction['transaction_code'] ?? $transaction['id']));
        $code = trim(substr((string) $code, 0, 55), '-');

        return $prefix . '-' . ($code !== '' ? $code : (int) $transaction['id']) . '-' . strtoupper(bin2hex(random_bytes(8)));
    }

    private function newOperationToken(): string
    {
        return bin2hex(random_bytes(16));
    }

    private function decodeOperationJson($json): array
    {
        if (! is_string($json) || trim($json) === '') {
            return [];
        }
        $decoded = json_decode($json, true);

        return is_array($decoded) ? $decoded : [];
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

        if (! $isManualTransfer) {
            $this->assertPaymentOperationStorageAvailable();
        }

        try {
            $this->pdo->beginTransaction();

            // Kunci mobilnya secara atomik sebelum membuat baris transaksi.
            // UPDATE ... WHERE listing_status = 'published' ini terkunci di
            // level baris oleh InnoDB, jadi kalau dua request datang hampir
            // bersamaan untuk mobil yang sama, yang kedua akan menunggu lalu
            // menemukan listing_status sudah bukan 'published' lagi -- tanpa
            // ini keduanya bisa lolos SELECT awal dan sama-sama bikin
            // transaksi untuk mobil yang sama.
            if (! $this->transactions->updateCarListingStatus((int) $car['id'], 'reserved', ['published'])) {
                throw new NotFoundException('Mobil ini baru saja dipesan pembeli lain. Silakan pilih mobil lain.');
            }

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
                'expires_at' => date('Y-m-d H:i:s', strtotime('+5 minutes')),
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

        $operation = $this->prepareSessionOperation(
            $transactionId,
            'initial_session',
            $transaction,
            $buyer,
            $paymentMethod
        );
        $session = $this->executeSessionOperation($transactionId, $operation, true);

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

        $statusContext = $this->pendingProviderStatusContext($transactionId, $transaction);
        if ($statusContext['blocked'] || $statusContext['provider_order_id'] === '') {
            return $this->detail($user, $transactionId);
        }
        $providerOrderId = $statusContext['provider_order_id'];

        $providerStatus = $this->runUnparentedProviderOperation(
            $transactionId,
            $providerOrderId,
            $statusContext['session_operation']
        );
        if ($providerStatus === null) {
            return $this->detail($user, $transactionId);
        }
        $this->processProviderStatus(
            $transaction,
            $providerOrderId,
            $providerStatus['provider_payload'],
            'response',
            false,
            $providerStatus
        );

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
        if (in_array($data['transaction_status'] ?? null, ['dp_paid', 'paid'], true)) {
            throw new ValidationException([
                'transaction_status' => 'Status pembayaran tidak dapat diubah langsung. Gunakan endpoint konfirmasi pembayaran yang sesuai: sinkronisasi Midtrans, konfirmasi transfer manual, atau pencatatan pembayaran offline showroom.',
            ]);
        }
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

        $operation = $this->prepareSessionOperation(
            $transactionId,
            'completion_session',
            $transaction,
            [
                'name' => $user['name'] ?? 'Customer',
                'email' => $user['email'] ?? null,
                'phone_number' => $user['phone_number'] ?? null,
            ],
            (string) ($data['payment_method'] ?? '')
        );
        $session = $this->executeSessionOperation($transactionId, $operation, false);

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

        try {
            $this->pdo->beginTransaction();

            $current = $this->transactions->lockById($transactionId);
            if ($current === null) {
                throw new NotFoundException('Transaksi tidak ditemukan.');
            }
            // Status and refund requirements can change after the initial read
            // (for example, a payment callback or offline payment wins the
            // race). Re-authorize and derive the refund from the locked row.
            TransactionPolicy::ensureCanCancel($user, $current);
            $this->ensureCanCancelStatus($user, $current, $data);
            $refund = $this->refundPayload($user, $current, $data);

            $this->applyStatus($current, 'cancelled');

            if (! $this->transactions->publishCarForCancelledTransaction((int) $current['car_id'])) {
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
        $resolution = $this->transactions->resolveMidtransOrderId($providerOrderId);
        if ($resolution['status'] === 'ambiguous') {
            return [
                'acknowledged' => true,
                'processed' => false,
                'order_id' => $providerOrderId,
            ];
        }

        $ownerResolution = $resolution['status'];
        $transaction = $resolution['status'] === 'unique'
            ? $this->transactions->findById((int) $resolution['transaction_id'])
            : $this->transactions->findByCode($providerOrderId);

        if (! $transaction) {
            return [
                'acknowledged' => true,
                'processed' => false,
                'order_id' => $providerOrderId,
            ];
        }

        $transactionId = (int) $transaction['id'];
        $sessions = $this->paymentOperations->sessionsForOrder($transactionId, $providerOrderId);
        $sessionOperation = $sessions === [] ? null : $sessions[count($sessions) - 1];
        $callbackOwnerContext = [
            'transaction_id' => $transactionId,
            'resolution' => $ownerResolution,
        ];
        $verifiedStatus = $this->runUnparentedProviderOperation(
            $transactionId,
            $providerOrderId,
            $sessionOperation,
            true,
            $callbackOwnerContext
        );
        if ($verifiedStatus === null) {
            return [
                'acknowledged' => true,
                'processed' => false,
                'order_id' => $providerOrderId,
            ];
        }

        $processed = $this->processProviderStatus(
            $transaction,
            $providerOrderId,
            $verifiedStatus['provider_payload'],
            'response',
            false,
            $verifiedStatus,
            $callbackOwnerContext,
            $payload['payload_callback'] ?? $payload
        );
        if ($processed['ignored'] ?? false) {
            return [
                'acknowledged' => true,
                'processed' => false,
                'order_id' => $providerOrderId,
            ];
        }

        return [
            'transaction' => TransactionMapper::status($this->requireTransaction((int) $transaction['id'])),
            'payment_log' => $processed['log'],
        ];
    }

    public function expirePendingTransactions(): array
    {
        $now = date('Y-m-d H:i:s');
        $expiredTransactionIds = [];

        foreach ($this->transactions->listStalePending($now) as $transaction) {
            $transactionId = (int) $transaction['id'];
            $statusContext = $this->pendingProviderStatusContext($transactionId, $transaction);
            if ($statusContext['blocked']) {
                continue;
            }

            $providerOrderId = $statusContext['provider_order_id'];

            if ($providerOrderId !== '') {
                $providerStatus = $this->runUnparentedProviderOperation(
                    $transactionId,
                    $providerOrderId,
                    $statusContext['session_operation']
                );
                if ($providerStatus === null) {
                    // Another status sync owns a live lease, or this transaction
                    // changed while the expiry scan was in progress. Never treat
                    // the absence of a fresh provider response as an expiry.
                    continue;
                }

                $processed = $this->processProviderStatus(
                    $transaction,
                    $providerOrderId,
                    $providerStatus['provider_payload'],
                    'response',
                    true,
                    $providerStatus
                );

                if (($processed['ignored'] ?? false) !== true && $processed['next_status'] === 'expired') {
                    $expiredTransactionIds[] = (int) $transaction['id'];
                }

                continue;
            }

            try {
                $this->pdo->beginTransaction();
                $current = $this->transactions->lockById($transactionId);
                $lockedNow = date('Y-m-d H:i:s');
                if ($current === null
                    || ($current['transaction_status'] ?? null) !== 'pending_payment'
                    || ($current['payment_method'] ?? null) === 'offline_payment'
                    || ($current['expires_at'] ?? null) === null
                    || (string) ($current['expires_at'] ?? '') > $lockedNow) {
                    $this->pdo->commit();
                    continue;
                }

                $lockedStatusContext = $this->pendingProviderStatusContext($transactionId, $current);
                if ($lockedStatusContext['blocked'] || $lockedStatusContext['provider_order_id'] !== '') {
                    $this->pdo->commit();
                    continue;
                }

                $expiredCount = $this->transactions->expirePendingByIds([$transactionId], $lockedNow);
                if ($expiredCount > 0) {
                    $this->transactions->publishReservedCarsByIds([(int) $current['car_id']]);
                }
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
        bool $expireUnresolved = false,
        ?array $statusCheckContext = null,
        ?array $callbackOwnerContext = null,
        ?array $callbackAuditPayload = null
    ): array {
        if ($payloadType === 'response') {
            $this->verifiedProviderStatus($providerOrderId, $providerPayload);
        }

        $providerStatus = isset($providerPayload['transaction_status'])
            ? (string) $providerPayload['transaction_status']
            : null;
        $grossAmount = $this->parseProviderAmount($providerPayload['gross_amount'] ?? null);
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
            if ($callbackAuditPayload !== null) {
                $logData['payload_callback'] = $callbackAuditPayload;
            }
        }

        try {
            $this->pdo->beginTransaction();
            $current = $this->transactions->lockById((int) $transaction['id']);
            if ($current === null) {
                throw new NotFoundException('Transaksi tidak ditemukan.');
            }
            if ($payloadType === 'response') {
                $owner = $this->transactions->resolveMidtransOrderId($providerOrderId, true);
                $callbackOwnerIsCurrent = $callbackOwnerContext !== null
                    && $this->callbackOwnerIsCurrent(
                        (int) $current['id'],
                        (string) ($current['transaction_code'] ?? ''),
                        $providerOrderId,
                        $callbackOwnerContext
                    );
                if (! $callbackOwnerIsCurrent
                    && ($owner['status'] !== 'unique'
                        || (int) ($owner['transaction_id'] ?? 0) !== (int) $current['id'])) {
                    $this->pdo->commit();

                    return ['log' => null, 'next_status' => $current['transaction_status'] ?? null, 'ignored' => true];
                }
            }
            if ($payloadType === 'callback'
                && ! $this->callbackOwnerIsCurrent(
                    (int) $current['id'],
                    (string) ($current['transaction_code'] ?? ''),
                    $providerOrderId,
                    $callbackOwnerContext
                )) {
                $this->pdo->commit();

                return ['log' => null, 'next_status' => $current['transaction_status'] ?? null, 'ignored' => true];
            }
            if ($statusCheckContext !== null
                && ! $this->statusCheckResultIsCurrent(
                    (int) $current['id'],
                    $providerOrderId,
                    $providerPayload,
                    $statusCheckContext
                )) {
                $this->pdo->commit();

                return ['log' => null, 'next_status' => $current['transaction_status'] ?? null, 'ignored' => true];
            }
            if ($expireUnresolved
                && (($current['transaction_status'] ?? null) !== 'pending_payment'
                    || ($current['payment_method'] ?? null) === 'offline_payment')) {
                $this->pdo->commit();

                return ['log' => null, 'next_status' => $current['transaction_status'] ?? null, 'ignored' => true];
            }
            if ($expireUnresolved
                && ! $this->providerStatusIsPaid(strtolower(trim((string) $providerStatus)), $providerPayload)
                && (($current['expires_at'] ?? null) === null
                    || (string) $current['expires_at'] > date('Y-m-d H:i:s'))) {
                $this->pdo->commit();

                return ['log' => null, 'next_status' => $current['transaction_status'] ?? null, 'ignored' => true];
            }

            $providerStatusNormalized = strtolower(trim((string) $providerStatus));
            $expectedGrossAmount = $this->expectedProviderOrderAmount($current, $providerOrderId);
            $providerSuccessValidated = $this->providerSuccessIsValidated(
                $providerStatusNormalized,
                $providerPayload,
                $expectedGrossAmount
            );
            $operationProviderStatus = $this->providerStatusForOperation(
                $providerStatusNormalized,
                $providerPayload,
                $expectedGrossAmount
            );
            $lateSuccess = ($current['payment_method'] ?? null) === 'offline_payment'
                && $providerSuccessValidated;
            if ($lateSuccess && is_array($logData['payload_callback'] ?? null)) {
                $logData['payload_callback']['_carlynk_late_success_after_offline_conversion'] = true;
            }
            $log = $this->paymentLogs->record((int) $transaction['id'], $logData);
            $this->paymentOperations->recordProviderEventForTransaction(
                (int) $current['id'],
                $providerOrderId,
                $operationProviderStatus,
                $lateSuccess,
                $providerSuccessValidated
            );
            if ($callbackAuditPayload !== null
                && $providerSuccessValidated
                && in_array(($current['transaction_status'] ?? null), ['cancelled', 'expired', 'returned'], true)) {
                $this->recordLateTerminalPaymentRefundReview(
                    $current,
                    $providerOrderId,
                    $providerStatusNormalized,
                    $providerPayload,
                    $expectedGrossAmount
                );
                $this->pdo->commit();

                return ['log' => $log, 'next_status' => $current['transaction_status']];
            }
            if (($current['payment_method'] ?? null) === 'offline_payment') {
                if ($lateSuccess && $payloadType === 'callback') {
                    // Persist the explicit late-success marker alongside the
                    // raw callback audit entry, without changing offline dp_paid.
                    $this->paymentOperations->recordProviderEventForTransaction(
                        (int) $current['id'],
                        $providerOrderId,
                        'paid',
                        true,
                        true
                    );
                }
                $this->pdo->commit();

                return ['log' => $log, 'next_status' => $current['transaction_status']];
            }
            $providerNextStatus = $this->paymentLogs->providerStatusToCanon(
                $current,
                $providerStatus,
                $grossAmount,
                $expectedGrossAmount,
                array_key_exists('fraud_status', $providerPayload) ? (string) $providerPayload['fraud_status'] : null,
                array_key_exists('fraud_status', $providerPayload)
            );
            $providerConfirmsTerminalUnpaid = in_array(
                $providerStatusNormalized,
                ['expire', 'cancel', 'deny', 'failure', 'failed'],
                true
            );
            $nextStatus = $expireUnresolved
                ? (in_array($providerNextStatus, ['dp_paid', 'paid', 'completed'], true)
                    ? $providerNextStatus
                    : ($providerConfirmsTerminalUnpaid ? 'expired' : $providerNextStatus))
                : $providerNextStatus;

            if ($nextStatus !== null && $nextStatus !== ($current['transaction_status'] ?? null)) {
                $this->applyStatus($current, $nextStatus);
            }

            if ($expireUnresolved && $nextStatus === 'expired') {
                $this->transactions->publishReservedCarsByIds([(int) $current['car_id']]);
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

    private function expectedProviderOrderAmount(array $transaction, string $providerOrderId): ?int
    {
        $transactionId = (int) ($transaction['id'] ?? 0);
        if ($transactionId <= 0 || $providerOrderId === '') {
            return null;
        }

        $sessions = $this->paymentOperations->sessionsForOrder($transactionId, $providerOrderId);
        if ($sessions !== []) {
            $operationType = null;
            $amounts = [];
            foreach ($sessions as $session) {
                $currentType = (string) ($session['operation_type'] ?? '');
                if ($currentType === 'legacy_session') {
                    // Migration-seeded legacy rows copy observed provider
                    // amounts, not locally established payment intent.
                    continue;
                }

                $amount = $this->parseProviderAmount($session['gross_amount'] ?? null);
                if (! in_array($currentType, ['initial_session', 'completion_session'], true)
                    || $amount === null
                    || $amount <= 0
                    || ($operationType !== null && $operationType !== $currentType)) {
                    return null;
                }
                $operationType = $currentType;
                $amounts[] = $amount;
            }

            if ($amounts !== []) {
                return count(array_unique($amounts, SORT_REGULAR)) === 1 ? $amounts[0] : null;
            }
        }

        // Legacy logs and migration-seeded legacy_session rows may contain
        // provider observations rather than local payment intent. Never let
        // those observed amounts define the amount expected for settlement.
        return $this->inferLegacyProviderOrderAmount($transaction, $providerOrderId);
    }

    private function inferLegacyProviderOrderAmount(array $transaction, string $providerOrderId): ?int
    {
        $transactionId = (int) ($transaction['id'] ?? 0);
        $transactionCode = trim((string) ($transaction['transaction_code'] ?? ''));
        $safeCode = preg_replace('/[^A-Za-z0-9_-]+/', '-', $transactionCode !== '' ? $transactionCode : (string) $transactionId);
        $safeCode = trim(substr((string) $safeCode, 0, 55), '-');
        if ($safeCode === '') {
            return null;
        }

        $initialOrderPrefix = 'ORDER-' . $safeCode;
        $completionOrderPrefix = 'PELUNASAN-' . $safeCode;
        $matchesPrefix = static function (string $orderId, string $prefix): bool {
            return $orderId === $prefix
                || (strlen($orderId) > strlen($prefix)
                    && substr($orderId, 0, strlen($prefix)) === $prefix
                    && substr($orderId, strlen($prefix), 1) === '-');
        };

        if ($matchesPrefix($providerOrderId, $completionOrderPrefix)) {
            $amount = $this->parseProviderAmount($transaction['remaining_amount'] ?? null);

            return $amount !== null && $amount > 0 ? $amount : null;
        }

        $legacyInitialOrderId = trim((string) ($transaction['midtrans_order_id'] ?? ''));
        if ($providerOrderId === $legacyInitialOrderId
            || $providerOrderId === $transactionCode
            || $matchesPrefix($providerOrderId, $initialOrderPrefix)) {
            $paymentType = (string) ($transaction['payment_type'] ?? '');
            $amountValue = $paymentType === 'dp'
                ? ($transaction['dp_amount'] ?? null)
                : ($paymentType === 'full' ? ($transaction['car_price'] ?? null) : null);
            $amount = $this->parseProviderAmount($amountValue);

            return $amount !== null && $amount > 0 ? $amount : null;
        }

        return null;
    }

    private function parseProviderAmount($value): ?int
    {
        if (is_int($value)) {
            return $value >= 0 ? $value : null;
        }
        if (! is_string($value) || ! preg_match('/\A[0-9]+(?:\.00)?\z/D', $value)) {
            return null;
        }

        $whole = explode('.', $value, 2)[0];
        $normalized = ltrim($whole, '0');
        $normalized = $normalized === '' ? '0' : $normalized;
        $maximum = (string) PHP_INT_MAX;
        if (strlen($normalized) > strlen($maximum)
            || (strlen($normalized) === strlen($maximum) && strcmp($normalized, $maximum) > 0)) {
            return null;
        }

        return (int) $normalized;
    }

    private function callbackOwnerIsCurrent(
        int $transactionId,
        string $transactionCode,
        string $providerOrderId,
        ?array $ownerContext
    ): bool {
        if ($ownerContext === null || (int) ($ownerContext['transaction_id'] ?? 0) !== $transactionId) {
            return false;
        }

        $resolution = $this->transactions->resolveMidtransOrderId($providerOrderId, true);
        if ($resolution['status'] === 'unique') {
            return (int) $resolution['transaction_id'] === $transactionId;
        }

        return $resolution['status'] === 'not_found'
            && ($ownerContext['resolution'] ?? null) === 'not_found'
            && $transactionCode !== ''
            && $transactionCode === $providerOrderId;
    }

    private function statusCheckResultIsCurrent(
        int $transactionId,
        string $providerOrderId,
        array $providerPayload,
        array $context
    ): bool {
        $statusCheck = $context['status_check'] ?? null;
        if (! is_array($statusCheck)
            || (int) ($statusCheck['id'] ?? 0) < 1
            || (string) ($statusCheck['provider_order_id'] ?? '') !== $providerOrderId
            || ! array_key_exists('session_operation_id', $context)) {
            return false;
        }

        $checkId = (int) $statusCheck['id'];
        $checkFence = (int) ($statusCheck['fence'] ?? -1);
        $newestChecks = $this->paymentOperations->statusChecksForOrder($transactionId, $providerOrderId);
        $newestCheck = $newestChecks[0] ?? null;
        $storedCheck = $this->paymentOperations->findById($checkId, true);
        $storedProviderPayload = $storedCheck === null
            ? null
            : json_decode((string) ($storedCheck['response_payload_json'] ?? ''), true);
        if ($newestCheck === null
            || (int) ($newestCheck['id'] ?? 0) !== $checkId
            || $storedCheck === null
            || (int) ($storedCheck['transaction_id'] ?? 0) !== $transactionId
            || (string) ($storedCheck['operation_type'] ?? '') !== 'status_check'
            || (string) ($storedCheck['provider_order_id'] ?? '') !== $providerOrderId
            || (string) ($storedCheck['operation_status'] ?? '') !== 'completed'
            || (int) ($storedCheck['fence'] ?? -1) !== $checkFence
            || ! is_array($storedProviderPayload)) {
            return false;
        }

        foreach (['order_id', 'transaction_status', 'gross_amount', 'fraud_status'] as $field) {
            $storedHasField = array_key_exists($field, $storedProviderPayload);
            if ($storedHasField !== array_key_exists($field, $providerPayload)) {
                return false;
            }
            if (! $storedHasField) {
                continue;
            }

            if ($field === 'gross_amount') {
                if (! is_scalar($storedProviderPayload[$field])
                    || ! is_scalar($providerPayload[$field])
                    || (string) $storedProviderPayload[$field] !== (string) $providerPayload[$field]) {
                    return false;
                }
                continue;
            }

            $storedValue = (string) $storedProviderPayload[$field];
            $providerValue = (string) $providerPayload[$field];
            if (in_array($field, ['transaction_status', 'fraud_status'], true)) {
                $storedValue = strtolower(trim($storedValue));
                $providerValue = strtolower(trim($providerValue));
            }
            if ($storedValue !== $providerValue) {
                return false;
            }
        }

        $originSessionId = $context['session_operation_id'] === null
            ? null
            : (int) $context['session_operation_id'];
        $latestOriginSession = $this->latestSessionOperation($transactionId);
        $sessionsForOrder = $this->paymentOperations->sessionsForOrder($transactionId, $providerOrderId);
        $latestSessionForOrder = $sessionsForOrder === [] ? null : $sessionsForOrder[count($sessionsForOrder) - 1];
        if ($originSessionId === null) {
            return $latestOriginSession === null && $latestSessionForOrder === null;
        }

        return $latestOriginSession !== null
            && (int) ($latestOriginSession['id'] ?? 0) === $originSessionId
            && $latestSessionForOrder !== null
            && (int) ($latestSessionForOrder['id'] ?? 0) === $originSessionId
            && in_array($latestSessionForOrder['operation_type'] ?? null, [
                'initial_session', 'completion_session', 'legacy_session',
            ], true);
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

    private function latestSessionOperation(int $transactionId): ?array
    {
        $sessions = $this->paymentOperations->sessions($transactionId);

        return $sessions === [] ? null : $sessions[count($sessions) - 1];
    }

    private function latestInitialOrLegacySessionOperation(int $transactionId): ?array
    {
        $sessions = $this->paymentOperations->sessions($transactionId);
        for ($index = count($sessions) - 1; $index >= 0; $index--) {
            if (in_array($sessions[$index]['operation_type'] ?? null, ['initial_session', 'legacy_session'], true)) {
                return $sessions[$index];
            }
        }

        return null;
    }

    private function pendingProviderStatusContext(int $transactionId, array $transaction): array
    {
        $sessionOperation = $this->latestInitialOrLegacySessionOperation($transactionId);
        if ($sessionOperation === null) {
            return [
                'blocked' => false,
                'provider_order_id' => $this->providerOrderId($transaction),
                'session_operation' => null,
            ];
        }

        $operationStatus = (string) ($sessionOperation['operation_status'] ?? '');
        if ($operationStatus === 'prepared') {
            return ['blocked' => true, 'provider_order_id' => '', 'session_operation' => $sessionOperation];
        }

        if ($operationStatus === 'in_flight') {
            $leaseExpiresAt = $sessionOperation['lease_expires_at'] ?? null;
            $leaseExpiry = is_string($leaseExpiresAt) && trim($leaseExpiresAt) !== ''
                ? strtotime($leaseExpiresAt)
                : false;
            if ($leaseExpiry === false || $leaseExpiry > time()) {
                return ['blocked' => true, 'provider_order_id' => '', 'session_operation' => $sessionOperation];
            }
        } elseif (! in_array($operationStatus, ['unknown', 'completed', 'failed'], true)) {
            // Ignore terminal session attempts and retain the legacy transaction/log fallback.
            return [
                'blocked' => false,
                'provider_order_id' => $this->providerOrderId($transaction),
                'session_operation' => null,
            ];
        }

        $providerOrderId = trim((string) ($sessionOperation['provider_order_id'] ?? ''));
        if ($providerOrderId === '') {
            // An applicable newer session with no usable order is indeterminate;
            // never fall back to an older transaction/log order or direct-expire.
            return ['blocked' => true, 'provider_order_id' => '', 'session_operation' => $sessionOperation];
        }

        return [
            'blocked' => false,
            'provider_order_id' => $providerOrderId,
            'session_operation' => $sessionOperation,
        ];
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
