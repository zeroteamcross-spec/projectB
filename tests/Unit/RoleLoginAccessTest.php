<?php

declare(strict_types=1);

namespace Tests\Unit;

use Tests\TestCase;

/**
 * Siapa yang boleh masuk lewat halaman login peran tertentu.
 *
 * acceptedRoles menentukan pintu masuk, bukan hak akses -- peran tetap datang
 * dari server dan roleGuard yang menentukan halaman mana yang terbuka. Tapi
 * daftar itu tetap perlu dijaga: melebarkannya tanpa sengaja berarti membuka
 * pintu, dan menyempitkannya diam-diam mengunci orang di luar.
 */
class RoleLoginAccessTest extends TestCase
{
    public function run(): void
    {
        $this->sellerLoginAlsoAcceptsMarketing();
        $this->otherLoginPagesStayNarrow();
        $this->landingFollowsTheRealRoleNotThePageTitle();
    }

    private function sellerLoginAlsoAcceptsMarketing(): void
    {
        $source = $this->service();

        $this->assertTrue(
            preg_match('/acceptedRoles:\s*\["seller",\s*"affiliate_admin"\]/', $source) === 1,
            'Halaman /login/seller harus menerima seller dan affiliate_admin.'
        );
    }

    /**
     * Login buyer dan marketing tidak punya acceptedRoles, jadi masing-masing
     * hanya menerima perannya sendiri. Kalau salah satu tiba-tiba punya daftar,
     * itu perlu keputusan sadar, bukan lolos begitu saja.
     */
    private function otherLoginPagesStayNarrow(): void
    {
        $source = $this->service();
        $jumlah = preg_match_all('/acceptedRoles:/', $source);

        $this->assertSame(
            2,
            $jumlah,
            'Hanya login admin dan login seller yang boleh punya acceptedRoles; ditemukan ' . $jumlah . '.'
        );
    }

    /**
     * Satu halaman yang menerima dua peran harus mengirim tiap peran ke
     * rumahnya sendiri. Kalau tidak, marketing dikirim ke /seller, ditolak
     * roleGuard, dan dipantulkan kembali ke login -- terlihat seperti gagal
     * login padahal sesinya sudah terbentuk.
     */
    private function landingFollowsTheRealRoleNotThePageTitle(): void
    {
        $source = $this->service();

        $this->assertTrue(
            strpos($source, 'role !== config.role') !== false,
            'homeForAuthenticatedRole harus memakai peran asli saat berbeda dari peran halaman.'
        );
    }

    private function service(): string
    {
        return (string) file_get_contents(
            dirname(__DIR__, 2) . '/public/assets/js/modules/auth/services/roleSpecificLoginService.js'
        );
    }
}
