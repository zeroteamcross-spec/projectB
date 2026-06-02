<?php
/**
 * Bridge public_html/index.php -> /home/u321714661/domains/garasi-mobil.com/public
 *
 * Pakai file ini jika struktur ProjectB TIDAK berada di:
 *   /home/u321714661/domains/garasi-mobil.com/public_html/projectB/public
 *
 * Tetapi SPA entry ProjectB berada di:
 *   /home/u321714661/domains/garasi-mobil.com/public/index.html
 *
 * Letakkan file ini di:
 *   /home/u321714661/domains/garasi-mobil.com/public_html/index.php
 */

$publicRoot = '/home/u321714661/domains/garasi-mobil.com/public';

if (!is_dir($publicRoot)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "ProjectB public folder not found.\n";
    echo "Expected: {$publicRoot}\n";
    echo "Edit \$publicRoot in public_html/index.php to match your server path.\n";
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
| Forward /api/... to the real ProjectB backend entry:
|   /home/u321714661/domains/garasi-mobil.com/public/index.php
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
| Protected storage/uploads route, if ProjectB handles this through PHP.
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
| Serve static files from the real public folder.
|--------------------------------------------------------------------------
| Examples:
|   /assets/js/app.js -> /home/.../public/assets/js/app.js
|   /assets/images/bg-vid.mp4 -> /home/.../public/assets/images/bg-vid.mp4
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
| Root and SPA fallback
|--------------------------------------------------------------------------
| Browser hash fragments are not sent to the server:
|   https://garasi-mobil.com/#/seller
| reaches PHP as "/".
|
| Serve real public/index.html.
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
