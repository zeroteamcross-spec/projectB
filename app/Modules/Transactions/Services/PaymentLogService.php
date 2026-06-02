<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Services;

use App\Modules\Transactions\Mappers\TransactionMapper;
use App\Modules\Transactions\Repositories\PaymentLogRepository;

class PaymentLogService
{
    private PaymentLogRepository $logs;

    public function __construct(PaymentLogRepository $logs)
    {
        $this->logs = $logs;
    }

    public function record(int $transactionId, array $data): array
    {
        $now = date('Y-m-d H:i:s');
        $logId = $this->logs->create([
            'transaction_id' => $transactionId,
            'provider_name' => $data['provider_name'] ?? 'midtrans',
            'provider_order_id' => $data['provider_order_id'] ?? $data['order_id'] ?? null,
            'provider_transaction_id' => $data['provider_transaction_id'] ?? $data['transaction_id'] ?? null,
            'payment_method' => $data['payment_method'] ?? $data['payment_type'] ?? null,
            'transaction_status' => $data['transaction_status'] ?? null,
            'gross_amount' => isset($data['gross_amount']) ? (int) $data['gross_amount'] : null,
            'payload_request_json' => $this->encodePayload($data['payload_request'] ?? null),
            'payload_response_json' => $this->encodePayload($data['payload_response'] ?? null),
            'payload_callback_json' => $this->encodePayload($data['payload_callback'] ?? null),
            'logged_at' => $now,
            'created_at' => $now,
        ]);

        return TransactionMapper::paymentLog($this->logs->findById($logId));
    }

    public function latestByTransaction(int $transactionId, int $limit = 10): array
    {
        return $this->logs->latestByTransaction($transactionId, $limit);
    }

    public function providerStatusToCanon(array $transaction, ?string $providerStatus, ?int $grossAmount): ?string
    {
        if (! is_string($providerStatus) || $providerStatus === '') {
            return null;
        }

        $providerStatus = strtolower($providerStatus);

        if (($transaction['transaction_status'] ?? null) === 'completed') {
            return 'completed';
        }

        if (($transaction['transaction_status'] ?? null) === 'paid') {
            return 'paid';
        }

        if (in_array($providerStatus, ['settlement', 'capture', 'paid'], true)) {
            return $this->settledStatus($transaction, $grossAmount);
        }

        if ($providerStatus === 'pending') {
            return ($transaction['transaction_status'] ?? null) === 'pending_payment'
                ? 'pending_payment'
                : null;
        }

        if ($providerStatus === 'expire') {
            return 'expired';
        }

        if (in_array($providerStatus, ['cancel', 'deny', 'failure', 'failed'], true)) {
            return 'cancelled';
        }

        return null;
    }

    private function settledStatus(array $transaction, ?int $grossAmount): string
    {
        if (($transaction['payment_type'] ?? null) === 'full') {
            return 'paid';
        }

        if (($transaction['transaction_status'] ?? null) === 'dp_paid') {
            $remainingAmount = (int) ($transaction['remaining_amount'] ?? 0);

            return $grossAmount !== null && $grossAmount >= $remainingAmount ? 'paid' : 'dp_paid';
        }

        return 'dp_paid';
    }

    private function encodePayload($payload): ?string
    {
        if ($payload === null) {
            return null;
        }

        return json_encode($payload, JSON_UNESCAPED_SLASHES);
    }
}
