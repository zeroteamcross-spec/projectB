<?php

declare(strict_types=1);

namespace App\Modules\Inspection\Policies;

use App\Core\Exceptions\ForbiddenException;
use App\Modules\Auth\Policies\StaffAccessPolicy;

class InspectionPolicy
{
    public static function ensureCanManage(array $user, array $car): void
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

        throw new ForbiddenException('Akses inspeksi mobil tidak diizinkan.');
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
