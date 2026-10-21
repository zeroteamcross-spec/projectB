<?php

declare(strict_types=1);

namespace Tests\Unit;

use Tests\TestCase;
use App\Modules\Showrooms\Services\PublicRouteSlugBootstrap;

/**
 * Menjaga syarat yang membuat versi-di-jalur benar.
 *
 * Aset frontend disajikan lewat jalur berprefiks versi (/assets/v-XXXX/js/...)
 * supaya browser boleh menyimpannya selamanya, dan tetap mengambil ulang
 * semuanya begitu ada deploy. Yang membuat itu bekerja tanpa build step adalah
 * satu sifat ES module: specifier relatif diselesaikan terhadap URL modul yang
 * mengimpornya, jadi seluruh graf mewarisi prefiks dari titik masuknya.
 *
 * Satu import absolut merusak rantai itu -- berkas tersebut dan seluruh cabang
 * di bawahnya lolos dari versi, lalu disajikan dari cache lama selamanya.
 * Tidak ada error, tidak ada gejala; pengguna cuma menjalankan kode basi. Tes
 * ini yang berteriak sebelum itu sempat terjadi.
 */
class FrontendAssetVersioningTest extends TestCase
{
    /**
     * Runtime Tailwind versi peramban. Berkas vendor, tidak diimpor sebagai
     * modul, dan isinya memang menyebut jalur absolut untuk keperluannya
     * sendiri.
     */
    private const VENDOR = ['tailwindcss.js'];

    public function run(): void
    {
        $this->modulJsTidakMemakaiImportAbsolut();
        $this->jsTidakMenyebutJalurAsetAbsolut();
        $this->halamanMasukMemakaiPlaceholderVersi();
        $this->reservedRouteBootstrapRendersAValidUniqueJavascriptAssignment();
        $this->halamanTidakBolehIkutTersimpan();
    }

    private function modulJsTidakMemakaiImportAbsolut(): void
    {
        $pelanggar = [];

        foreach ($this->berkasJs() as $berkas) {
            $isi = (string) file_get_contents($berkas);

            // from "/..." dan import("/...") -- keduanya keluar dari prefiks.
            // Tanda "//" dilewati supaya URL penuh seperti https://... dan
            // komentar tidak ikut tertangkap.
            if (preg_match('~\bfrom\s+[\'"]/(?!/)~', $isi) === 1
                || preg_match('~\bimport\s*\(\s*[\'"`]/(?!/)~', $isi) === 1) {
                $pelanggar[] = $this->jalurRelatif($berkas);
            }
        }

        $this->assertSame([], $pelanggar, sprintf(
            'Import absolut lolos dari versi aset dan akan disajikan basi selamanya. Pakai jalur relatif di: %s',
            implode(', ', $pelanggar)
        ));
    }

    private function jsTidakMenyebutJalurAsetAbsolut(): void
    {
        $pelanggar = [];

        foreach ($this->berkasJs() as $berkas) {
            $isi = (string) file_get_contents($berkas);

            if (preg_match('~[\'"`]/assets/~', $isi) === 1) {
                $pelanggar[] = $this->jalurRelatif($berkas);
            }
        }

        $this->assertSame([], $pelanggar, sprintf(
            'Jalur /assets/ absolut melewati prefiks versi. Pakai jalur relatif di: %s',
            implode(', ', $pelanggar)
        ));
    }

    private function halamanMasukMemakaiPlaceholderVersi(): void
    {
        foreach (['public/index.html', 'public/app.html'] as $halaman) {
            $berkas = $this->projectPath($halaman);

            if (! is_file($berkas)) {
                continue;
            }

            $isi = (string) file_get_contents($berkas);

            $this->assertTrue(
                strpos($isi, '__ASSET_VER__') !== false,
                $halaman . ' harus memuat aset lewat placeholder __ASSET_VER__, bukan jalur telanjang.'
            );

            // Skrip yang menunjuk /assets/ tanpa placeholder tidak akan pernah
            // dibatalkan cache-nya setelah header immutable dipasang.
            preg_match_all('~<script[^>]+src="(/assets/[^"]+)"~', $isi, $cocok);

            foreach ($cocok[1] ?? [] as $src) {
                $this->assertTrue(
                    strpos($src, '__ASSET_VER__') !== false,
                    $halaman . ' memuat ' . $src . ' tanpa versi; berkas itu akan mengendap di cache pengguna selamanya.'
                );
            }
        }
    }

    private function halamanTidakBolehIkutTersimpan(): void
    {
        $isi = (string) file_get_contents($this->projectPath('public/index.php'));

        // Ini tumpuan seluruh mekanisme: HTML selalu segar, jadi penunjuk
        // versinya selalu yang terbaru. Begitu HTML ikut tersimpan, pengguna
        // bisa tertahan pada token lama dan tidak akan pernah dapat pembaruan.
        $this->assertTrue(
            preg_match('~Cache-Control:\s*no-store~i', $isi) === 1,
            'index.php harus mengirim HTML dengan Cache-Control no-store.'
        );
    }

    private function reservedRouteBootstrapRendersAValidUniqueJavascriptAssignment(): void
    {
        foreach (['public/index.html', 'public/app.html'] as $page) {
            $template = (string) file_get_contents($this->projectPath($page));
            $this->assertTrue(
                strpos($template, 'window.__PROJECTB_RESERVED_ROUTE_PREFIXES__ = __PROJECTB_RESERVED_ROUTE_PREFIXES_JSON__;') !== false,
                $page . ' must keep the JavaScript property separate from its unique JSON placeholder.'
            );

            $rendered = PublicRouteSlugBootstrap::injectIntoHtml($template, ['admin', 'assets', '</script>']);
            $expectedScript = 'window.__PROJECTB_RESERVED_ROUTE_PREFIXES__ = ["admin","assets","\\u003C/script\\u003E"];';
            $this->assertTrue(
                strpos($rendered, $expectedScript) !== false,
                $page . ' must render the exact valid JavaScript assignment without replacing its property name.'
            );
            $this->assertTrue(
                strpos($rendered, PublicRouteSlugBootstrap::HTML_PLACEHOLDER) === false,
                $page . ' must not leave the route JSON placeholder in served HTML.'
            );
            $this->assertTrue(
                strpos($rendered, 'window.["admin"') === false,
                $page . ' must not turn the global property into invalid JavaScript syntax.'
            );
        }
    }

    /** @return list<string> */
    private function berkasJs(): array
    {
        $akar = $this->projectPath('public/assets/js');
        $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($akar, \FilesystemIterator::SKIP_DOTS));
        $berkas = [];

        foreach ($iterator as $item) {
            if (! $item->isFile() || $item->getExtension() !== 'js') {
                continue;
            }

            if (in_array($item->getFilename(), self::VENDOR, true)) {
                continue;
            }

            $berkas[] = $item->getPathname();
        }

        sort($berkas);

        return $berkas;
    }

    private function jalurRelatif(string $berkas): string
    {
        return str_replace(str_replace('\\', '/', $this->projectPath('')), '', str_replace('\\', '/', $berkas));
    }

    private function projectPath(string $path): string
    {
        return dirname(__DIR__, 2) . '/' . str_replace('\\', '/', $path);
    }
}
