<?php

declare(strict_types=1);

namespace App\Modules\Auth\Policies;

class StaffAccessPolicy
{
    /**
     * Staf login dengan users.id miliknya sendiri, bukan user_id pemilik
     * showroom -- jadi dia tidak pernah cocok dengan pengecekan kepemilikan
     * biasa (seller_user_id/user_id === $user['id']). Predikat ini dipakai
     * ADDITIF di samping pengecekan kepemilikan yang sudah ada di tiap modul
     * (Showrooms/Cars/Images/Inspection/Transactions), tidak pernah
     * menggantikannya.
     */
    public static function staffCanActOnShowroom(array $user, ?int $showroomId): bool
    {
        return ($user['role'] ?? null) === 'seller_staff'
            && $showroomId !== null
            && $showroomId > 0
            && (int) ($user['staff_showroom_id'] ?? 0) === $showroomId;
    }
}
