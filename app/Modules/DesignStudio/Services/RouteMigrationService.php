<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class RouteMigrationService
{
    public function setV2Enabled(string $route, bool $enabled): bool
    {
        $metadata = $this->loadMetadata();
        $metadata[$route] = array_merge($metadata[$route] ?? [], [
            'v2Enabled' => $enabled,
            'updatedAt' => date('Y-m-d H:i:s'),
        ]);

        return $this->saveMetadata($metadata);
    }

    public function status(string $route): array
    {
        return $this->loadMetadata()[$route] ?? [
            'v2Enabled' => false,
            'status' => 'NOT_MIGRATED',
        ];
    }

    public function markMigrated(string $route, string $status = 'PARTIAL'): bool
    {
        $metadata = $this->loadMetadata();
        $metadata[$route] = array_merge($metadata[$route] ?? [], [
            'status' => $status,
            'updatedAt' => date('Y-m-d H:i:s'),
        ]);

        return $this->saveMetadata($metadata);
    }

    private function loadMetadata(): array
    {
        $file = $this->metadataFile();

        if (! is_file($file)) {
            return [];
        }

        $decoded = json_decode((string) file_get_contents($file), true);

        return is_array($decoded) ? $decoded : [];
    }

    private function saveMetadata(array $metadata): bool
    {
        $file = $this->metadataFile();
        $directory = dirname($file);

        if (! is_dir($directory) && ! mkdir($directory, 0755, true) && ! is_dir($directory)) {
            return false;
        }

        $encoded = json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        return $encoded !== false && file_put_contents($file, $encoded . PHP_EOL, LOCK_EX) !== false;
    }

    private function metadataFile(): string
    {
        return (string) config('design_studio.storage_path', base_path('storage/design-studio')) . DIRECTORY_SEPARATOR . 'migration' . DIRECTORY_SEPARATOR . 'routes.json';
    }
}
