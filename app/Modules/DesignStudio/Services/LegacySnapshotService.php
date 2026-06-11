<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class LegacySnapshotService
{
    public function save(string $route, array $legacyPayload): ?array
    {
        $storagePath = (string) config('design_studio.storage_path', base_path('storage/design-studio'));
        $directory = $storagePath . DIRECTORY_SEPARATOR . 'migration' . DIRECTORY_SEPARATOR . 'snapshots';

        if (! is_dir($directory) && ! mkdir($directory, 0755, true) && ! is_dir($directory)) {
            return null;
        }

        $snapshot = [
            'route' => $route,
            'createdAt' => date('Y-m-d H:i:s'),
            'payload' => $legacyPayload,
        ];
        $file = $directory . DIRECTORY_SEPARATOR . 'legacy_snapshot_' . preg_replace('/[^A-Za-z0-9_.-]/', '_', trim($route, '#/')) . '_' . date('YmdHis') . '.json';
        $encoded = json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        if ($encoded === false || file_put_contents($file, $encoded . PHP_EOL, LOCK_EX) === false) {
            return null;
        }

        return $snapshot;
    }
}
