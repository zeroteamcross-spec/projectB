<?php

declare(strict_types=1);

$allowedDomains = array_values(array_filter(array_map(
    static fn (string $domain): string => strtolower(trim($domain)),
    explode(',', (string) env('GOOGLE_ALLOWED_DOMAINS', ''))
)));

/**
 * Host mana yang boleh memulai login Google, dan sebagai peran apa.
 *
 * Dibangun dari ROLE_HOST_* yang sama dengan penjaga domain di frontend, bukan
 * ditulis tetap. Sebelumnya daftarnya dipatok ke empat host garasi-mobil.com,
 * jadi begitu aplikasi pindah ke carlynk.id host-nya tidak ada di daftar dan
 * contextForHost() menolak dengan "Domain login tidak diizinkan." -- tanpa
 * petunjuk bahwa yang salah adalah daftarnya, bukan akun Google-nya.
 *
 * Host utama masuk sebagai buyer: itu peran pengunjung umum yang mendaftar
 * sendiri. Marketing tetap google_enabled false, sejalan dengan
 * googleLoginService di frontend -- akunnya dibuat showroom, bukan mendaftar.
 */
$peranPerHost = [];

foreach ([
    'ROLE_HOST_DEFAULT' => 'buyer',
    'ROLE_HOST_BUYER' => 'buyer',
    'ROLE_HOST_ADMIN' => 'admin',
    'ROLE_HOST_SELLER' => 'seller',
    'ROLE_HOST_AFFILIATE' => 'affiliate_admin',
] as $kunci => $peran) {
    $host = strtolower(trim((string) env($kunci, '')));

    if ($host === '' || isset($peranPerHost[$host])) {
        continue;
    }

    $peranPerHost[$host] = [
        'role' => $peran,
        'google_enabled' => $peran !== 'affiliate_admin',
    ];
}

// Pemasangan yang belum menyetel ROLE_HOST_* sama sekali -- garasi-mobil.com
// termasuk -- tetap memakai daftar lamanya. Baris ini boleh dihapus begitu
// setiap pemasangan sudah punya ROLE_HOST_* di .env-nya.
if ($peranPerHost === []) {
    $peranPerHost = [
        'admin.garasi-mobil.com' => ['role' => 'admin', 'google_enabled' => true],
        'garasi-mobil.com' => ['role' => 'buyer', 'google_enabled' => true],
        'showroom.garasi-mobil.com' => ['role' => 'seller', 'google_enabled' => true],
        'marketing.garasi-mobil.com' => ['role' => 'affiliate_admin', 'google_enabled' => false],
    ];
}

return [
    'auth' => [
        'enabled' => env('GOOGLE_AUTH_ENABLED', false),
        'client_id' => env('GOOGLE_CLIENT_ID', ''),
        'client_secret' => env('GOOGLE_CLIENT_SECRET', ''),
        'redirect_uri' => env('GOOGLE_REDIRECT_URI', ''),
        'allowed_domains' => $allowedDomains,
        'hosts' => $peranPerHost,
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
