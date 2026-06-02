<?php

declare(strict_types=1);

namespace App\Modules\Inspection\Policies;

use App\Core\Exceptions\ForbiddenException;

class InspectionPolicy
{
    public static function ensureCanManage(array $user, array $car): void
    {
        if (($user['role'] ?? null) === 'admin') {
            return;
        }

        if (($user['role'] ?? null) !== 'seller' || (int) $user['id'] !== (int) $car['seller_user_id']) {
            throw new ForbiddenException('Akses inspeksi mobil tidak diizinkan.');
        }
    }

    public static function ensureCanView(?array $user, array $car, ?array $report): void
    {
        if ($report && ($report['report_status'] ?? null) === 'published' && ($car['listing_status'] ?? null) === 'published') {
            return;
        }

        if (! $user) {
            throw new ForbiddenException('Akses inspeksi mobil tidak diizinkan.');
        }

        self::ensureCanManage($user, $car);
    }
}
