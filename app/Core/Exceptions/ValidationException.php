<?php

declare(strict_types=1);

namespace App\Core\Exceptions;

class ValidationException extends HttpException
{
    public function __construct(array $errors, string $message = 'Validation failed', array $meta = [])
    {
        parent::__construct($message, 422, $errors, $meta);
    }
}
