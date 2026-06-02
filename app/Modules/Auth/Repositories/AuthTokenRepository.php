<?php

declare(strict_types=1);

namespace App\Modules\Auth\Repositories;

use PDO;

class AuthTokenRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function create(int $userId, string $selector, string $hashedValidator, string $expiresAt): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO user_auth_tokens
                (user_id, selector, hashed_validator, expires_at, created_at)
             VALUES
                (:user_id, :selector, :hashed_validator, :expires_at, :created_at)'
        );

        $stmt->execute([
            'user_id' => $userId,
            'selector' => $selector,
            'hashed_validator' => $hashedValidator,
            'expires_at' => $expiresAt,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function findActiveBySelector(string $selector): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT *
             FROM user_auth_tokens
             WHERE selector = :selector
             AND revoked_at IS NULL
             AND expires_at > :now
             LIMIT 1'
        );
        $stmt->execute([
            'selector' => $selector,
            'now' => date('Y-m-d H:i:s'),
        ]);
        $token = $stmt->fetch();

        return $token ?: null;
    }

    public function markLastUsed(int $id): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE user_auth_tokens
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

    public function revokeBySelector(string $selector): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE user_auth_tokens
             SET revoked_at = :revoked_at,
                 updated_at = :updated_at
             WHERE selector = :selector
             AND revoked_at IS NULL'
        );
        $stmt->execute([
            'selector' => $selector,
            'revoked_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function revokeByUserId(int $userId): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE user_auth_tokens
             SET revoked_at = :revoked_at,
                 updated_at = :updated_at
             WHERE user_id = :user_id
             AND revoked_at IS NULL'
        );
        $stmt->execute([
            'user_id' => $userId,
            'revoked_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }
}
