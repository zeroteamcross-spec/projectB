<?php
/**
 * ProjectB shared-hosting bridge for public_html/index.php
 *
 * Use case:
 * - Keep ProjectB structure unchanged.
 * - Domain document root stays at public_html.
 * - Real ProjectB public entry stays at projectB/public.
 *
 * Place this file at:
 *   public_html/index.php
 *
 * Expected structure:
 *   public_html/
 *   ├── index.php              <- this file
 *   ├── .htaccess              <- use provided rewrite file
 *   └── projectB/
 *       ├── app/
 *       ├── bootstrap/
 *       ├── config/
 *       ├── routes/
 *       └── public/
 *           ├── index.html
 *           ├── app.html
 *           ├── index.php
 *           └── assets/
 */

/*
|--------------------------------------------------------------------------
| Adjust this if your projectB folder has a different name/location.
|--------------------------------------------------------------------------
|
| Example alternatives:
|   __DIR__ . '/projectB'
|   dirname(__DIR__) . '/projectB'
|   '/home/USERNAME/projectB'
|
*/
$projectRoot = __DIR__ . '/projectB';
$publicRoot = $projectRoot . '/public';

if (!is_dir($publicRoot)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "ProjectB public folder not found.\n";
    echo "Expected: {$publicRoot}\n";
    echo "Edit \$projectRoot in public_html/index.php to match your server path.\n";
    exit;
}

$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$uriPath = rawurldecode($uriPath);

/*
|--------------------------------------------------------------------------
| Security: normalize path and prevent traversal.
|--------------------------------------------------------------------------
*/
$relativePath = ltrim($uriPath, '/');
if (str_contains($relativePath, '..')) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Bad request.';
    exit;
}

/*
|--------------------------------------------------------------------------
| API/backend requests should be handled by ProjectB public/index.php.
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
| Protected storage/upload route, if ProjectB handles it through PHP.
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
| Serve static files from projectB/public without moving the folder.
|--------------------------------------------------------------------------
*/
$staticFile = realpath($publicRoot . '/' . $relativePath);
$publicRootReal = realpath($publicRoot);

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
| Root and SPA hash routes.
|--------------------------------------------------------------------------
|
| Browser never sends hash fragments to the server, so:
|   https://domain.com/#/seller
| reaches the server as:
|   /
|
| Serve projectB/public/index.html.
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
//echo "ProjectB SPA entry not found. Expected index.html or app.html in: {$publicRoot}\n";
