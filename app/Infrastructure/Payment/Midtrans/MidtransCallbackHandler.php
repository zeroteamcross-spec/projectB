<?php

declare(strict_types=1);

namespace App\Infrastructure\Payment\Midtrans;

use App\Core\Exceptions\UnauthorizedException;
use App\Core\Exceptions\ValidationException;

class MidtransCallbackHandler
{
    private MidtransConfig $config;

    public function __construct(?MidtransConfig $config = null)
    {
        $this->config = $config ?? MidtransConfig::fromConfig();
    }

    public function normalize(array $payload): array
    {
        $this->verifySignature($payload);

        if (empty($payload['order_id'])) {
            throw new ValidationException(['order_id' => 'The order_id field is required.']);
        }

        if (empty($payload['transaction_status'])) {
            throw new ValidationException(['transaction_status' => 'The transaction_status field is required.']);
        }

        $normalized = [
            'provider_name' => 'midtrans',
            'order_id' => (string) $payload['order_id'],
            'transaction_id' => isset($payload['transaction_id']) ? (string) $payload['transaction_id'] : null,
            'payment_type' => isset($payload['payment_type']) ? (string) $payload['payment_type'] : null,
            'transaction_status' => (string) $payload['transaction_status'],
            // Keep the provider's exact amount representation. Midtrans signs
            // the original gross_amount bytes and downstream validation must
            // not receive a lossy float conversion.
            'gross_amount' => $payload['gross_amount'] ?? null,
            'status_code' => isset($payload['status_code']) ? (string) $payload['status_code'] : null,
            'payload_callback' => $payload,
        ];

        // Absence and an explicit non-accept fraud status have different
        // meanings for capture. Keep this key absent if Midtrans omitted it.
        if (array_key_exists('fraud_status', $payload)) {
            $normalized['fraud_status'] = (string) $payload['fraud_status'];
        }

        return $normalized;
    }

    private function verifySignature(array $payload): void
    {
        if (! $this->config->shouldVerifySignature()) {
            return;
        }

        if ($this->config->serverKey() === '') {
            throw new UnauthorizedException('Signature callback Midtrans tidak dapat diverifikasi.');
        }

        foreach (['order_id', 'status_code', 'gross_amount', 'signature_key'] as $field) {
            if (! isset($payload[$field]) || $payload[$field] === '') {
                throw new UnauthorizedException('Signature callback Midtrans tidak valid.');
            }
        }

        $expected = hash(
            'sha512',
            (string) $payload['order_id']
            . (string) $payload['status_code']
            . (string) $payload['gross_amount']
            . $this->config->serverKey()
        );

        if (! hash_equals($expected, (string) $payload['signature_key'])) {
            throw new UnauthorizedException('Signature callback Midtrans tidak valid.');
        }
    }
}
