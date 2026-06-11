<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class LockRecoveryService
{
    public function acquire(string $path, string $owner, int $ttlSeconds = 300): bool
    {
        if (is_file($path)) {
            return false;
        }

        $directory = dirname($path);

        if (! is_dir($directory) && ! mkdir($directory, 0755, true) && ! is_dir($directory)) {
            return false;
        }

        $now = time();
        $document = [
            'owner' => $owner,
            'createdAt' => date('Y-m-d H:i:s', $now),
            'expiredAt' => date('Y-m-d H:i:s', $now + $ttlSeconds),
        ];

        return (new AtomicFileWriter())->writeJson($path, $document);
    }

    public function inspect(string $path): array
    {
        if (! is_file($path)) {
            return ['status' => 'MISSING', 'stale' => false];
        }

        $data = json_decode((string) file_get_contents($path), true);
        $expiredAt = strtotime((string) ($data['expiredAt'] ?? '')) ?: 0;

        return [
            'status' => $expiredAt > 0 && $expiredAt < time() ? 'STALE' : 'ACTIVE',
            'stale' => $expiredAt > 0 && $expiredAt < time(),
            'lock' => is_array($data) ? $data : [],
        ];
    }

    public function release(string $path, string $owner): bool
    {
        $inspection = $this->inspect($path);

        if (($inspection['lock']['owner'] ?? null) !== $owner) {
            return false;
        }

        return ! is_file($path) || @unlink($path);
    }
}
