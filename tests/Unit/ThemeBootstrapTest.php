<?php

declare(strict_types=1);

namespace Tests\Unit;

use Tests\TestCase;

/**
 * Tema harus ditanam ke dalam HTML, bukan diambil lewat permintaan kedua.
 *
 * Latarnya: shell dulu memuat <script src="/api/theme/runtime-config.js">.
 * Nginx di server punya aturan yang mencocokkan akhiran .js, tidak menemukan
 * berkasnya di disk, lalu meneruskan ke PHP tanpa mengembalikan status -- jadi
 * responsnya benar isinya tapi berstatus 404, dan peramban membatalkan
 * skripnya. Tidak ada yang error di sisi PHP; tema hanya diam-diam kembali ke
 * bawaan, sehingga nama aplikasi, warna, dan logo dari Konfigurasi WEB tidak
 * pernah terpakai.
 *
 * Kegagalannya tidak bersuara, jadi bentuk penyajiannya dijaga di sini.
 */
class ThemeBootstrapTest extends TestCase
{
    public function run(): void
    {
        $this->shellsEmbedTheThemeInsteadOfFetchingIt();
        $this->theBridgeFillsTheThemePlaceholder();
        $this->encodedThemeCannotCloseTheScriptBlock();
    }

    private function shellsEmbedTheThemeInsteadOfFetchingIt(): void
    {
        foreach (['public/index.html', 'public/app.html'] as $relative) {
            $html = $this->read($relative);

            $this->assertTrue(
                strpos($html, '/api/theme/runtime-config.js') === false,
                $relative . ' harus berhenti memuat tema lewat URL berakhiran .js.'
            );
            $this->assertTrue(
                strpos($html, '__THEME_CONFIG__') !== false,
                $relative . ' harus memuat placeholder tema.'
            );

            // Applier-nya didefinisikan tailwindRuntimeConfig.js. Kalau tema
            // disisipkan lebih dulu, penjaga di dalamnya diam-diam keluar dan
            // temanya kembali ke bawaan -- persis kegagalan yang dihindari.
            $posisiApplier = strpos($html, 'tailwindRuntimeConfig.js');
            $posisiTema = strpos($html, '__THEME_CONFIG__');
            $this->assertTrue(
                $posisiApplier !== false && $posisiTema !== false && $posisiApplier < $posisiTema,
                $relative . ' harus menyisipkan tema sesudah tailwindRuntimeConfig.js.'
            );
        }
    }

    private function theBridgeFillsTheThemePlaceholder(): void
    {
        $bridge = $this->read('public/index.php');

        $this->assertTrue(
            strpos($bridge, "str_replace('__THEME_CONFIG__'") !== false,
            'index.php harus mengganti __THEME_CONFIG__ saat menyajikan shell.'
        );
        $this->assertTrue(
            strpos($bridge, 'function themeConfigJson') !== false,
            'themeConfigJson() harus ada sebagai satu-satunya penyandi tema.'
        );
    }

    /**
     * index.php tidak boleh di-require dari tes: memuatnya akan menjalankan
     * jembatannya, menyajikan shell, dan menyentuh database. Jadi sifatnya
     * diperiksa dari sumbernya, sama seperti FrontendAssetVersioningTest.
     *
     * Yang dijaga adalah JSON_HEX_TAG. Nama aplikasi datang dari kolom yang
     * diisi admin, dan tanpa flag itu satu string berisi "</script>" akan
     * menutup blok skripnya lebih awal.
     */
    private function encodedThemeCannotCloseTheScriptBlock(): void
    {
        $bridge = $this->read('public/index.php');
        $awal = strpos($bridge, 'function themeConfigJson');
        $badan = $awal === false ? '' : substr($bridge, $awal, 600);

        $this->assertTrue(
            strpos($badan, 'JSON_HEX_TAG') !== false,
            'themeConfigJson() harus memakai JSON_HEX_TAG supaya tema tidak bisa menutup <script>.'
        );
        $this->assertTrue(
            strpos($badan, "return '{}'") !== false,
            'Tema kosong harus menjadi objek kosong, bukan string kosong yang merusak sintaks.'
        );
    }

    private function read(string $relative): string
    {
        return (string) file_get_contents(dirname(__DIR__, 2) . '/' . $relative);
    }
}
