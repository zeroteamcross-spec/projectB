<?php

declare(strict_types=1);

return [
    'remember_cookie' => [
        'name' => 'remember_me',
        'ttl_days' => 365,
        'session_ttl_hours' => 12,
        'secure' => env('AUTH_REMEMBER_SECURE', false),
        'same_site' => env('AUTH_REMEMBER_SAME_SITE', 'Lax'),
    ],
    'impersonation_cookie' => [
        'name' => 'admin_impersonation',
        'ttl_hours' => 4,
        'secure' => env('AUTH_REMEMBER_SECURE', false),
        'same_site' => env('AUTH_REMEMBER_SAME_SITE', 'Lax'),
    ],
];
