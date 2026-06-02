<?php

declare(strict_types=1);

namespace App\Infrastructure\Payment;

use App\Core\Exceptions\HttpException;

class PaymentProviderException extends HttpException
{
    private array $logPayload;

    public function __construct(string $message, array $logPayload = [], int $statusCode = 502)
    {
        parent::__construct($message, $statusCode, [], [
            'provider_name' => $logPayload['provider_name'] ?? null,
            'provider_order_id' => $logPayload['provider_order_id'] ?? null,
        ]);

        $this->logPayload = $logPayload;
    }

    public function logPayload(): array
    {
        return $this->logPayload;
    }
}
