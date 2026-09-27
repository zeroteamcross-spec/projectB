<?php

declare(strict_types=1);

namespace App\Modules\Showrooms\Policies;

use App\Core\Exceptions\ForbiddenException;
use App\Modules\Auth\Policies\StaffAccessPolicy;

class ShowroomPolicy
{
    /**
     * Diekstrak dari pengecekan yang sudah benar di ShowroomService::show() --
     * sejak fitur multi-cabang, setiap method seller-facing yang menerima
     * showroom_id eksplisit (bukan lagi menebak lewat findByUserId()) harus
     * memverifikasi cabang itu benar milik user yang sedang login, persis
     * seperti ini. Admin selalu lolos, sama seperti pola otorisasi admin di
     * modul lain.
     */
    public static function ensureOwnedByUser(array $showroom, array $user): void
    {
        if (in_array($user['role'] ?? null, ['admin', 'super_admin'], true)) {
            return;
        }

        if ((int) ($showroom['user_id'] ?? 0) !== (int) ($user['id'] ?? 0)) {
            throw new ForbiddenException('Akses showroom tidak diizinkan.');
        }
    }

    /**
     * Versi longgar dari ensureOwnedByUser() yang juga meloloskan staf yang
     * ditugaskan ke showroom ini -- HANYA dipakai untuk aksi non-billing
     * (profil/branding, katalog, inspeksi, transaksi). Aksi billing/ganti
     * paket/tambah cabang TETAP memakai ensureOwnedByUser() yang ketat,
     * tidak pernah method ini -- staf dilarang menyentuh keduanya.
     */
    public static function ensureOwnedOrStaffAssigned(array $showroom, array $user): void
    {
        if (in_array($user['role'] ?? null, ['admin', 'super_admin'], true)) {
            return;
        }

        if ((int) ($showroom['user_id'] ?? 0) === (int) ($user['id'] ?? 0)) {
            return;
        }

        if (StaffAccessPolicy::staffCanActOnShowroom($user, (int) ($showroom['id'] ?? 0))) {
            return;
        }

        throw new ForbiddenException('Akses showroom tidak diizinkan.');
    }
}
