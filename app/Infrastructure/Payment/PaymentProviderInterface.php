<?php

declare(strict_types=1);

namespace App\Infrastructure\Payment;

interface PaymentProviderInterface
{
    public function createInitialPayment(
        array $transaction,
        array $customer,
        string $paymentMethod,
        ?string $providerOrderId = null,
        ?string $idempotencyKey = null
    ): array;

    public function createCompletionPayment(
        array $transaction,
        array $customer,
        string $paymentMethod,
        ?string $providerOrderId = null,
        ?string $idempotencyKey = null
    ): array;

    public function checkStatus(string $providerOrderId): array;

    public function cancelPending(string $providerOrderId, ?string $idempotencyKey = null): array;
}
