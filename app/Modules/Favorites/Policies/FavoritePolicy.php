<?php

declare(strict_types=1);

namespace App\Modules\Favorites\Policies;

use App\Core\Exceptions\ForbiddenException;

class FavoritePolicy
{
    public function ensureCanManage(array $user): void
    {
        if (($user['role'] ?? null) !== 'buyer') {
            throw new ForbiddenException('Hanya buyer yang dapat mengelola favorit.');
        }
    }
}
