<?php

declare(strict_types=1);

namespace App\Modules\Auth\Policies;

use App\Core\Auth\AuthContext;
use App\Core\Exceptions\ForbiddenException;

class ImpersonationPolicy
{
    public static function ensureImpersonationTargetRole(array $target, string $expectedRole): void
    {
        $role = $target['role'] ?? null;

        if ($role !== $expectedRole) {
            throw new ForbiddenException('Role target impersonation tidak sesuai.');
        }
    }

    public static function ensureSupportedTargetRole(array $target): void
    {
        $role = $target['role'] ?? null;

        if (! in_array($role, ['seller', 'affiliate_admin'], true)) {
            throw new ForbiddenException('Impersonation hanya diizinkan untuk akun seller atau affiliate.');
        }
    }

    public static function ensureSensitiveMutationAllowed(?AuthContext $auth, string $message = 'Aksi ini tidak diizinkan saat admin sedang login sebagai affiliate.'): void
    {
        if (! $auth || ! $auth->isImpersonating()) {
            return;
        }

        $actor = $auth->actor();

        if (($actor['role'] ?? null) === 'admin') {
            throw new ForbiddenException($message);
        }
    }
}
