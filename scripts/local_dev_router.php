<?php

declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$file = realpath(__DIR__ . '/../public' . $path);
$publicRoot = realpath(__DIR__ . '/../public');

if ($publicRoot !== false && $file !== false && strpos($file, $publicRoot) === 0 && is_file($file)) {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (! in_array($method, ['GET', 'HEAD'], true)) {
        return false;
    }

    $contentTypes = [
        'css' => 'text/css; charset=utf-8',
        'csv' => 'text/csv; charset=utf-8',
        'gif' => 'image/gif',
        'html' => 'text/html; charset=utf-8',
        'ico' => 'image/x-icon',
        'jpeg' => 'image/jpeg',
        'jpg' => 'image/jpeg',
        'js' => 'application/javascript; charset=utf-8',
        'json' => 'application/json; charset=utf-8',
        'map' => 'application/json; charset=utf-8',
        'png' => 'image/png',
        'svg' => 'image/svg+xml',
        'webp' => 'image/webp',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
    ];
    $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $contentType = $contentTypes[$extension] ?? (mime_content_type($file) ?: 'application/octet-stream');

    header('Content-Type: ' . $contentType);
    header('Content-Length: ' . filesize($file));
    if ($method !== 'HEAD') {
        readfile($file);
    }

    return true;
}

// Semua yang bukan berkas nyata diserahkan ke public/index.php, termasuk
// halaman HTML-nya. Router ini dulu membaca index.html mentah-mentah supaya
// cepat, tapi itu melewati substitusi placeholder di index.php -- __ASSET_VER__
// akan sampai ke peramban apa adanya dan tidak ada satu pun aset yang termuat.
// Perbedaan kecepatannya tidak sebanding dengan dev lokal yang berperilaku
// berbeda dari produksi.
require __DIR__ . '/../public/index.php';
