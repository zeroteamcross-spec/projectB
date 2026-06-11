<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class JsonValidator
{
    public function validateFile(string $path): array
    {
        if (! is_file($path)) {
            return ['valid' => false, 'reason' => 'missing'];
        }

        if (! is_readable($path)) {
            return ['valid' => false, 'reason' => 'not_readable'];
        }

        $contents = file_get_contents($path);

        if ($contents === false || trim($contents) === '') {
            return ['valid' => false, 'reason' => 'empty'];
        }

        json_decode($contents, true);

        return json_last_error() === JSON_ERROR_NONE
            ? ['valid' => true, 'reason' => null]
            : ['valid' => false, 'reason' => 'invalid_json'];
    }
}
