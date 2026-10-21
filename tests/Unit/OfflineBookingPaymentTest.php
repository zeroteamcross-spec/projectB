<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\HttpException;
use App\Core\Exceptions\ValidationException;
use App\Core\Request;
use App\Infrastructure\Payment\Midtrans\MidtransConfig;
use App\Infrastructure\Payment\Midtrans\MidtransCallbackHandler;
use App\Infrastructure\Payment\Midtrans\MidtransHttpClient;
use App\Infrastructure\Payment\Midtrans\MidtransPaymentAdapter;
use App\Infrastructure\Payment\PaymentProviderInterface;
use App\Infrastructure\Storage\StorageServiceInterface;
use App\Modules\Affiliate\Services\AffiliateService;
use App\Modules\Auth\Repositories\AuthTokenRepository;
use App\Modules\Auth\Repositories\AuthUserRepository;
use App\Modules\Auth\Services\AuthService;
use App\Modules\Showrooms\Repositories\ShowroomRepository;
use App\Modules\Transactions\Repositories\PaymentLogRepository;
use App\Modules\Transactions\Repositories\TransactionRepository;
use App\Modules\Transactions\Controllers\TransactionController;
use App\Modules\Transactions\Requests\CreateOfflineBookingRequest;
use App\Modules\Transactions\Requests\RecordOfflinePaymentRequest;
use App\Modules\Transactions\Services\PaymentLogService;
use App\Modules\Transactions\Services\TransactionService;
use DateTimeImmutable;
use DateTimeZone;
use PDO;
use Tests\TestCase;

class OfflineBookingPaymentTest extends TestCase
{
    public function run(): void
    {
        $this->offlineBookingCreatesBuyerAndClosesAtExactBookingFee();
        $this->offlineBookingRejectsNonOwnerRolesAndMismatchedAmount();
        $this->offlineBookingRejectsFuturePaymentTimes();
        $this->offlinePendingTransactionsAreExcludedFromExpiry();
        $this->pendingProviderSessionIsCancelledAndCheckedAgain();
        $this->offlineConversionRejectsInvalidOrMissingGateLease();
        $this->offlineConversionRejectsAnotherLiveGate();
        $this->offlineConversionFencesExpiredGateBeforeRetry();
        $this->staleOfflineProviderResponseCannotPersistAfterNewGateStarts();
        $this->staleOfflineFinishAndCloseCannotChangeNewerGate();
        $this->cancelRechecksPaymentStateAfterStaleRead();
        $this->offlineConversionWinsBeforeCompletionSessionCreation();
        $this->pendingCompletionSessionIsRejectedBeforeProviderCall();
        $this->terminalCompletionSessionStatesAreRejectedBeforeProviderCall();
        $this->completionSessionChecksLockedRowAfterStaleRead();
        $this->initialSessionUsesDurableOrderAndIdempotencyKey();
        $this->ambiguousInitialSessionIsDurablyMarkedUnknown();
        $this->syncPaymentStatusRecoversLatestPersistedSessionOrder();
        $this->syncPaymentStatusDeduplicatesConcurrentChecks();
        $this->syncPaymentStatusRejectsStaleStatusCheckResults();
        $this->syncPaymentStatusRejectsMismatchedProviderOrder();
        $this->syncPaymentStatusIgnoresAmbiguousOrderSettlement();
        $this->syncPaymentStatusRejectsSessionAppearingAfterSnapshot();
        $this->syncPaymentStatusDoesNotApplyAfterOriginSessionChanges();
        $this->expiryScanDoesNotApplyStaleExpireAfterNewerSettlement();
        $this->expiryScanIgnoresAmbiguousOrderSettlement();
        $this->expiryScanKeepsPendingAndUnknownResponsesReserved();
        $this->expiryScanExpiresOnlyExplicitTerminalUnpaidResponses();
        $this->expiryScanDoesNotExpireBeforeActualSessionExpiry();
        $this->expiryScanRechecksProviderExpiryDeadlineUnderLock();
        $this->expiryScanDoesNotOverrideConcurrentCallbackCancellation();
        $this->expiryScanRechecksNoOrderContextUnderLock();
        $this->expiryScanDoesNotPublishWhenExpirationUpdateDoesNotChangeRow();
        $this->expiryScanDoesNotCountIgnoredExpiredTransaction();
        $this->syncPaymentStatusPreservesProviderExceptionWhenLeaseIsSuperseded();
        $this->expiryScanSkipsTransactionWhenStatusCheckIsOwnedElsewhere();
        $this->expiryScanFailsClosedOnNewerSessionState();
        $this->expiryScanDoesNotDirectExpireWhenSessionOrderIsMissing();
        $this->expiryScanUsesNewerSessionProviderOrder();
        $this->syncPaymentStatusSkipsNewerPreparedOrLiveSessionBeforeStaleOrder();
        $this->syncPaymentStatusPrefersNewerSessionOrderOverStaleTransactionOrder();
        $this->syncPaymentStatusSkipsLiveSessionLease();
        $this->syncPaymentStatusFailsClosedForIndeterminateSessionLease();
        $this->syncUnknownOrFailedProviderStatusLeavesTransactionPending();
        $this->lateSessionSuccessCannotPersistAfterTransactionOrLeaseChanges();
        $this->lateSessionFailurePreservesOriginalErrorWhenLeaseIsSuperseded();
        $this->providerFailureIsDurablyMarkedUnknown();
        $this->settledAndCapturedProviderPaymentsCannotBeReplaced();
        $this->providerCallbackPreservesExactAmountThroughNormalization();
        $this->captureFraudStatusDoesNotSettleOrCountAsOfflineLateSuccess();
        $this->unverifiedProviderSuccessCanBeReconciledForOfflineConversion();
        $this->providerSettlementRequiresExactOrderAmount();
        $this->providerSessionResponseAmountMustMatchExactly();
        $this->sessionCaptureChallengeIsUnverifiedAndCanReconcileOffline();
        $this->midtransChargeResponseAmountAndOrderIdMustMatchPersistedIntent();
        $this->legacyProviderSettlementUsesBusinessAmountNotProviderObservations();
        $this->completionSettlementUsesCompletionSessionAmount();
        $this->unknownProviderStateFailsClosed();
        $this->unconfirmedProviderCancellationFailsClosed();
        $this->lateProviderCallbackCannotOverwriteOfflinePayment();
        $this->ambiguousProviderCallbackDoesNotFallbackToTransactionCode();
        $this->providerCallbackRevalidatesOwnerUnderTransactionLock();
        $this->requestsValidateOfflinePaymentInputs();
        $this->offlinePaymentRoutesRemainAuthenticated();
        $this->midtransAdapterExposesStatusAndCancelOperations();
    }

    private function offlineBookingCreatesBuyerAndClosesAtExactBookingFee(): void
    {
        [$pdo, $service, $provider] = $this->freshService(true);

        $result = $service->createOfflineBooking(['id' => 2, 'role' => 'seller'], [
            'car_id' => 10,
            'buyer_name' => 'Rina Pratama',
            'buyer_phone_number' => '081234567890',
            'buyer_email' => null,
            'buyer_username' => 'Rina.Pratama_01',
            'buyer_password' => 'BuyerPass2026',
            'payment_amount' => 5000000,
            'paid_at' => '2026-10-19T10:30',
            'note' => 'Pembayaran Booking Fee diterima langsung di showroom.',
        ]);

        $buyer = $pdo->query("SELECT role, name, phone_number, email, buyer_username, password_hash, account_status, is_approved FROM users WHERE buyer_username = 'rina.pratama_01'")->fetch(PDO::FETCH_ASSOC);
        $transaction = $pdo->query('SELECT payment_method, transaction_status, dp_amount, remaining_amount, expires_at, paid_at FROM transactions LIMIT 1')->fetch(PDO::FETCH_ASSOC);
        $car = $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetch(PDO::FETCH_ASSOC);

        $this->assertSame('buyer', $buyer['role']);
        $this->assertSame('Rina Pratama', $buyer['name']);
        $this->assertSame(null, $buyer['email']);
        $this->assertSame('active', $buyer['account_status']);
        $this->assertSame(1, (int) $buyer['is_approved']);
        $this->assertTrue(password_verify('BuyerPass2026', $buyer['password_hash']));
        $this->assertSame('offline_payment', $transaction['payment_method']);
        $this->assertSame('dp_paid', $transaction['transaction_status']);
        $this->assertSame(5000000, (int) $transaction['dp_amount']);
        $this->assertSame(195000000, (int) $transaction['remaining_amount']);
        $this->assertSame(null, $transaction['expires_at']);
        $this->assertSame('2026-10-19 10:30:00', $transaction['paid_at']);
        $this->assertSame('sold', $car['listing_status']);
        $this->assertSame('dp_paid', $result['transaction_status']);
        $this->assertSame('rina.pratama_01', $result['buyer']['buyer_username']);
        $this->assertSame([], $provider->calls);

        $log = $pdo->query('SELECT provider_name, payment_method, transaction_status, gross_amount, payload_request_json FROM transaction_payment_logs ORDER BY id DESC LIMIT 1')->fetch(PDO::FETCH_ASSOC);
        $audit = json_decode((string) $log['payload_request_json'], true);
        $this->assertSame('offline', $log['provider_name']);
        $this->assertSame('offline_payment', $log['payment_method']);
        $this->assertSame('dp_paid', $log['transaction_status']);
        $this->assertSame(5000000, (int) $log['gross_amount']);
        $this->assertSame('2026-10-19 10:30:00', $audit['paid_at']);
        $this->assertSame('Pembayaran Booking Fee diterima langsung di showroom.', $audit['note']);
        $this->assertSame(2, (int) $audit['recorded_by_user_id']);
    }

    private function offlineBookingRejectsNonOwnerRolesAndMismatchedAmount(): void
    {
        [$pdo, $service] = $this->freshService(true);
        $data = $this->offlineBookingData();

        $this->expectException(ForbiddenException::class, static function () use ($service, $data): void {
            $service->createOfflineBooking(['id' => 2, 'role' => 'seller_staff'], $data);
        });
        $this->expectException(ForbiddenException::class, static function () use ($service, $data): void {
            $service->createOfflineBooking(['id' => 9, 'role' => 'seller'], $data);
        });
        $this->expectException(ForbiddenException::class, static function () use ($service, $data): void {
            $service->createOfflineBooking(['id' => 2, 'role' => 'admin'], $data);
        });

        $wrongAmount = $data;
        $wrongAmount['payment_amount'] = 4999999;
        $this->expectException(ValidationException::class, static function () use ($service, $wrongAmount): void {
            $service->createOfflineBooking(['id' => 2, 'role' => 'seller'], $wrongAmount);
        }, 'payment_amount');

        $this->assertSame(0, (int) $pdo->query('SELECT COUNT(*) FROM transactions')->fetchColumn());
        $this->assertSame(0, (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'buyer'")->fetchColumn());
        $this->assertSame('published', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());

        [$pendingPdo, $pendingService, $provider] = $this->pendingTransactionService(
            [['transaction_status' => 'pending']],
            [['transaction_status' => 'pending']]
        );
        foreach ([['id' => 2, 'role' => 'seller_staff'], ['id' => 2, 'role' => 'admin']] as $unauthorizedUser) {
            $this->expectException(ForbiddenException::class, static function () use ($pendingService, $unauthorizedUser): void {
                $pendingService->recordOfflinePayment($unauthorizedUser, 1, [
                    'payment_amount' => 5000000,
                    'paid_at' => '2026-10-19T11:45',
                    'note' => null,
                ]);
            });
        }
        $this->assertSame([], $provider->calls);
        $this->assertSame('pending_payment', $pendingPdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
    }

    private function offlineBookingRejectsFuturePaymentTimes(): void
    {
        [$bookingPdo, $bookingService] = $this->freshService(true);
        $bookingData = $this->offlineBookingData();
        $bookingData['paid_at'] = $this->futurePaidAt();

        $this->expectException(ValidationException::class, static function () use ($bookingService, $bookingData): void {
            $bookingService->createOfflineBooking(['id' => 2, 'role' => 'seller'], $bookingData);
        }, 'paid_at');
        $this->assertSame(0, (int) $bookingPdo->query('SELECT COUNT(*) FROM transactions')->fetchColumn());
        $this->assertSame(0, (int) $bookingPdo->query("SELECT COUNT(*) FROM users WHERE role = 'buyer'")->fetchColumn());

        [$paymentPdo, $paymentService, $provider] = $this->pendingTransactionService([]);
        $futurePaidAt = $this->futurePaidAt();
        $this->expectException(ValidationException::class, static function () use ($paymentService, $futurePaidAt): void {
            $paymentService->recordOfflinePayment(['id' => 2, 'role' => 'seller'], 1, [
                'payment_amount' => 5000000,
                'paid_at' => $futurePaidAt,
                'note' => null,
            ]);
        }, 'paid_at');
        $this->assertSame([], $provider->calls);
        $this->assertSame('pending_payment', $paymentPdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
    }

    private function offlineConversionWinsBeforeCompletionSessionCreation(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $provider->statusesByOrder['ORDER-TRX-049'] = [['transaction_status' => 'cancel']];

        $service->recordOfflinePayment(['id' => 2, 'role' => 'seller'], 1, [
            'payment_amount' => 5000000,
            'paid_at' => '2026-10-19T11:45',
            'note' => 'Pembayaran Booking Fee diterima langsung.',
        ]);

        $this->expectException(ValidationException::class, static function () use ($service): void {
            $service->completePayment(['id' => 1, 'role' => 'buyer', 'name' => 'Buyer Existing'], 1, [
                'payment_method' => 'gopay',
            ]);
        }, 'transaction_status');

        $this->assertSame(0, $provider->completionCalls);
        $this->assertSame(0, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_operations WHERE operation_type = 'completion_session'")->fetchColumn());
        $this->assertSame('offline_payment', $pdo->query('SELECT payment_method FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('dp_paid', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
    }

    private function cancelRechecksPaymentStateAfterStaleRead(): void
    {
        $pdo = new OfflineBookingHookingPdo();
        $this->createSchema($pdo);
        $this->seedUsersAndCar($pdo, 'reserved');
        [, $service] = $this->pendingTransactionServiceOnPdo($pdo, []);
        $pdo->beforeBeginTransaction(1, static function (OfflineBookingHookingPdo $connection): void {
            $connection->exec("UPDATE transactions SET payment_method = 'offline_payment',
                transaction_status = 'dp_paid', paid_at = '2026-10-20 11:45:00' WHERE id = 1");
            $connection->exec("INSERT INTO transaction_payment_logs
                (transaction_id, provider_name, provider_order_id, payment_method, transaction_status,
                 gross_amount, logged_at, created_at)
                VALUES (1, 'offline', 'TRX-049', 'offline_payment', 'dp_paid', 5000000,
                 '2026-10-20 11:45:00', '2026-10-20 11:45:00')");
        });

        $this->expectException(ValidationException::class, static function () use ($service): void {
            // The initial snapshot is pending, but payment becomes dp_paid
            // immediately before the cancellation transaction acquires its lock.
            $service->cancel(['id' => 1, 'role' => 'buyer'], 1, [
                'cancel_reason' => 'Berubah pikiran',
            ]);
        }, 'refund_bank_name');

        $this->assertSame('dp_paid', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('reserved', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
        $this->assertSame(0, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_logs
            WHERE transaction_id = 1 AND provider_name = 'internal'")->fetchColumn());
    }

    private function pendingCompletionSessionIsRejectedBeforeProviderCall(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $operationCountBefore = (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_operations')->fetchColumn();

        $this->expectException(ValidationException::class, static function () use ($service): void {
            $service->completePayment(['id' => 1, 'role' => 'buyer', 'name' => 'Buyer Existing'], 1, [
                'payment_method' => 'gopay',
            ]);
        }, 'transaction_status');

        $this->assertSame([], $provider->calls);
        $this->assertSame(0, $provider->completionCalls);
        $this->assertSame($operationCountBefore, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_operations')->fetchColumn());
        $this->assertSame(0, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_operations WHERE operation_type = 'completion_session'")->fetchColumn());
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
    }

    private function terminalCompletionSessionStatesAreRejectedBeforeProviderCall(): void
    {
        foreach (['expired', 'cancelled', 'returned'] as $transactionStatus) {
            [$pdo, $service, $provider] = $this->pendingTransactionService([], [], $transactionStatus);
            $operationCountBefore = (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_operations')->fetchColumn();

            $this->expectException(ValidationException::class, static function () use ($service): void {
                $service->completePayment(['id' => 1, 'role' => 'buyer', 'name' => 'Buyer Existing'], 1, [
                    'payment_method' => 'gopay',
                ]);
            }, 'transaction_status');

            $this->assertSame([], $provider->calls);
            $this->assertSame(0, $provider->completionCalls);
            $this->assertSame($operationCountBefore, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_operations')->fetchColumn());
            $this->assertSame(0, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_operations WHERE operation_type = 'completion_session'")->fetchColumn());
            $this->assertSame($transactionStatus, $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        }
    }

    private function completionSessionChecksLockedRowAfterStaleRead(): void
    {
        [$pdo] = $this->pendingTransactionService([]);
        $pdo->exec("UPDATE transactions SET transaction_status = 'dp_paid', payment_method = 'offline_payment' WHERE id = 1");
        $provider = new OfflineBookingFakePaymentProvider();
        $operationCountBefore = (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_operations')->fetchColumn();
        $transactions = new class($pdo) extends TransactionRepository {
            private bool $returnStaleSnapshot = true;

            public function findById(int $id): ?array
            {
                $transaction = parent::findById($id);
                if ($this->returnStaleSnapshot && $transaction !== null) {
                    $this->returnStaleSnapshot = false;
                    $transaction['transaction_status'] = 'cancelled';
                    $transaction['payment_method'] = 'gopay';
                }

                return $transaction;
            }
        };
        $service = new TransactionService(
            $pdo,
            $transactions,
            new PaymentLogService(new PaymentLogRepository($pdo)),
            $provider,
            new OfflineBookingFakeAffiliateService(),
            new OfflineBookingFakeStorageService()
        );

        $this->expectException(ValidationException::class, static function () use ($service): void {
            $service->completePayment(['id' => 1, 'role' => 'buyer', 'name' => 'Buyer Existing'], 1, [
                'payment_method' => 'gopay',
            ]);
        }, 'transaction_status');

        $this->assertSame([], $provider->calls);
        $this->assertSame(0, $provider->completionCalls);
        $this->assertSame($operationCountBefore, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_operations')->fetchColumn());
        $this->assertSame(0, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_operations WHERE operation_type = 'completion_session'")->fetchColumn());
        $this->assertSame('offline_payment', $pdo->query('SELECT payment_method FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('dp_paid', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
    }

    private function initialSessionUsesDurableOrderAndIdempotencyKey(): void
    {
        [$pdo, $service, $provider] = $this->initialPaymentService();
        $transaction = $this->createInitialProviderTransaction($service);
        $operation = $pdo->query("SELECT operation_type, provider_order_id, idempotency_key, operation_status, gross_amount
            FROM transaction_payment_operations WHERE transaction_id = " . (int) $transaction['id'])->fetch(PDO::FETCH_ASSOC);

        $this->assertSame('initial_session', $operation['operation_type']);
        $this->assertSame('completed', $operation['operation_status']);
        $this->assertSame(5000000, (int) $operation['gross_amount']);
        $this->assertSame($operation['provider_order_id'], $transaction['payment_session']['provider_order_id']);
        $this->assertSame($operation['provider_order_id'], $provider->initialSessionCalls[0][0]);
        $this->assertSame($operation['idempotency_key'], $provider->initialSessionCalls[0][1]);
        $this->assertSame(1, $provider->initialCalls);
        $this->assertSame(0, $provider->completionCalls);
        $this->assertSame(1, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_operations WHERE operation_type = 'initial_session'")->fetchColumn());
    }

    private function ambiguousInitialSessionIsDurablyMarkedUnknown(): void
    {
        [$pdo, $service, $provider] = $this->initialPaymentService();
        $provider->initialHook = function ($transaction, $customer, $paymentMethod, $providerOrderId, $idempotencyKey) use ($pdo): array {
            $this->assertTrue(! $pdo->inTransaction(), 'The provider request must not run inside a database transaction.');
            $operation = $pdo->query("SELECT operation_status, provider_order_id, idempotency_key FROM transaction_payment_operations WHERE operation_type = 'initial_session'")->fetch(PDO::FETCH_ASSOC);
            $this->assertSame('in_flight', $operation['operation_status']);
            $this->assertSame($providerOrderId, $operation['provider_order_id']);
            $this->assertSame($idempotencyKey, $operation['idempotency_key']);
            throw new \RuntimeException('Simulated ambiguous network outcome.');
        };

        $this->expectException(\RuntimeException::class, function () use ($service): void {
            $this->createInitialProviderTransaction($service);
        });
        $operation = $pdo->query("SELECT operation_status, provider_order_id, idempotency_key FROM transaction_payment_operations WHERE operation_type = 'initial_session'")->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('unknown', $operation['operation_status']);
        $this->assertSame($operation['provider_order_id'], $provider->initialSessionCalls[0][0]);
        $this->assertSame($operation['idempotency_key'], $provider->initialSessionCalls[0][1]);
        $this->assertSame(1, $provider->initialCalls);
        $this->assertSame(0, $provider->completionCalls);
    }

    private function syncPaymentStatusRecoversLatestPersistedSessionOrder(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $pdo->exec('UPDATE transactions SET midtrans_order_id = NULL WHERE id = 1');
        $pdo->exec('DELETE FROM transaction_payment_logs WHERE transaction_id = 1');
        $pdo->exec("INSERT INTO transaction_payment_operations
            (transaction_id, operation_key, operation_type, provider_order_id, payment_method,
             gross_amount, operation_status, fence, created_at, updated_at)
            VALUES (1, 'initial-recovery', 'initial_session', 'ORDER-TRX-RECOVERED', 'gopay',
             5000000, 'unknown', 1, '2026-10-20 10:01:00', '2026-10-20 10:01:00')");
        $expiredLease = $pdo->prepare("UPDATE transaction_payment_operations
            SET operation_status = 'in_flight', lease_token = 'expired-session-lease', lease_expires_at = :lease_expires_at
            WHERE operation_key = 'initial-recovery'");
        $expiredLease->execute(['lease_expires_at' => date('Y-m-d H:i:s', time() - 300)]);
        $provider->statusesByOrder['ORDER-TRX-RECOVERED'] = [[
            'transaction_status' => 'settlement',
            'gross_amount' => '5000000.00',
            'transaction_id' => 'MID-RECOVERED',
        ]];

        $result = $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);

        $this->assertSame('dp_paid', $result['transaction_status']);
        $this->assertSame([['check', 'ORDER-TRX-RECOVERED']], $provider->calls);
        $this->assertSame(0, $provider->initialCalls);
        $this->assertSame(0, $provider->completionCalls);
        $this->assertSame(2, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_operations
            WHERE operation_type IN ('initial_session', 'legacy_session')")->fetchColumn());
        $statusCheck = $pdo->query("SELECT operation_type, provider_order_id, operation_status, provider_status
            FROM transaction_payment_operations WHERE operation_type = 'status_check'")->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('status_check', $statusCheck['operation_type']);
        $this->assertSame('ORDER-TRX-RECOVERED', $statusCheck['provider_order_id']);
        $this->assertSame('completed', $statusCheck['operation_status']);
        $this->assertSame('settlement', $statusCheck['provider_status']);

        [$completedPdo, $completedService, $completedProvider] = $this->pendingTransactionService([]);
        $completedPdo->exec('UPDATE transactions SET midtrans_order_id = NULL WHERE id = 1');
        $completedPdo->exec('DELETE FROM transaction_payment_logs WHERE transaction_id = 1');
        $completedProvider->statusesByOrder['ORDER-TRX-049'] = [['transaction_status' => 'pending']];

        $completedResult = $completedService->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);

        $this->assertSame('pending_payment', $completedResult['transaction_status']);
        $this->assertSame([['check', 'ORDER-TRX-049']], $completedProvider->calls);
        $this->assertSame(0, $completedProvider->initialCalls);
        $this->assertSame(0, $completedProvider->completionCalls);
    }

    private function syncPaymentStatusDeduplicatesConcurrentChecks(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $secondResult = null;
        $provider->statusHook = function (string $providerOrderId) use ($service, $provider, &$secondResult): array {
            // The first sync has committed its lease before calling the provider.
            // Re-entering here models a second request arriving while that call is
            // in flight, without sleeps or timing-sensitive threads.
            $provider->statusHook = null;
            $secondResult = $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);

            return [
                'order_id' => $providerOrderId,
                'transaction_status' => 'pending',
                'gross_amount' => '5000000.00',
            ];
        };

        $firstResult = $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);

        $this->assertSame('pending_payment', $firstResult['transaction_status']);
        $this->assertSame('pending_payment', $secondResult['transaction_status'] ?? null);
        $this->assertSame([['check', 'ORDER-TRX-049']], $provider->calls);
        $this->assertSame(1, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_operations
            WHERE transaction_id = 1 AND operation_type = 'status_check'")->fetchColumn());
        $statusCheck = $pdo->query("SELECT operation_status, provider_status, lease_token, lease_expires_at
            FROM transaction_payment_operations WHERE transaction_id = 1 AND operation_type = 'status_check'")->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('completed', $statusCheck['operation_status']);
        $this->assertSame('pending', $statusCheck['provider_status']);
        $this->assertSame(null, $statusCheck['lease_token']);
        $this->assertSame(null, $statusCheck['lease_expires_at']);
        $this->assertSame(2, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs WHERE transaction_id = 1')->fetchColumn());
    }

    private function syncPaymentStatusRejectsStaleStatusCheckResults(): void
    {
        foreach (['expired', 'superseded'] as $leaseChange) {
            [$pdo, $service, $provider] = $this->pendingTransactionService([]);
            $provider->statusHook = static function (string $providerOrderId) use ($pdo, $leaseChange): array {
                if ($leaseChange === 'expired') {
                    $statement = $pdo->prepare("UPDATE transaction_payment_operations
                        SET lease_expires_at = :lease_expires_at
                        WHERE transaction_id = 1 AND operation_type = 'status_check'");
                    $statement->execute(['lease_expires_at' => date('Y-m-d H:i:s', time() - 1)]);
                } else {
                    // Keep the old token live but advance its fence. This catches
                    // implementations that re-read the fence after the provider
                    // returns and accidentally authorize the stale response.
                    $pdo->exec("UPDATE transaction_payment_operations SET fence = fence + 1
                        WHERE transaction_id = 1 AND operation_type = 'status_check'");
                }

                return [
                    'order_id' => $providerOrderId,
                    'transaction_status' => 'settlement',
                    'gross_amount' => '5000000.00',
                    'transaction_id' => 'MID-STALE-CHECK',
                ];
            };

            $this->expectException(HttpException::class, static function () use ($service): void {
                $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);
            });

            $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
            $this->assertSame(1, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs WHERE transaction_id = 1')->fetchColumn());
            $operation = $pdo->query("SELECT operation_status, provider_status, lease_token, lease_expires_at, fence
                FROM transaction_payment_operations WHERE transaction_id = 1 AND operation_type = 'status_check'")->fetch(PDO::FETCH_ASSOC);
            $this->assertSame('in_flight', $operation['operation_status']);
            $this->assertSame(null, $operation['provider_status']);
            $this->assertTrue(is_string($operation['lease_token']) && $operation['lease_token'] !== '');
            $this->assertSame($leaseChange === 'superseded' ? 2 : 1, (int) $operation['fence']);
            $leaseExpiry = strtotime((string) $operation['lease_expires_at']);
            $this->assertTrue($leaseChange === 'expired' ? $leaseExpiry <= time() : $leaseExpiry > time());
            $this->assertSame(1, count($provider->calls));
        }
    }

    private function syncPaymentStatusRejectsMismatchedProviderOrder(): void
    {
        foreach ([
            ['order_id' => 'ORDER-OTHER', 'transaction_status' => 'settlement', 'gross_amount' => '5000000.00'],
            ['transaction_status' => 'settlement', 'gross_amount' => '5000000.00'],
        ] as $response) {
            [$pdo, $service, $provider] = $this->pendingTransactionService([]);
            $provider->statusHook = static function (string $requestedOrderId) use ($response): array {
                return $response;
            };

            $this->expectException(ValidationException::class, static function () use ($service): void {
                $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);
            });

            $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
            $this->assertSame(1, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs WHERE transaction_id = 1')->fetchColumn());
            $operation = $pdo->query("SELECT operation_status, provider_status, response_payload_json, error_payload_json
                FROM transaction_payment_operations WHERE operation_type = 'status_check'")->fetch(PDO::FETCH_ASSOC);
            $this->assertSame('unknown', $operation['operation_status']);
            $this->assertSame('unverified_settlement', $operation['provider_status']);
            $this->assertSame($response, json_decode((string) $operation['response_payload_json'], true));
            $error = json_decode((string) $operation['error_payload_json'], true);
            $this->assertSame('Provider status response order_id did not match the requested order.', $error['reason'] ?? null);
            $this->assertSame([['check', 'ORDER-TRX-049']], $provider->calls);
        }
    }

    private function syncPaymentStatusIgnoresAmbiguousOrderSettlement(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $this->insertCallbackCollisionTransaction($pdo, 2, 'TRX-OTHER', 'ORDER-TRX-049');
        $provider->statusesByOrder['ORDER-TRX-049'] = [[
            'transaction_status' => 'settlement',
            'gross_amount' => '5000000.00',
            'transaction_id' => 'MID-AMBIGUOUS-POLL',
        ]];
        $logCountBefore = (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs')->fetchColumn();

        $result = $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);

        $this->assertSame('pending_payment', $result['transaction_status']);
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 2')->fetchColumn());
        $this->assertSame($logCountBefore, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs')->fetchColumn());
        $this->assertSame('reserved', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
        $this->assertSame([['check', 'ORDER-TRX-049']], $provider->calls);
    }

    private function syncPaymentStatusRejectsSessionAppearingAfterSnapshot(): void
    {
        foreach ([false, true] as $hasSessionAtSnapshot) {
            $pdo = new OfflineBookingHookingPdo();
            $this->createSchema($pdo);
            $this->seedUsersAndCar($pdo, 'published');
            [$pdo, $service, $provider] = $this->pendingTransactionServiceOnPdo($pdo, []);
            if (! $hasSessionAtSnapshot) {
                $pdo->exec("DELETE FROM transaction_payment_operations
                    WHERE transaction_id = 1 AND operation_type = 'legacy_session'");
            }
            $pdo->beforeBeginTransaction(1, static function (OfflineBookingHookingPdo $connection) use ($hasSessionAtSnapshot): void {
                $operationKey = $hasSessionAtSnapshot ? 'newer-session-replaces-snapshot' : 'session-arrived-after-null-snapshot';
                $insert = $connection->prepare("INSERT INTO transaction_payment_operations
                    (transaction_id, operation_key, operation_type, provider_order_id, payment_method,
                     gross_amount, operation_status, fence, created_at, updated_at)
                    VALUES (1, :operation_key, 'initial_session', 'ORDER-TRX-NEWER',
                     'gopay', 5000000, 'prepared', 1, :created_at, :created_at)");
                $insert->execute([
                    'operation_key' => $operationKey,
                    'created_at' => date('Y-m-d H:i:s'),
                ]);
            });

            $result = $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);

            $this->assertSame('pending_payment', $result['transaction_status']);
            $this->assertSame([], $provider->calls);
            $this->assertSame(0, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_operations
                WHERE operation_type = 'status_check'")->fetchColumn());
            $this->assertSame('prepared', $pdo->query("SELECT operation_status FROM transaction_payment_operations
                WHERE operation_type = 'initial_session' ORDER BY id DESC LIMIT 1")->fetchColumn());
            $this->assertSame(1, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs WHERE transaction_id = 1')->fetchColumn());
        }
    }

    private function syncPaymentStatusDoesNotApplyAfterOriginSessionChanges(): void
    {
        $pdo = new OfflineBookingHookingPdo();
        $this->createSchema($pdo);
        $this->seedUsersAndCar($pdo, 'published');
        [$pdo, $service, $provider] = $this->pendingTransactionServiceOnPdo($pdo, []);
        $provider->statusesByOrder['ORDER-TRX-049'] = [['transaction_status' => 'expire']];
        $pdo->beforeBeginTransaction(3, static function (OfflineBookingHookingPdo $connection): void {
            $insert = $connection->prepare("INSERT INTO transaction_payment_operations
                (transaction_id, operation_key, operation_type, provider_order_id, payment_method,
                 gross_amount, operation_status, fence, created_at, updated_at)
                VALUES (1, 'session-arrived-before-status-apply', 'initial_session', 'ORDER-TRX-NEWER',
                 'gopay', 5000000, 'prepared', 1, :created_at, :created_at)");
            $insert->execute(['created_at' => date('Y-m-d H:i:s')]);
        });

        $result = $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);

        $this->assertSame('pending_payment', $result['transaction_status']);
        $this->assertSame([['check', 'ORDER-TRX-049']], $provider->calls);
        $this->assertSame(1, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs WHERE transaction_id = 1')->fetchColumn());
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('completed', $pdo->query("SELECT operation_status FROM transaction_payment_operations
            WHERE operation_type = 'status_check'")->fetchColumn());
        $this->assertSame('ORDER-TRX-NEWER', $pdo->query("SELECT provider_order_id FROM transaction_payment_operations
            WHERE operation_key = 'session-arrived-before-status-apply'")->fetchColumn());
    }

    private function expiryScanDoesNotApplyStaleExpireAfterNewerSettlement(): void
    {
        $pdo = new OfflineBookingHookingPdo();
        $this->createSchema($pdo);
        $this->seedUsersAndCar($pdo, 'reserved');
        [$pdo, $service, $provider] = $this->pendingTransactionServiceOnPdo($pdo, []);
        $oldTimestamp = date('Y-m-d H:i:s', time() - 3600);
        $update = $pdo->prepare('UPDATE transactions SET created_at = :created_at, expires_at = :expires_at WHERE id = 1');
        $update->execute(['created_at' => $oldTimestamp, 'expires_at' => $oldTimestamp]);
        $provider->statusesByOrder['ORDER-TRX-049'] = [
            ['transaction_status' => 'expire', 'gross_amount' => '5000000.00'],
            ['transaction_status' => 'settlement', 'gross_amount' => '5000000.00'],
        ];
        $pdo->beforeBeginTransaction(3, static function () use ($service): void {
            // The first expire response is journaled, then a newer sync settles
            // the order before the old response enters processProviderStatus().
            $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);
        });

        $result = $service->expirePendingTransactions();

        $this->assertSame(0, $result['expired_count']);
        $this->assertSame([], $result['expired_transaction_ids']);
        $this->assertSame('dp_paid', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame([['check', 'ORDER-TRX-049'], ['check', 'ORDER-TRX-049']], $provider->calls);
        $this->assertSame(2, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs WHERE transaction_id = 1')->fetchColumn());
        $checks = $pdo->query("SELECT provider_status, operation_status FROM transaction_payment_operations
            WHERE operation_type = 'status_check' ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
        $this->assertSame([
            ['provider_status' => 'expire', 'operation_status' => 'completed'],
            ['provider_status' => 'settlement', 'operation_status' => 'completed'],
        ], $checks);
        $this->assertSame('sold', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
    }

    private function expiryScanIgnoresAmbiguousOrderSettlement(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $this->insertCallbackCollisionTransaction($pdo, 2, 'TRX-OTHER', 'ORDER-TRX-049');
        $futureExpiry = date('Y-m-d H:i:s', time() + 300);
        $update = $pdo->prepare('UPDATE transactions SET created_at = :created_at, expires_at = :expires_at WHERE id = 2');
        $update->execute(['created_at' => date('Y-m-d H:i:s'), 'expires_at' => $futureExpiry]);
        $provider->statusesByOrder['ORDER-TRX-049'] = [[
            'transaction_status' => 'settlement',
            'gross_amount' => '5000000.00',
            'transaction_id' => 'MID-AMBIGUOUS-EXPIRY',
        ]];
        $logCountBefore = (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs')->fetchColumn();

        $result = $service->expirePendingTransactions();

        $this->assertSame(0, $result['expired_count']);
        $this->assertSame([], $result['expired_transaction_ids']);
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 2')->fetchColumn());
        $this->assertSame($logCountBefore, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs')->fetchColumn());
        $this->assertSame('reserved', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
        $this->assertSame([['check', 'ORDER-TRX-049']], $provider->calls);
    }

    private function expiryScanKeepsPendingAndUnknownResponsesReserved(): void
    {
        foreach ([
            'pending' => ['transaction_status' => 'pending'],
            'unknown' => ['transaction_status' => 'unknown'],
            'challenge' => ['transaction_status' => 'challenge'],
            'missing' => [],
        ] as $label => $response) {
            [$pdo, $service, $provider] = $this->pendingTransactionService([]);
            $provider->statusesByOrder['ORDER-TRX-049'] = [$response];
            $result = $service->expirePendingTransactions();

            $this->assertSame(0, $result['expired_count'], $label . ' response must not be reported expired');
            $this->assertSame([], $result['expired_transaction_ids']);
            $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
            $this->assertSame('reserved', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
            $this->assertSame([['check', 'ORDER-TRX-049']], $provider->calls);
        }
    }

    private function expiryScanExpiresOnlyExplicitTerminalUnpaidResponses(): void
    {
        foreach (['expire', 'cancel', 'deny', 'failure', 'failed'] as $providerStatus) {
            [$pdo, $service, $provider] = $this->pendingTransactionService([]);
            $provider->statusesByOrder['ORDER-TRX-049'] = [['transaction_status' => $providerStatus]];

            $result = $service->expirePendingTransactions();

            $this->assertSame(1, $result['expired_count'], $providerStatus . ' is an explicit terminal unpaid status');
            $this->assertSame([1], $result['expired_transaction_ids']);
            $this->assertSame('expired', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
            $this->assertSame('published', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
            $this->assertSame([['check', 'ORDER-TRX-049']], $provider->calls);
        }
    }

    private function expiryScanDoesNotExpireBeforeActualSessionExpiry(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $oldCreatedAt = date('Y-m-d H:i:s', time() - 3600);
        $futureExpiry = date('Y-m-d H:i:s', time() + 300);
        $update = $pdo->prepare('UPDATE transactions SET created_at = :created_at, expires_at = :expires_at WHERE id = 1');
        $update->execute(['created_at' => $oldCreatedAt, 'expires_at' => $futureExpiry]);
        $logCountBefore = (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs')->fetchColumn();
        $repository = new TransactionRepository($pdo);
        $now = date('Y-m-d H:i:s');
        $this->assertSame([], $repository->listStalePending($now));
        $this->assertSame(0, $repository->expirePendingByIds([1], $now));

        $result = $service->expirePendingTransactions();

        $this->assertSame(0, $result['expired_count']);
        $this->assertSame([], $result['expired_transaction_ids']);
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('reserved', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
        $this->assertSame($logCountBefore, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs')->fetchColumn());
        $this->assertSame([], $provider->calls);
    }

    private function expiryScanRechecksProviderExpiryDeadlineUnderLock(): void
    {
        $pdo = new OfflineBookingHookingPdo();
        $this->createSchema($pdo);
        $this->seedUsersAndCar($pdo, 'reserved');
        [$pdo, $service, $provider] = $this->pendingTransactionServiceOnPdo($pdo, []);
        $provider->statusesByOrder['ORDER-TRX-049'] = [['transaction_status' => 'expire']];
        $futureExpiry = date('Y-m-d H:i:s', time() + 300);
        $pdo->beforeBeginTransaction(3, static function (OfflineBookingHookingPdo $connection) use ($futureExpiry): void {
            $update = $connection->prepare('UPDATE transactions SET expires_at = :expires_at WHERE id = 1');
            $update->execute(['expires_at' => $futureExpiry]);
        });
        $logCountBefore = (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs')->fetchColumn();

        $result = $service->expirePendingTransactions();

        $this->assertSame(0, $result['expired_count']);
        $this->assertSame([], $result['expired_transaction_ids']);
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('reserved', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
        $this->assertSame($logCountBefore, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs')->fetchColumn());
        $this->assertSame([['check', 'ORDER-TRX-049']], $provider->calls);
    }

    private function expiryScanDoesNotOverrideConcurrentCallbackCancellation(): void
    {
        $pdo = new OfflineBookingHookingPdo();
        $this->createSchema($pdo);
        $this->seedUsersAndCar($pdo, 'reserved');
        [$pdo, $service, $provider] = $this->pendingTransactionServiceOnPdo($pdo, []);
        $provider->statusesByOrder['ORDER-TRX-049'] = [
            ['transaction_status' => 'expire'],
            ['transaction_status' => 'cancel'],
        ];
        $logCountBefore = (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs')->fetchColumn();
        $pdo->beforeBeginTransaction(3, static function () use ($service): void {
            $service->handleProviderCallback([
                'order_id' => 'ORDER-TRX-049',
                'transaction_status' => 'cancel',
                'gross_amount' => '5000000.00',
                'transaction_id' => 'MID-CANCEL-RACE',
                'payment_type' => 'gopay',
            ]);
        });

        $result = $service->expirePendingTransactions();

        $this->assertSame(0, $result['expired_count']);
        $this->assertSame([], $result['expired_transaction_ids']);
        $this->assertSame('cancelled', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('reserved', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
        $this->assertSame($logCountBefore + 1, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs')->fetchColumn());
        $statuses = $pdo->query('SELECT transaction_status FROM transaction_payment_logs WHERE transaction_id = 1 ORDER BY id ASC')->fetchAll(PDO::FETCH_COLUMN);
        $this->assertSame(['pending', 'cancel'], $statuses);
        $this->assertSame([
            ['check', 'ORDER-TRX-049'],
            ['check', 'ORDER-TRX-049'],
        ], $provider->calls);
    }

    private function expiryScanRechecksNoOrderContextUnderLock(): void
    {
        foreach (['new_session', 'offline', 'terminal', 'future_expiry'] as $change) {
            $pdo = new OfflineBookingHookingPdo();
            $this->createSchema($pdo);
            $this->seedUsersAndCar($pdo, 'reserved');
            [$pdo, $service, $provider] = $this->pendingTransactionServiceOnPdo($pdo, []);
            $oldTimestamp = date('Y-m-d H:i:s', time() - 3600);
            $update = $pdo->prepare('UPDATE transactions SET midtrans_order_id = NULL, created_at = :created_at, expires_at = :expires_at WHERE id = 1');
            $update->execute(['created_at' => $oldTimestamp, 'expires_at' => $oldTimestamp]);
            $pdo->exec('DELETE FROM transaction_payment_logs WHERE transaction_id = 1');
            $pdo->exec("DELETE FROM transaction_payment_operations
                WHERE transaction_id = 1 AND operation_type = 'legacy_session'");
            $pdo->beforeBeginTransaction(1, static function (OfflineBookingHookingPdo $connection) use ($change): void {
                if ($change === 'new_session') {
                    $insert = $connection->prepare("INSERT INTO transaction_payment_operations
                        (transaction_id, operation_key, operation_type, provider_order_id, payment_method,
                         gross_amount, operation_status, fence, created_at, updated_at)
                        VALUES (1, 'late-session-order', 'initial_session', 'ORDER-TRX-LATE',
                         'gopay', 5000000, 'prepared', 1, :created_at, :created_at)");
                    $insert->execute(['created_at' => date('Y-m-d H:i:s')]);
                } elseif ($change === 'offline') {
                    $connection->exec("UPDATE transactions SET payment_method = 'offline_payment' WHERE id = 1");
                } elseif ($change === 'terminal') {
                    $connection->exec("UPDATE transactions SET transaction_status = 'dp_paid' WHERE id = 1");
                } else {
                    $update = $connection->prepare('UPDATE transactions SET expires_at = :expires_at WHERE id = 1');
                    $update->execute(['expires_at' => date('Y-m-d H:i:s', time() + 300)]);
                }
            });

            $result = $service->expirePendingTransactions();

            $this->assertSame(0, $result['expired_count']);
            $this->assertSame([], $result['expired_transaction_ids']);
            $this->assertSame($change === 'terminal' ? 'dp_paid' : 'pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
            $this->assertSame($change === 'offline' ? 'offline_payment' : 'gopay', $pdo->query('SELECT payment_method FROM transactions WHERE id = 1')->fetchColumn());
            $this->assertSame('reserved', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
            $this->assertSame([], $provider->calls);
            $this->assertSame(0, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_operations
                WHERE operation_type = 'status_check'")->fetchColumn());
        }
    }

    private function expiryScanDoesNotPublishWhenExpirationUpdateDoesNotChangeRow(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $oldTimestamp = date('Y-m-d H:i:s', time() - 3600);
        $update = $pdo->prepare('UPDATE transactions SET midtrans_order_id = NULL, created_at = :created_at, expires_at = :expires_at WHERE id = 1');
        $update->execute(['created_at' => $oldTimestamp, 'expires_at' => $oldTimestamp]);
        $pdo->exec('DELETE FROM transaction_payment_logs WHERE transaction_id = 1');
        $pdo->exec("DELETE FROM transaction_payment_operations
            WHERE transaction_id = 1 AND operation_type = 'legacy_session'");
        $pdo->exec("CREATE TRIGGER ignore_transaction_expiry BEFORE UPDATE OF transaction_status ON transactions
            WHEN NEW.transaction_status = 'expired' BEGIN SELECT RAISE(IGNORE); END");

        $result = $service->expirePendingTransactions();

        $this->assertSame(0, $result['expired_count']);
        $this->assertSame([], $result['expired_transaction_ids']);
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('reserved', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
        $this->assertSame([], $provider->calls);
    }

    private function expiryScanDoesNotCountIgnoredExpiredTransaction(): void
    {
        $pdo = new OfflineBookingHookingPdo();
        $this->createSchema($pdo);
        $this->seedUsersAndCar($pdo, 'reserved');
        [$pdo, $service] = $this->pendingTransactionServiceOnPdo($pdo, [[
            'transaction_status' => 'expire',
            'gross_amount' => '5000000.00',
        ]]);
        $pdo->exec("UPDATE transactions SET expires_at = '2026-10-20 09:00:00' WHERE id = 1");
        $pdo->beforeBeginTransaction(3, static function (OfflineBookingHookingPdo $connection): void {
            $connection->exec("UPDATE transactions SET transaction_status = 'expired' WHERE id = 1");
        });

        $result = $service->expirePendingTransactions();

        $this->assertSame(0, $result['expired_count']);
        $this->assertSame([], $result['expired_transaction_ids']);
        $this->assertSame('expired', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
    }

    private function syncPaymentStatusPreservesProviderExceptionWhenLeaseIsSuperseded(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $provider->statusHook = static function (string $providerOrderId) use ($pdo): array {
            $pdo->exec("UPDATE transaction_payment_operations SET fence = fence + 1
                WHERE transaction_id = 1 AND operation_type = 'status_check'");
            throw new \RuntimeException('Provider status service is temporarily unavailable.');
        };

        $thrown = null;
        try {
            $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);
        } catch (\Throwable $exception) {
            $thrown = $exception;
        }

        $this->assertSame(
            \RuntimeException::class,
            $thrown === null ? null : get_class($thrown),
            'Unexpected provider failure: ' . ($thrown === null ? 'none' : get_class($thrown) . ': ' . $thrown->getMessage())
        );
        $this->assertSame('Provider status service is temporarily unavailable.', $thrown === null ? null : $thrown->getMessage());
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame(1, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs WHERE transaction_id = 1')->fetchColumn());
        $operation = $pdo->query("SELECT operation_status, error_payload_json, fence
            FROM transaction_payment_operations WHERE transaction_id = 1 AND operation_type = 'status_check'")->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('in_flight', $operation['operation_status']);
        $this->assertSame(null, $operation['error_payload_json']);
        $this->assertSame(2, (int) $operation['fence']);
        $this->assertSame([['check', 'ORDER-TRX-049']], $provider->calls);
    }

    private function expiryScanSkipsTransactionWhenStatusCheckIsOwnedElsewhere(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $oldTimestamp = date('Y-m-d H:i:s', time() - 3600);
        $update = $pdo->prepare('UPDATE transactions SET created_at = :created_at, expires_at = :expires_at WHERE id = 1');
        $update->execute(['created_at' => $oldTimestamp, 'expires_at' => $oldTimestamp]);
        $insert = $pdo->prepare("INSERT INTO transaction_payment_operations
            (transaction_id, operation_key, operation_type, provider_order_id, operation_status,
             fence, lease_token, lease_expires_at, first_attempt_at, created_at, updated_at)
            VALUES (1, 'active-status-check', 'status_check', 'ORDER-TRX-049', 'in_flight',
             1, 'active-status-check-lease', :lease_expires_at, :now, :now, :now)");
        $insert->execute([
            'lease_expires_at' => date('Y-m-d H:i:s', time() + 300),
            'now' => date('Y-m-d H:i:s'),
        ]);

        $result = $service->expirePendingTransactions();

        $this->assertSame(0, $result['expired_count']);
        $this->assertSame([], $result['expired_transaction_ids']);
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('reserved', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
        $this->assertSame(1, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs WHERE transaction_id = 1')->fetchColumn());
        $this->assertSame([], $provider->calls);
        $this->assertSame('in_flight', $pdo->query("SELECT operation_status FROM transaction_payment_operations
            WHERE transaction_id = 1 AND operation_type = 'status_check'")->fetchColumn());
    }

    private function expiryScanFailsClosedOnNewerSessionState(): void
    {
        foreach (['prepared', 'live', 'indeterminate_null', 'indeterminate_invalid'] as $sessionState) {
            [$pdo, $service, $provider] = $this->pendingTransactionService([]);
            $oldTimestamp = date('Y-m-d H:i:s', time() - 3600);
            $update = $pdo->prepare('UPDATE transactions SET created_at = :created_at, expires_at = :expires_at WHERE id = 1');
            $update->execute(['created_at' => $oldTimestamp, 'expires_at' => $oldTimestamp]);
            $isInFlight = $sessionState !== 'prepared';
            $leaseExpiresAt = $sessionState === 'live'
                ? date('Y-m-d H:i:s', time() + 300)
                : ($sessionState === 'indeterminate_invalid' ? 'not-a-valid-expiry' : null);
            $insert = $pdo->prepare("INSERT INTO transaction_payment_operations
                (transaction_id, operation_key, operation_type, provider_order_id, payment_method,
                 gross_amount, operation_status, fence, lease_token, lease_expires_at, created_at, updated_at)
                VALUES (1, :operation_key, 'initial_session', 'ORDER-TRX-NEWER', 'gopay',
                 5000000, :operation_status, 1, :lease_token, :lease_expires_at, :created_at, :created_at)");
            $insert->execute([
                'operation_key' => 'newer-session-' . $sessionState,
                'operation_status' => $isInFlight ? 'in_flight' : 'prepared',
                'lease_token' => $isInFlight ? 'newer-session-lease-' . $sessionState : null,
                'lease_expires_at' => $leaseExpiresAt,
                'created_at' => date('Y-m-d H:i:s'),
            ]);
            $provider->statusesByOrder['ORDER-TRX-049'] = [['transaction_status' => 'expire']];

            $result = $service->expirePendingTransactions();

            $this->assertSame(0, $result['expired_count']);
            $this->assertSame([], $result['expired_transaction_ids']);
            $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
            $latestSessionQuery = $pdo->prepare("SELECT provider_order_id, operation_status, lease_token, lease_expires_at
                FROM transaction_payment_operations WHERE operation_key = :operation_key");
            $latestSessionQuery->execute(['operation_key' => 'newer-session-' . $sessionState]);
            $latestSession = $latestSessionQuery->fetch(PDO::FETCH_ASSOC);
            $this->assertSame('ORDER-TRX-NEWER', $latestSession['provider_order_id']);
            $this->assertSame($isInFlight ? 'in_flight' : 'prepared', $latestSession['operation_status']);
            $this->assertSame($isInFlight ? 'newer-session-lease-' . $sessionState : null, $latestSession['lease_token']);
            $this->assertSame($leaseExpiresAt, $latestSession['lease_expires_at']);
            $this->assertSame([], $provider->calls);
            $this->assertSame(0, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_operations
                WHERE transaction_id = 1 AND operation_type = 'status_check'")->fetchColumn());
            $this->assertSame(1, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs WHERE transaction_id = 1')->fetchColumn());
        }
    }

    private function expiryScanUsesNewerSessionProviderOrder(): void
    {
        foreach (['unknown', 'completed', 'failed', 'expired_in_flight'] as $sessionState) {
            [$pdo, $service, $provider] = $this->pendingTransactionService([]);
            $oldTimestamp = date('Y-m-d H:i:s', time() - 3600);
            $update = $pdo->prepare('UPDATE transactions SET created_at = :created_at, expires_at = :expires_at WHERE id = 1');
            $update->execute(['created_at' => $oldTimestamp, 'expires_at' => $oldTimestamp]);
            $operationStatus = $sessionState === 'expired_in_flight' ? 'in_flight' : $sessionState;
            $leaseToken = $sessionState === 'expired_in_flight' ? 'expired-newer-session-lease' : null;
            $leaseExpiresAt = $sessionState === 'expired_in_flight'
                ? date('Y-m-d H:i:s', time() - 300)
                : null;
            $insert = $pdo->prepare("INSERT INTO transaction_payment_operations
                (transaction_id, operation_key, operation_type, provider_order_id, payment_method,
                 gross_amount, operation_status, fence, lease_token, lease_expires_at, created_at, updated_at)
                VALUES (1, :operation_key, 'initial_session', 'ORDER-TRX-NEWER', 'gopay',
                 5000000, :operation_status, 1, :lease_token, :lease_expires_at, :created_at, :created_at)");
            $insert->execute([
                'operation_key' => 'newer-session-expiry-' . $sessionState,
                'operation_status' => $operationStatus,
                'lease_token' => $leaseToken,
                'lease_expires_at' => $leaseExpiresAt,
                'created_at' => date('Y-m-d H:i:s'),
            ]);
            $provider->statusesByOrder['ORDER-TRX-NEWER'] = [[
                'transaction_status' => 'settlement',
                'gross_amount' => '5000000.00',
                'transaction_id' => 'MID-NEWER-SESSION',
            ]];

            $result = $service->expirePendingTransactions();

            $this->assertSame(0, $result['expired_count']);
            $this->assertSame([], $result['expired_transaction_ids']);
            $this->assertSame('dp_paid', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
            $this->assertSame([['check', 'ORDER-TRX-NEWER']], $provider->calls);
            $statusCheck = $pdo->query("SELECT provider_order_id, operation_status, provider_status
                FROM transaction_payment_operations WHERE transaction_id = 1 AND operation_type = 'status_check'")->fetch(PDO::FETCH_ASSOC);
            $this->assertSame('ORDER-TRX-NEWER', $statusCheck['provider_order_id']);
            $this->assertSame('completed', $statusCheck['operation_status']);
            $this->assertSame('settlement', $statusCheck['provider_status']);
        }
    }

    private function expiryScanDoesNotDirectExpireWhenSessionOrderIsMissing(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $oldTimestamp = date('Y-m-d H:i:s', time() - 3600);
        $update = $pdo->prepare('UPDATE transactions SET midtrans_order_id = NULL, created_at = :created_at, expires_at = :expires_at WHERE id = 1');
        $update->execute(['created_at' => $oldTimestamp, 'expires_at' => $oldTimestamp]);
        $pdo->exec('DELETE FROM transaction_payment_logs WHERE transaction_id = 1');
        $pdo->exec("UPDATE transaction_payment_operations SET operation_type = 'initial_session',
            provider_order_id = NULL, operation_status = 'in_flight', lease_token = 'unknown-session-lease',
            lease_expires_at = NULL WHERE transaction_id = 1 AND operation_type = 'legacy_session'");

        $result = $service->expirePendingTransactions();

        $this->assertSame(0, $result['expired_count']);
        $this->assertSame([], $result['expired_transaction_ids']);
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame([], $provider->calls);
        $this->assertSame(0, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_operations
            WHERE transaction_id = 1 AND operation_type = 'status_check'")->fetchColumn());
    }

    private function syncPaymentStatusSkipsLiveSessionLease(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $pdo->exec('UPDATE transactions SET midtrans_order_id = NULL WHERE id = 1');
        $pdo->exec('DELETE FROM transaction_payment_logs WHERE transaction_id = 1');
        $stmt = $pdo->prepare("UPDATE transaction_payment_operations
            SET operation_type = 'initial_session', operation_status = 'in_flight',
                lease_token = 'live-session-lease', lease_expires_at = :lease_expires_at
            WHERE transaction_id = 1 AND operation_type = 'legacy_session'");
        $stmt->execute(['lease_expires_at' => date('Y-m-d H:i:s', time() + 300)]);

        $result = $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);

        $this->assertSame('pending_payment', $result['transaction_status']);
        $this->assertSame([], $provider->calls);
        $this->assertSame(0, $provider->initialCalls);
        $this->assertSame(0, $provider->completionCalls);
        $this->assertSame(0, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_operations
            WHERE operation_type = 'status_check'")->fetchColumn());
    }

    private function syncPaymentStatusSkipsNewerPreparedOrLiveSessionBeforeStaleOrder(): void
    {
        foreach (['prepared', 'in_flight'] as $sessionStatus) {
            [$pdo, $service, $provider] = $this->pendingTransactionService([]);
            $insert = $pdo->prepare("INSERT INTO transaction_payment_operations
                (transaction_id, operation_key, operation_type, provider_order_id, payment_method,
                 gross_amount, operation_status, fence, lease_token, lease_expires_at, created_at, updated_at)
                VALUES (1, :operation_key, 'initial_session', 'ORDER-TRX-NEWER', 'gopay',
                 5000000, :operation_status, 1, :lease_token, :lease_expires_at, '2026-10-20 10:02:00', '2026-10-20 10:02:00')");
            $insert->execute([
                'operation_key' => 'newer-session-' . $sessionStatus,
                'operation_status' => $sessionStatus,
                'lease_token' => $sessionStatus === 'in_flight' ? 'newer-live-session-lease' : null,
                'lease_expires_at' => $sessionStatus === 'in_flight' ? date('Y-m-d H:i:s', time() + 300) : null,
            ]);
            $provider->statusesByOrder['ORDER-TRX-049'] = [['transaction_status' => 'expire']];

            $result = $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);

            $this->assertSame('pending_payment', $result['transaction_status']);
            $this->assertSame([], $provider->calls);
            $this->assertSame(0, $provider->initialCalls);
            $this->assertSame(0, $provider->completionCalls);
            $this->assertSame(0, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_operations
                WHERE operation_type = 'status_check'")->fetchColumn());
            $this->assertSame('ORDER-TRX-049', $pdo->query('SELECT midtrans_order_id FROM transactions WHERE id = 1')->fetchColumn());
            $this->assertSame('ORDER-TRX-049', $pdo->query('SELECT provider_order_id FROM transaction_payment_logs WHERE transaction_id = 1')->fetchColumn());
        }
    }

    private function syncPaymentStatusPrefersNewerSessionOrderOverStaleTransactionOrder(): void
    {
        foreach (['unknown', 'completed', 'failed', 'expired_in_flight'] as $sessionState) {
            [$pdo, $service, $provider] = $this->pendingTransactionService([]);
            $operationStatus = $sessionState === 'expired_in_flight' ? 'in_flight' : $sessionState;
            $leaseToken = $sessionState === 'expired_in_flight' ? 'expired-newer-session-lease' : null;
            $leaseExpiresAt = $sessionState === 'expired_in_flight'
                ? date('Y-m-d H:i:s', time() - 300)
                : null;
            $insert = $pdo->prepare("INSERT INTO transaction_payment_operations
                (transaction_id, operation_key, operation_type, provider_order_id, payment_method,
                 gross_amount, operation_status, fence, lease_token, lease_expires_at, created_at, updated_at)
                VALUES (1, :operation_key, 'initial_session', 'ORDER-TRX-NEWER', 'gopay',
                 5000000, :operation_status, 1, :lease_token, :lease_expires_at, '2026-10-20 10:02:00', '2026-10-20 10:02:00')");
            $insert->execute([
                'operation_key' => 'newer-session-' . $sessionState,
                'operation_status' => $operationStatus,
                'lease_token' => $leaseToken,
                'lease_expires_at' => $leaseExpiresAt,
            ]);
            $provider->statusesByOrder['ORDER-TRX-049'] = [['transaction_status' => 'expire']];
            $provider->statusesByOrder['ORDER-TRX-NEWER'] = [['transaction_status' => 'pending']];

            $result = $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);

            $this->assertSame('pending_payment', $result['transaction_status']);
            $this->assertSame([['check', 'ORDER-TRX-NEWER']], $provider->calls);
            $statusCheck = $pdo->query("SELECT provider_order_id FROM transaction_payment_operations
                WHERE operation_type = 'status_check'")->fetchColumn();
            $this->assertSame('ORDER-TRX-NEWER', $statusCheck);
            $this->assertSame(0, $provider->initialCalls);
            $this->assertSame(0, $provider->completionCalls);
        }
    }

    private function syncPaymentStatusFailsClosedForIndeterminateSessionLease(): void
    {
        foreach ([null, 'not-a-valid-expiry'] as $leaseExpiresAt) {
            [$pdo, $service, $provider] = $this->pendingTransactionService([]);
            $pdo->exec('UPDATE transactions SET midtrans_order_id = NULL WHERE id = 1');
            $pdo->exec('DELETE FROM transaction_payment_logs WHERE transaction_id = 1');
            $stmt = $pdo->prepare("UPDATE transaction_payment_operations
                SET operation_type = 'initial_session', operation_status = 'in_flight',
                    lease_token = 'indeterminate-session-lease', lease_expires_at = :lease_expires_at
                WHERE transaction_id = 1 AND operation_type = 'legacy_session'");
            $stmt->execute(['lease_expires_at' => $leaseExpiresAt]);
            $fenceBefore = (int) $pdo->query("SELECT fence FROM transaction_payment_operations
                WHERE operation_type = 'initial_session'")->fetchColumn();

            $result = $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);

            $this->assertSame('pending_payment', $result['transaction_status']);
            $this->assertSame([], $provider->calls);
            $this->assertSame(0, $provider->initialCalls);
            $this->assertSame(0, $provider->completionCalls);
            $this->assertSame('in_flight', $pdo->query("SELECT operation_status FROM transaction_payment_operations
                WHERE operation_type = 'initial_session'")->fetchColumn());
            $this->assertSame('indeterminate-session-lease', $pdo->query("SELECT lease_token FROM transaction_payment_operations
                WHERE operation_type = 'initial_session'")->fetchColumn());
            $this->assertSame($fenceBefore, (int) $pdo->query("SELECT fence FROM transaction_payment_operations
                WHERE operation_type = 'initial_session'")->fetchColumn());
            $this->assertSame(0, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_operations
                WHERE operation_type = 'status_check'")->fetchColumn());
            $this->assertSame(0, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs')->fetchColumn());
        }
    }

    private function syncUnknownOrFailedProviderStatusLeavesTransactionPending(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $pdo->exec('UPDATE transactions SET midtrans_order_id = NULL WHERE id = 1');
        $pdo->exec('DELETE FROM transaction_payment_logs WHERE transaction_id = 1');
        $pdo->exec("UPDATE transaction_payment_operations SET operation_status = 'unknown'
            WHERE transaction_id = 1 AND operation_type = 'legacy_session'");
        $provider->statusesByOrder['ORDER-TRX-049'] = [['transaction_status' => 'challenge']];

        $result = $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);

        $this->assertSame('pending_payment', $result['transaction_status']);
        $this->assertSame([['check', 'ORDER-TRX-049']], $provider->calls);
        $this->assertSame(0, $provider->initialCalls);
        $this->assertSame(0, $provider->completionCalls);
        $this->assertSame('challenge', $pdo->query('SELECT transaction_status FROM transaction_payment_logs ORDER BY id DESC LIMIT 1')->fetchColumn());
        $this->assertSame('completed', $pdo->query("SELECT operation_status FROM transaction_payment_operations
            WHERE operation_type = 'status_check'")->fetchColumn());

        [$failedPdo, $failedService, $failedProvider] = $this->pendingTransactionService([]);
        $failedPdo->exec('UPDATE transactions SET midtrans_order_id = NULL WHERE id = 1');
        $failedPdo->exec('DELETE FROM transaction_payment_logs WHERE transaction_id = 1');
        $failedPdo->exec("UPDATE transaction_payment_operations SET operation_status = 'unknown'
            WHERE transaction_id = 1 AND operation_type = 'legacy_session'");
        $failedProvider->statusesByOrder['ORDER-TRX-049'] = [];

        $this->expectException(\RuntimeException::class, static function () use ($failedService): void {
            $failedService->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);
        });

        $this->assertSame('pending_payment', $failedPdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame([['check', 'ORDER-TRX-049']], $failedProvider->calls);
        $this->assertSame('unknown', $failedPdo->query("SELECT operation_status FROM transaction_payment_operations
            WHERE operation_type = 'status_check'")->fetchColumn());
        $this->assertSame(0, $failedProvider->initialCalls);
        $this->assertSame(0, $failedProvider->completionCalls);
    }

    private function lateSessionSuccessCannotPersistAfterTransactionOrLeaseChanges(): void
    {
        foreach (['terminal', 'offline', 'lease'] as $change) {
            [$pdo, $service, $provider] = $this->initialPaymentService();
            $originalExpiry = null;
            $provider->initialHook = static function ($transaction, $customer, $paymentMethod, $providerOrderId) use ($pdo, $change, &$originalExpiry): array {
                $originalExpiry = $pdo->query('SELECT expires_at FROM transactions WHERE id = 1')->fetchColumn();
                if ($change === 'terminal') {
                    $pdo->exec("UPDATE transactions SET transaction_status = 'expired' WHERE id = 1");
                } elseif ($change === 'offline') {
                    $pdo->exec("UPDATE transactions SET payment_method = 'offline_payment', midtrans_token = NULL,
                        midtrans_redirect_url = NULL, expires_at = NULL WHERE id = 1");
                } else {
                    $pdo->exec("UPDATE transaction_payment_operations SET fence = fence + 1,
                        lease_token = 'superseding-session-lease'
                        WHERE transaction_id = 1 AND operation_type = 'initial_session'");
                }

                return [
                    'provider_name' => 'midtrans',
                    'provider_order_id' => $providerOrderId,
                    'provider_transaction_id' => null,
                    'payment_method' => $paymentMethod,
                    'transaction_status' => 'pending',
                    'gross_amount' => 5000000,
                    'expires_at' => '2099-12-31 23:59:59',
                    'payment_data' => ['token' => 'late-payment-token'],
                    'payload_request' => ['order_id' => $providerOrderId],
                    'payload_response' => ['token' => 'late-payment-token'],
                    'midtrans_token' => 'late-payment-token',
                    'midtrans_redirect_url' => 'https://payments.example.test/late-session',
                ];
            };

            $this->expectException(\App\Core\Exceptions\HttpException::class, function () use ($service): void {
                $this->createInitialProviderTransaction($service);
            });

            $transaction = $pdo->query('SELECT payment_method, transaction_status, midtrans_order_id,
                midtrans_token, midtrans_redirect_url, expires_at FROM transactions WHERE id = 1')->fetch(PDO::FETCH_ASSOC);
            $this->assertSame(null, $transaction['midtrans_order_id']);
            $this->assertSame(null, $transaction['midtrans_token']);
            $this->assertSame(null, $transaction['midtrans_redirect_url']);
            $this->assertSame(0, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs')->fetchColumn());
            $this->assertSame(null, $pdo->query("SELECT response_payload_json FROM transaction_payment_operations
                WHERE operation_type = 'initial_session'")->fetchColumn());

            if ($change === 'terminal') {
                $this->assertSame('expired', $transaction['transaction_status']);
                $this->assertSame($originalExpiry, $transaction['expires_at']);
            } elseif ($change === 'offline') {
                $this->assertSame('offline_payment', $transaction['payment_method']);
                $this->assertSame('pending_payment', $transaction['transaction_status']);
                $this->assertSame(null, $transaction['expires_at']);
            } else {
                $this->assertSame('pending_payment', $transaction['transaction_status']);
                $this->assertSame('superseding-session-lease', $pdo->query("SELECT lease_token FROM transaction_payment_operations
                    WHERE operation_type = 'initial_session'")->fetchColumn());
            }
        }
    }

    private function lateSessionFailurePreservesOriginalErrorWhenLeaseIsSuperseded(): void
    {
        [$pdo, $service, $provider] = $this->initialPaymentService();
        $provider->initialHook = static function ($transaction, $customer, $paymentMethod, $providerOrderId) use ($pdo): array {
            $pdo->exec("UPDATE transaction_payment_operations SET fence = fence + 1,
                lease_token = 'superseding-session-lease'
                WHERE transaction_id = 1 AND operation_type = 'initial_session'");
            throw new \App\Infrastructure\Payment\PaymentProviderException('original provider failure', [
                'provider_name' => 'midtrans',
                'provider_order_id' => $providerOrderId,
                'transaction_status' => 'create_session_failed',
                'gross_amount' => 5000000,
                'payload_request' => ['order_id' => $providerOrderId],
                'payload_response' => ['message' => 'original provider failure'],
            ]);
        };

        $caught = null;
        try {
            $this->createInitialProviderTransaction($service);
        } catch (\Throwable $exception) {
            $caught = $exception;
        }

        $this->assertTrue($caught instanceof \App\Infrastructure\Payment\PaymentProviderException);
        $this->assertSame('original provider failure', $caught->getMessage());
        $this->assertSame(null, $pdo->query('SELECT midtrans_order_id FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame(null, $pdo->query('SELECT midtrans_token FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame(null, $pdo->query('SELECT midtrans_redirect_url FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame(0, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs')->fetchColumn());
        $this->assertSame(null, $pdo->query("SELECT error_payload_json FROM transaction_payment_operations
            WHERE operation_type = 'initial_session'")->fetchColumn());
        $this->assertSame('superseding-session-lease', $pdo->query("SELECT lease_token FROM transaction_payment_operations
            WHERE operation_type = 'initial_session'")->fetchColumn());
    }

    private function providerFailureIsDurablyMarkedUnknown(): void
    {
        [$pdo, $service, $provider] = $this->initialPaymentService();
        $provider->initialHook = static function ($transaction, $customer, $paymentMethod, $providerOrderId): array {
            throw new \App\Infrastructure\Payment\PaymentProviderException(
                'Provider session creation failed.',
                [
                    'provider_name' => 'midtrans',
                    'provider_order_id' => $providerOrderId,
                    'transaction_status' => 'create_session_failed',
                    'gross_amount' => 5000000,
                ]
            );
        };

        $this->expectException(\App\Infrastructure\Payment\PaymentProviderException::class, function () use ($service): void {
            $this->createInitialProviderTransaction($service);
        });

        $log = $pdo->query("SELECT provider_name, provider_order_id, transaction_status
            FROM transaction_payment_logs WHERE transaction_status = 'create_session_failed'")->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('midtrans', $log['provider_name']);
        $this->assertSame($provider->initialSessionCalls[0][0], $log['provider_order_id']);
        $this->assertSame('unknown', $pdo->query("SELECT operation_status FROM transaction_payment_operations WHERE operation_type = 'initial_session'")->fetchColumn());
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
    }

    private function pendingProviderSessionIsCancelledAndCheckedAgain(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService(
            [['transaction_status' => 'pending'], ['transaction_status' => 'cancel']],
            [['transaction_status' => 'cancel']]
        );

        $result = $service->recordOfflinePayment(['id' => 2, 'role' => 'seller'], 1, [
            'payment_amount' => 5000000,
            'paid_at' => '2026-10-19T11:45',
            'note' => 'Buyer membayar Booking Fee di showroom.',
        ]);

        $row = $pdo->query('SELECT payment_method, transaction_status, expires_at, paid_at FROM transactions WHERE id = 1')->fetch(PDO::FETCH_ASSOC);
        $this->assertSame([
            ['check', 'ORDER-TRX-049'],
            ['cancel', 'ORDER-TRX-049'],
            ['check', 'ORDER-TRX-049'],
        ], $provider->calls);
        $this->assertSame('offline_payment', $row['payment_method']);
        $this->assertSame('dp_paid', $row['transaction_status']);
        $this->assertSame(null, $row['expires_at']);
        $this->assertSame('2026-10-19 11:45:00', $row['paid_at']);
        $this->assertSame('dp_paid', $result['transaction_status']);
        $this->assertSame('sold', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());

        $auditActions = $pdo->query("SELECT payload_request_json FROM transaction_payment_logs WHERE provider_name = 'midtrans' ORDER BY id")->fetchAll(PDO::FETCH_COLUMN);
        $actions = array_map(static function (string $json): ?string {
            $payload = json_decode($json, true);

            return $payload['action'] ?? null;
        }, $auditActions);
        $this->assertSame([null, 'status_before_cancel', 'cancel_pending', 'status_after_cancel'], $actions);
    }

    private function offlineConversionRejectsInvalidOrMissingGateLease(): void
    {
        foreach ([
            ['token' => null, 'expiry' => date('Y-m-d H:i:s', time() + 600)],
            ['token' => 'malformed-lease', 'expiry' => 'not-a-valid-date'],
        ] as $lease) {
            [$pdo, $service, $provider] = $this->pendingTransactionService([]);
            $gateId = $this->insertOfflineConversionGate($pdo, [
                'lease_token' => $lease['token'],
                'lease_expires_at' => $lease['expiry'],
                'fence' => 7,
            ]);

            $this->expectException(HttpException::class, static function () use ($service): void {
                $service->recordOfflinePayment(['id' => 2, 'role' => 'seller'], 1, [
                    'payment_amount' => 5000000,
                    'paid_at' => '2026-10-19T11:45',
                    'note' => null,
                ]);
            });

            $gate = $pdo->query('SELECT operation_status, lease_token, fence FROM transaction_payment_operations WHERE id = ' . $gateId)->fetch(PDO::FETCH_ASSOC);
            $this->assertSame('in_flight', $gate['operation_status']);
            $this->assertSame($lease['token'], $gate['lease_token']);
            $this->assertSame(7, (int) $gate['fence']);
            $this->assertSame(1, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_operations WHERE operation_type = 'offline_conversion'")->fetchColumn());
            $this->assertSame([], $provider->calls);
        }
    }

    private function offlineConversionRejectsAnotherLiveGate(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $gateId = $this->insertOfflineConversionGate($pdo, [
            'lease_token' => 'live-gate-token',
            'lease_expires_at' => date('Y-m-d H:i:s', time() + 600),
            'fence' => 3,
        ]);

        $this->expectException(HttpException::class, static function () use ($service): void {
            $service->recordOfflinePayment(['id' => 2, 'role' => 'seller'], 1, [
                'payment_amount' => 5000000,
                'paid_at' => '2026-10-19T11:45',
                'note' => null,
            ]);
        });

        $gate = $pdo->query('SELECT operation_status, lease_token, fence FROM transaction_payment_operations WHERE id = ' . $gateId)->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('in_flight', $gate['operation_status']);
        $this->assertSame('live-gate-token', $gate['lease_token']);
        $this->assertSame(3, (int) $gate['fence']);
        $this->assertSame(1, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_operations WHERE operation_type = 'offline_conversion'")->fetchColumn());
        $this->assertSame([], $provider->calls);
    }

    private function offlineConversionFencesExpiredGateBeforeRetry(): void
    {
        [$pdo, $service] = $this->pendingTransactionService([['transaction_status' => 'expire']]);
        $oldGateId = $this->insertOfflineConversionGate($pdo, [
            'lease_token' => 'expired-old-gate',
            'lease_expires_at' => date('Y-m-d H:i:s', time() - 60),
            'fence' => 4,
        ]);

        $service->recordOfflinePayment(['id' => 2, 'role' => 'seller'], 1, [
            'payment_amount' => 5000000,
            'paid_at' => '2026-10-19T11:45',
            'note' => 'Pembayaran Booking Fee diterima di showroom.',
        ]);

        $oldGate = $pdo->query('SELECT operation_status, lease_token, lease_expires_at, fence FROM transaction_payment_operations WHERE id = ' . $oldGateId)->fetch(PDO::FETCH_ASSOC);
        $newGate = $pdo->query("SELECT operation_status, lease_token, fence FROM transaction_payment_operations
            WHERE operation_type = 'offline_conversion' ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('unknown', $oldGate['operation_status']);
        $this->assertSame(null, $oldGate['lease_token']);
        $this->assertSame(null, $oldGate['lease_expires_at']);
        $this->assertSame(5, (int) $oldGate['fence']);
        $this->assertSame('converted', $newGate['operation_status']);
        $this->assertSame(null, $newGate['lease_token']);
        $this->assertSame(6, (int) $newGate['fence']);
        $this->assertSame('offline_payment', $pdo->query('SELECT payment_method FROM transactions WHERE id = 1')->fetchColumn());
    }

    private function staleOfflineProviderResponseCannotPersistAfterNewGateStarts(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $provider->statusHook = function (string $orderId) use ($pdo): array {
            $oldGateId = (int) $pdo->query("SELECT id FROM transaction_payment_operations
                WHERE operation_type = 'offline_conversion' ORDER BY id DESC LIMIT 1")->fetchColumn();
            $pdo->exec("UPDATE transaction_payment_operations SET operation_status = 'unknown',
                lease_token = NULL, lease_expires_at = NULL, fence = fence + 1 WHERE id = " . $oldGateId);
            $this->insertOfflineConversionGate($pdo, [
                'lease_token' => 'newer-gate-token',
                'lease_expires_at' => date('Y-m-d H:i:s', time() + 600),
                'fence' => 20,
            ]);

            return ['order_id' => $orderId, 'transaction_status' => 'cancel'];
        };

        $this->expectException(HttpException::class, static function () use ($service): void {
            $service->recordOfflinePayment(['id' => 2, 'role' => 'seller'], 1, [
                'payment_amount' => 5000000,
                'paid_at' => '2026-10-19T11:45',
                'note' => null,
            ]);
        });

        $newGate = $pdo->query("SELECT operation_status, lease_token, fence FROM transaction_payment_operations
            WHERE operation_type = 'offline_conversion' ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('in_flight', $newGate['operation_status']);
        $this->assertSame('newer-gate-token', $newGate['lease_token']);
        $this->assertSame(20, (int) $newGate['fence']);
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('gopay', $pdo->query('SELECT payment_method FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame(1, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_logs WHERE provider_name = 'midtrans'")->fetchColumn());
        $this->assertSame('pending', $pdo->query("SELECT provider_status FROM transaction_payment_operations
            WHERE operation_type = 'legacy_session' AND transaction_id = 1")->fetchColumn());
        $this->assertSame('in_flight', $pdo->query("SELECT operation_status FROM transaction_payment_operations
            WHERE operation_type = 'status_check' ORDER BY id DESC LIMIT 1")->fetchColumn());
    }

    private function staleOfflineFinishAndCloseCannotChangeNewerGate(): void
    {
        $pdo = new OfflineBookingHookingPdo();
        $this->createSchema($pdo);
        $this->seedUsersAndCar($pdo, 'reserved');
        [, $service, $provider] = $this->pendingTransactionServiceOnPdo($pdo, [['transaction_status' => 'cancel']]);
        $pdo->beforeBeginTransaction(4, function (OfflineBookingHookingPdo $connection): void {
            $oldGateId = (int) $connection->query("SELECT id FROM transaction_payment_operations
                WHERE operation_type = 'offline_conversion' ORDER BY id DESC LIMIT 1")->fetchColumn();
            $connection->exec("UPDATE transaction_payment_operations SET operation_status = 'unknown',
                lease_token = NULL, lease_expires_at = NULL, fence = fence + 1 WHERE id = " . $oldGateId);
            $this->insertOfflineConversionGate($connection, [
                'lease_token' => 'gate-created-before-finalize',
                'lease_expires_at' => date('Y-m-d H:i:s', time() + 600),
                'fence' => 30,
            ]);
        });

        $this->expectException(HttpException::class, static function () use ($service): void {
            $service->recordOfflinePayment(['id' => 2, 'role' => 'seller'], 1, [
                'payment_amount' => 5000000,
                'paid_at' => '2026-10-19T11:45',
                'note' => null,
            ]);
        });

        $newGate = $pdo->query("SELECT operation_status, lease_token, fence FROM transaction_payment_operations
            WHERE operation_type = 'offline_conversion' ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('in_flight', $newGate['operation_status']);
        $this->assertSame('gate-created-before-finalize', $newGate['lease_token']);
        $this->assertSame(30, (int) $newGate['fence']);
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('gopay', $pdo->query('SELECT payment_method FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame(0, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_logs WHERE provider_name = 'offline'")->fetchColumn());
        $this->assertSame('cancel', $pdo->query("SELECT provider_status FROM transaction_payment_operations
            WHERE operation_type = 'legacy_session' AND transaction_id = 1")->fetchColumn());
        $this->assertSame([['check', 'ORDER-TRX-049']], $provider->calls);
    }

    private function offlinePendingTransactionsAreExcludedFromExpiry(): void
    {
        [$pdo] = $this->freshService(false);
        $pdo->exec("INSERT INTO users (id, role, name, email, account_status, is_approved, deleted_at) VALUES
            (1, 'buyer', 'Buyer Existing', 'buyer@example.test', 'active', 1, NULL)");
        $pdo->exec("INSERT INTO transactions
            (id, transaction_code, buyer_user_id, seller_user_id, car_id, car_price, payment_type,
             payment_method, dp_amount, remaining_amount, transaction_status, expires_at,
             created_at, updated_at, deleted_at)
            VALUES (1, 'TRX-OFFLINE-PENDING', 1, 2, 10, 200000000, 'dp', 'offline_payment',
             5000000, 195000000, 'pending_payment', '2026-10-20 10:05:00',
             '2026-10-20 10:00:00', NULL, NULL)");

        $repository = new TransactionRepository($pdo);
        $this->assertSame([], $repository->listStalePending('2026-10-20 10:10:00'));
        $this->assertSame(0, $repository->expirePendingByIds([1], '2026-10-20 10:10:00'));
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
    }

    private function settledAndCapturedProviderPaymentsCannotBeReplaced(): void
    {
        foreach (['settlement', 'capture'] as $status) {
            $providerStatus = [
                'transaction_status' => $status,
                'gross_amount' => '5000000.00',
                'transaction_id' => 'MID-' . $status,
            ];
            if ($status === 'capture') {
                $providerStatus['fraud_status'] = 'accept';
            }
            [$pdo, $service, $provider] = $this->pendingTransactionService([$providerStatus]);

            $this->expectException(ValidationException::class, static function () use ($service): void {
                $service->recordOfflinePayment(['id' => 2, 'role' => 'seller'], 1, [
                    'payment_amount' => 5000000,
                    'paid_at' => '2026-10-19T11:45',
                    'note' => null,
                ]);
            }, 'transaction_status');

            $row = $pdo->query('SELECT payment_method, transaction_status FROM transactions WHERE id = 1')->fetch(PDO::FETCH_ASSOC);
            $this->assertSame('gopay', $row['payment_method']);
            $this->assertSame('dp_paid', $row['transaction_status']);
            $this->assertSame([['check', 'ORDER-TRX-049']], $provider->calls);
        }
    }

    private function providerCallbackPreservesExactAmountThroughNormalization(): void
    {
        foreach ([
            ['settlement', null],
            ['capture', 'accept'],
            ['capture', null],
        ] as [$providerStatus, $fraudStatus]) {
            [$pdo, $service, $provider] = $this->pendingTransactionService([]);
            $providerPayload = [
                'order_id' => 'ORDER-TRX-049',
                'transaction_status' => $providerStatus,
                'status_code' => '200',
                'gross_amount' => '5000000.00',
                'transaction_id' => 'MID-CALLBACK-' . $providerStatus . '-' . ($fraudStatus ?? 'no-fraud-field'),
                'payment_type' => 'gopay',
            ];
            if ($fraudStatus !== null) {
                $providerPayload['fraud_status'] = $fraudStatus;
            }
            $verifiedPayload = [
                'transaction_status' => $providerStatus,
                'gross_amount' => '5000000.00',
            ];
            if ($fraudStatus !== null) {
                $verifiedPayload['fraud_status'] = $fraudStatus;
            }
            $provider->statusesByOrder['ORDER-TRX-049'] = [$verifiedPayload];
            $providerPayload['signature_key'] = hash(
                'sha512',
                $providerPayload['order_id'] . $providerPayload['status_code'] . $providerPayload['gross_amount'] . 'callback-test-key'
            );

            $handler = new MidtransCallbackHandler(new MidtransConfig([
                'server_key' => 'callback-test-key',
                'verify_signature' => true,
            ]));
            $normalized = $handler->normalize($providerPayload);
            $this->assertSame('5000000.00', $normalized['gross_amount']);
            $this->assertSame($fraudStatus !== null, array_key_exists('fraud_status', $normalized));

            $request = new Request(
                'POST',
                '/api/payments/midtrans/callbacks',
                '/api/payments/midtrans/callbacks',
                [],
                $providerPayload,
                ['content-type' => 'application/json'],
                [],
                [],
                json_encode($providerPayload, JSON_UNESCAPED_SLASHES)
            );
            $response = (new TransactionController($service, $handler))->providerCallback($request);
            $responseBody = json_decode($response->body(), true);

            $this->assertSame(200, $response->statusCode());
            $expectedStatus = $providerStatus === 'capture' && $fraudStatus !== 'accept' ? 'pending_payment' : 'dp_paid';
            $this->assertSame($expectedStatus, $responseBody['data']['transaction']['transaction_status'] ?? null);
            $this->assertSame($expectedStatus, $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
            $loggedCallback = json_decode((string) $pdo->query('SELECT payload_callback_json FROM transaction_payment_logs WHERE transaction_id = 1 ORDER BY id DESC LIMIT 1')->fetchColumn(), true);
            $this->assertSame('5000000.00', $loggedCallback['gross_amount'] ?? null);
        }

        foreach (['challenge', 'deny'] as $fraudStatus) {
            [$pdo, $service, $provider] = $this->pendingTransactionService([]);
            $providerPayload = [
                'order_id' => 'ORDER-TRX-049',
                'transaction_status' => 'capture',
                'status_code' => '200',
                'gross_amount' => '5000000.00',
                'transaction_id' => 'MID-ONLINE-CAPTURE-' . $fraudStatus,
                'payment_type' => 'credit_card',
                'fraud_status' => $fraudStatus,
            ];
            $provider->statusesByOrder['ORDER-TRX-049'] = [[
                'transaction_status' => 'capture',
                'gross_amount' => '5000000.00',
                'fraud_status' => $fraudStatus,
            ]];
            $providerPayload['signature_key'] = hash(
                'sha512',
                $providerPayload['order_id'] . $providerPayload['status_code'] . $providerPayload['gross_amount'] . 'callback-test-key'
            );
            $handler = new MidtransCallbackHandler(new MidtransConfig([
                'server_key' => 'callback-test-key',
                'verify_signature' => true,
            ]));
            $request = new Request(
                'POST',
                '/api/payments/midtrans/callbacks',
                '/api/payments/midtrans/callbacks',
                [],
                $providerPayload,
                ['content-type' => 'application/json']
            );
            $response = (new TransactionController($service, $handler))->providerCallback($request);
            $responseBody = json_decode($response->body(), true);

            $this->assertSame(200, $response->statusCode());
            $this->assertSame('pending_payment', $responseBody['data']['transaction']['transaction_status'] ?? null);
            $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
            $this->assertSame('reserved', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
            $this->assertSame(null, $pdo->query('SELECT paid_at FROM transactions WHERE id = 1')->fetchColumn());
        }
    }

    private function captureFraudStatusDoesNotSettleOrCountAsOfflineLateSuccess(): void
    {
        foreach (['challenge', 'deny'] as $fraudStatus) {
            [$pdo, $service, $provider] = $this->pendingTransactionService([]);
            $provider->statusesByOrder['ORDER-TRX-049'] = [[
                'transaction_status' => 'capture',
                'gross_amount' => '5000000.00',
                'fraud_status' => $fraudStatus,
            ]];
            $pdo->exec("UPDATE transactions SET payment_method = 'offline_payment', transaction_status = 'dp_paid', paid_at = '2026-10-20 10:01:00' WHERE id = 1");

            $service->handleProviderCallback([
                'order_id' => 'ORDER-TRX-049',
                'transaction_status' => 'capture',
                'gross_amount' => '5000000.00',
                'transaction_id' => 'MID-OFFLINE-CAPTURE-' . $fraudStatus,
                'payment_type' => 'credit_card',
                'fraud_status' => $fraudStatus,
            ]);

            $operation = $pdo->query("SELECT provider_status, late_success_at FROM transaction_payment_operations
                WHERE transaction_id = 1 AND operation_type = 'legacy_session'")->fetch(PDO::FETCH_ASSOC);
            $callbackJson = $pdo->query('SELECT payload_callback_json FROM transaction_payment_logs WHERE transaction_id = 1 ORDER BY id DESC LIMIT 1')->fetchColumn();
            $callback = json_decode((string) $callbackJson, true);
            $this->assertSame('dp_paid', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
            $this->assertSame('unverified_capture', $operation['provider_status']);
            $this->assertSame(null, $operation['late_success_at']);
            $this->assertSame(false, (bool) ($callback['_carlynk_late_success_after_offline_conversion'] ?? false));
        }
    }

    private function unverifiedProviderSuccessCanBeReconciledForOfflineConversion(): void
    {
        foreach ([
            ['capture', '5000000.00', ['fraud_status' => 'challenge'], 'deny'],
            ['settlement', '5000000.01', [], 'cancel'],
        ] as $index => [$providerStatus, $grossAmount, $extraPayload, $terminalStatus]) {
            [$pdo, $service, $provider] = $this->pendingTransactionService([
                ['transaction_status' => $terminalStatus],
            ]);
            $callback = array_merge([
                'order_id' => 'ORDER-TRX-049',
                'transaction_status' => $providerStatus,
                'gross_amount' => $grossAmount,
                'transaction_id' => 'MID-UNVERIFIED-' . $index,
                'payment_type' => 'gopay',
            ], $extraPayload);
            $verifiedPayload = array_merge([
                'transaction_status' => $providerStatus,
                'gross_amount' => $grossAmount,
            ], $extraPayload);
            $provider->statusesByOrder['ORDER-TRX-049'] = [$verifiedPayload, ['transaction_status' => $terminalStatus]];
            $service->handleProviderCallback($callback);

            $this->assertSame(
                'unverified_' . $providerStatus,
                $pdo->query("SELECT provider_status FROM transaction_payment_operations
                    WHERE transaction_id = 1 AND operation_type = 'legacy_session'")->fetchColumn()
            );
            $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());

            $service->recordOfflinePayment(['id' => 2, 'role' => 'seller'], 1, [
                'payment_amount' => 5000000,
                'paid_at' => '2026-10-19T11:45',
                'note' => 'Pembayaran booking fee diterima langsung di showroom.',
            ]);

            $transaction = $pdo->query('SELECT payment_method, transaction_status FROM transactions WHERE id = 1')->fetch(PDO::FETCH_ASSOC);
            $this->assertSame('offline_payment', $transaction['payment_method']);
            $this->assertSame('dp_paid', $transaction['transaction_status']);
            $this->assertSame($terminalStatus, $pdo->query("SELECT provider_status FROM transaction_payment_operations
                WHERE transaction_id = 1 AND operation_type = 'legacy_session'")->fetchColumn());
            $this->assertSame('offline', $pdo->query("SELECT provider_name FROM transaction_payment_logs
                WHERE transaction_status = 'dp_paid' ORDER BY id DESC LIMIT 1")->fetchColumn());

            $rawPayload = $pdo->query("SELECT payload_callback_json FROM transaction_payment_logs
                WHERE provider_name = 'midtrans' AND transaction_id = 1
                AND transaction_status = '" . $providerStatus . "' ORDER BY id DESC LIMIT 1")->fetchColumn();
            $decodedRawPayload = json_decode((string) $rawPayload, true);
            $this->assertSame($providerStatus, $decodedRawPayload['transaction_status'] ?? null);
            $this->assertSame($grossAmount, $decodedRawPayload['gross_amount'] ?? null);
            if (isset($extraPayload['fraud_status'])) {
                $this->assertSame('challenge', $decodedRawPayload['fraud_status'] ?? null);
            }
            $this->assertSame([
                ['check', 'ORDER-TRX-049'], // Verify the provider callback against Midtrans.
                ['check', 'ORDER-TRX-049'], // Re-check before converting the pending payment offline.
            ], $provider->calls);
        }
    }

    private function providerSettlementRequiresExactOrderAmount(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $provider->statusesByOrder['ORDER-TRX-049'] = [[
            'transaction_status' => 'settlement',
            'gross_amount' => '5000000.00',
        ]];
        $service->handleProviderCallback([
            'order_id' => 'ORDER-TRX-049',
            'transaction_status' => 'settlement',
            'gross_amount' => '5000000.00',
            'transaction_id' => 'MID-EXACT-DP',
            'payment_type' => 'gopay',
        ]);
        $this->assertSame('dp_paid', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());

        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $pdo->exec("UPDATE transactions SET payment_type = 'full' WHERE id = 1");
        $pdo->exec("UPDATE transaction_payment_operations SET gross_amount = 200000000
            WHERE transaction_id = 1 AND operation_type = 'legacy_session'");
        $pdo->exec("UPDATE transaction_payment_logs SET gross_amount = 200000000
            WHERE transaction_id = 1 AND provider_order_id = 'ORDER-TRX-049'");
        $provider->statusesByOrder['ORDER-TRX-049'] = [[
            'transaction_status' => 'capture',
            'gross_amount' => '200000000.00',
            'fraud_status' => 'accept',
        ]];
        $service->handleProviderCallback([
            'order_id' => 'ORDER-TRX-049',
            'transaction_status' => 'capture',
            'gross_amount' => '200000000.00',
            'transaction_id' => 'MID-EXACT-FULL',
            'payment_type' => 'gopay',
        ]);
        $this->assertSame('paid', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());

        foreach ([
            [null, 'callback'],
            ['200000000.01', 'status'],
            ['invalid-amount', 'callback'],
        ] as $index => [$amount, $delivery]) {
            $providerPayload = ['transaction_status' => 'settlement'];
            if ($amount !== null) {
                $providerPayload['gross_amount'] = $amount;
            }
            [$pdo, $service, $provider] = $this->pendingTransactionService($delivery === 'status' ? [$providerPayload] : []);
            $pdo->exec("UPDATE transactions SET payment_type = 'full' WHERE id = 1");
            $pdo->exec("UPDATE transaction_payment_operations SET gross_amount = 200000000
                WHERE transaction_id = 1 AND operation_type = 'legacy_session'");
            $pdo->exec("UPDATE transaction_payment_logs SET gross_amount = 200000000
                WHERE transaction_id = 1 AND provider_order_id = 'ORDER-TRX-049'");
            if ($delivery === 'callback') {
                $providerPayload['order_id'] = 'ORDER-TRX-049';
                $providerPayload['transaction_id'] = 'MID-FULL-INVALID-' . $index;
                $providerPayload['payment_type'] = 'gopay';
                $provider->statusesByOrder['ORDER-TRX-049'] = [$providerPayload];
                $service->handleProviderCallback($providerPayload);
            } else {
                $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);
            }

            $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
            $this->assertSame('reserved', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
            $this->assertSame(null, $pdo->query('SELECT paid_at FROM transactions WHERE id = 1')->fetchColumn());
        }

        $invalidCases = [
            ['settlement', null, 'callback'],
            ['capture', '5000000.50', 'status'],
            ['paid', '5000001.00', 'callback'],
            ['settlement', '5000000.00junk', 'status'],
            ['capture', '999999999999999999999999.00', 'callback'],
            ['paid', 5000000.01, 'status'],
        ];

        foreach ($invalidCases as $index => [$providerStatus, $amount, $delivery]) {
            $providerPayload = ['transaction_status' => $providerStatus];
            if ($amount !== null) {
                $providerPayload['gross_amount'] = $amount;
            }
            $statuses = $delivery === 'status' ? [$providerPayload] : [];
            [$pdo, $service, $provider] = $this->pendingTransactionService($statuses);

            if ($delivery === 'callback') {
                $callbackPayload = array_merge($providerPayload, [
                    'order_id' => 'ORDER-TRX-049',
                    'transaction_id' => 'MID-INVALID-' . $index,
                    'payment_type' => 'gopay',
                ]);
                $provider->statusesByOrder['ORDER-TRX-049'] = [$providerPayload];
                $service->handleProviderCallback($callbackPayload);
            } else {
                $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);
            }

            $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
            $this->assertSame('reserved', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
            $this->assertSame(null, $pdo->query('SELECT paid_at FROM transactions WHERE id = 1')->fetchColumn());
        }

        [$pdo, $service] = $this->pendingTransactionService([[
            'transaction_status' => 'settlement',
            'gross_amount' => '5000000.00',
        ]]);
        $pdo->exec("UPDATE transactions SET payment_type = 'full' WHERE id = 1");
        $pdo->exec("UPDATE transaction_payment_operations SET gross_amount = 200000000
            WHERE transaction_id = 1 AND operation_type = 'legacy_session'");
        $pdo->exec("UPDATE transaction_payment_logs SET gross_amount = 200000000
            WHERE transaction_id = 1 AND provider_order_id = 'ORDER-TRX-049'");
        $service->syncPaymentStatus(['id' => 1, 'role' => 'buyer'], 1);
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('reserved', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
    }

    private function legacyProviderSettlementUsesBusinessAmountNotProviderObservations(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $pdo->exec("UPDATE transaction_payment_operations SET gross_amount = 999999999
            WHERE transaction_id = 1 AND operation_type = 'legacy_session'");
        $pdo->exec("UPDATE transaction_payment_logs SET gross_amount = 999999999
            WHERE transaction_id = 1 AND provider_order_id = 'ORDER-TRX-049'");
        $this->assertSame(999999999, (int) $pdo->query("SELECT gross_amount FROM transaction_payment_operations
            WHERE transaction_id = 1 AND operation_type = 'legacy_session'")->fetchColumn());
        $provider->statusesByOrder['ORDER-TRX-049'] = [[
            'transaction_status' => 'paid',
            'gross_amount' => '5000000.00',
        ]];

        $service->handleProviderCallback([
            'order_id' => 'ORDER-TRX-049',
            'transaction_status' => 'paid',
            'gross_amount' => '5000000.00',
            'transaction_id' => 'MID-LEGACY-EXACT',
            'payment_type' => 'gopay',
        ]);

        $this->assertSame('dp_paid', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('legacy_session', $pdo->query("SELECT operation_type FROM transaction_payment_operations
            WHERE transaction_id = 1 AND operation_type = 'legacy_session'")->fetchColumn());

        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $pdo->exec("UPDATE transaction_payment_operations SET gross_amount = 999999999
            WHERE transaction_id = 1 AND operation_type = 'legacy_session'");
        $pdo->exec("UPDATE transaction_payment_logs SET gross_amount = 999999999
            WHERE transaction_id = 1 AND provider_order_id = 'ORDER-TRX-049'");
        $this->assertSame(999999999, (int) $pdo->query("SELECT gross_amount FROM transaction_payment_operations
            WHERE transaction_id = 1 AND operation_type = 'legacy_session'")->fetchColumn());
        $provider->statusesByOrder['ORDER-TRX-049'] = [[
            'transaction_status' => 'settlement',
            'gross_amount' => '999999999.00',
        ]];
        $service->handleProviderCallback([
            'order_id' => 'ORDER-TRX-049',
            'transaction_status' => 'settlement',
            'gross_amount' => '999999999.00',
            'transaction_id' => 'MID-LEGACY-OBSERVED-AMOUNT',
            'payment_type' => 'gopay',
        ]);

        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('reserved', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
        $this->assertSame(null, $pdo->query('SELECT paid_at FROM transactions WHERE id = 1')->fetchColumn());

        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $pdo->exec("DELETE FROM transaction_payment_operations WHERE transaction_id = 1 AND operation_type = 'legacy_session'");
        $pdo->exec("DELETE FROM transaction_payment_logs WHERE transaction_id = 1");
        $provider->statusesByOrder['ORDER-TRX-049'] = [[
            'transaction_status' => 'settlement',
            'gross_amount' => '5000000.00',
        ]];
        $service->handleProviderCallback([
            'order_id' => 'ORDER-TRX-049',
            'transaction_status' => 'settlement',
            'gross_amount' => '5000000.00',
            'transaction_id' => 'MID-LEGACY-TRANSACTION-FIELDS',
            'payment_type' => 'gopay',
        ]);

        $this->assertSame('dp_paid', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());

        [$pdo, $service, $provider] = $this->pendingTransactionService([]);
        $stmt = $pdo->prepare("INSERT INTO transaction_payment_operations
            (transaction_id, operation_key, operation_type, provider_order_id, payment_method,
             gross_amount, operation_status, fence, created_at, updated_at)
            VALUES (1, 'conflicting-session-amount', 'initial_session', 'ORDER-TRX-049', 'gopay',
             200000000, 'completed', 2, '2026-10-20 10:00:00', '2026-10-20 10:00:00')");
        $stmt->execute();
        $provider->statusesByOrder['ORDER-TRX-049'] = [[
            'transaction_status' => 'settlement',
            'gross_amount' => '5000000.00',
        ]];
        $service->handleProviderCallback([
            'order_id' => 'ORDER-TRX-049',
            'transaction_status' => 'settlement',
            'gross_amount' => '5000000.00',
            'transaction_id' => 'MID-AMBIGUOUS-SESSION-AMOUNT',
            'payment_type' => 'gopay',
        ]);

        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('reserved', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
    }

    private function completionSettlementUsesCompletionSessionAmount(): void
    {
        $orderId = 'PELUNASAN-TRX-049-COMPLETE';

        foreach ([
            ['5000000.00', false],
            [null, false],
            ['195000000.50', false],
            ['malformed', false],
            ['195000000.00', true],
        ] as $index => [$grossAmount, $shouldSettle]) {
            [$pdo, $service, $provider] = $this->pendingTransactionService([]);
            $stmt = $pdo->prepare("INSERT INTO transaction_payment_operations
                (transaction_id, operation_key, operation_type, provider_order_id, payment_method,
                 gross_amount, operation_status, provider_status, fence, created_at, updated_at)
                VALUES (1, :operation_key, 'completion_session', :provider_order_id, 'gopay',
                 195000000, 'completed', 'pending', 2, '2026-10-20 10:00:00', '2026-10-20 10:00:00')");
            $stmt->execute([
                'operation_key' => 'completion-order-' . bin2hex(random_bytes(4)),
                'provider_order_id' => $orderId,
            ]);

            $providerPayload = [
                'order_id' => $orderId,
                'transaction_status' => 'settlement',
                'transaction_id' => 'MID-COMPLETION-' . $index,
                'payment_type' => 'gopay',
            ];
            if ($grossAmount !== null) {
                $providerPayload['gross_amount'] = $grossAmount;
            }
            $provider->statusesByOrder[$orderId] = [$providerPayload];
            $service->handleProviderCallback($providerPayload);

            $expectedStatus = $shouldSettle ? 'dp_paid' : 'pending_payment';
            $this->assertSame($expectedStatus, $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
            if (! $shouldSettle) {
                $this->assertSame('reserved', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
                $this->assertSame(null, $pdo->query('SELECT paid_at FROM transactions WHERE id = 1')->fetchColumn());
            }
        }
    }

    private function providerSessionResponseAmountMustMatchExactly(): void
    {
        foreach ([
            ['4999999.00', false],
            ['5000000.50', false],
            ['not-an-amount', false],
            [null, true],
        ] as [$grossAmount, $omitGrossAmount]) {
            [$pdo, $service, $provider] = $this->initialPaymentService();
            $provider->initialHook = static function ($transaction, $customer, $paymentMethod, $providerOrderId) use ($grossAmount, $omitGrossAmount): array {
                $session = [
                    'provider_name' => 'midtrans',
                    'provider_order_id' => $providerOrderId,
                    'provider_transaction_id' => null,
                    'payment_method' => $paymentMethod,
                    'transaction_status' => 'pending',
                    'gross_amount' => $omitGrossAmount ? 5000000 : $grossAmount,
                    'expires_at' => '2026-10-20 10:05:00',
                    'payment_data' => [],
                    'payload_request' => ['order_id' => $providerOrderId],
                    'payload_response' => ['order_id' => $providerOrderId, 'transaction_status' => 'pending'],
                    'midtrans_redirect_url' => 'https://payments.example.test/continue',
                ];
                if ($omitGrossAmount) {
                    unset($session['gross_amount']);
                }

                return $session;
            };

            $this->expectException(ValidationException::class, function () use ($service): void {
                $this->createInitialProviderTransaction($service);
            }, 'payment_session');

            $transaction = $pdo->query('SELECT transaction_status, paid_at FROM transactions ORDER BY id DESC LIMIT 1')->fetch(PDO::FETCH_ASSOC);
            $car = $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetch(PDO::FETCH_ASSOC);
            $this->assertSame('pending_payment', $transaction['transaction_status']);
            $this->assertSame(null, $transaction['paid_at']);
            $this->assertSame('reserved', $car['listing_status']);
        }
    }

    private function midtransChargeResponseAmountAndOrderIdMustMatchPersistedIntent(): void
    {
        foreach ([
            ['4999999.00', true],
            [null, true],
            ['5000000.00', false],
        ] as [$grossAmount, $responseOrderIdMatches]) {
            [$pdo] = $this->initialPaymentService();
            $config = new MidtransConfig(['server_key' => 'test-server-key']);
            $http = new OfflineBookingFakeMidtransHttpClient($config);
            $http->chargeResponseUseRequestOrderId = $responseOrderIdMatches;
            $http->chargeResponse = [
                'status_code' => '201',
                'status_message' => 'Transaction created',
                'transaction_id' => 'MID-SESSION-AMOUNT-MISMATCH',
                'order_id' => 'provider-order-response',
                'gross_amount' => $grossAmount,
                'payment_type' => 'gopay',
                'transaction_status' => 'pending',
            ];
            $adapter = new MidtransPaymentAdapter($config, $http);
            $adapterSession = $adapter->createInitialPayment([
                'id' => 1,
                'transaction_code' => 'TRX-ADAPTER-TEST',
                'car_id' => 10,
                'payment_type' => 'dp',
                'dp_amount' => 5000000,
                'car_price' => 200000000,
            ], ['name' => 'Buyer', 'email' => 'buyer@example.test'], 'gopay', 'ORDER-ADAPTER-TEST');
            $this->assertSame($grossAmount, $adapterSession['gross_amount']);
            $this->assertSame(
                $responseOrderIdMatches ? 'ORDER-ADAPTER-TEST' : 'provider-order-response',
                $adapterSession['provider_order_id']
            );
            $service = $this->makeService($pdo, $adapter);

            $this->expectException(ValidationException::class, function () use ($service): void {
                $this->createInitialProviderTransaction($service);
            }, 'payment_session');

            $transaction = $pdo->query('SELECT transaction_status, paid_at, midtrans_order_id,
                midtrans_token, midtrans_redirect_url FROM transactions ORDER BY id DESC LIMIT 1')->fetch(PDO::FETCH_ASSOC);
            $operation = $pdo->query("SELECT operation_status, error_payload_json FROM transaction_payment_operations
                WHERE operation_type = 'initial_session' ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
            $this->assertSame('pending_payment', $transaction['transaction_status']);
            $this->assertSame(null, $transaction['paid_at']);
            $this->assertSame(null, $transaction['midtrans_order_id']);
            $this->assertSame(null, $transaction['midtrans_token']);
            $this->assertSame(null, $transaction['midtrans_redirect_url']);
            $this->assertSame('failed', $operation['operation_status']);
            $error = json_decode((string) $operation['error_payload_json'], true);
            $this->assertSame(ValidationException::class, $error['exception'] ?? null);
            $this->assertSame(0, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_logs
                WHERE provider_name = 'midtrans'")->fetchColumn());
            $this->assertSame('reserved', $pdo->query('SELECT listing_status FROM cars WHERE id = 10')->fetchColumn());
        }
    }

    private function sessionCaptureChallengeIsUnverifiedAndCanReconcileOffline(): void
    {
        [$pdo, $service, $provider] = $this->initialPaymentService();
        $provider->initialHook = static function ($transaction, $customer, $paymentMethod, $providerOrderId): array {
            $payload = [
                'order_id' => $providerOrderId,
                'transaction_status' => 'capture',
                'gross_amount' => '5000000.00',
                'fraud_status' => 'challenge',
            ];

            return [
                'provider_name' => 'midtrans',
                'provider_order_id' => $providerOrderId,
                'provider_transaction_id' => 'MID-SESSION-CHALLENGE',
                'payment_method' => $paymentMethod,
                'transaction_status' => 'capture',
                'gross_amount' => '5000000.00',
                'expires_at' => '2026-10-21 11:00:00',
                'payment_data' => [],
                'payload_request' => ['order_id' => $providerOrderId],
                'payload_response' => $payload,
                'midtrans_redirect_url' => 'https://payments.example.test/continue',
            ];
        };

        $this->createInitialProviderTransaction($service);
        $transactionId = (int) $pdo->query('SELECT id FROM transactions ORDER BY id DESC LIMIT 1')->fetchColumn();
        $operation = $pdo->query("SELECT provider_order_id, provider_status, response_payload_json
            FROM transaction_payment_operations WHERE transaction_id = " . $transactionId . "
            AND operation_type = 'initial_session'")->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('unverified_capture', $operation['provider_status']);
        $response = json_decode((string) $operation['response_payload_json'], true);
        $this->assertSame('challenge', $response['payload_response']['fraud_status'] ?? null);
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = ' . $transactionId)->fetchColumn());

        $provider->statusesByOrder[$operation['provider_order_id']] = [[
            'transaction_status' => 'deny',
            'gross_amount' => '5000000.00',
        ]];
        $service->recordOfflinePayment(['id' => 2, 'role' => 'seller'], $transactionId, [
            'payment_amount' => 5000000,
            'paid_at' => '2026-10-19T11:45',
            'note' => 'Pembayaran booking fee diterima langsung di showroom.',
        ]);

        $transaction = $pdo->query('SELECT payment_method, transaction_status FROM transactions WHERE id = ' . $transactionId)->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('offline_payment', $transaction['payment_method']);
        $this->assertSame('dp_paid', $transaction['transaction_status']);
        $this->assertSame('deny', $pdo->query("SELECT provider_status FROM transaction_payment_operations
            WHERE transaction_id = " . $transactionId . " AND operation_type = 'initial_session'")->fetchColumn());
        $this->assertSame([['check', $operation['provider_order_id']]], $provider->calls);
    }

    private function unknownProviderStateFailsClosed(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService([
            ['transaction_status' => 'challenge'],
        ]);

        $this->expectException(ValidationException::class, static function () use ($service): void {
            $service->recordOfflinePayment(['id' => 2, 'role' => 'seller'], 1, [
                'payment_amount' => 5000000,
                'paid_at' => '2026-10-19T11:45',
                'note' => null,
            ]);
        }, 'payment_method');

        $row = $pdo->query('SELECT payment_method, transaction_status FROM transactions WHERE id = 1')->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('gopay', $row['payment_method']);
        $this->assertSame('pending_payment', $row['transaction_status']);
        $this->assertSame([['check', 'ORDER-TRX-049']], $provider->calls);
    }

    private function unconfirmedProviderCancellationFailsClosed(): void
    {
        [$pdo, $service, $provider] = $this->pendingTransactionService(
            [['transaction_status' => 'pending']],
            [['transaction_status' => 'pending']]
        );

        $this->expectException(ValidationException::class, static function () use ($service): void {
            $service->recordOfflinePayment(['id' => 2, 'role' => 'seller'], 1, [
                'payment_amount' => 5000000,
                'paid_at' => '2026-10-19T11:45',
                'note' => null,
            ]);
        }, 'payment_method');

        $row = $pdo->query('SELECT payment_method, transaction_status FROM transactions WHERE id = 1')->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('gopay', $row['payment_method']);
        $this->assertSame('pending_payment', $row['transaction_status']);
        $this->assertSame([
            ['check', 'ORDER-TRX-049'],
            ['cancel', 'ORDER-TRX-049'],
        ], $provider->calls);
    }

    private function lateProviderCallbackCannotOverwriteOfflinePayment(): void
    {
        [$pdo, $service] = $this->pendingTransactionService(
            [
                ['transaction_status' => 'pending'],
                ['transaction_status' => 'cancel'],
                ['transaction_status' => 'settlement', 'gross_amount' => '5000000.00'],
            ],
            [['transaction_status' => 'cancel']]
        );
        $service->recordOfflinePayment(['id' => 2, 'role' => 'seller'], 1, [
            'payment_amount' => 5000000,
            'paid_at' => '2026-10-19T11:45',
            'note' => 'Pembayaran diterima langsung.',
        ]);

        $service->handleProviderCallback([
            'order_id' => 'ORDER-TRX-049',
            'transaction_status' => 'settlement',
            'gross_amount' => '5000000.00',
            'transaction_id' => 'MID-LATE',
            'payment_type' => 'gopay',
        ]);

        $row = $pdo->query('SELECT payment_method, transaction_status, paid_at FROM transactions WHERE id = 1')->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('offline_payment', $row['payment_method']);
        $this->assertSame('dp_paid', $row['transaction_status']);
        $this->assertSame('2026-10-19 11:45:00', $row['paid_at']);
        $this->assertSame(1, (int) $pdo->query("SELECT COUNT(*) FROM transaction_payment_logs WHERE provider_name = 'offline'")->fetchColumn());
        $lateCallback = $pdo->query("SELECT payload_callback_json FROM transaction_payment_logs
            WHERE provider_name = 'midtrans' ORDER BY id DESC LIMIT 1")->fetchColumn();
        $this->assertSame(true, json_decode((string) $lateCallback, true)['_carlynk_late_success_after_offline_conversion'] ?? false);
    }

    private function ambiguousProviderCallbackDoesNotFallbackToTransactionCode(): void
    {
        [$pdo, $service] = $this->pendingTransactionService([]);
        $providerOrderId = 'TRX-049';
        $pdo->exec("UPDATE transactions SET midtrans_order_id = '" . $providerOrderId . "' WHERE id = 1");
        $this->insertCallbackCollisionTransaction($pdo, 2, 'TRX-OTHER', $providerOrderId);
        $logCountBefore = (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs')->fetchColumn();

        $result = $service->handleProviderCallback([
            'order_id' => $providerOrderId,
            'transaction_status' => 'settlement',
            'gross_amount' => '5000000.00',
            'transaction_id' => 'MID-AMBIGUOUS',
            'payment_type' => 'gopay',
        ]);

        $this->assertSame(true, $result['acknowledged'] ?? false);
        $this->assertSame(false, $result['processed'] ?? true);
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 2')->fetchColumn());
        $this->assertSame($logCountBefore, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs')->fetchColumn());
    }

    private function providerCallbackRevalidatesOwnerUnderTransactionLock(): void
    {
        $pdo = new OfflineBookingHookingPdo();
        $this->createSchema($pdo);
        $this->seedUsersAndCar($pdo, 'reserved');
        [, $service] = $this->pendingTransactionServiceOnPdo($pdo, []);
        $pdo->beforeBeginTransaction(1, function (OfflineBookingHookingPdo $connection): void {
            $this->insertCallbackCollisionTransaction($connection, 2, 'TRX-OTHER', 'ORDER-TRX-049');
        });
        $logCountBefore = (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs')->fetchColumn();

        $result = $service->handleProviderCallback([
            'order_id' => 'ORDER-TRX-049',
            'transaction_status' => 'settlement',
            'gross_amount' => '5000000.00',
            'transaction_id' => 'MID-OWNER-RACE',
            'payment_type' => 'gopay',
        ]);

        $this->assertSame(true, $result['acknowledged'] ?? false);
        $this->assertSame(false, $result['processed'] ?? true);
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 1')->fetchColumn());
        $this->assertSame('pending_payment', $pdo->query('SELECT transaction_status FROM transactions WHERE id = 2')->fetchColumn());
        $this->assertSame($logCountBefore, (int) $pdo->query('SELECT COUNT(*) FROM transaction_payment_logs')->fetchColumn());
    }

    private function requestsValidateOfflinePaymentInputs(): void
    {
        $valid = $this->offlineBookingData();
        $request = new Request('POST', '/api/transactions/offline-bookings', '/api/transactions/offline-bookings', [], $valid);
        $payload = (new CreateOfflineBookingRequest($request))->validate();
        $this->assertSame(10, (int) $payload['car_id']);

        unset($valid['buyer_phone_number'], $valid['buyer_email']);
        $invalid = new Request('POST', '/api/transactions/offline-bookings', '/api/transactions/offline-bookings', [], $valid);
        $this->expectException(ValidationException::class, static function () use ($invalid): void {
            (new CreateOfflineBookingRequest($invalid))->validate();
        }, 'buyer_phone_number');

        $recordRequest = new Request('POST', '/api/transactions/1/offline-payment', '/api/transactions/1/offline-payment', [], [
            'payment_amount' => 5000000,
            'paid_at' => '2026-10-19T11:45',
            'note' => 'Pembayaran langsung di showroom.',
        ]);
        $this->assertSame(5000000, (int) (new RecordOfflinePaymentRequest($recordRequest))->validate()['payment_amount']);
    }

    private function offlinePaymentRoutesRemainAuthenticated(): void
    {
        $routes = file_get_contents(dirname(__DIR__, 2) . '/app/Modules/Transactions/Routes/api.php');
        $this->assertTrue(strpos($routes, "'/offline-bookings'") !== false);
        $this->assertTrue(strpos($routes, "'/{transaction_id}/offline-payment'") !== false);
        $this->assertTrue(strpos($routes, '[AuthenticatedUserMiddleware::class]') !== false);
    }

    private function midtransAdapterExposesStatusAndCancelOperations(): void
    {
        $config = new MidtransConfig(['server_key' => 'test-server-key']);
        $http = new OfflineBookingFakeMidtransHttpClient($config);
        $adapter = new MidtransPaymentAdapter($config, $http);
        $orderId = 'ORDER TRX/049';

        $adapter->checkStatus($orderId);
        $adapter->cancelPending($orderId);

        $this->assertSame([
            ['GET', '/v2/ORDER%20TRX%2F049/status', null],
            ['POST', '/v2/ORDER%20TRX%2F049/cancel', [], null],
        ], $http->calls);
    }

    private function freshService(bool $withAuth): array
    {
        $pdo = $this->sqlite();
        $this->createSchema($pdo);
        $this->seedUsersAndCar($pdo, 'published');
        $provider = new OfflineBookingFakePaymentProvider();
        $auth = $withAuth
            ? new AuthService($pdo, new AuthUserRepository($pdo), new AuthTokenRepository($pdo), new ShowroomRepository($pdo))
            : null;

        return [$pdo, $this->makeService($pdo, $provider, $auth), $provider];
    }

    private function pendingTransactionService(array $statuses, array $cancelResponses = [], string $transactionStatus = 'pending_payment'): array
    {
        [$pdo, ,] = $this->freshService(false);
        return $this->pendingTransactionServiceOnPdo($pdo, $statuses, $cancelResponses, $transactionStatus);
    }

    private function pendingTransactionServiceOnPdo(
        PDO $pdo,
        array $statuses,
        array $cancelResponses = [],
        string $transactionStatus = 'pending_payment'
    ): array {
        $pdo->exec("UPDATE cars SET listing_status = 'reserved' WHERE id = 10");
        $pdo->exec("INSERT INTO users (id, role, name, email, account_status, is_approved, deleted_at) VALUES
            (1, 'buyer', 'Buyer Existing', 'buyer@example.test', 'active', 1, NULL)");
        $transactionInsert = $pdo->prepare("INSERT INTO transactions
            (id, transaction_code, buyer_user_id, seller_user_id, car_id, car_price, payment_type,
             payment_method, dp_amount, remaining_amount, transaction_status, midtrans_order_id,
             expires_at, paid_at, created_at, updated_at, deleted_at)
            VALUES (1, 'TRX-049', 1, 2, 10, 200000000, 'dp', 'gopay', 5000000, 195000000,
             :transaction_status, 'ORDER-TRX-049', '2026-10-20 11:00:00', NULL, '2026-10-20 10:00:00', NULL, NULL)");
        $transactionInsert->execute(['transaction_status' => $transactionStatus]);
        $pdo->exec("INSERT INTO transaction_payment_logs
            (transaction_id, provider_name, provider_order_id, payment_method, transaction_status,
             gross_amount, payload_request_json, payload_response_json, logged_at, created_at)
            VALUES (1, 'midtrans', 'ORDER-TRX-049', 'gopay', 'pending', 5000000, '{}',
             '{\"order_id\":\"ORDER-TRX-049\",\"transaction_status\":\"pending\"}',
             '2026-10-20 10:00:00', '2026-10-20 10:00:00')");
        $pdo->exec("INSERT INTO transaction_payment_operations
            (transaction_id, operation_key, operation_type, provider_order_id, payment_method,
             gross_amount, operation_status, provider_status, fence, created_at, updated_at, completed_at)
            VALUES (1, 'legacy-order-1', 'legacy_session', 'ORDER-TRX-049', 'gopay', 5000000,
             'completed', 'pending', 0, '2026-10-20 10:00:00', '2026-10-20 10:00:00', '2026-10-20 10:00:00')");

        $provider = new OfflineBookingFakePaymentProvider($statuses, $cancelResponses);

        return [$pdo, $this->makeService($pdo, $provider), $provider];
    }

    private function insertOfflineConversionGate(PDO $pdo, array $overrides = []): int
    {
        $now = date('Y-m-d H:i:s');
        $stmt = $pdo->prepare("INSERT INTO transaction_payment_operations
            (transaction_id, operation_key, operation_type, operation_status, fence, lease_token,
             lease_expires_at, created_at, updated_at)
            VALUES (1, :operation_key, 'offline_conversion', 'in_flight', :fence, :lease_token,
             :lease_expires_at, :created_at, :updated_at)");
        $stmt->execute([
            'operation_key' => 'offline-gate-' . bin2hex(random_bytes(6)),
            'fence' => (int) ($overrides['fence'] ?? 1),
            'lease_token' => $overrides['lease_token'] ?? null,
            'lease_expires_at' => $overrides['lease_expires_at'] ?? date('Y-m-d H:i:s', time() + 600),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return (int) $pdo->lastInsertId();
    }

    private function insertCallbackCollisionTransaction(PDO $pdo, int $id, string $transactionCode, string $providerOrderId): void
    {
        $stmt = $pdo->prepare("INSERT INTO transactions
            (id, transaction_code, buyer_user_id, seller_user_id, car_id, car_price, payment_type,
             payment_method, dp_amount, remaining_amount, transaction_status, midtrans_order_id,
             expires_at, paid_at, created_at, updated_at, deleted_at)
            VALUES (:id, :transaction_code, 1, 2, 10, 200000000, 'dp', 'gopay', 5000000, 195000000,
             'pending_payment', :midtrans_order_id, '2026-10-20 11:00:00', NULL,
             '2026-10-20 10:00:00', NULL, NULL)");
        $stmt->execute([
            'id' => $id,
            'transaction_code' => $transactionCode,
            'midtrans_order_id' => $providerOrderId,
        ]);
    }

    private function makeService(PDO $pdo, PaymentProviderInterface $provider, ?AuthService $auth = null): TransactionService
    {
        return new TransactionService(
            $pdo,
            new TransactionRepository($pdo),
            new PaymentLogService(new PaymentLogRepository($pdo)),
            $provider,
            new OfflineBookingFakeAffiliateService(),
            new OfflineBookingFakeStorageService(),
            null,
            $auth
        );
    }

    private function initialPaymentService(): array
    {
        [$pdo, , $provider] = $this->freshService(false);
        $pdo->exec("INSERT INTO users (id, role, name, email, account_status, is_approved, deleted_at) VALUES
            (1, 'buyer', 'Buyer Existing', 'buyer@example.test', 'active', 1, NULL)");

        return [$pdo, $this->makeService($pdo, $provider), $provider];
    }

    private function createInitialProviderTransaction(TransactionService $service): array
    {
        return $service->create(['id' => 1, 'role' => 'buyer', 'name' => 'Buyer Existing'], [
            'car_id' => 10,
            'payment_type' => 'dp',
            'payment_method' => 'gopay',
        ]);
    }

    private function createSchema(PDO $pdo): void
    {
        $pdo->exec('CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            name TEXT NOT NULL,
            phone_number TEXT NULL,
            email TEXT NULL UNIQUE,
            buyer_username TEXT NULL UNIQUE,
            password_hash TEXT NULL,
            address TEXT NULL,
            account_status TEXT NULL,
            is_approved INTEGER NULL,
            created_at TEXT NULL,
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
        $pdo->exec('CREATE TABLE affiliates (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            seller_user_id INTEGER,
            referral_code TEXT,
            status TEXT
        )');
        $pdo->exec('CREATE TABLE transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        $pdo->exec('CREATE TABLE transaction_payment_operations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id INTEGER NOT NULL,
            parent_operation_id INTEGER NULL,
            operation_key TEXT NOT NULL,
            operation_type TEXT NOT NULL,
            provider_order_id TEXT NULL,
            payment_method TEXT NULL,
            gross_amount INTEGER NULL,
            idempotency_key TEXT NULL,
            operation_status TEXT NOT NULL,
            provider_status TEXT NULL,
            fence INTEGER NOT NULL DEFAULT 0,
            lease_token TEXT NULL,
            lease_expires_at TEXT NULL,
            first_attempt_at TEXT NULL,
            request_payload_json TEXT NULL,
            response_payload_json TEXT NULL,
            error_payload_json TEXT NULL,
            late_success_at TEXT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NULL,
            completed_at TEXT NULL
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
        $pdo->exec("INSERT INTO showrooms (id, name, bank_account_number, bank_type, bank_account_name)
            VALUES (1, 'Showroom Harapan', '1234567890', 'BCA', 'Showroom Harapan')");
    }

    private function seedUsersAndCar(PDO $pdo, string $listingStatus): void
    {
        $pdo->exec("INSERT INTO users (id, role, name, phone_number, email, account_status, is_approved, deleted_at) VALUES
            (2, 'seller', 'Showroom Harapan', '081200000002', 'owner@example.test', 'active', 1, NULL)");
        $pdo->exec("INSERT INTO cars
            (id, seller_user_id, showroom_id, listing_status, brand_name, model_name, price_cash, dp_amount, deleted_at)
            VALUES (10, 2, 1, '" . str_replace("'", "''", $listingStatus) . "', 'Toyota', 'Avanza', 200000000, 5000000, NULL)");
    }

    private function offlineBookingData(): array
    {
        return [
            'car_id' => 10,
            'buyer_name' => 'Rina Pratama',
            'buyer_phone_number' => '081234567890',
            'buyer_email' => null,
            'buyer_username' => 'rina.pratama_01',
            'buyer_password' => 'BuyerPass2026',
            'payment_amount' => 5000000,
            'paid_at' => '2026-10-19T10:30',
            'note' => 'Pembayaran Booking Fee diterima langsung di showroom.',
        ];
    }

    private function futurePaidAt(): string
    {
        $future = (new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta')))->modify('+5 minutes');

        return $future->format('Y-m-d') . 'T' . $future->format('H:i');
    }
}

class OfflineBookingHookingPdo extends PDO
{
    private int $beginTransactionCount = 0;

    private array $beforeBeginHooks = [];

    public function __construct()
    {
        parent::__construct('sqlite::memory:');
        $this->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    }

    public function beforeBeginTransaction(int $callNumber, callable $hook): void
    {
        $this->beforeBeginHooks[$callNumber] = $hook;
    }

    public function beginTransaction(): bool
    {
        $this->beginTransactionCount++;
        if (isset($this->beforeBeginHooks[$this->beginTransactionCount])) {
            $hook = $this->beforeBeginHooks[$this->beginTransactionCount];
            unset($this->beforeBeginHooks[$this->beginTransactionCount]);
            $hook($this);
        }

        return parent::beginTransaction();
    }
}

class OfflineBookingFakePaymentProvider implements PaymentProviderInterface
{
    public array $calls = [];

    public int $initialCalls = 0;

    private array $statuses;

    private array $cancelResponses;

    public array $statusesByOrder = [];

    public array $cancelResponsesByOrder = [];

    public $statusHook = null;

    public int $completionCalls = 0;

    public array $sessionCalls = [];

    public array $initialSessionCalls = [];

    public $completionHook = null;

    public $initialHook = null;

    public function __construct(array $statuses = [], array $cancelResponses = [])
    {
        $this->statuses = $statuses;
        $this->cancelResponses = $cancelResponses;
    }

    public function createInitialPayment(array $transaction, array $customer, string $paymentMethod, ?string $providerOrderId = null, ?string $idempotencyKey = null): array
    {
        $this->initialCalls++;
        $this->initialSessionCalls[] = [$providerOrderId, $idempotencyKey, $paymentMethod];
        if ($this->initialHook !== null) {
            return ($this->initialHook)($transaction, $customer, $paymentMethod, $providerOrderId, $idempotencyKey);
        }

        return [
            'provider_name' => 'midtrans',
            'provider_order_id' => $providerOrderId,
            'provider_transaction_id' => null,
            'payment_method' => $paymentMethod,
            'transaction_status' => 'pending',
            'gross_amount' => (int) ($transaction['dp_amount'] ?? $transaction['car_price'] ?? 0),
            'expires_at' => '2026-10-20 10:05:00',
            'payment_data' => [],
            'payload_request' => ['order_id' => $providerOrderId],
            'payload_response' => ['order_id' => $providerOrderId, 'transaction_status' => 'pending'],
            'midtrans_redirect_url' => 'https://payments.example.test/continue',
        ];
    }

    public function createCompletionPayment(array $transaction, array $customer, string $paymentMethod, ?string $providerOrderId = null, ?string $idempotencyKey = null): array
    {
        $this->completionCalls++;
        $this->sessionCalls[] = [$providerOrderId, $idempotencyKey, $paymentMethod];
        if ($this->completionHook !== null) {
            return ($this->completionHook)($transaction, $customer, $paymentMethod, $providerOrderId, $idempotencyKey);
        }

        $orderId = 'PELUNASAN-' . ($transaction['transaction_code'] ?? $transaction['id']);

        return [
            'provider_name' => 'midtrans',
            'provider_order_id' => $providerOrderId ?: $orderId,
            'provider_transaction_id' => null,
            'payment_method' => $paymentMethod,
            'transaction_status' => 'pending',
            'gross_amount' => (int) ($transaction['remaining_amount'] ?? 0),
            'expires_at' => '2026-10-20 10:05:00',
            'payment_data' => [],
            'payload_request' => ['purpose' => 'completion_payment'],
            'payload_response' => ['order_id' => $providerOrderId ?: $orderId, 'transaction_status' => 'pending'],
            'midtrans_redirect_url' => 'https://payments.example.test/continue',
        ];
    }

    public function checkStatus(string $providerOrderId): array
    {
        $this->calls[] = ['check', $providerOrderId];
        if ($this->statusHook !== null) {
            return ($this->statusHook)($providerOrderId);
        }
        if (array_key_exists($providerOrderId, $this->statusesByOrder)) {
            if ($this->statusesByOrder[$providerOrderId] === []) {
                throw new \RuntimeException('Unexpected provider status check for order ' . $providerOrderId . '.');
            }

            return array_merge(['order_id' => $providerOrderId], array_shift($this->statusesByOrder[$providerOrderId]));
        }
        if ($this->statuses === []) {
            throw new \RuntimeException('Unexpected provider status check.');
        }

        return array_merge(['order_id' => $providerOrderId], array_shift($this->statuses));
    }

    public function cancelPending(string $providerOrderId, ?string $idempotencyKey = null): array
    {
        $this->calls[] = ['cancel', $providerOrderId];
        if (array_key_exists($providerOrderId, $this->cancelResponsesByOrder)) {
            if ($this->cancelResponsesByOrder[$providerOrderId] === []) {
                throw new \RuntimeException('Unexpected provider cancellation for order ' . $providerOrderId . '.');
            }

            return array_merge(['order_id' => $providerOrderId], array_shift($this->cancelResponsesByOrder[$providerOrderId]));
        }
        if ($this->cancelResponses === []) {
            throw new \RuntimeException('Unexpected provider cancellation.');
        }

        return array_merge(['order_id' => $providerOrderId], array_shift($this->cancelResponses));
    }
}

class OfflineBookingFakeAffiliateService extends AffiliateService
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

class OfflineBookingFakeStorageService implements StorageServiceInterface
{
    public function storeUploadedFile(array $file, string $directory): array
    {
        return [];
    }

    public function delete(string $relativePath): bool
    {
        return true;
    }
}

class OfflineBookingFakeMidtransHttpClient extends MidtransHttpClient
{
    public array $calls = [];

    public ?array $chargeResponse = null;

    public bool $chargeResponseUseRequestOrderId = false;

    public function get(string $path): array
    {
        $this->calls[] = ['GET', $path, null];

        return ['transaction_status' => 'pending'];
    }

    public function post(string $path, array $payload, ?string $idempotencyKey = null): array
    {
        $this->calls[] = ['POST', $path, $payload, $idempotencyKey];

        if ($path === '/v2/charge' && $this->chargeResponse !== null) {
            $response = $this->chargeResponse;
            if ($this->chargeResponseUseRequestOrderId) {
                $response['order_id'] = $payload['transaction_details']['order_id'] ?? null;
            }

            return $response;
        }

        return ['transaction_status' => 'cancel'];
    }
}
