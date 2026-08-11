<?php

declare(strict_types=1);

/**
 * Helper sementara: membuktikan bahwa database kosong bisa dibangun penuh dari
 * scripts/sql saja.
 *
 * Persis kegagalan yang terjadi di carlynk.id, dijalankan di database sekali
 * pakai supaya ketahuan di sini dulu, bukan di server.
 */

$app = require __DIR__ . '/../bootstrap/app.php';

/** @var PDO $pdo */
$pdo = $app->container()->make(PDO::class);

$namaUji = 'projectb_uji_pasang_baru';

$pdo->exec('DROP DATABASE IF EXISTS `' . $namaUji . '`');
$pdo->exec('CREATE DATABASE `' . $namaUji . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$pdo->exec('USE `' . $namaUji . '`');

echo 'Database uji dibuat: ' . $namaUji . PHP_EOL;

$service = new App\Modules\Migration\Services\MigrationManagerService($pdo);
$hasil = $service->runPending();

$gagal = [];
foreach ($hasil as $baris) {
    if (($baris['status'] ?? '') === 'failed') {
        $gagal[] = ($baris['name'] ?? '?') . ': ' . ($baris['message'] ?? '?');
    }
}

$jumlahTabel = (int) $pdo->query(
    'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ' . $pdo->quote($namaUji)
)->fetchColumn();

printf('Migrasi dijalankan: %d berkas, %d gagal.%s', count($hasil), count($gagal), PHP_EOL);
printf('Tabel terbentuk: %d%s', $jumlahTabel, PHP_EOL);

foreach ($gagal as $pesan) {
    echo '  GAGAL ' . $pesan . PHP_EOL;
}

// Tabel yang harus ada supaya aplikasi bisa dipakai sama sekali.
foreach (['users', 'showrooms', 'cars', 'transactions', 'master_data'] as $wajib) {
    $ada = (int) $pdo->query(
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ' . $pdo->quote($namaUji)
        . ' AND table_name = ' . $pdo->quote($wajib)
    )->fetchColumn();

    echo ($ada > 0 ? '  ada    ' : '  HILANG ') . $wajib . PHP_EOL;
}

$pdo->exec('DROP DATABASE `' . $namaUji . '`');
echo 'Database uji dihapus.' . PHP_EOL;

exit($gagal === [] && $jumlahTabel > 0 ? 0 : 1);
