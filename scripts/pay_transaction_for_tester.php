<?php

declare(strict_types=1);

/**
 * Jembatan pembayaran khusus untuk SIATOM/public/tester.
 *
 * Kenapa ini perlu ada: Midtrans mengirim callback bertanda tangan
 * (sha512(order_id . status_code . gross_amount . server_key)) yang cuma bisa
 * dibuat server, bukan lewat klik di browser. `public/tester/uji_otomatis_browser.js`
 * bisa mengklik "Booking Sekarang" sampai transaksi berstatus pending_payment,
 * tapi tidak bisa melanjutkan sampai dp_paid tanpa callback sungguhan.
 *
 * Skrip ini mengambil ALIH BAGIAN PALING AKHIR SAJA: baca payment_session
 * (provider_order_id, gross_amount) milik transaction_id yang SUDAH DIBUAT
 * lewat browser, lalu kirim callback settlement bertanda tangan sah untuk
 * transaksi itu spesifik — persis logika di scripts/smoke_payment_flow.php,
 * tapi menyasar transaksi yang sudah ada, bukan membuat transaksi baru.
 *
 * TIDAK melakukan bypass autentikasi atau validasi apa pun di endpoint
 * callback; endpoint yang sama, signature yang sama-sama diverifikasi
 * hash_equals(), hanya server_key-nya dibaca dari .env server itu sendiri
 * (yang cuma bisa berjalan kalau skrip ini dijalankan di server itu).
 *
 * Cara pakai (lokal/staging saja):
 *   php scripts/pay_transaction_for_tester.php <transaction_id>
 *
 * Ditolak keras kalau APP_ENV=production.
 */

$app = require __DIR__ . '/../bootstrap/app.php';

/** @var PDO $pdo */
$pdo = $app->container()->make(PDO::class);

$appEnv = (string) config('app.env', 'local');
if ($appEnv === 'production') {
    fwrite(STDERR, "DITOLAK: skrip ini tidak boleh dijalankan saat APP_ENV=production.\n");
    exit(1);
}

$transactionId = (int) ($argv[1] ?? 0);
if ($transactionId <= 0) {
    fwrite(STDERR, "Pemakaian: php scripts/pay_transaction_for_tester.php <transaction_id>\n");
    exit(1);
}

$serverKey = (string) config('payment.midtrans.server_key', '');
if ($serverKey === '') {
    fwrite(STDERR, "GAGAL: MIDTRANS_SERVER_KEY belum diisi di .env.\n");
    exit(1);
}

$stmt = $pdo->prepare(
    'SELECT provider_order_id, gross_amount
     FROM transaction_payment_logs
     WHERE transaction_id = :transaction_id
       AND provider_order_id IS NOT NULL
     ORDER BY id DESC
     LIMIT 1'
);
$stmt->execute(['transaction_id' => $transactionId]);
$log = $stmt->fetch(PDO::FETCH_ASSOC);

if (! $log) {
    fwrite(STDERR, "GAGAL: tidak ada payment_session untuk transaction_id={$transactionId}. Pastikan transaksi sudah dibuat lewat POST /api/transactions lebih dulu.\n");
    exit(1);
}

$statusStmt = $pdo->prepare('SELECT transaction_status FROM transactions WHERE id = :id LIMIT 1');
$statusStmt->execute(['id' => $transactionId]);
$currentStatus = (string) ($statusStmt->fetchColumn() ?: '');

if ($currentStatus === '') {
    fwrite(STDERR, "GAGAL: transaction_id={$transactionId} tidak ditemukan.\n");
    exit(1);
}

if ($currentStatus !== 'pending_payment') {
    fwrite(STDERR, "DILEWATI: transaction_id={$transactionId} sudah berstatus '{$currentStatus}', bukan pending_payment. Tidak mengirim callback lagi.\n");
    exit($currentStatus === 'dp_paid' || $currentStatus === 'paid' ? 0 : 1);
}

$orderId = (string) $log['provider_order_id'];
$gross = number_format((float) $log['gross_amount'], 2, '.', '');

$payload = [
    'order_id' => $orderId,
    'transaction_id' => 'TESTER-SETTLEMENT-' . bin2hex(random_bytes(3)),
    'payment_type' => 'bank_transfer',
    'transaction_status' => 'settlement',
    'gross_amount' => $gross,
    'status_code' => '200',
    'signature_key' => hash('sha512', $orderId . '200' . $gross . $serverKey),
];

[$http, $response] = callInternal($app, 'POST', '/api/payments/midtrans/callbacks', $payload);

$statusStmt->execute(['id' => $transactionId]);
$finalStatus = (string) ($statusStmt->fetchColumn() ?: '');

echo "HTTP callback: {$http}\n";
echo 'Respons: ' . json_encode($response, JSON_UNESCAPED_SLASHES) . "\n";
echo "Status transaksi sekarang: {$finalStatus}\n";

exit($http === 200 && $finalStatus === 'dp_paid' ? 0 : 1);

/**
 * Panggilan HTTP in-process, sama seperti request() di
 * scripts/smoke_payment_flow.php — lewat kernel aplikasi langsung, tanpa
 * soket jaringan, supaya skrip ini tidak butuh server HTTP menyala terpisah.
 */
function callInternal($app, string $method, string $uri, array $body = []): array
{
    $parts = parse_url($uri);
    $path = $parts['path'] ?? '/';
    $query = [];
    if (isset($parts['query'])) {
        parse_str($parts['query'], $query);
    }

    $request = new App\Core\Request(
        $method,
        $uri,
        $path,
        $query,
        $body,
        ['content-type' => 'application/json'],
        [],
        [],
        json_encode($body, JSON_UNESCAPED_SLASHES) ?: ''
    );
    $response = $app->handle($request);
    $payload = json_decode($response->body(), true);

    return [$response->statusCode(), is_array($payload) ? $payload : null];
}
