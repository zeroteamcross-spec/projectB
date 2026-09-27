<?php

declare(strict_types=1);

namespace App\Modules\Images\Policies;

use App\Core\Exceptions\ForbiddenException;
use App\Modules\Auth\Policies\StaffAccessPolicy;

class CarImagePolicy
{
    public static function ensureCanManageCarImages(array $user, array $car): void
    {
        if (in_array(($user['role'] ?? null), ['admin', 'super_admin'], true)) {
            return;
        }

        if (($user['role'] ?? null) === 'seller' && (int) $user['id'] === (int) $car['seller_user_id']) {
            return;
        }

        if (StaffAccessPolicy::staffCanActOnShowroom($user, (int) ($car['showroom_id'] ?? 0))) {
            return;
        }

        throw new ForbiddenException('Akses gambar mobil tidak diizinkan.');
    }

    public static function ensureCanViewCarImages(?array $user, array $car): void
    {
        if (($car['listing_status'] ?? null) === 'published') {
            return;
        }

        if (! $user) {
            throw new ForbiddenException('Akses gambar mobil tidak diizinkan.');
        }

        self::ensureCanManageCarImages($user, $car);
    }
}
