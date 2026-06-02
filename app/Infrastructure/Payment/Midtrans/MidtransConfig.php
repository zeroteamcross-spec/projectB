<?php

declare(strict_types=1);

namespace App\Infrastructure\Payment\Midtrans;

use App\Core\Exceptions\ValidationException;

class MidtransConfig
{
    private string $serverKey;

    private string $clientKey;

    private bool $isProduction;

    private bool $isSanitized;

    private bool $is3ds;

    private string $callbackUrl;

    private bool $verifySignature;

    private string $snapBaseUrl;

    private string $coreApiBaseUrl;

    public function __construct(array $config)
    {
        $this->serverKey = (string) ($config['server_key'] ?? '');
        $this->clientKey = (string) ($config['client_key'] ?? '');
        $this->isProduction = (bool) ($config['is_production'] ?? false);
        $this->isSanitized = (bool) ($config['is_sanitized'] ?? true);
        $this->is3ds = (bool) ($config['is_3ds'] ?? true);
        $this->callbackUrl = (string) ($config['callback_url'] ?? '');
        $this->verifySignature = (bool) ($config['verify_signature'] ?? true);
        $this->snapBaseUrl = rtrim((string) ($config['snap_base_url'] ?? ''), '/');
        $this->coreApiBaseUrl = rtrim((string) ($config['core_api_base_url'] ?? ''), '/');
    }

    public static function fromConfig(): self
    {
        return new self(config('payment.midtrans', []));
    }

    public function ensureUsable(): void
    {
        if ($this->serverKey === '') {
            throw new ValidationException([
                'midtrans_server_key' => 'MIDTRANS_SERVER_KEY is required to create payment session.',
            ]);
        }
    }

    public function serverKey(): string
    {
        return $this->serverKey;
    }

    public function clientKey(): string
    {
        return $this->clientKey;
    }

    public function isProduction(): bool
    {
        return $this->isProduction;
    }

    public function isSanitized(): bool
    {
        return $this->isSanitized;
    }

    public function is3ds(): bool
    {
        return $this->is3ds;
    }

    public function callbackUrl(): string
    {
        return $this->callbackUrl;
    }

    public function shouldVerifySignature(): bool
    {
        return $this->verifySignature;
    }

    public function snapBaseUrl(): string
    {
        return $this->snapBaseUrl;
    }

    public function coreApiBaseUrl(): string
    {
        return $this->coreApiBaseUrl;
    }
}
