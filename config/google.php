<?php

declare(strict_types=1);

$allowedDomains = array_values(array_filter(array_map(
    static fn (string $domain): string => strtolower(trim($domain)),
    explode(',', (string) env('GOOGLE_ALLOWED_DOMAINS', ''))
)));

return [
    'auth' => [
        'enabled' => env('GOOGLE_AUTH_ENABLED', false),
        'client_id' => env('GOOGLE_CLIENT_ID', ''),
        'client_secret' => env('GOOGLE_CLIENT_SECRET', ''),
        'redirect_uri' => env('GOOGLE_REDIRECT_URI', ''),
        'allowed_domains' => $allowedDomains,
        'hosts' => [
            'admin.garasi-mobil.com' => [
                'role' => 'admin',
                'google_enabled' => true,
            ],
            'garasi-mobil.com' => [
                'role' => 'buyer',
                'google_enabled' => true,
            ],
            'showroom.garasi-mobil.com' => [
                'role' => 'seller',
                'google_enabled' => true,
            ],
            'marketing.garasi-mobil.com' => [
                'role' => 'affiliate_admin',
                'google_enabled' => false,
            ],
        ],
        'state_cookie' => [
            'name' => 'google_oauth_state',
            'ttl_minutes' => 15,
            'secure' => env('AUTH_REMEMBER_SECURE', false),
            'same_site' => 'Lax',
        ],
        'completion_cookie' => [
            'name' => 'google_profile_completion',
            'ttl_minutes' => 60,
            'secure' => env('AUTH_REMEMBER_SECURE', false),
            'same_site' => 'Lax',
        ],
    ],
];
