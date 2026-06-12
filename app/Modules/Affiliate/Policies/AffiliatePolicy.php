<?php

declare(strict_types=1);

namespace App\Modules\Affiliate\Policies;

use App\Core\Exceptions\ForbiddenException;

class AffiliatePolicy
{
    public static function ensureCanGenerateReferralCode(array $user): void
    {
        if (self::isAdminScope($user) || ($user['role'] ?? null) === 'seller') {
            return;
        }

        throw new ForbiddenException('Akses affiliate tidak diizinkan.');
    }

    public static function ensureCanCreate(array $user, int $sellerUserId): void
    {
        if (self::isAdminScope($user)) {
            return;
        }

        if (($user['role'] ?? null) === 'seller' && (int) $user['id'] === $sellerUserId) {
            return;
        }

        throw new ForbiddenException('Akses affiliate tidak diizinkan.');
    }

    public static function ensureCanManage(array $user, array $affiliate): void
    {
        if (self::isAdminScope($user)) {
            return;
        }

        if (($user['role'] ?? null) === 'seller' && (int) $user['id'] === (int) $affiliate['seller_user_id']) {
            return;
        }

        throw new ForbiddenException('Akses affiliate tidak diizinkan.');
    }

    public static function ensureCanViewSeller(array $user, int $sellerUserId): void
    {
        if (self::isAdminScope($user)) {
            return;
        }

        if (($user['role'] ?? null) === 'seller' && (int) $user['id'] === $sellerUserId) {
            return;
        }

        throw new ForbiddenException('Akses affiliate tidak diizinkan.');
    }

    public static function ensureCanManageCommission(array $user, int $sellerUserId): void
    {
        self::ensureCanViewSeller($user, $sellerUserId);
    }

    public static function ensureCanManageSettlement(array $user): void
    {
        if (self::isAdminScope($user)) {
            return;
        }

        throw new ForbiddenException('Akses settlement affiliate tidak diizinkan.');
    }

    private static function isAdminScope(array $user): bool
    {
        return in_array(($user['role'] ?? null), ['admin', 'super_admin'], true);
    }
}
