<?php

declare(strict_types=1);

namespace App\Infrastructure\Database;

use PDO;
use PDOException;

class ConnectionFactory
{
    public static function make(): PDO
    {
        $connection = config('database.default', 'mysql');
        $config = config('database.connections.' . $connection);

        if (! is_array($config)) {
            throw new \RuntimeException('Database connection is not configured.');
        }

        if ($connection !== 'mysql') {
            throw new \RuntimeException('Unsupported database connection: ' . $connection);
        }

        $config = self::normalizeMysqlConfig($config);
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        if ($config['timeout'] > 0) {
            $options[PDO::ATTR_TIMEOUT] = $config['timeout'];
        }

        // Seluruh tabel aplikasi ini utf8mb4_unicode_ci, tapi charset di DSN
        // saja membuat literal dan user variable memakai kolasi bawaan server
        // -- utf8mb4_general_ci atau utf8mb4_0900_ai_ci, tergantung mesinnya.
        // Membandingkan kolom dengan literal lalu ditolak MySQL sebagai
        // "Illegal mix of collations", dan gejalanya baru muncul di server yang
        // bawaannya berbeda dari mesin tempat kode ditulis. Koneksinya
        // disamakan dengan skemanya.
        $options[PDO::MYSQL_ATTR_INIT_COMMAND] = sprintf(
            'SET NAMES %s COLLATE %s',
            $config['charset'],
            $config['collation']
        );

        try {
            return new PDO(self::mysqlDsn($config), $config['username'], $config['password'], $options);
        } catch (PDOException $exception) {
            throw new \RuntimeException(self::connectionFailureMessage($config, $exception), 0, $exception);
        }
    }

    private static function normalizeMysqlConfig(array $config): array
    {
        $normalized = [
            'host' => self::stringValue($config, 'host'),
            'port' => self::stringValue($config, 'port'),
            'socket' => self::stringValue($config, 'socket'),
            'database' => self::stringValue($config, 'database'),
            'username' => self::stringValue($config, 'username'),
            'password' => self::stringValue($config, 'password'),
            'charset' => self::stringValue($config, 'charset') !== '' ? self::stringValue($config, 'charset') : 'utf8mb4',
            'collation' => self::stringValue($config, 'collation') !== '' ? self::stringValue($config, 'collation') : 'utf8mb4_unicode_ci',
            'timeout' => max(0, (int) self::stringValue($config, 'timeout')),
        ];

        $missing = [];
        foreach (['database', 'username'] as $field) {
            if ($normalized[$field] === '') {
                $missing[] = $field;
            }
        }

        if ($normalized['socket'] === '') {
            foreach (['host', 'port'] as $field) {
                if ($normalized[$field] === '') {
                    $missing[] = $field;
                }
            }
        }

        if ($missing !== []) {
            throw new \RuntimeException('Database config is missing: ' . implode(', ', $missing) . '.');
        }

        return $normalized;
    }

    private static function mysqlDsn(array $config): string
    {
        if ($config['socket'] !== '') {
            return sprintf(
                'mysql:unix_socket=%s;dbname=%s;charset=%s',
                $config['socket'],
                $config['database'],
                $config['charset']
            );
        }

        return sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );
    }

    private static function connectionFailureMessage(array $config, PDOException $exception): string
    {
        $target = $config['socket'] !== ''
            ? 'socket "' . $config['socket'] . '"'
            : 'host "' . $config['host'] . ':' . $config['port'] . '"';

        return sprintf(
            'Database connection failed for %s, database "%s", user "%s": %s',
            $target,
            $config['database'],
            self::mask($config['username']),
            $exception->getMessage()
        );
    }

    private static function stringValue(array $config, string $key): string
    {
        return isset($config[$key]) ? trim((string) $config[$key]) : '';
    }

    private static function mask(string $value): string
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
