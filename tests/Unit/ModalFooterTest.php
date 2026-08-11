<?php

declare(strict_types=1);

namespace Tests\Unit;

use Tests\TestCase;

/**
 * `footer: null` harus benar-benar membuang footer modal.
 *
 * syncModalFooter membuang footer hanya kalau nilainya persis null, sementara
 * openModal dulu menulis `options.footer ?? "default"` -- dan `??` menganggap
 * null sebagai kosong, sehingga null berubah jadi "default". Akibatnya 31
 * pemanggil yang menulis `footer: null` tetap mendapat footer bawaan berikut
 * tombol Tutup, di modal yang tombolnya sudah lengkap di tempat lain.
 *
 * Kegagalannya tidak pernah melempar error; footernya hanya muncul di tempat
 * yang tidak memintanya. Jadi bentuk penulisannya dijaga di sini.
 */
class ModalFooterTest extends TestCase
{
    public function run(): void
    {
        $this->explicitNullRemovesTheFooter();
        $this->callersThatPassNullStillDoSo();
    }

    private function explicitNullRemovesTheFooter(): void
    {
        $source = $this->read('public/assets/js/ui/primitives/modal.js');

        $this->assertTrue(
            strpos($source, 'options.footer === null ? null :') !== false,
            'openModal harus membedakan footer null dari footer yang tidak diisi, bukan lewat ??.'
        );
        $this->assertTrue(
            preg_match('/footer:\s*options\.footer\s*\?\?\s*"default"/', $source) !== 1,
            'Pola lama `options.footer ?? "default"` menelan null dan harus tidak dipakai lagi.'
        );
    }

    /**
     * Kalau perbaikan di atas benar tapi pemanggilnya berhenti mengirim null,
     * tombol Tutup yang mubazir itu diam-diam kembali.
     */
    private function callersThatPassNullStillDoSo(): void
    {
        $jumlah = 0;

        foreach ($this->frontendFiles() as $file) {
            $jumlah += preg_match_all('/footer:\s*null/', (string) file_get_contents($file));
        }

        $this->assertTrue(
            $jumlah >= 20,
            'Modal yang tidak ingin footer harus tetap menulis `footer: null`; ditemukan ' . $jumlah . '.'
        );
    }

    private function read(string $relative): string
    {
        return (string) file_get_contents(dirname(__DIR__, 2) . '/' . $relative);
    }

    /** @return list<string> */
    private function frontendFiles(): array
    {
        $files = [];
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator(dirname(__DIR__, 2) . '/public/assets/js')
        );

        foreach ($iterator as $entry) {
            if ($entry->isFile() && $entry->getExtension() === 'js' && $entry->getFilename() !== 'tailwindcss.js') {
                $files[] = $entry->getPathname();
            }
        }

        return $files;
    }
}
