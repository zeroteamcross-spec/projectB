<?php

declare(strict_types=1);

return [
    'credentials_page' => [
        'enabled' => filter_var(env('TESTER_CREDENTIALS_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
        'password_hash' => (string) env('TESTER_CREDENTIALS_PASSWORD_HASH', ''),
        'accounts_path' => (string) env(
            'TESTER_CREDENTIALS_ACCOUNTS_PATH',
            base_path('storage/tester/akun.json')
        ),
        'attempts_path' => base_path('storage/cache/tester-credentials-attempts'),
        'session_name' => 'carlynk_tester_gate',
        'session_ttl_seconds' => 1800,
        'session_max_seconds' => 7200,
        'max_attempts' => 5,
        'lockout_seconds' => 900,
    ],
];
