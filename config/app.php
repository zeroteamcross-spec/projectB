<?php

declare(strict_types=1);

return [
    'name' => env('APP_NAME', 'BeliMobil'),
    'env' => env('APP_ENV', 'local'),
    'debug' => env('APP_DEBUG', false),
    'timezone' => env('APP_TIMEZONE', 'Asia/Jakarta'),
    'url' => env('APP_URL', 'http://localhost:8000'),
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
