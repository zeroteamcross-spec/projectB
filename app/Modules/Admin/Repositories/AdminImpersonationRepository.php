<?php

declare(strict_types=1);

namespace App\Modules\Admin\Repositories;

use PDO;

class AdminImpersonationRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO admin_impersonation_sessions
                (
                    admin_user_id,
                    target_user_id,
                    selector,
                    hashed_validator,
                    started_at,
                    expires_at,
                    created_at,
                    updated_at
                )
             VALUES
                (
                    :admin_user_id,
                    :target_user_id,
                    :selector,
                    :hashed_validator,
                    :started_at,
                    :expires_at,
                    :created_at,
                    :updated_at
                )'
        );

        $stmt->execute([
            'admin_user_id' => $data['admin_user_id'],
            'target_user_id' => $data['target_user_id'],
            'selector' => $data['selector'],
            'hashed_validator' => $data['hashed_validator'],
            'started_at' => $data['started_at'],
            'expires_at' => $data['expires_at'],
            'created_at' => $data['created_at'],
            'updated_at' => $data['updated_at'],
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT *
             FROM admin_impersonation_sessions
             WHERE id = :id
             LIMIT 1'
        );
        $stmt->execute([
            'id' => $id,
        ]);
        $session = $stmt->fetch();

        return $session ?: null;
    }

    public function findActiveBySelector(string $selector): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT *
             FROM admin_impersonation_sessions
             WHERE selector = :selector
             AND ended_at IS NULL
             AND expires_at > :now
             LIMIT 1'
        );
        $stmt->execute([
            'selector' => $selector,
            'now' => date('Y-m-d H:i:s'),
        ]);
        $session = $stmt->fetch();

        return $session ?: null;
    }

    public function markLastUsed(int $id): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE admin_impersonation_sessions
             SET last_used_at = :last_used_at,
                 updated_at = :updated_at
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $id,
            'last_used_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function endById(int $id, string $reason = 'manual_stop'): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE admin_impersonation_sessions
             SET ended_at = :ended_at,
                 ended_reason = :ended_reason,
                 updated_at = :updated_at
             WHERE id = :id
             AND ended_at IS NULL'
        );
        $stmt->execute([
            'id' => $id,
            'ended_at' => date('Y-m-d H:i:s'),
            'ended_reason' => $reason,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function endActiveByAdminUserId(int $adminUserId, string $reason = 'replaced'): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE admin_impersonation_sessions
             SET ended_at = :ended_at,
                 ended_reason = :ended_reason,
                 updated_at = :updated_at
             WHERE admin_user_id = :admin_user_id
             AND ended_at IS NULL'
        );
        $stmt->execute([
            'admin_user_id' => $adminUserId,
            'ended_at' => date('Y-m-d H:i:s'),
            'ended_reason' => $reason,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }
}
