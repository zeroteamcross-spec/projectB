<?php

declare(strict_types=1);

namespace Tests\Unit;

use Tests\TestCase;

/**
 * Shell HTML harus memuat entry paket yang sudah dibundel, bukan grafik
 * modul mentah satu-satu.
 *
 * Sebelum ini, membuka satu halaman berarti peramban meminta ~150 berkas JS
 * terpisah -- setiap import di sumbernya jadi satu permintaan HTTP sendiri,
 * dan peramban harus membaca isi satu modul dulu untuk tahu modul berikutnya
 * yang harus diminta. esbuild memaketkannya jadi app.js plus potongan lazy
 * yang mengikuti batas import() yang sudah ada di kode (manifest per peran),
 * jadi jalur muat cepat tetap hanya mengambil kode yang benar-benar dipakai.
 *
 * Kalau shell kembali menunjuk grafik modul mentah -- lewat revert manual,
 * atau seseorang menambah <script> baru tanpa tahu sejarahnya -- rute
 * permintaan bertingkat itu kembali tanpa ada yang error. Jadi bentuknya
 * dijaga di sini.
 */
class JsBundleTest extends TestCase
{
    public function run(): void
    {
        $this->bundledEntryExists();
        $this->shellsLinkTheBundleNotTheRawGraph();
        $this->lazyChunksExistForRoleManifests();
    }

    private function bundledEntryExists(): void
    {
        $path = dirname(__DIR__, 2) . '/public/assets/dist/js/app.js';

        $this->assertTrue(is_file($path), 'public/assets/dist/js/app.js harus ada -- hasil `npm run build:js`.');
        $this->assertTrue(
            filesize($path) > 50000,
            'app.js hasil bundle jauh lebih kecil dari yang diharapkan; kemungkinan build terhenti sebelum selesai.'
        );
    }

    private function shellsLinkTheBundleNotTheRawGraph(): void
    {
        foreach (['public/index.html', 'public/app.html'] as $relative) {
            $html = $this->read($relative);

            $this->assertTrue(
                strpos($html, '/assets/v-__ASSET_VER__/dist/js/app.js') !== false,
                $relative . ' harus memuat dist/js/app.js yang sudah dibundel.'
            );
            $this->assertTrue(
                strpos($html, 'src="/assets/v-__ASSET_VER__/js/app.js"') === false,
                $relative . ' tidak boleh lagi memuat entry mentah dari grafik modul sumber.'
            );
        }
    }

    /**
     * Batas lazy yang sudah ada di sumber (manifest per peran, dimuat lewat
     * import() di core/app.js) harus tetap jadi potongan terpisah setelah
     * dibundel -- bukan ikut terseret ke app.js dan membuat pengunjung buyer
     * mengunduh kode admin.
     */
    private function lazyChunksExistForRoleManifests(): void
    {
        $chunkDir = dirname(__DIR__, 2) . '/public/assets/dist/js/chunks';

        $this->assertTrue(is_dir($chunkDir), 'public/assets/dist/js/chunks harus ada -- splitting menghasilkan potongan lazy.');

        $jumlah = count(glob($chunkDir . '/*.js') ?: []);
        $this->assertTrue(
            $jumlah >= 10,
            'Jumlah potongan lazy (' . $jumlah . ') jauh lebih sedikit dari yang diharapkan; splitting mungkin tidak aktif.'
        );
    }

    private function read(string $relative): string
    {
        return (string) file_get_contents(dirname(__DIR__, 2) . '/' . $relative);
    }
}
