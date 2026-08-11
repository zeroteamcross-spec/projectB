<?php

declare(strict_types=1);

/**
 * Sekali jalan: menulis ulang logo yang sudah terlanjur tersimpan dengan
 * width/height persegi, lalu mengarahkan Konfigurasi WEB ke berkas barunya.
 *
 * Nama berkasnya sengaja baru, bukan menimpa yang lama. Berkas di
 * /uploads dilayani dengan Cache-Control max-age=604800, jadi menimpa isinya
 * tidak akan sampai ke peramban yang sudah menyimpannya selama seminggu ke
 * depan. URL baru langsung terpakai.
 *
 * Baris temanya dicadangkan lebih dulu ke berkas .json di samping skrip ini.
 */

$root = '/www/wwwroot/carlynk.id';

require_once $root . '/bootstrap/helpers.php';
load_env($root . '/.env');

$pdo = new PDO(
    sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', env('DB_HOST', '127.0.0.1'), env('DB_PORT', '3306'), env('DB_DATABASE', '')),
    (string) env('DB_USERNAME', ''),
    (string) env('DB_PASSWORD', ''),
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
);

$stmt = $pdo->prepare('SELECT id, data_json FROM master_data WHERE master_key = ? AND deleted_at IS NULL LIMIT 1');
$stmt->execute(['design_studio.theme_config']);
$row = $stmt->fetch();

if (! $row) {
    exit("Baris tema tidak ditemukan.\n");
}

file_put_contents(__DIR__ . '/cadangan-tema.json', $row['data_json']);
echo "Cadangan baris tema ditulis.\n";

$theme = json_decode((string) $row['data_json'], true);
$lama = (string) ($theme['brand']['iconUrl'] ?? '');

if ($lama === '') {
    exit("brand.iconUrl kosong, tidak ada yang diperbaiki.\n");
}

$berkasLama = $root . '/public' . $lama;
if (! is_file($berkasLama)) {
    exit("Berkas tidak ada: {$berkasLama}\n");
}

$svg = (string) file_get_contents($berkasLama);
$tagLama = (string) (preg_match('/<svg[^>]*>/i', $svg, $m) ? $m[0] : '');

// Buang width dan height dari tag <svg> saja. viewBox dibiarkan -- itu yang
// menentukan rasio sebenarnya.
$svgBaru = preg_replace_callback(
    '/<svg\b([^>]*)>/i',
    static fn (array $cocok): string => '<svg' . preg_replace('/\s(width|height)\s*=\s*"[^"]*"/i', '', $cocok[1]) . '>',
    $svg,
    1
);

if (! is_string($svgBaru) || $svgBaru === $svg) {
    exit("Tag <svg> tidak berubah, dihentikan.\n{$tagLama}\n");
}

$namaBaru = 'app-icon-' . bin2hex(random_bytes(10)) . '.svg';
$jalurBaru = '/uploads/master/apps/' . $namaBaru;
file_put_contents($root . '/public' . $jalurBaru, $svgBaru);
chmod($root . '/public' . $jalurBaru, 0644);

$theme['brand']['iconUrl'] = $jalurBaru;
$theme['brand']['logoMarkAsset'] = $jalurBaru;

$update = $pdo->prepare('UPDATE master_data SET data_json = :data, updated_at = NOW() WHERE id = :id');
$update->execute(['data' => json_encode($theme, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), 'id' => $row['id']]);

echo "Lama : {$lama}\n";
echo "Baru : {$jalurBaru}\n";
echo "Tag  : " . (preg_match('/<svg[^>]*>/i', $svgBaru, $m2) ? substr(preg_replace('/\s+/', ' ', $m2[0]), 0, 160) : '?') . "\n";
