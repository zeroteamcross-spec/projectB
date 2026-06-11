<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class RecoveryEngine
{
    public function inspect(array $paths): array
    {
        $tempFiles = array_values(array_filter($paths['temp'] ?? [], 'is_file'));
        $backupFiles = array_values(array_filter($paths['backup'] ?? [], 'is_file'));
        $locks = array_map(static fn (string $path): array => ['path' => $path, 'exists' => is_file($path)], $paths['locks'] ?? []);

        $status = ($tempFiles !== [] || $backupFiles !== [] || array_filter($locks, static fn (array $lock): bool => $lock['exists'])) ? 'RECOVERY_REQUIRED' : 'NORMAL';

        return [
            'status' => $status,
            'tempFiles' => $tempFiles,
            'backupFiles' => $backupFiles,
            'locks' => $locks,
            'recommendation' => $status === 'NORMAL' ? 'No recovery action required.' : 'Review recovery artifacts before manual action.',
        ];
    }
}
