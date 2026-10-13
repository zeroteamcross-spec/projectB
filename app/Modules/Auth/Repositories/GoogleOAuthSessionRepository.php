<?php

declare(strict_types=1);

namespace App\Modules\Auth\Repositories;

use PDO;

final class GoogleOAuthSessionRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO google_oauth_sessions
                (state_hash, source_host, role, showroom_id, next_path, redirect_uri,
                 status, expires_at, created_at, updated_at)
             VALUES
                (:state_hash, :source_host, :role, :showroom_id, :next_path, :redirect_uri,
                 :status, :expires_at, :created_at, NULL)'
        );
        $stmt->execute([
            'state_hash' => $data['state_hash'],
            'source_host' => $data['source_host'],
            'role' => $data['role'],
            'showroom_id' => $data['showroom_id'] ?? null,
            'next_path' => $data['next_path'] ?? null,
            'redirect_uri' => $data['redirect_uri'],
            'status' => $data['status'] ?? 'pending',
            'expires_at' => $data['expires_at'],
            'created_at' => $data['created_at'] ?? date('Y-m-d H:i:s'),
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function findPendingByState(string $state): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT *
             FROM google_oauth_sessions
             WHERE state_hash = :state_hash
             AND status = \'pending\'
             AND expires_at > :now
             LIMIT 1'
        );
        $stmt->execute([
            'state_hash' => self::hashToken($state),
            'now' => date('Y-m-d H:i:s'),
        ]);
        $session = $stmt->fetch();

        return $session ?: null;
    }

    public function findByState(string $state): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT *
             FROM google_oauth_sessions
             WHERE state_hash = :state_hash
             LIMIT 1'
        );
        $stmt->execute(['state_hash' => self::hashToken($state)]);
        $session = $stmt->fetch();

        return $session ?: null;
    }

    public function authorize(
        int $id,
        string $handoffHash,
        int $userId,
        ?string $completionCookie,
        string $redirectPath,
        string $handoffExpiresAt
    ): bool {
        $stmt = $this->pdo->prepare(
            'UPDATE google_oauth_sessions
             SET handoff_hash = :handoff_hash,
                 user_id = :user_id,
                 completion_cookie = :completion_cookie,
                 redirect_path = :redirect_path,
                 handoff_expires_at = :handoff_expires_at,
                 status = \'authorized\',
                 updated_at = :updated_at
             WHERE id = :id
             AND status = \'pending\'
             AND expires_at > :now'
        );

        $stmt->execute([
            'id' => $id,
            'handoff_hash' => $handoffHash,
            'user_id' => $userId,
            'completion_cookie' => $completionCookie,
            'redirect_path' => $redirectPath,
            'handoff_expires_at' => $handoffExpiresAt,
            'updated_at' => date('Y-m-d H:i:s'),
            'now' => date('Y-m-d H:i:s'),
        ]);

        return $stmt->rowCount() === 1;
    }

    public function findAuthorizedByHandoff(string $handoff): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT *
             FROM google_oauth_sessions
             WHERE handoff_hash = :handoff_hash
             AND status = \'authorized\'
             AND handoff_expires_at > :now
             AND consumed_at IS NULL
             LIMIT 1'
        );
        $stmt->execute([
            'handoff_hash' => self::hashToken($handoff),
            'now' => date('Y-m-d H:i:s'),
        ]);
        $session = $stmt->fetch();

        return $session ?: null;
    }

    public function consume(int $id, string $handoff, string $consumedAt): bool
    {
        $stmt = $this->pdo->prepare(
            'UPDATE google_oauth_sessions
             SET status = \'consumed\',
                 consumed_at = :consumed_at,
                 updated_at = :updated_at
             WHERE id = :id
             AND handoff_hash = :handoff_hash
             AND status = \'authorized\'
             AND handoff_expires_at > :now
             AND consumed_at IS NULL'
        );
        $stmt->execute([
            'id' => $id,
            'handoff_hash' => self::hashToken($handoff),
            'consumed_at' => $consumedAt,
            'updated_at' => $consumedAt,
            'now' => $consumedAt,
        ]);

        return $stmt->rowCount() === 1;
    }

    private static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }
}
