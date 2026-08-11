<?php

declare(strict_types=1);

return [
    'name' => env('APP_NAME', 'BeliMobil'),
    'env' => env('APP_ENV', 'local'),
    'debug' => env('APP_DEBUG', false),
    'timezone' => env('APP_TIMEZONE', 'Asia/Jakarta'),
    'url' => env('APP_URL', 'http://localhost:8000'),
    // Membuka /api/diagnostics/database. Selama kosong, rute itu menjawab 404
    // seolah tidak ada -- jadi tidak ada permukaan diagnostik yang menganggur
    // di deployment mana pun kecuali sengaja dinyalakan.
    'diagnostic_token' => env('DIAGNOSTIC_TOKEN', ''),
    /**
     * Host per peran. Kosong berarti peran itu tidak punya host sendiri dan
     * ikut `default`. Kalau `default` juga kosong, penjaga domain di frontend
     * tidak melakukan apa-apa sama sekali -- itu keadaan bawaannya, dan itu
     * yang berlaku di pengembangan lokal.
     */
    'role_hosts' => [
        'default' => env('ROLE_HOST_DEFAULT', ''),
        'admin' => env('ROLE_HOST_ADMIN', ''),
        'seller' => env('ROLE_HOST_SELLER', ''),
        'affiliate' => env('ROLE_HOST_AFFILIATE', ''),
        'buyer' => env('ROLE_HOST_BUYER', ''),
    ],
    'api' => [
        'prefix' => '/api',
        'response_contract' => [
            'success',
            'message',
            'data',
            'meta',
            'errors',
        ],
    ],
];
