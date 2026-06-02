<?php

declare(strict_types=1);

if (serveStorageUpload(dirname(__DIR__))) {
    return;
}

$app = require dirname(__DIR__) . '/bootstrap/app.php';
$app->run();

function serveStorageUpload(string $basePath): bool
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (! in_array($method, ['GET', 'HEAD'], true)) {
        return false;
    }

    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $prefix = '/storage/uploads/';
    if (strpos($path, $prefix) !== 0) {
        return false;
    }

    $relative = rawurldecode(substr($path, strlen($prefix)));
    $relative = str_replace('\\', '/', $relative);
    if ($relative === '' || strpos($relative, '..') !== false) {
        http_response_code(404);
        return true;
    }

    $root = realpath($basePath . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'uploads');
    $file = realpath($basePath . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative));
    if ($root === false || $file === false || strpos($file, $root . DIRECTORY_SEPARATOR) !== 0 || ! is_file($file)) {
        http_response_code(404);
        return true;
    }

    header('Content-Type: ' . (mime_content_type($file) ?: 'application/octet-stream'));
    header('Content-Length: ' . filesize($file));
    header('Cache-Control: public, max-age=604800');
    if ($method !== 'HEAD') {
        readfile($file);
    }

    return true;
}
