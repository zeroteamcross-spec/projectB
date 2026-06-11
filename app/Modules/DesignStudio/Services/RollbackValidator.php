<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class RollbackValidator
{
    private const MAX_NOTE_LENGTH = 500;
    private const MIN_NOTE_LENGTH = 5;
    private const MAX_SNAPSHOT_BYTES = 2097152;

    public function validateNote(string $note): bool
    {
        $length = strlen(trim($note));

        return $length >= self::MIN_NOTE_LENGTH && $length <= self::MAX_NOTE_LENGTH;
    }

    public function validateSnapshot(array $snapshot, string $route): bool
    {
        if (! isset($snapshot['schemaVersion'], $snapshot['version'], $snapshot['route'], $snapshot['elements'])) {
            return false;
        }

        if (! is_int($snapshot['schemaVersion']) || ! is_int($snapshot['version']) || ! is_string($snapshot['route'])) {
            return false;
        }

        if ($snapshot['route'] !== $route || ! is_array($snapshot['elements'])) {
            return false;
        }

        $encoded = json_encode($snapshot, JSON_UNESCAPED_SLASHES);

        return $encoded !== false && strlen($encoded) <= self::MAX_SNAPSHOT_BYTES;
    }
}
