<?php
/**
 * Bridge for Niagahoster shared hosting:
 *
 * public_html/index.php  ->  public_html/public/index.html
 * public_html/index.php  ->  public_html/public/index.php for /api/*
 *
 * Expected structure:
 *
 * public_html/
 * ├── index.php      <- this file
 * ├── .htaccess
 * └── public/
 *     ├── index.html
 *     ├── app.html
 *     ├── index.php
 *     └── assets/
 */

$publicRoot = __DIR__ . '/public';

if (!is_dir($publicRoot)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "ProjectB public folder not found.\n";
    echo "Expected: {$publicRoot}\n";
    exit;
}

$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$uriPath = rawurldecode($uriPath);
$relativePath = ltrim($uriPath, '/');

if (str_contains($relativePath, '..')) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Bad request.';
    exit;
}

/*
|--------------------------------------------------------------------------
| API/backend requests
|--------------------------------------------------------------------------
*/
if ($uriPath === '/api' || str_starts_with($uriPath, '/api/')) {
    $_SERVER['SCRIPT_FILENAME'] = $publicRoot . '/index.php';
    $_SERVER['SCRIPT_NAME'] = '/index.php';
    $_SERVER['PHP_SELF'] = '/index.php';

    chdir($publicRoot);
    require $publicRoot . '/index.php';
    exit;
}

/*
|--------------------------------------------------------------------------
| Protected storage/uploads route
|--------------------------------------------------------------------------
*/
if ($uriPath === '/storage/uploads' || str_starts_with($uriPath, '/storage/uploads/')) {
    $_SERVER['SCRIPT_FILENAME'] = $publicRoot . '/index.php';
    $_SERVER['SCRIPT_NAME'] = '/index.php';
    $_SERVER['PHP_SELF'] = '/index.php';

    chdir($publicRoot);
    require $publicRoot . '/index.php';
    exit;
}

/*
|--------------------------------------------------------------------------
| Serve static files from public_html/public.
|--------------------------------------------------------------------------
*/
$publicRootReal = realpath($publicRoot);
$staticFile = realpath($publicRoot . '/' . $relativePath);

if (
    $staticFile !== false
    && $publicRootReal !== false
    && str_starts_with($staticFile, $publicRootReal . DIRECTORY_SEPARATOR)
    && is_file($staticFile)
) {
    $ext = strtolower(pathinfo($staticFile, PATHINFO_EXTENSION));

    $mimeMap = [
        'html' => 'text/html; charset=utf-8',
        'css' => 'text/css; charset=utf-8',
        'js' => 'application/javascript; charset=utf-8',
        'mjs' => 'application/javascript; charset=utf-8',
        'json' => 'application/json; charset=utf-8',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml',
        'webp' => 'image/webp',
        'ico' => 'image/x-icon',
        'mp4' => 'video/mp4',
        'webm' => 'video/webm',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'map' => 'application/json; charset=utf-8',
    ];

    header('Content-Type: ' . ($mimeMap[$ext] ?? 'application/octet-stream'));
    header('Content-Length: ' . filesize($staticFile));
    header('Cache-Control: public, max-age=604800');

    readfile($staticFile);
    exit;
}

/*
|--------------------------------------------------------------------------
| SPA fallback
|--------------------------------------------------------------------------
| Hash fragments are not sent to the server.
| https://domain.com/#/seller reaches this script as "/".
*/
$indexHtml = $publicRoot . '/index.html';
$appHtml = $publicRoot . '/app.html';

if (is_file($indexHtml)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($indexHtml);
    exit;
}

if (is_file($appHtml)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($appHtml);
    exit;
}

http_response_code(500);
header('Content-Type: text/plain; charset=utf-8');
echo "ProjectB SPA entry not found.\n";
echo "Expected index.html or app.html in: {$publicRoot}\n";
