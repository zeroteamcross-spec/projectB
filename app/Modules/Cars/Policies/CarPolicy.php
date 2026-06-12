<?php

declare(strict_types=1);

namespace App\Modules\Cars\Policies;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\NotFoundException;

class CarPolicy
{
    public static function requireSeller(array $user): void
    {
        if (! in_array(($user['role'] ?? null), ['seller', 'super_admin'], true)) {
            throw new ForbiddenException('Hanya seller yang dapat mengelola mobil seller.');
        }
    }

    public static function requireAdmin(array $user): void
    {
        if (! in_array($user['role'] ?? null, ['admin', 'super_admin'], true)) {
            throw new ForbiddenException('Hanya admin yang dapat mengelola mobil admin.');
        }
    }

    public static function requireSellerOrAdmin(array $user): void
    {
        if (! in_array($user['role'] ?? null, ['seller', 'admin', 'super_admin'], true)) {
            throw new ForbiddenException('Hanya seller atau admin yang dapat mengelola mobil.');
        }
    }

    public static function canView(array $car, ?array $user): bool
    {
        if (($car['listing_status'] ?? null) === 'published') {
            return true;
        }

        if (! $user) {
            return false;
        }

        return in_array($user['role'] ?? null, ['admin', 'super_admin'], true) || (int) $car['seller_user_id'] === (int) $user['id'];
    }

    public static function ensureCanManage(?array $car, array $user): void
    {
        if (! $car) {
            throw new NotFoundException('Mobil tidak ditemukan.');
        }

        if (in_array($user['role'] ?? null, ['admin', 'super_admin'], true)) {
            return;
        }

        if (($user['role'] ?? null) !== 'seller' || (int) $car['seller_user_id'] !== (int) $user['id']) {
            throw new ForbiddenException('Akses pengelolaan mobil tidak diizinkan.');
        }
    }
}
