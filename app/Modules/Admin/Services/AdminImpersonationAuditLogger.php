<?php

declare(strict_types=1);

namespace App\Modules\Admin\Services;

class AdminImpersonationAuditLogger
{
    public function log(string $event, array $payload): void
    {
        $line = json_encode([
            'event' => $event,
            'occurred_at' => date('c'),
            'payload' => $payload,
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        if (! is_string($line) || $line === '') {
            return;
        }

        $path = base_path('storage/logs/admin_affiliate_impersonation.log');
        $directory = dirname($path);

        if (! is_dir($directory)) {
            @mkdir($directory, 0777, true);
        }

        @file_put_contents($path, $line . PHP_EOL, FILE_APPEND | LOCK_EX);
    }
}
