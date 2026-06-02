<?php

declare(strict_types=1);

namespace App\Core\Exceptions;

class ForbiddenException extends HttpException
{
    public function __construct(string $message = 'Forbidden', array $errors = [], array $meta = [])
    {
        parent::__construct($message, 403, $errors, $meta);
    }
}
