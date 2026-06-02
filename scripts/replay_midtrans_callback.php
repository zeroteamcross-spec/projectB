<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/helpers.php';

load_env(base_path('.env'));

$arguments = array_slice($argv, 1);

if ($arguments === [] || in_array($arguments[0], ['-h', '--help'], true)) {
    usage();
    exit($arguments === [] ? 1 : 0);
}

$jsonPath = array_shift($arguments);
$targetUrl = null;

foreach ($arguments as $argument) {
    if (strpos($argument, '--url=') === 0) {
        $targetUrl = substr($argument, strlen('--url='));
        continue;
    }

    fwrite(STDERR, 'Unknown option: ' . $argument . PHP_EOL);
    usage();
    exit(1);
}

assertLocalEnvironment();

$resolvedPath = resolveJsonPath((string) $jsonPath);
$body = file_get_contents($resolvedPath);

if ($body === false) {
    fwrite(STDERR, 'Unable to read callback JSON file: ' . $resolvedPath . PHP_EOL);
    exit(1);
}

$decoded = json_decode($body, true);

if (! is_array($decoded) || json_last_error() !== JSON_ERROR_NONE) {
    fwrite(STDERR, 'Callback file must contain a valid JSON object.' . PHP_EOL);
    exit(1);
}

$body = json_encode($decoded, JSON_UNESCAPED_SLASHES);

if ($body === false) {
    fwrite(STDERR, 'Unable to encode callback JSON payload.' . PHP_EOL);
    exit(1);
}

$targetUrl = $targetUrl ?: defaultCallbackUrl();
assertLocalUrl($targetUrl);

$response = postJson($targetUrl, $body);

echo 'POST ' . $targetUrl . PHP_EOL;
echo 'HTTP status: ' . $response['status'] . PHP_EOL;
echo 'Response body:' . PHP_EOL;
echo ($response['body'] === '' ? '[empty]' : $response['body']) . PHP_EOL;

exit($response['status'] >= 200 && $response['status'] < 300 ? 0 : 1);

function usage(): void
{
    echo 'Usage: php scripts/replay_midtrans_callback.php callback.json [--url=http://localhost:8000/api/payments/midtrans/callbacks]' . PHP_EOL;
}

function assertLocalEnvironment(): void
{
    $appEnv = strtolower((string) env('APP_ENV', 'local'));
    $allowed = ['local', 'dev', 'development', 'test', 'testing'];

    if (! in_array($appEnv, $allowed, true)) {
        fwrite(STDERR, 'This local callback replay tool refuses to run when APP_ENV=' . $appEnv . '.' . PHP_EOL);
        exit(1);
    }
}

function resolveJsonPath(string $path): string
{
    $candidates = [
        $path,
        getcwd() . DIRECTORY_SEPARATOR . $path,
        base_path($path),
    ];

    foreach ($candidates as $candidate) {
        if (is_file($candidate)) {
            $realPath = realpath($candidate);

            if ($realPath !== false) {
                return $realPath;
            }
        }
    }

    fwrite(STDERR, 'Callback JSON file not found: ' . $path . PHP_EOL);
    exit(1);
}

function defaultCallbackUrl(): string
{
    $callbackUrl = (string) env('MIDTRANS_CALLBACK_URL', '');

    if ($callbackUrl !== '') {
        return $callbackUrl;
    }

    return rtrim((string) env('APP_URL', 'http://localhost:8000'), '/') . '/api/payments/midtrans/callbacks';
}

function assertLocalUrl(string $url): void
{
    $host = strtolower((string) parse_url($url, PHP_URL_HOST));
    $allowedHosts = ['localhost', '127.0.0.1', '::1'];

    $isLocalHost = in_array($host, $allowedHosts, true)
        || endsWith($host, '.local')
        || endsWith($host, '.test');

    if (! $isLocalHost) {
        fwrite(STDERR, 'Refusing to replay callback to non-local host: ' . $host . PHP_EOL);
        exit(1);
    }
}

function endsWith(string $value, string $suffix): bool
{
    if ($suffix === '') {
        return true;
    }

    return substr($value, -strlen($suffix)) === $suffix;
}

/**
 * @return array{status:int, body:string}
 */
function postJson(string $url, string $body): array
{
    $headers = [
        'Accept: application/json',
        'Content-Type: application/json',
        'Content-Length: ' . strlen($body),
    ];

    if (function_exists('curl_init')) {
        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
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
            'method' => 'POST',
            'header' => implode("\r\n", $headers),
            'content' => $body,
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
