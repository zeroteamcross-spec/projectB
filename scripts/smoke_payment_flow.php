<?php

declare(strict_types=1);

$app = require __DIR__ . '/../bootstrap/app.php';

/** @var PDO $pdo */
$pdo = $app->container()->make(PDO::class);

$results = [];
$createdTransactionIds = [];

$buyerCookie = login($app, 'buyer@projectb.local', 'SmokePass123!');

if ($buyerCookie === null) {
    addResult($results, 'AUTH', 'Buyer smoke login', 'BLOCKED', 'buyer@projectb.local cannot login with smoke password.');
    output($results);
    exit(1);
}

$serverKey = (string) config('payment.midtrans.server_key', '');
$verifySignature = (bool) config('payment.midtrans.verify_signature', true);

if ($serverKey === '') {
    foreach (['ST-070', 'ST-071', 'ST-072', 'ST-073', 'ST-074', 'ST-080', 'ST-081', 'ST-082', 'ST-083', 'ST-084', 'ST-085', 'ST-090', 'ST-092'] as $id) {
        addResult($results, $id, $id, 'BLOCKED', 'MIDTRANS_SERVER_KEY is not configured.');
    }

    output($results);
    exit(0);
}

$dp = createTransaction($app, $buyerCookie, 'dp');
if ($dp['ok']) {
    $createdTransactionIds[] = $dp['transaction']['id'];
    addResult($results, 'ST-070', 'Create transaction DP', 'PASS', 'Transaction id ' . $dp['transaction']['id']);
    addResult($results, 'ST-080', 'Create initial payment session', paymentSessionExists($dp) ? 'PASS' : 'FAIL', paymentSessionExists($dp) ? 'Initial payment session created.' : 'Payment session missing from response.');
} else {
    addResult($results, 'ST-070', 'Create transaction DP', $dp['blocked'] ? 'BLOCKED' : 'FAIL', $dp['message'], $dp['http']);
    addResult($results, 'ST-080', 'Create initial payment session', $dp['blocked'] ? 'BLOCKED' : 'FAIL', $dp['message'], $dp['http']);
}

$full = createTransaction($app, $buyerCookie, 'full');
if ($full['ok']) {
    $createdTransactionIds[] = $full['transaction']['id'];
    addResult($results, 'ST-071', 'Create transaction full payment', 'PASS', 'Transaction id ' . $full['transaction']['id']);
} else {
    addResult($results, 'ST-071', 'Create transaction full payment', $full['blocked'] ? 'BLOCKED' : 'FAIL', $full['message'], $full['http']);
}

[$http, $payload] = request($app, 'GET', '/api/transactions', [], $buyerCookie);
addResult(
    $results,
    'ST-072',
    'List my transactions',
    $http === 200 && isset($payload['data']['transactions']) ? 'PASS' : 'FAIL',
    'HTTP ' . $http,
    $http
);

if ($dp['ok']) {
    [$http, $payload] = request($app, 'GET', '/api/transactions/' . $dp['transaction']['id'], [], $buyerCookie);
    addResult(
        $results,
        'ST-073',
        'Transaction detail',
        $http === 200 && isset($payload['data']['transaction']) ? 'PASS' : 'FAIL',
        'HTTP ' . $http,
        $http
    );
}

if ($dp['ok']) {
    [$http, $payload] = request($app, 'POST', '/api/transactions/' . $dp['transaction']['id'] . '/complete-payment', [
        'payment_method' => 'bca_va',
    ], $buyerCookie);
    addResult(
        $results,
        'ST-074',
        'Complete payment / pelunasan',
        $http === 200 && isset($payload['data']['transaction']['payment_session']) ? 'PASS' : 'FAIL',
        $payload['message'] ?? ('HTTP ' . $http),
        $http
    );
}

$pendingTx = createTransaction($app, $buyerCookie, 'dp');
if ($pendingTx['ok']) {
    $createdTransactionIds[] = $pendingTx['transaction']['id'];
    $callback = callback($app, $pendingTx, 'pending', '201', $serverKey);
    $status = transactionStatus($app, $buyerCookie, $pendingTx['transaction']['id']);
    addResult(
        $results,
        'ST-081',
        'Callback pending',
        $callback['http'] === 200 && $status === 'pending_payment' ? 'PASS' : 'FAIL',
        'callback HTTP ' . $callback['http'] . ', transaction_status=' . ($status ?? 'null'),
        $callback['http']
    );
} else {
    addResult($results, 'ST-081', 'Callback pending', $pendingTx['blocked'] ? 'BLOCKED' : 'FAIL', $pendingTx['message'], $pendingTx['http']);
}

$settleTx = createTransaction($app, $buyerCookie, 'dp');
if ($settleTx['ok']) {
    $createdTransactionIds[] = $settleTx['transaction']['id'];
    $callback = callback($app, $settleTx, 'settlement', '200', $serverKey);
    $status = transactionStatus($app, $buyerCookie, $settleTx['transaction']['id']);
    addResult(
        $results,
        'ST-082',
        'Callback settlement/capture',
        $callback['http'] === 200 && $status === 'dp_paid' ? 'PASS' : 'FAIL',
        'callback HTTP ' . $callback['http'] . ', transaction_status=' . ($status ?? 'null'),
        $callback['http']
    );
} else {
    addResult($results, 'ST-082', 'Callback settlement/capture', $settleTx['blocked'] ? 'BLOCKED' : 'FAIL', $settleTx['message'], $settleTx['http']);
}

$expireTx = createTransaction($app, $buyerCookie, 'dp');
if ($expireTx['ok']) {
    $createdTransactionIds[] = $expireTx['transaction']['id'];
    $callback = callback($app, $expireTx, 'expire', '202', $serverKey);
    $status = transactionStatus($app, $buyerCookie, $expireTx['transaction']['id']);
    addResult(
        $results,
        'ST-083',
        'Callback expire',
        $callback['http'] === 200 && $status === 'expired' ? 'PASS' : 'FAIL',
        'callback HTTP ' . $callback['http'] . ', transaction_status=' . ($status ?? 'null'),
        $callback['http']
    );
} else {
    addResult($results, 'ST-083', 'Callback expire', $expireTx['blocked'] ? 'BLOCKED' : 'FAIL', $expireTx['message'], $expireTx['http']);
}

$cancelTx = createTransaction($app, $buyerCookie, 'dp');
if ($cancelTx['ok']) {
    $createdTransactionIds[] = $cancelTx['transaction']['id'];
    $callback = callback($app, $cancelTx, 'cancel', '202', $serverKey);
    $status = transactionStatus($app, $buyerCookie, $cancelTx['transaction']['id']);
    addResult(
        $results,
        'ST-084',
        'Callback cancel/deny/failure',
        $callback['http'] === 200 && $status === 'cancelled' ? 'PASS' : 'FAIL',
        'callback HTTP ' . $callback['http'] . ', transaction_status=' . ($status ?? 'null'),
        $callback['http']
    );
} else {
    addResult($results, 'ST-084', 'Callback cancel/deny/failure', $cancelTx['blocked'] ? 'BLOCKED' : 'FAIL', $cancelTx['message'], $cancelTx['http']);
}

if ($settleTx['ok']) {
    [$http, $payload] = request($app, 'POST', '/api/transactions/' . $settleTx['transaction']['id'] . '/complete-payment', [
        'payment_method' => 'bca_va',
    ], $buyerCookie);
    $completionOrderId = $payload['data']['transaction']['payment_session']['provider_order_id'] ?? null;
    $completionAmount = (int) ($payload['data']['transaction']['payment_session']['gross_amount'] ?? 0);

    if ($http === 200 && is_string($completionOrderId) && $completionAmount > 0) {
        $callback = callbackOrder($app, $completionOrderId, $completionAmount, 'settlement', '200', $serverKey);
        $status = transactionStatus($app, $buyerCookie, $settleTx['transaction']['id']);
        addResult(
            $results,
            'ST-085',
            'Completion payment sandbox',
            $callback['http'] === 200 && $status === 'paid' ? 'PASS' : 'FAIL',
            'callback HTTP ' . $callback['http'] . ', transaction_status=' . ($status ?? 'null'),
            $callback['http']
        );
    } else {
        addResult($results, 'ST-085', 'Completion payment sandbox', 'FAIL', $payload['message'] ?? ('HTTP ' . $http), $http);
    }
} else {
    addResult($results, 'ST-085', 'Completion payment sandbox', 'BLOCKED', 'Settlement transaction was not created.');
}

$logAudit = auditPaymentLogs($pdo, $createdTransactionIds);
addResult(
    $results,
    'ST-090',
    'Payment logs recorded',
    $logAudit['ok'] ? 'PASS' : 'FAIL',
    $logAudit['message']
);

addResult(
    $results,
    'ST-091',
    'Soft delete image then purge',
    'N/A',
    'Outside payment sandbox scope and no 30-day eligible soft-deleted image fixture was prepared.'
);

$invalidCallback = invalidSignatureProbe($app, $dp['ok'] ? $dp : $pendingTx, $serverKey);
addResult(
    $results,
    'ST-092',
    'Error path payment creation/callback',
    $invalidCallback['http'] === 401 ? 'PASS' : 'FAIL',
    'Invalid signature callback returned HTTP ' . $invalidCallback['http'] . '.',
    $invalidCallback['http']
);

addResult(
    $results,
    'AUDIT',
    'Callback signature verification',
    $verifySignature && $invalidCallback['http'] === 401 ? 'PASS' : 'FAIL',
    'MIDTRANS_VERIFY_SIGNATURE=' . ($verifySignature ? 'true' : 'false') . '.'
);

output($results);

function createTransaction($app, string $buyerCookie, string $paymentType): array
{
    $body = [
        'car_id' => 2,
        'payment_type' => $paymentType,
        'payment_method' => 'bca_va',
    ];

    if ($paymentType === 'dp') {
        $body['dp_amount'] = 50000000;
    }

    [$http, $payload] = request($app, 'POST', '/api/transactions', $body, $buyerCookie);
    $transaction = $payload['data']['transaction'] ?? null;
    $message = $payload['message'] ?? ('HTTP ' . $http);
    $blocked = $http >= 500 || stripos((string) $message, 'midtrans') !== false || stripos((string) $message, 'provider') !== false;

    return [
        'ok' => $http === 201 && is_array($transaction),
        'blocked' => $blocked,
        'http' => $http,
        'message' => $message,
        'transaction' => $transaction,
    ];
}

function paymentSessionExists(array $result): bool
{
    return isset($result['transaction']['payment_session']['provider_order_id'])
        && isset($result['transaction']['payment_session']['payment_method'])
        && isset($result['transaction']['payment_session']['gross_amount']);
}

function callback($app, array $transactionResult, string $status, string $statusCode, string $serverKey): array
{
    $session = $transactionResult['transaction']['payment_session'];

    return callbackOrder(
        $app,
        (string) $session['provider_order_id'],
        (int) $session['gross_amount'],
        $status,
        $statusCode,
        $serverKey
    );
}

function callbackOrder($app, string $orderId, int $grossAmount, string $status, string $statusCode, string $serverKey): array
{
    $gross = number_format($grossAmount, 2, '.', '');
    $payload = [
        'order_id' => $orderId,
        'transaction_id' => 'SMOKE-' . strtoupper($status) . '-' . bin2hex(random_bytes(2)),
        'payment_type' => 'bank_transfer',
        'transaction_status' => $status,
        'gross_amount' => $gross,
        'status_code' => $statusCode,
        'signature_key' => signature($orderId, $statusCode, $gross, $serverKey),
    ];

    [$http, $response] = request($app, 'POST', '/api/payments/midtrans/callbacks', $payload);

    return [
        'http' => $http,
        'payload' => $response,
    ];
}

function invalidSignatureProbe($app, array $transactionResult, string $serverKey): array
{
    if (! ($transactionResult['ok'] ?? false)) {
        return ['http' => 0, 'payload' => null];
    }

    $session = $transactionResult['transaction']['payment_session'];
    $gross = number_format((int) $session['gross_amount'], 2, '.', '');
    $payload = [
        'order_id' => (string) $session['provider_order_id'],
        'transaction_id' => 'SMOKE-BAD-SIGNATURE',
        'payment_type' => 'bank_transfer',
        'transaction_status' => 'settlement',
        'gross_amount' => $gross,
        'status_code' => '200',
        'signature_key' => str_repeat('0', 128),
    ];

    [$http, $response] = request($app, 'POST', '/api/payments/midtrans/callbacks', $payload);

    return [
        'http' => $http,
        'payload' => $response,
    ];
}

function transactionStatus($app, string $buyerCookie, int $transactionId): ?string
{
    [$http, $payload] = request($app, 'GET', '/api/transactions/' . $transactionId . '/status', [], $buyerCookie);

    if ($http !== 200) {
        return null;
    }

    return $payload['data']['transaction']['transaction_status'] ?? null;
}

function auditPaymentLogs(PDO $pdo, array $transactionIds): array
{
    $ids = array_values(array_unique(array_filter($transactionIds)));

    if ($ids === []) {
        return [
            'ok' => false,
            'message' => 'No transaction ids were available for log audit.',
        ];
    }

    $placeholders = implode(', ', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS total,
                SUM(CASE WHEN payload_request_json IS NOT NULL THEN 1 ELSE 0 END) AS request_logs,
                SUM(CASE WHEN payload_response_json IS NOT NULL THEN 1 ELSE 0 END) AS response_logs,
                SUM(CASE WHEN payload_callback_json IS NOT NULL THEN 1 ELSE 0 END) AS callback_logs
         FROM transaction_payment_logs
         WHERE transaction_id IN (' . $placeholders . ')'
    );
    $stmt->execute($ids);
    $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $total = (int) ($row['total'] ?? 0);
    $requestLogs = (int) ($row['request_logs'] ?? 0);
    $responseLogs = (int) ($row['response_logs'] ?? 0);
    $callbackLogs = (int) ($row['callback_logs'] ?? 0);

    return [
        'ok' => $total > 0 && $requestLogs > 0 && $responseLogs > 0 && $callbackLogs > 0,
        'message' => 'logs=' . $total . ', request_logs=' . $requestLogs . ', response_logs=' . $responseLogs . ', callback_logs=' . $callbackLogs,
    ];
}

function login($app, string $email, string $password): ?string
{
    [$http, , $headers] = request($app, 'POST', '/api/auth/login', [
        'email' => $email,
        'password' => $password,
        'remember' => true,
    ]);

    if ($http !== 200) {
        return null;
    }

    $cookie = $headers['Set-Cookie'] ?? null;

    if (! is_string($cookie) || $cookie === '') {
        return null;
    }

    $first = explode(';', $cookie, 2)[0];
    $parts = explode('=', $first, 2);

    return isset($parts[1]) ? rawurldecode($parts[1]) : null;
}

function request($app, string $method, string $uri, array $body = [], ?string $cookie = null): array
{
    $parts = parse_url($uri);
    $path = $parts['path'] ?? '/';
    $query = [];

    if (isset($parts['query'])) {
        parse_str($parts['query'], $query);
    }

    $cookies = [];

    if ($cookie !== null) {
        $cookies['remember_me'] = $cookie;
    }

    $request = new App\Core\Request(
        $method,
        $uri,
        $path,
        $query,
        $body,
        ['content-type' => 'application/json'],
        [],
        $cookies,
        json_encode($body, JSON_UNESCAPED_SLASHES) ?: ''
    );
    $response = $app->handle($request);
    $payload = json_decode($response->body(), true);

    return [
        $response->statusCode(),
        is_array($payload) ? $payload : null,
        $response->headers(),
    ];
}

function signature(string $orderId, string $statusCode, string $grossAmount, string $serverKey): string
{
    return hash('sha512', $orderId . $statusCode . $grossAmount . $serverKey);
}

function addResult(array &$results, string $id, string $testCase, string $result, string $notes, ?int $http = null): void
{
    $results[] = [
        'id' => $id,
        'test_case' => $testCase,
        'result' => $result,
        'http' => $http,
        'notes' => $notes,
    ];
}

function output(array $results): void
{
    echo json_encode([
        'success' => true,
        'message' => 'Payment smoke flow completed.',
        'data' => [
            'results' => $results,
        ],
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
}
