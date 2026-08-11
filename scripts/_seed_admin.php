<?php

declare(strict_types=1);

/**
 * Helper sementara: membuat akun admin pertama di deployment yang databasenya
 * baru dibangun dan belum punya satu pun user.
 *
 * Passwordnya tidak pernah muncul di layar dan tidak pernah dikirim ke mana
 * pun. Kalau tidak diberikan lewat environment ADMIN_PASSWORD, script ini
 * membangkitkannya sendiri dengan random_bytes lalu menuliskannya ke satu
 * berkas milik root dengan izin 600. Yang tercetak hanya lokasi berkas itu.
 *
 * Dihapus begitu akunnya jadi.
 */

$app = require __DIR__ . '/../bootstrap/app.php';

/** @var PDO $pdo */
$pdo = $app->container()->make(PDO::class);

$email = getenv('ADMIN_EMAIL') ?: 'admin@carlynk.id';
$nama = getenv('ADMIN_NAME') ?: 'Administrator';
$berkasKredensial = getenv('ADMIN_CREDENTIALS_FILE') ?: '/root/carlynk-admin-credentials.txt';

// Menolak jalan kalau sudah ada admin. Script ini untuk membuat akun pertama,
// bukan untuk mengganti password akun yang sudah dipakai orang.
$sudahAda = (int) $pdo->query(
    "SELECT COUNT(*) FROM users WHERE role IN ('admin','super_admin') AND deleted_at IS NULL"
)->fetchColumn();

if ($sudahAda > 0) {
    fwrite(STDERR, sprintf(
        'Sudah ada %d akun admin. Script ini hanya untuk akun pertama; ganti password lewat aplikasi.' . PHP_EOL,
        $sudahAda
    ));
    exit(1);
}

$statement = $pdo->prepare('SELECT COUNT(*) FROM users WHERE email = :email');
$statement->execute(['email' => $email]);

if ((int) $statement->fetchColumn() > 0) {
    fwrite(STDERR, 'Email ' . $email . ' sudah dipakai.' . PHP_EOL);
    exit(1);
}

$password = (string) getenv('ADMIN_PASSWORD');
$dibangkitkan = false;

if ($password === '') {
    // 24 karakter dari alfabet yang aman diketik ulang: tanpa 0/O dan 1/l/I.
    $alfabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    $panjang = strlen($alfabet);
    $password = '';

    for ($i = 0; $i < 24; $i++) {
        $password .= $alfabet[random_int(0, $panjang - 1)];
    }

    $dibangkitkan = true;
}

$pdo->prepare(
    'INSERT INTO users (role, name, email, password_hash, account_status, is_approved, created_at)
     VALUES (:role, :name, :email, :password_hash, :account_status, 1, NOW())'
)->execute([
    'role' => 'super_admin',
    'name' => $nama,
    'email' => $email,
    'password_hash' => password_hash($password, PASSWORD_DEFAULT),
    'account_status' => 'active',
]);

$id = (int) $pdo->lastInsertId();

echo 'Akun super_admin dibuat. id=' . $id . ' email=' . $email . PHP_EOL;

if (! $dibangkitkan) {
    echo 'Password diambil dari ADMIN_PASSWORD.' . PHP_EOL;
    exit(0);
}

$isi = "carlynk.id - kredensial admin pertama\n"
    . "dibuat: " . date(DATE_ATOM) . "\n"
    . "email: " . $email . "\n"
    . "password: " . $password . "\n\n"
    . "Segera masuk ke https://admin.carlynk.id/ lalu ganti passwordnya,\n"
    . "dan hapus berkas ini setelahnya.\n";

$lama = umask(0077);
$berhasil = file_put_contents($berkasKredensial, $isi) !== false;
umask($lama);

if (! $berhasil) {
    fwrite(STDERR, 'Akun dibuat, tapi berkas kredensial gagal ditulis ke ' . $berkasKredensial . PHP_EOL);
    exit(1);
}

chmod($berkasKredensial, 0600);

echo 'Password dibangkitkan acak dan ditulis ke ' . $berkasKredensial . ' (izin 600).' . PHP_EOL;
echo 'Passwordnya sengaja tidak dicetak di sini.' . PHP_EOL;
