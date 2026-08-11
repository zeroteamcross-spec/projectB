<?php

declare(strict_types=1);

return [
    // Domain untuk semua cookie autentikasi. Kosong berarti host-only: cookie
    // yang diterbitkan carlynk.id tidak akan terbawa ke admin.carlynk.id, dan
    // adminnya diminta login lagi di subdomain. Isi ".carlynk.id" supaya sesi
    // dibagi -- termasuk saat impersonation melempar admin dari subdomain ke
    // domain utama.
    'cookie_domain' => env('AUTH_COOKIE_DOMAIN', ''),

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
