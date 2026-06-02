<?php

declare(strict_types=1);

namespace App\Modules\Admin\Services;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\UnauthorizedException;
use App\Modules\Admin\Repositories\AdminImpersonationRepository;
use App\Modules\Auth\Policies\AuthPolicy;
use App\Modules\Auth\Policies\ImpersonationPolicy;
use App\Modules\Auth\Services\AuthService;
use App\Modules\Users\Repositories\UserRepository;
use DateInterval;
use DateTimeImmutable;

class AdminImpersonationService
{
    private AdminImpersonationRepository $impersonations;

    private UserRepository $users;

    private AuthService $authService;

    private AdminImpersonationAuditLogger $auditLogger;

    public function __construct(
        AdminImpersonationRepository $impersonations,
        UserRepository $users,
        AuthService $authService,
        AdminImpersonationAuditLogger $auditLogger
    ) {
        $this->impersonations = $impersonations;
        $this->users = $users;
        $this->authService = $authService;
        $this->auditLogger = $auditLogger;
    }

    public function start(array $actor, int $targetUserId, array $metadata = []): array
    {
        return $this->startForRole($actor, $targetUserId, null, $metadata);
    }

    public function startSeller(array $actor, int $targetUserId, array $metadata = []): array
    {
        return $this->startForRole($actor, $targetUserId, 'seller', $metadata);
    }

    public function startAffiliate(array $actor, int $targetUserId, array $metadata = []): array
    {
        return $this->startForRole($actor, $targetUserId, 'affiliate_admin', $metadata);
    }

    public function startForRole(array $actor, int $targetUserId, ?string $expectedRole = null, array $metadata = []): array
    {
        AuthPolicy::requireAdmin($actor);

        if ((int) ($actor['id'] ?? 0) === $targetUserId) {
            throw new ForbiddenException('Admin tidak perlu impersonate dirinya sendiri.');
        }

        $target = $this->users->findById($targetUserId);

        if (! $target) {
            throw new NotFoundException('User target tidak ditemukan.');
        }

        if ($expectedRole !== null) {
            ImpersonationPolicy::ensureImpersonationTargetRole($target, $expectedRole);
        } else {
            ImpersonationPolicy::ensureSupportedTargetRole($target);
        }

        if (($target['account_status'] ?? null) !== 'active' || (int) ($target['is_approved'] ?? 0) !== 1) {
            throw new ForbiddenException('User target belum aktif untuk diakses melalui impersonation.');
        }

        $this->impersonations->endActiveByAdminUserId((int) $actor['id']);

        $selector = bin2hex(random_bytes(6));
        $validator = bin2hex(random_bytes(32));
        $now = date('Y-m-d H:i:s');
        $expiresAt = (new DateTimeImmutable())
            ->add(new DateInterval('PT' . (int) config('auth.impersonation_cookie.ttl_hours', 4) . 'H'))
            ->format('Y-m-d H:i:s');

        $sessionId = $this->impersonations->create([
            'admin_user_id' => (int) $actor['id'],
            'target_user_id' => (int) $target['id'],
            'selector' => $selector,
            'hashed_validator' => password_hash($validator, PASSWORD_DEFAULT),
            'started_at' => $now,
            'expires_at' => $expiresAt,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $session = [
            'id' => $sessionId,
            'started_at' => $now,
            'expires_at' => $expiresAt,
        ];

        $this->auditLogger->log('impersonation_started', [
            'session_id' => $sessionId,
            'actor_admin_id' => (int) ($actor['id'] ?? 0),
            'actor_admin_name' => $actor['name'] ?? null,
            'target_user_id' => (int) ($target['id'] ?? 0),
            'target_role' => $target['role'] ?? null,
            'target_name' => $target['name'] ?? null,
            'reason' => $metadata['reason'] ?? null,
            'ip_address' => $metadata['ip_address'] ?? null,
            'user_agent' => $metadata['user_agent'] ?? null,
            'started_at' => $now,
            'expires_at' => $expiresAt,
        ]);

        return [
            'token' => [
                'value' => $selector . ':' . $validator,
                'expires_at' => $expiresAt,
            ],
            'session' => $this->sessionPayload($actor, $session, $target),
        ];
    }

    public function stop(?array $actorUser, ?array $actor, ?array $impersonation, array $metadata = []): void
    {
        unset($actorUser);

        if (! $impersonation || ! $actor) {
            throw new UnauthorizedException('Tidak ada sesi impersonation aktif.');
        }

        AuthPolicy::requireAdmin($actor);

        $sessionId = (int) ($impersonation['session_id'] ?? 0);

        if ($sessionId <= 0) {
            throw new UnauthorizedException('Sesi impersonation tidak valid.');
        }

        $this->impersonations->endById($sessionId, 'manual_stop');
        $target = is_array($impersonation['target'] ?? null) ? $impersonation['target'] : null;
        $session = $this->impersonations->findById($sessionId);
        $this->auditLogger->log('impersonation_stopped', [
            'session_id' => $sessionId,
            'actor_admin_id' => (int) ($actor['id'] ?? 0),
            'actor_admin_name' => $actor['name'] ?? null,
            'target_user_id' => (int) ($target['id'] ?? 0),
            'target_role' => $target['role'] ?? null,
            'target_name' => $target['name'] ?? null,
            'ip_address' => $metadata['ip_address'] ?? null,
            'user_agent' => $metadata['user_agent'] ?? null,
            'stopped_at' => $session['ended_at'] ?? date('Y-m-d H:i:s'),
            'ended_reason' => $session['ended_reason'] ?? 'manual_stop',
        ]);
    }

    public function sessionPayload(array $actor, array $session, array $target): array
    {
        $serializedTarget = $this->authService->serializeUser($target);

        return [
            'user' => $serializedTarget,
            'actor' => $actor,
            'impersonation' => [
                'is_impersonating' => true,
                'session_id' => (int) ($session['id'] ?? 0),
                'started_at' => $session['started_at'] ?? null,
                'expires_at' => $session['expires_at'] ?? null,
                'original_admin_id' => (int) ($actor['id'] ?? 0),
                'original_admin_name' => $actor['name'] ?? null,
                'impersonated_user_id' => (int) ($serializedTarget['id'] ?? 0),
                'impersonated_role' => $serializedTarget['role'] ?? null,
                'actor' => $actor,
                'target' => $serializedTarget,
            ],
        ];
    }
}
