<?php

declare(strict_types=1);

namespace Tests\Unit;

use Tests\TestCase;

/**
 * Tailwind harus tetap berupa CSS yang sudah jadi hasil build, bukan mesin
 * JIT yang jalan di peramban.
 *
 * Sebelum ini kedua shell HTML memuat tailwindcss.js -- 407KB, mesin Tailwind
 * lengkap (cdn.tailwindcss.com yang di-self-host) yang mengompilasi ulang
 * seluruh kelas utility setiap kali halaman dibuka. Di carlynk.id itu
 * memakan ~960ms sendirian, dari total 4 detik ke DOMContentLoaded.
 *
 * Kalau berkas itu kembali dimuat -- lewat revert manual, atau seseorang
 * menambahkannya lagi tanpa tahu sejarahnya -- ongkos itu kembali tanpa ada
 * yang error. Jadi bentuknya dijaga di sini.
 */
class TailwindBuildTest extends TestCase
{
    public function run(): void
    {
        $this->compiledCssExistsAndIsSubstantial();
        $this->shellsLinkTheCompiledCssNotTheJitEngine();
        $this->theOldEngineFileIsGone();
        $this->shadowCardStaysThemeable();
    }

    private function compiledCssExistsAndIsSubstantial(): void
    {
        $path = dirname(__DIR__, 2) . '/public/assets/css/tailwind.css';

        $this->assertTrue(is_file($path), 'public/assets/css/tailwind.css harus ada -- hasil `npm run build:css`.');
        $this->assertTrue(
            filesize($path) > 20000,
            'tailwind.css jauh lebih kecil dari yang diharapkan; kemungkinan build gagal diam-diam dan hanya base/reset yang tersimpan.'
        );
    }

    private function shellsLinkTheCompiledCssNotTheJitEngine(): void
    {
        foreach (['public/index.html', 'public/app.html'] as $relative) {
            $html = $this->read($relative);

            $this->assertTrue(
                strpos($html, '/assets/v-__ASSET_VER__/css/tailwind.css') !== false,
                $relative . ' harus memuat css/tailwind.css yang sudah dikompilasi.'
            );
            $this->assertTrue(
                strpos($html, 'theme/tailwindcss.js') === false,
                $relative . ' tidak boleh lagi memuat mesin JIT di peramban.'
            );
        }
    }

    private function theOldEngineFileIsGone(): void
    {
        $this->assertTrue(
            ! is_file(dirname(__DIR__, 2) . '/public/assets/js/theme/tailwindcss.js'),
            'theme/tailwindcss.js (407KB) seharusnya sudah dihapus, bukan tertinggal tak terpakai.'
        );
    }

    /**
     * shadow-card mengambil nilainya dari theme.layout.shadowDepth, yang bisa
     * diubah admin lewat Design Studio kapan saja. Build statis tidak boleh
     * membekukan angka itu -- config harus mengarahkannya ke custom property
     * yang sama yang disetel tailwindRuntimeConfig.js saat tema diterapkan.
     */
    private function shadowCardStaysThemeable(): void
    {
        $config = $this->read('tailwind.config.cjs');

        $this->assertTrue(
            preg_match('/card:\s*"var\(--pb-shadow-card\)"/', $config) === 1,
            'boxShadow.card di tailwind.config.cjs harus menunjuk var(--pb-shadow-card), bukan angka tetap.'
        );
    }

    private function read(string $relative): string
    {
        return (string) file_get_contents(dirname(__DIR__, 2) . '/' . $relative);
    }
}
