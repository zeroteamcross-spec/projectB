<?php

declare(strict_types=1);

namespace App\Core\Auth;

/**
 * Satu-satunya tempat header Set-Cookie autentikasi dirakit.
 *
 * Sebelumnya dirakit terpisah di empat berkas dengan format string yang
 * disalin-tempel. Selama tersebar begitu, menambah satu atribut berarti
 * menyunting empat tempat dan berharap tidak ada yang terlewat -- dan yang
 * terlewat tidak menimbulkan galat apa pun, hanya sesi yang diam-diam tidak
 * terbawa.
 *
 * Atribut Domain itulah alasannya: admin.carlynk.id dan carlynk.id harus
 * berbagi sesi, dan cookie tanpa Domain hanya berlaku di host yang
 * menerbitkannya.
 */
final class AuthCookie
{
    /**
     * Parameter $domain di ketiga method hanya untuk pengujian. Produksi
     * membiarkannya null, dan nilainya dibaca dari konfigurasi.
     *
     * @param string $name    nama cookie
     * @param string $value   nilai mentah, akan di-encode
     * @param string $expires waktu kedaluwarsa yang bisa dibaca strtotime()
     */
    public static function header(
        string $name,
        string $value,
        string $expires,
        bool $secure,
        string $sameSite,
        ?string $domain = null
    ): string {
        return self::build(
            $name,
            rawurlencode($value),
            gmdate('D, d M Y H:i:s T', (int) strtotime($expires)),
            $secure,
            $sameSite,
            $domain
        );
    }

    /**
     * Versi timestamp Unix, untuk pemanggil yang sudah memegang angka.
     */
    public static function headerFromTimestamp(
        string $name,
        string $value,
        int $expiresAt,
        bool $secure,
        string $sameSite,
        ?string $domain = null
    ): string {
        return self::build(
            $name,
            rawurlencode($value),
            gmdate('D, d M Y H:i:s T', $expiresAt),
            $secure,
            $sameSite,
            $domain
        );
    }

    /**
     * Cookie yang sudah lewat waktunya, dipakai untuk menghapus.
     *
     * Domain-nya harus sama persis dengan saat diterbitkan; kalau berbeda,
     * peramban menganggapnya cookie lain dan yang lama tetap tinggal.
     */
    public static function expiredHeader(
        string $name,
        bool $secure,
        string $sameSite,
        ?string $domain = null
    ): string {
        return self::build($name, '', 'Thu, 01 Jan 1970 00:00:00 GMT', $secure, $sameSite, $domain);
    }

    private static function build(
        string $name,
        string $encodedValue,
        string $expires,
        bool $secure,
        string $sameSite,
        ?string $domain
    ): string {
        $header = sprintf(
            '%s=%s; Expires=%s; Path=/; HttpOnly; SameSite=%s',
            $name,
            $encodedValue,
            $expires,
            $sameSite
        );

        $domain = trim($domain ?? self::domainTerkonfigurasi());

        if ($domain !== '') {
            $header .= '; Domain=' . $domain;
        }

        return $secure ? $header . '; Secure' : $header;
    }

    /**
     * Kosong berarti cookie host-only, dan itu bawaannya. Diisi hanya kalau
     * sesi memang harus dibagi lintas subdomain.
     */
    private static function domainTerkonfigurasi(): string
    {
        return trim((string) config('auth.cookie_domain', ''));
    }
}
