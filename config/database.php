<?php

declare(strict_types=1);

return [
    'default' => env('DB_CONNECTION', 'mysql'),
    'connections' => [
        'mysql' => [
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '3306'),
            'socket' => env('DB_SOCKET', ''),
            'database' => env('DB_DATABASE', ''),
            'username' => env('DB_USERNAME', ''),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8mb4',
            // Semua tabel dibuat utf8mb4_unicode_ci; koneksinya harus sama,
            // kalau tidak literal SQL memakai kolasi bawaan server dan
            // perbandingan dengan kolom ditolak sebagai illegal mix.
            'collation' => 'utf8mb4_unicode_ci',
            'timeout' => env('DB_TIMEOUT', '5'),
        ],
    ],
];
