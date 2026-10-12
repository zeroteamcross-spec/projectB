<?php

declare(strict_types=1);

namespace App\Modules\Showrooms\Services;

use Throwable;

/**
 * Pemeriksaan status registrasi domain melalui RDAP publik.
 *
 * Endpoint provider sengaja dipatok di backend. Domain dari user hanya boleh
 * menjadi satu segmen path setelah dinormalisasi oleh ShowroomService; user
 * tidak pernah dapat menentukan URL tujuan HTTP sehingga endpoint ini tidak
 * berubah menjadi proxy/SSRF terbuka.
 */
final class CustomDomainRdapService
{
    private const CACHE_TTL_SECONDS = 30;

    /**
     * Endpoint resmi yang digunakan untuk TLD yang saat ini didukung.
     * `.co.id`, `.web.id`, dan turunan `.id` lain tetap memakai registry PANDI
     * karena label TLD terakhirnya adalah `id`.
     */
    private const RDAP_ENDPOINTS = [
        'id' => 'https://rdap.pandi.id/rdap',
        'com' => 'https://rdap.verisign.com/com/v1',
        'net' => 'https://rdap.verisign.com/net/v1',
    ];

    /** @var array<string, array{expires_at:int, result:array<string, mixed>}> */
    private static array $cache = [];

    /** @var callable(string): array{0:int,1:string} */
    private $requester;

    /**
     * Callable opsional dipakai test unit agar tidak perlu memanggil registry
     * sungguhan. Container production memakai requester HTTP bawaan.
     */
    public function __construct(?callable $requester = null)
    {
        $this->requester = $requester ?? [$this, 'request'];
    }

    /**
     * Mengembalikan kandidat ketersediaan tanpa membocorkan response mentah
     * provider. `available=true` berarti RDAP tidak menemukan object domain;
     * registrar tetap harus melakukan pengecekan final sebelum pembelian.
     *
     * @return array<string, mixed>
     */
    public function check(string $domain): array
    {
        $domain = strtolower(trim($domain));
        $tld = strtolower((string) substr(strrchr($domain, '.'), 1));
        $endpoint = self::RDAP_ENDPOINTS[$tld] ?? null;

        if ($endpoint === null) {
            return [
                'domain' => $domain,
                'status' => 'unsupported',
                'available' => null,
                'source' => 'rdap',
                'message' => 'Ekstensi domain ini belum didukung oleh pemeriksaan RDAP Carlynk.',
            ];
        }

        $cacheKey = $tld . ':' . $domain;
        $now = time();
        $cached = self::$cache[$cacheKey] ?? null;

        if (is_array($cached) && ($cached['expires_at'] ?? 0) >= $now) {
            return $cached['result'];
        }

        try {
            [$statusCode] = ($this->requester)(rtrim($endpoint, '/') . '/domain/' . rawurlencode($domain));
            $result = $this->classify($domain, $statusCode);
        } catch (Throwable $exception) {
            // Detail error jaringan tidak boleh dikirim ke browser. Status
            // unknown membuat UI tidak pernah mengklaim domain tersedia hanya
            // karena provider sedang gagal diakses.
            $result = $this->unknown($domain);
        }

        self::$cache[$cacheKey] = [
            'expires_at' => $now + self::CACHE_TTL_SECONDS,
            'result' => $result,
        ];

        return $result;
    }

    /** @return array<string, mixed> */
    private function classify(string $domain, int $statusCode): array
    {
        if ($statusCode === 404) {
            return [
                'domain' => $domain,
                'status' => 'available',
                'available' => true,
                'source' => 'rdap',
                'message' => 'Belum ada data registrasi untuk domain ini. Ketersediaan final tetap diperiksa oleh registrar saat pembelian.',
            ];
        }

        if ($statusCode >= 200 && $statusCode < 300) {
            return [
                'domain' => $domain,
                'status' => 'unavailable',
                'available' => false,
                'source' => 'rdap',
                'message' => 'Domain sudah memiliki data registrasi atau tidak tersedia.',
            ];
        }

        return $this->unknown($domain);
    }

    /** @return array<string, mixed> */
    private function unknown(string $domain): array
    {
        return [
            'domain' => $domain,
            'status' => 'unknown',
            'available' => null,
            'source' => 'rdap',
            'message' => 'Ketersediaan domain belum dapat dipastikan. Silakan coba lagi.',
        ];
    }

    /** @return array{0:int,1:string} */
    private function request(string $url): array
    {
        if (function_exists('curl_init')) {
            return $this->requestWithCurl($url);
        }

        return $this->requestWithStream($url);
    }

    /** @return array{0:int,1:string} */
    private function requestWithCurl(string $url): array
    {
        $curl = curl_init($url);

        if ($curl === false) {
            return [0, ''];
        }

        curl_setopt_array($curl, [
            CURLOPT_HTTPGET => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 6,
            CURLOPT_HTTPHEADER => [
                'Accept: application/rdap+json, application/json',
                'User-Agent: Carlynk-Backend-RDAP/1.0',
            ],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $body = curl_exec($curl);
        $statusCode = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        return [$statusCode, is_string($body) ? $body : ''];
    }

    /** @return array{0:int,1:string} */
    private function requestWithStream(string $url): array
    {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => "Accept: application/rdap+json, application/json\r\nUser-Agent: Carlynk-Backend-RDAP/1.0",
                'timeout' => 6,
                'ignore_errors' => true,
                'follow_location' => 0,
            ],
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
            ],
        ]);

        $body = @file_get_contents($url, false, $context);
        $statusCode = 0;

        if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $matches)) {
            $statusCode = (int) $matches[1];
        }

        return [$statusCode, is_string($body) ? $body : ''];
    }
}
