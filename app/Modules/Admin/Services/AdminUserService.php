<?php

declare(strict_types=1);

namespace App\Modules\Admin\Services;

use App\Modules\Auth\Policies\AuthPolicy;
use App\Modules\Auth\Services\AuthService;
use App\Modules\Users\Repositories\UserRepository;

class AdminUserService
{
    private UserRepository $users;

    private AuthService $authService;

    public function __construct(UserRepository $users, AuthService $authService)
    {
        $this->users = $users;
        $this->authService = $authService;
    }

    public function listUsers(array $actor, array $filters = []): array
    {
        AuthPolicy::requireAdmin($actor);

        return array_map(
            fn (array $user): array => $this->authService->serializeUser($user),
            $this->users->listForAdmin($filters)
        );
    }
}
