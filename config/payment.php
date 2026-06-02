<?php

declare(strict_types=1);

return [
    'default_provider' => env('PAYMENT_DEFAULT_PROVIDER', 'midtrans'),
    'midtrans' => [
        'server_key' => env('MIDTRANS_SERVER_KEY', ''),
        'client_key' => env('MIDTRANS_CLIENT_KEY', ''),
        'is_production' => env('MIDTRANS_IS_PRODUCTION', false),
        'is_sanitized' => env('MIDTRANS_IS_SANITIZED', true),
        'is_3ds' => env('MIDTRANS_IS_3DS', true),
        'callback_url' => env('MIDTRANS_CALLBACK_URL', env('APP_URL', 'http://localhost:8000') . '/api/payments/midtrans/callbacks'),
        'verify_signature' => env('MIDTRANS_VERIFY_SIGNATURE', true),
        'snap_base_url' => env('MIDTRANS_SNAP_BASE_URL', 'https://app.sandbox.midtrans.com'),
        'core_api_base_url' => env('MIDTRANS_CORE_API_BASE_URL', 'https://api.sandbox.midtrans.com'),
    ],
];
