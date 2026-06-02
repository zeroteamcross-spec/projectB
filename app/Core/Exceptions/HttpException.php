<?php

declare(strict_types=1);

namespace App\Core\Exceptions;

use RuntimeException;

class HttpException extends RuntimeException
{
    private int $statusCode;

    private array $errors;

    private array $meta;

    public function __construct(string $message, int $statusCode = 500, array $errors = [], array $meta = [])
    {
        parent::__construct($message, $statusCode);

        $this->statusCode = $statusCode;
        $this->errors = $errors;
        $this->meta = $meta;
    }

    public function statusCode(): int
    {
        return $this->statusCode;
    }

    public function errors(): array
    {
        return $this->errors;
    }

    public function meta(): array
    {
        return $this->meta;
    }
}
