<?php

declare(strict_types=1);

namespace App\Modules\Showrooms\Policies;

use App\Core\Exceptions\ForbiddenException;

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
}
