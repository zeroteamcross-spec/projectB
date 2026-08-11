<?php

declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$file = realpath(__DIR__ . '/../public' . $path);
$publicRoot = realpath(__DIR__ . '/../public');

if ($publicRoot !== false && $file !== false && strpos($file, $publicRoot) === 0 && is_file($file)) {
    return false;
}

// Semua yang bukan berkas nyata diserahkan ke public/index.php, termasuk
// halaman HTML-nya. Router ini dulu membaca index.html mentah-mentah supaya
// cepat, tapi itu melewati substitusi placeholder di index.php -- __ASSET_VER__
// akan sampai ke peramban apa adanya dan tidak ada satu pun aset yang termuat.
// Perbedaan kecepatannya tidak sebanding dengan dev lokal yang berperilaku
// berbeda dari produksi.
require __DIR__ . '/../public/index.php';
