<?php

declare(strict_types=1);

namespace App\Core\Exceptions;

class NotFoundException extends HttpException
{
    public function __construct(string $message = 'Resource not found', array $errors = [], array $meta = [])
    {
        parent::__construct($message, 404, $errors, $meta);
    }
}
