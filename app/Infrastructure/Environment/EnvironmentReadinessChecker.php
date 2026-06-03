<?php

declare(strict_types=1);

namespace App\Infrastructure\Environment;

use App\Infrastructure\Database\ConnectionFactory;
use Throwable;

class EnvironmentReadinessChecker
{
    private const TARGETS = ['local', 'uat', 'staging', 'production'];

    public function check(string $target = 'local', bool $checkDatabase = false): array
    {
        $target = strtolower(trim($target));

        if (! in_array($target, self::TARGETS, true)) {
            $target = 'local';
        }

        $checks = [];
        $blockers = [];
        $warnings = [];

        $this->checkPhp($checks, $blockers, $warnings);
        $this->checkStorage($checks, $blockers);
        $this->checkDatabase($checks, $blockers, $warnings, $target, $checkDatabase);
        $this->checkPayment($checks, $blockers, $warnings, $target);

        return [
            'target' => $target,
            'ready' => $blockers === [],
            'checks' => $checks,
            'blockers' => $blockers,
            'warnings' => $warnings,
        ];
    }

    private function checkPhp(array &$checks, array &$blockers, array &$warnings): void
    {
        $checks['php_version'] = [
            'value' => PHP_VERSION,
            'ok' => PHP_VERSION_ID >= 70400,
            'required' => '>= 7.4',
        ];

        if (! $checks['php_version']['ok']) {
            $blockers[] = 'PHP version must be 7.4 or newer.';
        }

        foreach (['json', 'pdo', 'fileinfo'] as $extension) {
            $loaded = extension_loaded($extension);
            $checks['extension_' . $extension] = [
                'value' => $loaded,
                'ok' => $loaded,
            ];

            if (! $loaded) {
                $blockers[] = 'PHP extension ' . $extension . ' is required.';
            }
        }

        $curlLoaded = extension_loaded('curl');
        $checks['extension_curl'] = [
            'value' => $curlLoaded,
            'ok' => true,
        ];

        if (! $curlLoaded) {
            $warnings[] = 'PHP extension curl is not loaded; Midtrans HTTP calls will use stream fallback.';
        }
    }

    private function checkStorage(array &$checks, array &$blockers): void
    {
        foreach ([
            'storage_uploads' => (string) config('storage.uploads_path', base_path('storage/uploads')),
            'storage_logs' => base_path('storage/logs'),
            'storage_cache' => base_path('storage/cache'),
            'storage_cleanup_log_dir' => dirname((string) config('storage.cleanup_log_path', base_path('storage/logs/car_images_cleanup.log'))),
        ] as $name => $path) {
            $exists = is_dir($path);
            $writable = $exists && is_writable($path);
            $checks[$name] = [
                'value' => $path,
                'ok' => $writable,
            ];

            if (! $writable) {
                $blockers[] = 'Storage path is not writable: ' . $path;
            }
        }
    }

    private function checkDatabase(array &$checks, array &$blockers, array &$warnings, string $target, bool $checkDatabase): void
    {
        $connection = (string) config('database.default', 'mysql');
        $database = (array) config('database.connections.' . $connection, []);
        $isStrictTarget = in_array($target, ['uat', 'staging', 'production'], true);

        $checks['database_connection'] = [
            'value' => $connection,
            'ok' => $connection === 'mysql',
        ];

        if ($connection !== 'mysql') {
            $blockers[] = 'Only mysql database connection is currently supported.';
        }

        $pdoMysqlLoaded = extension_loaded('pdo_mysql');
        $checks['extension_pdo_mysql'] = [
            'value' => $pdoMysqlLoaded,
            'ok' => $connection !== 'mysql' || $pdoMysqlLoaded,
        ];

        if ($connection === 'mysql' && ! $pdoMysqlLoaded) {
            $blockers[] = 'PHP extension pdo_mysql is required for MySQL.';
        }

        $socket = isset($database['socket']) ? trim((string) $database['socket']) : '';
        $checks['database_socket'] = [
            'value' => $socket,
            'ok' => true,
        ];

        foreach (['database', 'username'] as $field) {
            $value = isset($database[$field]) ? (string) $database[$field] : '';
            $checks['database_' . $field] = [
                'value' => $field === 'username' ? $this->mask($value) : $value,
                'ok' => $value !== '',
            ];

            if ($value === '') {
                $blockers[] = 'Database config is missing: ' . $field . '.';
            }
        }

        if ($socket === '') {
            foreach (['host', 'port'] as $field) {
                $value = isset($database[$field]) ? (string) $database[$field] : '';
                $checks['database_' . $field] = [
                    'value' => $value,
                    'ok' => $value !== '',
                ];

                if ($value === '') {
                    $blockers[] = 'Database config is missing: ' . $field . '.';
                }
            }
        } else {
            $checks['database_host'] = [
                'value' => isset($database['host']) ? (string) $database['host'] : '',
                'ok' => true,
            ];
            $checks['database_port'] = [
                'value' => isset($database['port']) ? (string) $database['port'] : '',
                'ok' => true,
            ];

            if (! file_exists($socket)) {
                $warnings[] = 'Database socket path does not exist from this runtime: ' . $socket . '.';
            }
        }

        if (! $checkDatabase) {
            $checks['database_connectivity'] = [
                'value' => 'skipped',
                'ok' => ! $isStrictTarget,
            ];

            if ($isStrictTarget) {
                $warnings[] = 'Database connectivity was not checked; run with --check-db before staging/production.';
            }

            return;
        }

        try {
            $pdo = ConnectionFactory::make();
            $pdo->query('SELECT 1');
            $checks['database_connectivity'] = [
                'value' => 'connected',
                'ok' => true,
            ];
        } catch (Throwable $exception) {
            $checks['database_connectivity'] = [
                'value' => $exception->getMessage(),
                'ok' => false,
            ];
            $blockers[] = 'Database connectivity failed: ' . $exception->getMessage();
        }
    }

    private function checkPayment(array &$checks, array &$blockers, array &$warnings, string $target): void
    {
        $midtrans = (array) config('payment.midtrans', []);
        $isStrictTarget = in_array($target, ['uat', 'staging', 'production'], true);

        foreach (['server_key', 'client_key', 'callback_url', 'core_api_base_url'] as $field) {
            $value = isset($midtrans[$field]) ? (string) $midtrans[$field] : '';
            $checks['midtrans_' . $field] = [
                'value' => strpos($field, 'key') !== false ? $this->mask($value) : $value,
                'ok' => $value !== '',
            ];

            if ($value === '' && $isStrictTarget) {
                $blockers[] = 'Midtrans config is missing: ' . strtoupper($field) . '.';
            } elseif ($value === '') {
                $warnings[] = 'Midtrans config is missing: ' . strtoupper($field) . '.';
            }
        }

        $verifySignature = (bool) ($midtrans['verify_signature'] ?? true);
        $checks['midtrans_verify_signature'] = [
            'value' => $verifySignature,
            'ok' => $verifySignature,
        ];

        if (! $verifySignature && $isStrictTarget) {
            $blockers[] = 'Midtrans callback signature verification must be enabled.';
        } elseif (! $verifySignature) {
            $warnings[] = 'Midtrans callback signature verification is disabled.';
        }

        $callbackUrl = (string) ($midtrans['callback_url'] ?? '');
        $isHttps = strpos($callbackUrl, 'https://') === 0;
        $checks['midtrans_callback_https'] = [
            'value' => $callbackUrl,
            'ok' => $target !== 'production' || $isHttps,
        ];

        if ($target === 'production' && ! $isHttps) {
            $blockers[] = 'Production Midtrans callback URL must use HTTPS.';
        } elseif ($target !== 'local' && ! $isHttps) {
            $warnings[] = 'Non-local Midtrans callback URL should use HTTPS.';
        }
    }

    private function mask(string $value): string
    {
        if ($value === '') {
            return '';
        }

        if (strlen($value) <= 4) {
            return '****';
        }

        return substr($value, 0, 2) . str_repeat('*', max(2, strlen($value) - 4)) . substr($value, -2);
    }
}
