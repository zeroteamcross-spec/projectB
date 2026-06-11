<?php

declare(strict_types=1);

namespace App\Modules\Auth\Policies;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\UnauthorizedException;

class AuthPolicy
{
    public static function requireUser(?array $user): array
    {
        if (! $user) {
            throw new UnauthorizedException('Autentikasi diperlukan.');
        }

        return $user;
    }

    public static function requireRole(?array $user, array $roles): array
    {
        $user = self::requireUser($user);

        if (! in_array($user['role'] ?? null, $roles, true)) {
            throw new ForbiddenException('Akses tidak diizinkan.');
        }

        return $user;
    }

    public static function requireAdmin(?array $user): array
    {
        return self::requireRole($user, ['admin', 'super_admin']);
    }

    public static function ensureCanViewUser(?array $actor, int $targetUserId): array
    {
        $actor = self::requireUser($actor);

        if ((int) ($actor['id'] ?? 0) === $targetUserId || in_array($actor['role'] ?? null, ['admin', 'super_admin'], true)) {
            return $actor;
        }

        throw new ForbiddenException('Akses profil user tidak diizinkan.');
    }

    public static function ensureCanViewApprovalStatus(?array $actor, int $targetUserId): array
    {
        $actor = self::requireUser($actor);

        if ((int) ($actor['id'] ?? 0) === $targetUserId || in_array($actor['role'] ?? null, ['admin', 'super_admin'], true)) {
            return $actor;
        }

        throw new ForbiddenException('Akses status approval tidak diizinkan.');
    }
}
