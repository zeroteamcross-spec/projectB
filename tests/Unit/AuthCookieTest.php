<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Auth\AuthCookie;
use Tests\TestCase;

/**
 * Menjaga agar header cookie autentikasi hanya dirakit di satu tempat.
 *
 * Dulu dirakit terpisah di empat berkas. Menambah satu atribut berarti
 * menyunting empat tempat, dan yang terlewat tidak menimbulkan galat apa pun --
 * hanya sesi yang diam-diam tidak terbawa, muncul sebagai "kok harus login
 * lagi" tanpa jejak ke penyebabnya. Penulis cookie kelima yang lupa Domain akan
 * ditangkap di sini, bukan di produksi.
 */
class AuthCookieTest extends TestCase
{
    /**
     * Satu-satunya berkas yang boleh menyusun string Set-Cookie sendiri.
     */
    private const PEMILIK = 'app/Core/Auth/AuthCookie.php';

    public function run(): void
    {
        $this->hanyaSatuPerakitHeaderCookie();
        $this->tanpaDomainCookieTetapHostOnly();
        $this->domainIkutSaatDikonfigurasi();
        $this->cookieKedaluwarsaMembawaDomainYangSama();
    }

    private function hanyaSatuPerakitHeaderCookie(): void
    {
        $pelanggar = [];

        foreach ($this->berkasPhp($this->projectPath('app')) as $berkas) {
            $relatif = $this->jalurRelatif($berkas);

            if ($relatif === self::PEMILIK) {
                continue;
            }

            $isi = (string) file_get_contents($berkas);

            // Ciri perakitan manual: menulis atribut cookie sebagai teks.
            if (preg_match('/HttpOnly;\s*SameSite/i', $isi) === 1) {
                $pelanggar[] = $relatif;
            }
        }

        $this->assertSame([], $pelanggar, sprintf(
            'Header cookie harus lewat AuthCookie, kalau tidak atribut seperti Domain akan terlewat di: %s',
            implode(', ', $pelanggar)
        ));
    }

    private function tanpaDomainCookieTetapHostOnly(): void
    {
        $header = AuthCookie::header('remember_me', 'abc', '2030-01-01 00:00:00', false, 'Lax', '');

        $this->assertTrue(
            strpos($header, 'Domain=') === false,
            'Tanpa konfigurasi, cookie tidak boleh membawa Domain: ' . $header
        );
    }

    private function domainIkutSaatDikonfigurasi(): void
    {
        $header = AuthCookie::header('remember_me', 'abc', '2030-01-01 00:00:00', true, 'Lax', '.contoh.test');

        $this->assertTrue(
            strpos($header, '; Domain=.contoh.test') !== false,
            'Domain harus ikut saat dikonfigurasi: ' . $header
        );
        $this->assertTrue(
            strpos($header, '; Secure') !== false,
            'Secure harus tetap ikut: ' . $header
        );
    }

    private function cookieKedaluwarsaMembawaDomainYangSama(): void
    {
        // Peramban mencocokkan cookie berdasarkan nama plus domain. Kalau
        // penghapusnya tidak menyebut domain yang sama, cookie lamanya tetap
        // tinggal dan logout tidak benar-benar mengeluarkan siapa pun.
        $header = AuthCookie::expiredHeader('remember_me', false, 'Lax', '.contoh.test');

        $this->assertTrue(
            strpos($header, '; Domain=.contoh.test') !== false,
            'Cookie kedaluwarsa harus membawa Domain yang sama: ' . $header
        );
    }

    /** @return list<string> */
    private function berkasPhp(string $akar): array
    {
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($akar, \FilesystemIterator::SKIP_DOTS)
        );
        $berkas = [];

        foreach ($iterator as $item) {
            if ($item->isFile() && $item->getExtension() === 'php') {
                $berkas[] = $item->getPathname();
            }
        }

        sort($berkas);

        return $berkas;
    }

    private function jalurRelatif(string $berkas): string
    {
        $akar = str_replace('\\', '/', $this->projectPath(''));

        return str_replace($akar, '', str_replace('\\', '/', $berkas));
    }

    private function projectPath(string $path): string
    {
        return dirname(__DIR__, 2) . '/' . str_replace('\\', '/', $path);
    }
}
