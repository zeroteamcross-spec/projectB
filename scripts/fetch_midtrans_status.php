<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/helpers.php';

load_env(base_path('.env'));

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Infrastructure\Payment\Midtrans\MidtransConfig;

$arguments = array_slice($argv, 1);

if ($arguments === [] || in_array($arguments[0], ['-h', '--help'], true)) {
    usage();
    exit($arguments === [] ? 1 : 0);
}

$orderId = array_shift($arguments);

foreach ($arguments as $argument) {
    fwrite(STDERR, 'Unknown option: ' . $argument . PHP_EOL);
    usage();
    exit(1);
}

assertLocalEnvironment();

if (! is_string($orderId) || trim($orderId) === '') {
    fwrite(STDERR, 'ORDER_ID is required.' . PHP_EOL);
    usage();
    exit(1);
}

$config = MidtransConfig::fromConfig();

assertSandboxConfig($config);

if ($config->serverKey() === '') {
    fwrite(STDERR, 'MIDTRANS_SERVER_KEY is required.' . PHP_EOL);
    exit(1);
}

$path = '/v2/' . rawurlencode(trim($orderId)) . '/status';
$url = $config->coreApiBaseUrl() . $path;
$response = getMidtransJson($url, $config->serverKey());

echo 'GET ' . $url . PHP_EOL;
echo 'HTTP status: ' . $response['status'] . PHP_EOL;
echo 'Response body:' . PHP_EOL;
echo ($response['body'] === '' ? '[empty]' : $response['body']) . PHP_EOL;

exit($response['status'] >= 200 && $response['status'] < 300 ? 0 : 1);

function usage(): void
{
    echo 'Usage: php scripts/fetch_midtrans_status.php ORDER_ID' . PHP_EOL;
}

function assertLocalEnvironment(): void
{
    $appEnv = strtolower((string) env('APP_ENV', 'local'));
    $allowed = ['local', 'dev', 'development', 'test', 'testing'];

    if (! in_array($appEnv, $allowed, true)) {
        fwrite(STDERR, 'This local Midtrans status tool refuses to run when APP_ENV=' . $appEnv . '.' . PHP_EOL);
        exit(1);
    }
}

function assertSandboxConfig(MidtransConfig $config): void
{
    if ($config->isProduction()) {
        fwrite(STDERR, 'Refusing to call Midtrans status API when MIDTRANS_IS_PRODUCTION=true.' . PHP_EOL);
        exit(1);
    }

    if (stripos($config->coreApiBaseUrl(), 'sandbox.midtrans.com') === false) {
        fwrite(STDERR, 'Refusing to call non-sandbox Midtrans Core API URL: ' . $config->coreApiBaseUrl() . PHP_EOL);
        exit(1);
    }
}

/**
 * @return array{status:int, body:string}
 */
function getMidtransJson(string $url, string $serverKey): array
{
    $headers = [
        'Accept: application/json',
        'Authorization: Basic ' . base64_encode($serverKey . ':'),
    ];

    if (function_exists('curl_init')) {
        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_HTTPGET => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
        ]);

        $responseBody = curl_exec($curl);
        $statusCode = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);

        if ($responseBody === false) {
            fwrite(STDERR, 'HTTP request failed: ' . $error . PHP_EOL);
            exit(1);
        }

        return ['status' => $statusCode, 'body' => (string) $responseBody];
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", $headers),
            'timeout' => 30,
            'ignore_errors' => true,
        ],
    ]);

    $responseBody = file_get_contents($url, false, $context);
    $statusCode = 0;

    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $matches)) {
        $statusCode = (int) $matches[1];
    }

    if ($responseBody === false) {
        fwrite(STDERR, 'HTTP request failed.' . PHP_EOL);
        exit(1);
    }

    return ['status' => $statusCode, 'body' => (string) $responseBody];
}
