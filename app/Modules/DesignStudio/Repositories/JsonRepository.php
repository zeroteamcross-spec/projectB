<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Repositories;

use App\Modules\DesignStudio\Contracts\DesignStudioRepository;
use App\Modules\DesignStudio\Services\AtomicFileWriter;
use Throwable;

abstract class JsonRepository implements DesignStudioRepository
{
    protected string $storagePath;

    public function __construct(?string $storagePath = null)
    {
        $this->storagePath = $storagePath ?? (string) config('design_studio.storage_path', base_path('storage/design-studio'));
    }

    public function isEnabled(): bool
    {
        return (bool) config('design_studio.enabled', false);
    }

    protected function readJson(string $path, array $default = []): array
    {
        if (! $this->isEnabled() || ! is_file($path) || ! is_readable($path)) {
            return $default;
        }

        try {
            $contents = file_get_contents($path);

            if ($contents === false || trim($contents) === '') {
                return $default;
            }

            $decoded = json_decode($contents, true);

            return is_array($decoded) ? $decoded : $default;
        } catch (Throwable $exception) {
            return $default;
        }
    }

    protected function writeJson(string $path, array $data): bool
    {
        if (! $this->isEnabled()) {
            return false;
        }

        try {
            $directory = dirname($path);

            if (! is_dir($directory) && ! mkdir($directory, 0755, true) && ! is_dir($directory)) {
                return false;
            }

            return (new AtomicFileWriter())->writeJson($path, $data);
        } catch (Throwable $exception) {
            return false;
        }
    }

    protected function routeKey(string $route): string
    {
        $normalized = trim($route);

        if (strpos($normalized, '#/') === 0) {
            $normalized = substr($normalized, 2);
        }

        $normalized = trim($normalized, "/ \t\n\r\0\x0B");
        $normalized = str_replace('/', '.', $normalized);
        $normalized = preg_replace('/[^A-Za-z0-9_.-]/', '', $normalized) ?? '';

        return trim($normalized, '.');
    }
}
