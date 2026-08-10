<?php
/**
 * Diagnosa cepat penyebab 408 di server.
 *
 * Pakai: upload file ini ke folder yang sama dengan index.php (root
 * public_html), lalu buka lewat browser atau jalankan:
 *   php diagnosa_408.php
 *
 * Batas waktu tiap tahap sengaja dibuat PENDEK (detik, bukan menit), supaya
 * skrip ini sendiri tidak ikut menggantung 408 — kalau satu tahap gagal,
 * langsung ketahuan tahap mana, bukan ikut macet menunggu.
 */

header('Content-Type: text/plain; charset=utf-8');
set_time_limit(30);

function langkah(string $nama, callable $fn): void
{
    $mulai = microtime(true);
    echo "== {$nama} ==\n";
    try {
        $fn();
        $ms = round((microtime(true) - $mulai) * 1000);
        echo "OK ({$ms} ms)\n\n";
    } catch (Throwable $e) {
        $ms = round((microtime(true) - $mulai) * 1000);
        echo "GAGAL setelah {$ms} ms: " . get_class($e) . ': ' . $e->getMessage() . "\n\n";
    }
}

echo "PHP version: " . PHP_VERSION . "\n";
echo "Waktu server: " . date('Y-m-d H:i:s') . "\n\n";

langkah('1. Baca .env', function () {
    $path = __DIR__ . '/.env';
    if (!is_file($path)) {
        throw new RuntimeException(".env tidak ditemukan di {$path}");
    }
    echo "Ukuran: " . filesize($path) . " byte\n";
});

$env = [];
langkah('2. Parse .env', function () use (&$env) {
    foreach (file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $baris) {
        if ($baris === '' || $baris[0] === '#' || strpos($baris, '=') === false) {
            continue;
        }
        [$k, $v] = explode('=', $baris, 2);
        $env[trim($k)] = trim(trim($v), "\"'");
    }
    $wajib = ['DB_HOST', 'DB_DATABASE', 'DB_USERNAME'];
    foreach ($wajib as $k) {
        echo "{$k} = " . ($env[$k] ?? '(KOSONG)') . "\n";
    }
    echo 'DB_PASSWORD = ' . (isset($env['DB_PASSWORD']) && $env['DB_PASSWORD'] !== '' ? '(terisi, ' . strlen($env['DB_PASSWORD']) . ' karakter)' : '(KOSONG)') . "\n";
    echo 'DB_PORT = ' . ($env['DB_PORT'] ?? '3306 (default)') . "\n";
});

langkah('3. Resolusi DNS/host database', function () use ($env) {
    $host = $env['DB_HOST'] ?? '127.0.0.1';
    if (filter_var($host, FILTER_VALIDATE_IP)) {
        echo "{$host} sudah berupa IP, lewati resolusi DNS.\n";
        return;
    }
    $ip = gethostbyname($host);
    if ($ip === $host) {
        throw new RuntimeException("Gagal resolve '{$host}' ke IP.");
    }
    echo "{$host} -> {$ip}\n";
});

langkah('4. Koneksi TCP mentah ke database (timeout 5 detik)', function () use ($env) {
    $host = $env['DB_HOST'] ?? '127.0.0.1';
    $port = (int) ($env['DB_PORT'] ?? 3306);
    $fp = @fsockopen($host, $port, $errno, $errstr, 5);
    if (!$fp) {
        throw new RuntimeException("fsockopen ke {$host}:{$port} gagal: [{$errno}] {$errstr}");
    }
    fclose($fp);
    echo "Port {$host}:{$port} terbuka dan menerima koneksi.\n";
});

langkah('5. Login PDO ke database (timeout paksa 5 detik)', function () use ($env) {
    $host = $env['DB_HOST'] ?? '127.0.0.1';
    $port = $env['DB_PORT'] ?? '3306';
    $db = $env['DB_DATABASE'] ?? '';
    $charset = $env['DB_CHARSET'] ?? 'utf8mb4';
    $dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";
    $pdo = new PDO($dsn, $env['DB_USERNAME'] ?? '', $env['DB_PASSWORD'] ?? '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 5,
    ]);
    $versi = $pdo->query('SELECT VERSION()')->fetchColumn();
    echo "Terhubung. Versi MySQL/MariaDB: {$versi}\n";
});

langkah('6. Cek tabel users bisa di-SELECT', function () use ($env) {
    $host = $env['DB_HOST'] ?? '127.0.0.1';
    $port = $env['DB_PORT'] ?? '3306';
    $db = $env['DB_DATABASE'] ?? '';
    $charset = $env['DB_CHARSET'] ?? 'utf8mb4';
    $dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";
    $pdo = new PDO($dsn, $env['DB_USERNAME'] ?? '', $env['DB_PASSWORD'] ?? '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 5,
    ]);
    $jumlah = $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    echo "Jumlah baris di users: {$jumlah}\n";
});

langkah('7. Cek proses lain yang sedang berjalan/lock di database', function () use ($env) {
    $host = $env['DB_HOST'] ?? '127.0.0.1';
    $port = $env['DB_PORT'] ?? '3306';
    $db = $env['DB_DATABASE'] ?? '';
    $charset = $env['DB_CHARSET'] ?? 'utf8mb4';
    $dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";
    $pdo = new PDO($dsn, $env['DB_USERNAME'] ?? '', $env['DB_PASSWORD'] ?? '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 5,
    ]);
    $rows = $pdo->query('SHOW FULL PROCESSLIST')->fetchAll(PDO::FETCH_ASSOC);
    echo 'Jumlah proses aktif: ' . count($rows) . "\n";
    foreach ($rows as $r) {
        $waktu = $r['Time'] ?? '?';
        $status = $r['State'] ?? '';
        $info = $r['Info'] ?? '';
        if ((int) $waktu > 3 || stripos($status, 'lock') !== false) {
            echo "  MENCURIGAKAN: id={$r['Id']} waktu={$waktu}s status='{$status}' query=" . substr((string) $info, 0, 120) . "\n";
        }
    }
});

echo "Selesai.\n";
