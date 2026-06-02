<?php

declare(strict_types=1);

//local
return [
    'default' => env('DB_CONNECTION', 'mysql'),
    'connections' => [
        'mysql' => [
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '3306'),
            'database' => env('DB_DATABASE', 'beli_mobil'),
            'username' => env('DB_USERNAME', 'root'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8mb4',
        ],
    ],
];

//server
//return [
//    'default' => env('DB_CONNECTION', 'mysql'),
//    'connections' => [
//        'mysql' => [
//            'host' => env('DB_HOST', 'https://garasi-mobil.com/'),
//            'port' => env('DB_PORT', '3306'),
//            'database' => env('DB_DATABASE', 'u321714661_jualbelimobil'),
//            'username' => env('DB_USERNAME', 'u321714661_jualbelimobil'),
//            'password' => env('DB_PASSWORD', 'jualBelimobil2025!'),
//            'charset' => 'utf8mb4',
//        ],
//    ],
//];
