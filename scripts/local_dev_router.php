<?php

declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$file = realpath(__DIR__ . '/../public' . $path);
$publicRoot = realpath(__DIR__ . '/../public');

if ($publicRoot !== false && $file !== false && strpos($file, $publicRoot) === 0 && is_file($file)) {
    return false;
}

if (shouldServeSpa($path)) {
    $index = $publicRoot ? $publicRoot . DIRECTORY_SEPARATOR . 'index.html' : false;

    if ($index && is_file($index)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($index);
        return;
    }
}

require __DIR__ . '/../public/index.php';

function shouldServeSpa(string $path): bool
{
    if ($path === '/' || $path === '') {
        return true;
    }

    if (strpos($path, '/api/') === 0 || $path === '/api') {
        return false;
    }

    if ($path === '/health') {
        return false;
    }

    if (strpos($path, '/storage/uploads/') === 0) {
        return false;
    }

    return ! preg_match('/\.[A-Za-z0-9]{1,8}$/', $path);
}
