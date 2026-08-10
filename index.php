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
$appSplashMaxWaitMs = 1600;

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

if (strpos($relativePath, '..') !== false) {
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
if ($uriPath === '/api' || strpos($uriPath, '/api/') === 0) {
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
if ($uriPath === '/storage/uploads' || strpos($uriPath, '/storage/uploads/') === 0) {
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
    && strpos($staticFile, $publicRootReal . DIRECTORY_SEPARATOR) === 0
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
        // Model 3D landing. Tanpa MIME ini GLTFLoader menolak berkasnya.
        'glb' => 'model/gltf-binary',
        'gltf' => 'model/gltf+json',
        'wasm' => 'application/wasm',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'map' => 'application/json; charset=utf-8',
    ];

    header('Content-Type: ' . ($mimeMap[$ext] ?? 'application/octet-stream'));
    sendStaticCacheHeaders($ext, basename($staticFile), $uriPath);

    // Without validators the browser cannot revalidate, so "no-cache" turns into
    // a full re-download of every asset on every page load.
    if (sendStaticValidators($staticFile, $ext, basename($staticFile))) {
        http_response_code(304);
        exit;
    }

    header('Content-Length: ' . filesize($staticFile));

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') {
        readfile($staticFile);
    }

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
    sendNoStoreHeaders();
    renderSpaEntry($indexHtml, $appSplashMaxWaitMs);
    exit;
}

if (is_file($appHtml)) {
    header('Content-Type: text/html; charset=utf-8');
    sendNoStoreHeaders();
    renderSpaEntry($appHtml, $appSplashMaxWaitMs);
    exit;
}

http_response_code(500);
header('Content-Type: text/plain; charset=utf-8');
echo "ProjectB SPA entry not found.\n";
echo "Expected index.html or app.html in: {$publicRoot}\n";

function sendStaticCacheHeaders(string $extension, string $filename, string $uriPath = ''): void
{
    if ($extension === 'html' || $filename === 'release-manifest.json') {
        sendNoStoreHeaders();
        return;
    }

    // Pustaka pihak ketiga dikunci versinya lewat path, misalnya
    // /assets/vendor/three/0.160.0/. Isinya tidak akan pernah berubah, jadi
    // tidak perlu divalidasi ulang; naik versi berarti path baru.
    if (isImmutableVendorPath($uriPath)) {
        header('Cache-Control: public, max-age=31536000, immutable');
        return;
    }

    if (in_array($extension, ['js', 'mjs', 'css', 'json', 'map'], true)) {
        header('Cache-Control: no-cache, must-revalidate');
        return;
    }

    header('Cache-Control: public, max-age=604800');
}

function isImmutableVendorPath(string $uriPath): bool
{
    return strpos($uriPath, '/assets/vendor/') === 0;
}

function sendNoStoreHeaders(): void
{
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
}

/**
 * Emits ETag/Last-Modified and reports whether the client's copy is still current.
 *
 * Returns true when the caller should answer 304 instead of sending a body.
 */
function sendStaticValidators(string $path, string $extension, string $filename): bool
{
    // no-store responses must not be stored, so there is nothing to revalidate.
    if ($extension === 'html' || $filename === 'release-manifest.json') {
        return false;
    }

    $modifiedAt = filemtime($path);
    $size = filesize($path);

    if ($modifiedAt === false || $size === false) {
        return false;
    }

    $etag = '"' . dechex($modifiedAt) . '-' . dechex($size) . '"';
    $lastModified = gmdate('D, d M Y H:i:s', $modifiedAt) . ' GMT';

    header('ETag: ' . $etag);
    header('Last-Modified: ' . $lastModified);

    $ifNoneMatch = trim((string) ($_SERVER['HTTP_IF_NONE_MATCH'] ?? ''));

    if ($ifNoneMatch !== '') {
        // A cache may send several entity tags, and may weaken them with W/.
        foreach (explode(',', $ifNoneMatch) as $candidate) {
            $candidate = trim($candidate);

            if ($candidate === '*' || ltrim($candidate, 'W/') === $etag) {
                return true;
            }
        }

        // An ETag was offered but did not match, so the body really changed.
        return false;
    }

    $ifModifiedSince = trim((string) ($_SERVER['HTTP_IF_MODIFIED_SINCE'] ?? ''));

    if ($ifModifiedSince !== '') {
        $since = strtotime($ifModifiedSince);

        return $since !== false && $modifiedAt <= $since;
    }

    return false;
}

function renderSpaEntry(string $path, int $appSplashMaxWaitMs): void
{
    $html = file_get_contents($path);

    if ($html === false) {
        http_response_code(500);
        echo "ProjectB SPA entry cannot be read.\n";
        return;
    }

    $html = str_replace('__APP_SPLASH_MAX_WAIT_MS__', (string) $appSplashMaxWaitMs, $html);
    echo injectRuntimeMetadata($html, loadWebConfigMetadata());
}

function loadWebConfigMetadata(): array
{
    $defaults = [
        'app_name' => 'BeliMobil',
        'tagline' => 'Jual beli mobil terpercaya',
        'icon_url' => '',
    ];

    try {
        require_once __DIR__ . '/bootstrap/helpers.php';
        load_env(__DIR__ . '/.env');

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
        if (! is_array($row)) {
            return $defaults;
        }

        $theme = json_decode((string) ($row['data_json'] ?? ''), true);
        if (! is_array($theme)) {
            return $defaults;
        }

        $brand = is_array($theme['brand'] ?? null) ? $theme['brand'] : [];
        $iconUrl = trim((string) ($brand['iconUrl'] ?? $brand['logoMarkAsset'] ?? ''));

        return [
            'app_name' => trim((string) ($brand['appName'] ?? '')) ?: $defaults['app_name'],
            'tagline' => trim((string) ($brand['tagline'] ?? '')) ?: $defaults['tagline'],
            'icon_url' => isShareableIconUrl($iconUrl) ? $iconUrl : '',
        ];
    } catch (Throwable $exception) {
        return $defaults;
    }
}

function injectRuntimeMetadata(string $html, array $metadata): string
{
    $appName = (string) ($metadata['app_name'] ?? 'BeliMobil');
    $tagline = (string) ($metadata['tagline'] ?? 'Jual beli mobil terpercaya');
    $iconUrl = (string) ($metadata['icon_url'] ?? '');
    $absoluteIconUrl = $iconUrl !== '' ? absolutePublicUrl($iconUrl) : '';

    $html = preg_replace(
        '/<title>.*?<\/title>/is',
        '<title>' . escapeHtml($appName) . '</title>',
        $html,
        1
    ) ?? $html;

    $replacements = [
        ['name', 'application-name', $appName],
        ['name', 'apple-mobile-web-app-title', $appName],
        ['name', 'description', $tagline],
        ['property', 'og:site_name', $appName],
        ['property', 'og:title', $appName],
        ['property', 'og:description', $tagline],
        ['name', 'twitter:title', $appName],
        ['name', 'twitter:description', $tagline],
    ];

    foreach ($replacements as [$attribute, $key, $content]) {
        $html = upsertHtmlMeta($html, $attribute, $key, $content);
    }

    if ($absoluteIconUrl !== '') {
        $html = upsertHtmlLink($html, 'icon', $iconUrl);
        $html = upsertHtmlLink($html, 'shortcut icon', $iconUrl);
        $html = upsertHtmlLink($html, 'apple-touch-icon', $iconUrl);
        $html = upsertHtmlMeta($html, 'property', 'og:image', $absoluteIconUrl);
        $html = upsertHtmlMeta($html, 'name', 'twitter:image', $absoluteIconUrl);
    }

    return $html;
}

function upsertHtmlMeta(string $html, string $attribute, string $key, string $content): string
{
    $tag = '<meta ' . $attribute . '="' . escapeHtml($key) . '" content="' . escapeHtml($content) . '">';
    $pattern = '/<meta\s+' . preg_quote($attribute, '/') . '=["\']' . preg_quote($key, '/') . '["\'][^>]*>/i';

    if (preg_match($pattern, $html) === 1) {
        return preg_replace($pattern, $tag, $html, 1) ?? $html;
    }

    return preg_replace('/<\/head>/i', '    ' . $tag . "\n  </head>", $html, 1) ?? $html;
}

function upsertHtmlLink(string $html, string $rel, string $href): string
{
    $type = iconMimeType($href);
    $tag = '<link rel="' . escapeHtml($rel) . '" href="' . escapeHtml($href) . '"' . ($type !== '' ? ' type="' . escapeHtml($type) . '"' : '') . '>';
    $pattern = '/<link\s+rel=["\']' . preg_quote($rel, '/') . '["\'][^>]*>/i';

    if (preg_match($pattern, $html) === 1) {
        return preg_replace($pattern, $tag, $html, 1) ?? $html;
    }

    return preg_replace('/<\/head>/i', '    ' . $tag . "\n  </head>", $html, 1) ?? $html;
}

function isShareableIconUrl(string $url): bool
{
    if ($url === '' || strpos($url, 'brand.') === 0) {
        return false;
    }

    return preg_match('/^https?:\/\//i', $url) === 1
        || preg_match('/^\/(?!\/)[A-Za-z0-9._~!$&\'()*+,;=:@\/%-]+$/', $url) === 1;
}

function absolutePublicUrl(string $url): string
{
    if (preg_match('/^https?:\/\//i', $url) === 1) {
        return $url;
    }

    $scheme = (! empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');

    return $scheme . '://' . $host . $url;
}

function iconMimeType(string $href): string
{
    if (preg_match('/\.svg(?:[?#].*)?$/i', $href) === 1) {
        return 'image/svg+xml';
    }
    if (preg_match('/\.png(?:[?#].*)?$/i', $href) === 1) {
        return 'image/png';
    }
    if (preg_match('/\.webp(?:[?#].*)?$/i', $href) === 1) {
        return 'image/webp';
    }

    return '';
}

function escapeHtml(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
