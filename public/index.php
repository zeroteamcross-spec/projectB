<?php

declare(strict_types=1);

if (serveStorageUpload(dirname(__DIR__))) {
    return;
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if (serveVersionedAsset(__DIR__, $path)) {
    return;
}

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
        $theme = loadThemeConfig($basePath);
        $html = str_replace('__APP_SPLASH_MAX_WAIT_MS__', '1600', $html);
        $html = str_replace('__ASSET_VER__', assetVersionToken($publicPath), $html);
        $html = str_replace('__ROLE_HOSTS__', roleHostsJson(), $html);
        $html = str_replace('__THEME_CONFIG__', themeConfigJson($theme), $html);
        echo injectPublicMetadata($html, loadPublicWebConfigMetadata($theme));
    }

    return true;
}

/**
 * Peta host per peran untuk penjaga domain di frontend.
 *
 * Hanya entri yang benar-benar diisi yang diteruskan; sisanya dibuang supaya
 * peta kosong menghasilkan "{}" dan penjaganya diam.
 */
function roleHostsJson(): string
{
    // Shell HTML dilayani sebelum bootstrap/app.php dijalankan, jadi config()
    // belum tentu ada. Helper dan .env dimuat seperlunya di sini; keduanya
    // memakai penjaga sehingga aman kalau nanti dimuat lagi oleh bootstrap.
    if (! function_exists('config')) {
        require_once dirname(__DIR__) . '/bootstrap/helpers.php';
        load_env(base_path('.env'));
    }

    $hosts = (array) config('app.role_hosts', []);
    $bersih = [];

    foreach ($hosts as $peran => $host) {
        $host = strtolower(trim((string) $host));

        if ($host !== '') {
            $bersih[(string) $peran] = $host;
        }
    }

    $json = json_encode($bersih === [] ? (object) [] : $bersih, JSON_UNESCAPED_SLASHES);

    return $json === false ? '{}' : $json;
}

/**
 * Token versi untuk jalur aset.
 *
 * Diambil dari mtime terbaru seluruh isi public/assets. Deploy mengubah berkas,
 * mtime naik, token berubah, dan setiap URL modul ikut berubah -- tidak ada
 * langkah manual yang bisa terlupa. Dihitung hanya saat melayani HTML, yang
 * terjadi sekali per buka halaman, bukan pada ratusan permintaan asetnya.
 */
function assetVersionToken(string $publicPath): string
{
    $akar = $publicPath . DIRECTORY_SEPARATOR . 'assets';

    if (! is_dir($akar)) {
        return '0';
    }

    $terbaru = 0;
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($akar, FilesystemIterator::SKIP_DOTS)
    );

    foreach ($iterator as $item) {
        if (! $item->isFile()) {
            continue;
        }

        $waktu = (int) $item->getMTime();
        if ($waktu > $terbaru) {
            $terbaru = $waktu;
        }
    }

    return base_convert((string) $terbaru, 10, 36);
}

/**
 * Menyajikan /assets/v-<token>/<jalur> dari berkas asli di /assets/<jalur>.
 *
 * Token tidak diperiksa isinya dengan sengaja. Gunanya bukan keamanan,
 * melainkan membuat URL berubah setiap deploy; berkas yang dilayani selalu yang
 * ada di disk sekarang. Token lama tetap dijawab -- halaman yang sudah telanjur
 * terbuka di tab pengguna tidak mendadak rusak.
 *
 * Di produksi Nginx yang menangani jalur ini langsung dari disk. Fungsi ini
 * dipakai server PHP bawaan saat pengembangan, dan jadi jaring pengaman kalau
 * aturan rewrite belum terpasang.
 */
function serveVersionedAsset(string $publicPath, string $path): bool
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (! in_array($method, ['GET', 'HEAD'], true)) {
        return false;
    }

    if (preg_match('~^/assets/v-[^/]+/(.+)$~', $path, $cocok) !== 1) {
        return false;
    }

    $relatif = str_replace('\\', '/', rawurldecode($cocok[1]));
    if ($relatif === '' || strpos($relatif, '..') !== false) {
        http_response_code(404);
        return true;
    }

    $akar = realpath($publicPath . DIRECTORY_SEPARATOR . 'assets');
    $berkas = realpath($publicPath . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relatif));

    if ($akar === false || $berkas === false || strpos($berkas, $akar . DIRECTORY_SEPARATOR) !== 0 || ! is_file($berkas)) {
        http_response_code(404);
        return true;
    }

    header('Content-Type: ' . assetContentType($berkas));
    header('Content-Length: ' . filesize($berkas));
    // Setahun dan immutable: token di URL yang membatalkannya, bukan waktu.
    header('Cache-Control: public, max-age=31536000, immutable');

    if ($method !== 'HEAD') {
        readfile($berkas);
    }

    return true;
}

/**
 * mime_content_type() menebak .js sebagai text/plain, dan peramban menolak
 * mengeksekusi modul dengan tipe itu. Jadi ekstensi yang kita sajikan sendiri
 * dipetakan eksplisit.
 */
function assetContentType(string $berkas): string
{
    $peta = [
        'js' => 'application/javascript; charset=utf-8',
        'mjs' => 'application/javascript; charset=utf-8',
        'css' => 'text/css; charset=utf-8',
        'json' => 'application/json; charset=utf-8',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        'gif' => 'image/gif',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'map' => 'application/json; charset=utf-8',
    ];

    $ekstensi = strtolower(pathinfo($berkas, PATHINFO_EXTENSION));

    return $peta[$ekstensi] ?? (mime_content_type($berkas) ?: 'application/octet-stream');
}

/**
 * Baris tema dari Konfigurasi WEB, atau array kosong kalau tidak terbaca.
 *
 * Dibaca sekali per penyajian HTML, lalu dipakai dua kali: untuk metadata
 * <head> dan untuk menyuntikkan temanya sendiri ke halaman.
 *
 * Kegagalan apa pun -- .env belum ada, database mati, JSON rusak -- menghasilkan
 * array kosong, dan frontend memakai DEFAULT_THEME. Shell tetap tersaji.
 */
function loadThemeConfig(string $basePath): array
{
    try {
        require_once $basePath . DIRECTORY_SEPARATOR . 'bootstrap' . DIRECTORY_SEPARATOR . 'helpers.php';
        load_env($basePath . DIRECTORY_SEPARATOR . '.env');

        $database = (string) env('DB_DATABASE', '');
        if ($database === '') {
            return [];
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

        return is_array($theme) ? $theme : [];
    } catch (Throwable $exception) {
        return [];
    }
}

/**
 * Tema yang siap ditanam di dalam <script> pada shell.
 *
 * Sebelumnya halaman mengambilnya lewat <script src="/api/theme/...js">, dan
 * itu rapuh karena satu alasan yang tidak kelihatan dari kode PHP mana pun:
 * Nginx di server punya aturan yang mencocokkan akhiran .js, tidak menemukan
 * berkasnya di disk, lalu meneruskan ke PHP tanpa mengembalikan statusnya --
 * jadi responsnya benar tapi berstatus 404, dan peramban membatalkan skripnya.
 * Akibatnya seluruh tema diam-diam kembali ke bawaan: nama aplikasi, warna,
 * dan logo yang diunggah lewat Konfigurasi WEB semuanya tidak terpakai.
 *
 * Ditanam langsung, tidak ada permintaan kedua yang bisa gagal, dan halaman
 * hemat satu perjalanan bolak-balik. Endpoint lamanya dibiarkan hidup untuk
 * pemanggil lain.
 *
 * JSON_HEX_TAG penting: tanpa itu string berisi "</script>" akan menutup blok
 * skripnya lebih awal.
 */
function themeConfigJson(array $theme): string
{
    if ($theme === []) {
        return '{}';
    }

    $json = json_encode($theme, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE);

    return $json === false ? '{}' : $json;
}

function loadPublicWebConfigMetadata(array $theme): array
{
    $defaults = [
        'app_name' => 'BeliMobil',
        'tagline' => 'Jual beli mobil terpercaya',
        'icon_url' => '',
    ];

    $brand = is_array($theme['brand'] ?? null) ? $theme['brand'] : [];
    $iconUrl = trim((string) ($brand['iconUrl'] ?? $brand['logoMarkAsset'] ?? ''));

    return [
        'app_name' => trim((string) ($brand['appName'] ?? '')) ?: $defaults['app_name'],
        'tagline' => trim((string) ($brand['tagline'] ?? '')) ?: $defaults['tagline'],
        'icon_url' => isPublicShareableIconUrl($iconUrl) ? $iconUrl : '',
    ];
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
