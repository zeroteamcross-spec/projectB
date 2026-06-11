<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class ChecksumValidator
{
    public function validate(array $payload): bool
    {
        if (! isset($payload['checksum'])) {
            return true;
        }

        $copy = $payload;
        $checksum = (string) $copy['checksum'];
        unset($copy['checksum']);

        return hash('sha256', json_encode($copy, JSON_UNESCAPED_SLASHES) ?: '') === $checksum;
    }
}
