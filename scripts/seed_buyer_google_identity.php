<?php

declare(strict_types=1);

/**
 * Menyiapkan buyer uji yang identitasnya berasal dari Google.
 *
 * Kenapa ini bukan backdoor:
 * - Tidak ada endpoint baru, tidak ada perubahan pada kode autentikasi.
 * - Skrip ini hanya menulis baris data, persis seperti seeder lain.
 * - Buyer tetap login lewat jalur normal memakai email dan password.
 * - Sesi yang dihasilkan identik dengan sesi buyer Google sungguhan, karena
 *   memang lewat AuthService yang sama.
 *
 * Yang membedakannya dari buyer biasa hanyalah adanya baris di
 * `user_oauth_identities` dengan provider `google`, sehingga alur yang
 * membaca identitas OAuth tetap terpicu saat diuji.
 *
 * Menolak jalan bila APP_ENV = production.
 *
 * Pakai:
 *   php scripts/seed_buyer_google_identity.php
 */

require_once __DIR__ . '/../bootstrap/helpers.php';

load_env(base_path('.env'));

$appEnv = strtolower((string) env('APP_ENV', 'local'));

if ($appEnv === 'production') {
    fwrite(STDERR, "Ditolak: skrip ini tidak boleh dijalankan di production.\n");
    exit(1);
}

$email = 'buyer.google@projectb.test';
$password = 'DemoPass123!';
$namaLengkap = 'Buyer Google Uji';
$providerUserId = 'uji-google-buyer-0001';

$database = (string) env('DB_DATABASE', '');

if ($database === '') {
    fwrite(STDERR, "DB_DATABASE belum diisi di .env\n");
    exit(1);
}

$dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=%s',
    env('DB_HOST', '127.0.0.1'),
    env('DB_PORT', '3306'),
    $database,
    env('DB_CHARSET', 'utf8mb4')
);

$pdo = new PDO($dsn, (string) env('DB_USERNAME', ''), (string) env('DB_PASSWORD', ''), [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);
$pdo->exec('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');

$now = date('Y-m-d H:i:s');

$cari = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
$cari->execute(['email' => $email]);
$baris = $cari->fetch();

if ($baris) {
    $userId = (int) $baris['id'];
    $pdo->prepare(
        'UPDATE users
         SET password_hash = :password_hash,
             account_status = :account_status,
             is_approved = 1,
             deleted_at = NULL,
             updated_at = :updated_at
         WHERE id = :id'
    )->execute([
        'id' => $userId,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'account_status' => 'active',
        'updated_at' => $now,
    ]);
    echo "User sudah ada, disegarkan: #{$userId}\n";
} else {
    $pdo->prepare(
        'INSERT INTO users
            (role, name, phone_number, email, password_hash, address, account_status, is_approved, created_at)
         VALUES
            (:role, :name, :phone_number, :email, :password_hash, :address, :account_status, 1, :created_at)'
    )->execute([
        'role' => 'buyer',
        'name' => $namaLengkap,
        'phone_number' => '081200000001',
        'email' => $email,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'address' => 'Alamat uji buyer Google',
        'account_status' => 'active',
        'created_at' => $now,
    ]);
    $userId = (int) $pdo->lastInsertId();
    echo "User dibuat: #{$userId}\n";
}

$cariIdentitas = $pdo->prepare(
    'SELECT id FROM user_oauth_identities
     WHERE user_id = :user_id AND provider = :provider LIMIT 1'
);
$cariIdentitas->execute(['user_id' => $userId, 'provider' => 'google']);

if ($cariIdentitas->fetch()) {
    echo "Identitas Google sudah ada, dilewati.\n";
} else {
    $pdo->prepare(
        'INSERT INTO user_oauth_identities
            (user_id, provider, provider_user_id, provider_email, provider_name, avatar_url, created_at)
         VALUES
            (:user_id, :provider, :provider_user_id, :provider_email, :provider_name, NULL, :created_at)'
    )->execute([
        'user_id' => $userId,
        'provider' => 'google',
        'provider_user_id' => $providerUserId,
        'provider_email' => $email,
        'provider_name' => $namaLengkap,
        'created_at' => $now,
    ]);
    echo "Identitas Google ditautkan.\n";
}

echo "\nBuyer uji siap dipakai tester:\n";
echo "  email    : {$email}\n";
echo "  password : {$password}\n";
echo "  role     : buyer\n";
echo "  identitas: google / {$providerUserId}\n";
echo "\nLogin lewat jalur normal di #/auth. Sesinya identik dengan buyer Google sungguhan.\n";
