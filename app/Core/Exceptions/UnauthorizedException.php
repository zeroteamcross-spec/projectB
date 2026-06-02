<?php

declare(strict_types=1);

namespace App\Core\Exceptions;

class UnauthorizedException extends HttpException
{
    public function __construct(string $message = 'Unauthenticated', array $errors = [], array $meta = [])
    {
        parent::__construct($message, 401, $errors, $meta);
    }
}
