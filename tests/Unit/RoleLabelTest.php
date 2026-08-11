<?php

declare(strict_types=1);

namespace Tests\Unit;

use Tests\TestCase;

/**
 * Nama peran yang tampil di layar hanya boleh datang dari satu berkas.
 *
 * Sebelum ini ada empat peta terpisah -- roleGuard, roleSpecificLoginPage,
 * profilePage, publicAuthLandingService -- dan keempatnya sudah menyimpang satu
 * sama lain: "seller", "Seller", dan "marketing admin" untuk hal yang sama.
 * Peta kelima tidak akan menimbulkan error apa pun, hanya satu halaman yang
 * diam-diam memakai kata lama. Itu yang dijaga di sini.
 */
class RoleLabelTest extends TestCase
{
    public function run(): void
    {
        $this->canonicalLabelsAreTheOnesAskedFor();
        $this->noOtherFileDefinesItsOwnRoleLabelMap();
        $this->roleValuesThemselvesAreUntouched();
    }

    private function canonicalLabelsAreTheOnesAskedFor(): void
    {
        $source = $this->read('public/assets/js/core/roleLabels.js');

        $this->assertTrue(
            preg_match('/seller:\s*"Showroom"/', $source) === 1,
            'Peran seller harus tampil sebagai Showroom.'
        );
        $this->assertTrue(
            preg_match('/affiliate_admin:\s*"Marketing"/', $source) === 1,
            'Peran affiliate_admin harus tampil sebagai Marketing.'
        );
    }

    private function noOtherFileDefinesItsOwnRoleLabelMap(): void
    {
        $kanonik = realpath(dirname(__DIR__, 2) . '/public/assets/js/core/roleLabels.js');
        $pelanggar = [];

        foreach ($this->frontendFiles() as $file) {
            if (realpath($file) === $kanonik) {
                continue;
            }

            $source = (string) file_get_contents($file);

            // Pasangan kunci-nilai peran yang nilainya sebuah label, misal
            // seller: "Seller". Nilai peran di data ditulis sebagai string di
            // sisi kanan perbandingan, bukan sebagai kunci objek, jadi pola ini
            // tidak menangkapnya.
            if (preg_match('/\b(seller|affiliate_admin):\s*"[A-Z][A-Za-z ]{2,}"/', $source) === 1) {
                $pelanggar[] = str_replace('\\', '/', substr($file, strpos($file, 'public/assets/js') ?: 0));
            }
        }

        $this->assertSame(
            [],
            $pelanggar,
            'Label peran harus diambil dari core/roleLabels.js, bukan ditulis ulang di: ' . implode(', ', $pelanggar)
        );
    }

    /**
     * Penggantian ini murni soal kata yang tampil. Kalau nilai perannya ikut
     * berganti, setiap penjaga rute dan setiap query akan meleset diam-diam.
     */
    private function roleValuesThemselvesAreUntouched(): void
    {
        $guard = $this->read('public/assets/js/core/roleGuard.js');

        $this->assertTrue(
            strpos($guard, '"/seller"') !== false,
            'Rute dashboard seller tidak boleh ikut berganti nama.'
        );
        $this->assertTrue(
            strpos($guard, 'seller: "/seller"') !== false,
            'Kunci peran seller di peta home harus tetap "seller".'
        );
    }

    private function read(string $relative): string
    {
        return (string) file_get_contents(dirname(__DIR__, 2) . '/' . $relative);
    }

    /** @return list<string> */
    private function frontendFiles(): array
    {
        $root = dirname(__DIR__, 2) . '/public/assets/js';
        $files = [];

        $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($root));

        foreach ($iterator as $entry) {
            if (! $entry->isFile() || $entry->getExtension() !== 'js') {
                continue;
            }

            if ($entry->getFilename() === 'tailwindcss.js') {
                continue;
            }

            $files[] = $entry->getPathname();
        }

        return $files;
    }
}
