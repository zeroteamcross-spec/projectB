<?php

declare(strict_types=1);

if (serveStorageUpload(dirname(__DIR__))) {
    return;
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if (serveSpaShell(dirname(__DIR__), __DIR__, $path)) {
    return;
}

$app = require dirname(__DIR__) . '/bootstrap/app.php';
$app->run();

function serveSpaShell(string $basePath, string $publicPath, string $path): bool
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (! in_array($method, ['GET', 'HEAD'], true)) {
        return false;
    }

    if ($path === '/api' || strpos($path, '/api/') === 0 || $path === '/storage/uploads' || strpos($path, '/storage/uploads/') === 0) {
        return false;
    }

    $entry = $publicPath . DIRECTORY_SEPARATOR . 'index.html';
    if (! is_file($entry)) {
        $entry = $publicPath . DIRECTORY_SEPARATOR . 'app.html';
    }

    if (! is_file($entry)) {
        return false;
    }

    $html = file_get_contents($entry);
    if ($html === false) {
        return false;
    }

    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');

    if ($method !== 'HEAD') {
        $html = str_replace('__APP_SPLASH_MAX_WAIT_MS__', '1600', $html);
        echo injectPublicMetadata($html, loadPublicWebConfigMetadata($basePath));
    }

    return true;
}

function loadPublicWebConfigMetadata(string $basePath): array
{
    $defaults = [
        'app_name' => 'BeliMobil',
        'tagline' => 'Jual beli mobil terpercaya',
        'icon_url' => '',
    ];

    try {
        require_once $basePath . DIRECTORY_SEPARATOR . 'bootstrap' . DIRECTORY_SEPARATOR . 'helpers.php';
        load_env($basePath . DIRECTORY_SEPARATOR . '.env');

        $database = (string) env('DB_DATABASE', '');
        if ($database === '') {
            return $defaults;
        }

        $host = (string) env('DB_HOST', '127.0.0.1');
        $port = (string) env('DB_PORT', '3306');
        $socket = (string) env('DB_SOCKET', '');
        $charset = (string) env('DB_CHARSET', 'utf8mb4');
        $dsn = $socket !== ''
            ? "mysql:unix_socket={$socket};dbname={$database};charset={$charset}"
            : "mysql:host={$host};port={$port};dbname={$database};charset={$charset}";
        $pdo = new PDO($dsn, (string) env('DB_USERNAME', ''), (string) env('DB_PASSWORD', ''), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => (int) env('DB_TIMEOUT', 3),
        ]);

        $stmt = $pdo->prepare(
            'SELECT data_json
             FROM master_data
             WHERE master_key = :master_key
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['master_key' => 'design_studio.theme_config']);
        $row = $stmt->fetch();
        $theme = is_array($row) ? json_decode((string) ($row['data_json'] ?? ''), true) : null;
        $brand = is_array($theme) && is_array($theme['brand'] ?? null) ? $theme['brand'] : [];
        $iconUrl = trim((string) ($brand['iconUrl'] ?? $brand['logoMarkAsset'] ?? ''));

        return [
            'app_name' => trim((string) ($brand['appName'] ?? '')) ?: $defaults['app_name'],
            'tagline' => trim((string) ($brand['tagline'] ?? '')) ?: $defaults['tagline'],
            'icon_url' => isPublicShareableIconUrl($iconUrl) ? $iconUrl : '',
        ];
    } catch (Throwable $exception) {
        return $defaults;
    }
}

function injectPublicMetadata(string $html, array $metadata): string
{
    $appName = (string) ($metadata['app_name'] ?? 'BeliMobil');
    $tagline = (string) ($metadata['tagline'] ?? 'Jual beli mobil terpercaya');
    $iconUrl = (string) ($metadata['icon_url'] ?? '');
    $absoluteIconUrl = $iconUrl !== '' ? absolutePublicMetadataUrl($iconUrl) : '';

    $html = preg_replace('/<title>.*?<\/title>/is', '<title>' . htmlMetadataEscape($appName) . '</title>', $html, 1) ?? $html;
    foreach ([
        ['name', 'application-name', $appName],
        ['name', 'apple-mobile-web-app-title', $appName],
        ['name', 'description', $tagline],
        ['property', 'og:site_name', $appName],
        ['property', 'og:title', $appName],
        ['property', 'og:description', $tagline],
        ['name', 'twitter:title', $appName],
        ['name', 'twitter:description', $tagline],
    ] as [$attribute, $key, $content]) {
        $html = upsertPublicHtmlMeta($html, $attribute, $key, $content);
    }

    if ($absoluteIconUrl !== '') {
        $html = upsertPublicHtmlLink($html, 'icon', $iconUrl);
        $html = upsertPublicHtmlLink($html, 'shortcut icon', $iconUrl);
        $html = upsertPublicHtmlLink($html, 'apple-touch-icon', $iconUrl);
        $html = upsertPublicHtmlMeta($html, 'property', 'og:image', $absoluteIconUrl);
        $html = upsertPublicHtmlMeta($html, 'name', 'twitter:image', $absoluteIconUrl);
    }

    return $html;
}

function upsertPublicHtmlMeta(string $html, string $attribute, string $key, string $content): string
{
    $tag = '<meta ' . $attribute . '="' . htmlMetadataEscape($key) . '" content="' . htmlMetadataEscape($content) . '">';
    $pattern = '/<meta\s+' . preg_quote($attribute, '/') . '=["\']' . preg_quote($key, '/') . '["\'][^>]*>/i';

    return preg_match($pattern, $html) === 1
        ? (preg_replace($pattern, $tag, $html, 1) ?? $html)
        : (preg_replace('/<\/head>/i', '    ' . $tag . "\n  </head>", $html, 1) ?? $html);
}

function upsertPublicHtmlLink(string $html, string $rel, string $href): string
{
    $type = preg_match('/\.svg(?:[?#].*)?$/i', $href) === 1 ? 'image/svg+xml' : '';
    $tag = '<link rel="' . htmlMetadataEscape($rel) . '" href="' . htmlMetadataEscape($href) . '"' . ($type !== '' ? ' type="' . $type . '"' : '') . '>';
    $pattern = '/<link\s+rel=["\']' . preg_quote($rel, '/') . '["\'][^>]*>/i';

    return preg_match($pattern, $html) === 1
        ? (preg_replace($pattern, $tag, $html, 1) ?? $html)
        : (preg_replace('/<\/head>/i', '    ' . $tag . "\n  </head>", $html, 1) ?? $html);
}

function isPublicShareableIconUrl(string $url): bool
{
    if ($url === '' || strpos($url, 'brand.') === 0) {
        return false;
    }

    return preg_match('/^https?:\/\//i', $url) === 1
        || preg_match('/^\/(?!\/)[A-Za-z0-9._~!$&\'()*+,;=:@\/%-]+$/', $url) === 1;
}

function absolutePublicMetadataUrl(string $url): string
{
    if (preg_match('/^https?:\/\//i', $url) === 1) {
        return $url;
    }

    $scheme = (! empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    return $scheme . '://' . (string) ($_SERVER['HTTP_HOST'] ?? 'localhost') . $url;
}

function htmlMetadataEscape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

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
