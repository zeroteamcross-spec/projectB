<?php

declare(strict_types=1);

namespace App\Infrastructure\Database;

use PDO;

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

        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset'] ?? 'utf8mb4'
        );

        return new PDO($dsn, $config['username'], $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
}
