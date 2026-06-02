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

        return [
            'provider_name' => 'midtrans',
            'order_id' => (string) $payload['order_id'],
            'transaction_id' => isset($payload['transaction_id']) ? (string) $payload['transaction_id'] : null,
            'payment_type' => isset($payload['payment_type']) ? (string) $payload['payment_type'] : null,
            'transaction_status' => (string) $payload['transaction_status'],
            'gross_amount' => isset($payload['gross_amount']) ? (float) $payload['gross_amount'] : null,
            'fraud_status' => isset($payload['fraud_status']) ? (string) $payload['fraud_status'] : null,
            'status_code' => isset($payload['status_code']) ? (string) $payload['status_code'] : null,
            'payload_callback' => $payload,
        ];
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
