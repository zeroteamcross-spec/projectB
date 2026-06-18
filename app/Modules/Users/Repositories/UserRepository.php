<?php

declare(strict_types=1);

namespace App\Modules\Users\Repositories;

use PDO;

class UserRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, role, name, phone_number, email, address, account_status, is_approved, created_at, updated_at
             FROM users
             WHERE id = :id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        if ($user) {
            $stmtOauth = $this->pdo->prepare(
                'SELECT 1 FROM user_oauth_identities WHERE user_id = :user_id AND provider = "google" AND deleted_at IS NULL LIMIT 1'
            );
            $stmtOauth->execute(['user_id' => $id]);
            $user['has_google_identity'] = (bool) $stmtOauth->fetchColumn();
        }

        return $user ?: null;
    }

    public function findCredentialsById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, password_hash
             FROM users
             WHERE id = :id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function findWithShowroom(int $id): ?array
    {
        $user = $this->findById($id);

        if (! $user) {
            return null;
        }

        $stmt = $this->pdo->prepare(
            'SELECT id, user_id, name, address, phone_number, bank_account_number,
                    bank_type, bank_account_name, created_at, updated_at
             FROM showrooms
             WHERE user_id = :user_id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['user_id' => $id]);
        $showroom = $stmt->fetch();

        $user['showroom'] = $showroom ?: null;

        return $user;
    }

    public function emailExistsForOtherUser(string $email, int $userId): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT id FROM users WHERE email = :email AND id <> :id AND deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute([
            'email' => $email,
            'id' => $userId,
        ]);

        return (bool) $stmt->fetch();
    }

    public function updateProfile(int $id, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE users
             SET name = :name,
                 phone_number = :phone_number,
                 email = :email,
                 address = :address,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );

        $stmt->execute([
            'id' => $id,
            'name' => $data['name'],
            'phone_number' => $data['phone_number'] ?? null,
            'email' => $data['email'],
            'address' => $data['address'] ?? null,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function updatePasswordHash(int $id, string $passwordHash): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE users
             SET password_hash = :password_hash,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );

        $stmt->execute([
            'id' => $id,
            'password_hash' => $passwordHash,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function listForAdmin(array $filters = []): array
    {
        $limit = max(1, min(100, (int) ($filters['limit'] ?? 20)));
        $sql = 'SELECT id, role, name, phone_number, email, account_status, is_approved, created_at, updated_at
                FROM users
                WHERE deleted_at IS NULL';
        $params = [];

        if (! empty($filters['role'])) {
            $sql .= ' AND role = :role';
            $params['role'] = $filters['role'];
        }

        if (! empty($filters['keyword'])) {
            $sql .= ' AND (
                name LIKE :keyword
                OR email LIKE :keyword
                OR phone_number LIKE :keyword
            )';
            $params['keyword'] = '%' . trim((string) $filters['keyword']) . '%';
        }

        $sql .= ' ORDER BY created_at DESC, id DESC LIMIT ' . $limit;

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll() ?: [];
    }
}
