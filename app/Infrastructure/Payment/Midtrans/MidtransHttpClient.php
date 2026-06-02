<?php

declare(strict_types=1);

namespace App\Infrastructure\Payment\Midtrans;

use App\Core\Exceptions\HttpException;

class MidtransHttpClient
{
    private MidtransConfig $config;

    public function __construct(MidtransConfig $config)
    {
        $this->config = $config;
    }

    public function post(string $path, array $payload): array
    {
        $this->config->ensureUsable();
        $url = $this->config->coreApiBaseUrl() . '/' . ltrim($path, '/');
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $headers = [
            'Accept: application/json',
            'Content-Type: application/json',
            'Authorization: Basic ' . base64_encode($this->config->serverKey() . ':'),
        ];

        if (function_exists('curl_init')) {
            return $this->postWithCurl($url, $body, $headers);
        }

        return $this->postWithStream($url, $body, $headers);
    }

    private function postWithCurl(string $url, string $body, array $headers): array
    {
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
            throw new HttpException('Midtrans request failed: ' . $error, 502);
        }

        return $this->decodeResponse((string) $responseBody, $statusCode);
    }

    private function postWithStream(string $url, string $body, array $headers): array
    {
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
            throw new HttpException('Midtrans request failed.', 502);
        }

        return $this->decodeResponse((string) $responseBody, $statusCode);
    }

    private function decodeResponse(string $responseBody, int $statusCode): array
    {
        $decoded = json_decode($responseBody, true);

        if (! is_array($decoded)) {
            throw new HttpException('Midtrans returned invalid JSON.', 502);
        }

        if ($statusCode >= 400) {
            $message = $decoded['status_message'] ?? $decoded['message'] ?? 'Midtrans request failed.';
            throw new HttpException((string) $message, 502, [], [
                'provider_status_code' => $statusCode,
            ]);
        }

        return $decoded;
    }
}
