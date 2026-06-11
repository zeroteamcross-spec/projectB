<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

use Throwable;

class AtomicFileWriter
{
    public function writeJson(string $path, array $data): bool
    {
        $encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        if ($encoded === false || json_decode($encoded, true) === null && json_last_error() !== JSON_ERROR_NONE) {
            return false;
        }

        return $this->write($path, $encoded . PHP_EOL);
    }

    public function write(string $path, string $contents): bool
    {
        try {
            $directory = dirname($path);

            if (! is_dir($directory) && ! mkdir($directory, 0755, true) && ! is_dir($directory)) {
                return false;
            }

            $tmpPath = $path . '.tmp';

            if (file_put_contents($tmpPath, $contents, LOCK_EX) === false) {
                return false;
            }

            if (! @rename($tmpPath, $path)) {
                @unlink($tmpPath);
                return false;
            }

            return true;
        } catch (Throwable $exception) {
            return false;
        }
    }
}
