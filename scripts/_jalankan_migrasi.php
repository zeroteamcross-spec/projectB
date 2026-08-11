<?php

declare(strict_types=1);

/**
 * Helper sementara: menjalankan migrasi dari baris perintah.
 *
 * Aplikasi sudah punya runner-nya sendiri di MigrationManagerService, lengkap
 * dengan tabel schema_migrations dan pelacakan checksum. Yang belum ada cuma
 * cara memanggilnya tanpa login: rutenya ada di balik AuthenticatedUserMiddleware,
 * dan di database yang masih kosong tidak ada satu pun user untuk login.
 *
 * Jadi berkas ini hanya pembungkus tipis -- tidak menyalin logika apa pun --
 * dan dihapus begitu database berdiri.
 */

$app = require __DIR__ . '/../bootstrap/app.php';

/** @var PDO $pdo */
$pdo = $app->container()->make(PDO::class);
$service = new App\Modules\Migration\Services\MigrationManagerService($pdo);

$perintah = $argv[1] ?? 'status';

if ($perintah === 'status') {
    foreach ($service->status() as $baris) {
        printf("%-9s %s%s", $baris['status'], $baris['name'], PHP_EOL);
    }

    exit(0);
}

if ($perintah !== 'run') {
    fwrite(STDERR, 'Perintah: status | run' . PHP_EOL);
    exit(1);
}

$hasil = $service->runPending();
$gagal = 0;

foreach ($hasil as $baris) {
    $status = (string) ($baris['status'] ?? '?');
    printf("%-9s %s", $status, (string) ($baris['name'] ?? '?'));

    if ($status === 'failed') {
        $gagal++;
        printf("  -- %s", (string) ($baris['message'] ?? 'tidak diketahui'));
    }

    echo PHP_EOL;
}

printf('%sSelesai. %d berkas, %d gagal.%s', PHP_EOL, count($hasil), $gagal, PHP_EOL);

exit($gagal > 0 ? 1 : 0);
