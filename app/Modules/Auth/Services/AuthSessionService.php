<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\UnauthorizedException;
use App\Modules\Admin\Repositories\AdminImpersonationRepository;
use App\Modules\Admin\Services\AdminImpersonationService;
use App\Modules\Users\Repositories\UserRepository;

class AuthSessionService
{
    private AuthService $authService;

    private UserRepository $users;

    private AdminImpersonationRepository $impersonations;

    private AdminImpersonationService $adminImpersonationService;

    public function __construct(
        AuthService $authService,
        UserRepository $users,
        AdminImpersonationRepository $impersonations,
        AdminImpersonationService $adminImpersonationService
    ) {
        $this->authService = $authService;
        $this->users = $users;
        $this->impersonations = $impersonations;
        $this->adminImpersonationService = $adminImpersonationService;
    }

    public function authenticate(?string $rememberToken, ?string $impersonationToken = null): array
    {
        $actorAuth = $this->authService->authenticateRememberToken($rememberToken);
        $actor = $actorAuth['user'];

        if (($actor['role'] ?? null) !== 'admin' || ! is_string($impersonationToken) || $impersonationToken === '') {
            return [
                'user' => $actor,
                'actor' => $actor,
                'impersonation' => null,
            ];
        }

        try {
            [$selector, $validator] = $this->parseToken($impersonationToken);
            $session = $this->impersonations->findActiveBySelector($selector);

            if (! $session || ! password_verify($validator, (string) $session['hashed_validator'])) {
                throw new UnauthorizedException('Sesi impersonation tidak valid.');
            }

            if ((int) $session['admin_user_id'] !== (int) $actor['id']) {
                throw new ForbiddenException('Sesi impersonation tidak cocok dengan admin aktif.');
            }

            $target = $this->users->findById((int) $session['target_user_id']);

            if (! $target) {
                $this->impersonations->endById((int) $session['id'], 'target_missing');
                throw new UnauthorizedException('User target impersonation tidak ditemukan.');
            }

            if (($target['account_status'] ?? null) !== 'active' || (int) ($target['is_approved'] ?? 0) !== 1) {
                $this->impersonations->endById((int) $session['id'], 'target_inactive');
                throw new ForbiddenException('User target belum dapat diakses melalui impersonation.');
            }

            $this->impersonations->markLastUsed((int) $session['id']);

            return $this->buildImpersonationContext($actor, $session, $target);
        } catch (UnauthorizedException | ForbiddenException $exception) {
            return [
                'user' => $actor,
                'actor' => $actor,
                'impersonation' => null,
            ];
        }
    }

    public function buildImpersonationContext(array $actor, array $session, array $target): array
    {
        return $this->adminImpersonationService->sessionPayload($actor, $session, $target);
    }

    private function parseToken(?string $rawToken): array
    {
        if (! is_string($rawToken) || strpos($rawToken, ':') === false) {
            throw new UnauthorizedException('Token impersonation tidak ditemukan.');
        }

        [$selector, $validator] = explode(':', $rawToken, 2);

        if ($selector === '' || $validator === '') {
            throw new UnauthorizedException('Token impersonation tidak valid.');
        }

        return [$selector, $validator];
    }
}
