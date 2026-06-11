<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

use Throwable;

class ErrorClassificationService
{
    public function classify(Throwable $exception): array
    {
        return [
            'severity' => $exception instanceof \RuntimeException ? 'HIGH' : 'WARNING',
            'type' => get_class($exception),
            'message' => $exception->getMessage(),
        ];
    }
}
