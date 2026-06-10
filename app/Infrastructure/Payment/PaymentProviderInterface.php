<?php

declare(strict_types=1);

namespace App\Infrastructure\Payment;

interface PaymentProviderInterface
{
    public function createInitialPayment(array $transaction, array $customer, string $paymentMethod): array;

    public function createCompletionPayment(array $transaction, array $customer, string $paymentMethod): array;

    public function checkStatus(string $providerOrderId): array;
}
