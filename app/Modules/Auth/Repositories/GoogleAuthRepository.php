<?php

declare(strict_types=1);

namespace App\Modules\Auth\Repositories;

use PDO;

class GoogleAuthRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function findUserById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function findUserByEmail(string $email): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE email = :email AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['email' => strtolower(trim($email))]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function createUser(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO users
                (role, name, phone_number, email, password_hash, address, account_status,
                 otp_code, otp_expires_at, security_key, is_approved, created_at, updated_at, deleted_at)
             VALUES
                (:role, :name, :phone_number, :email, :password_hash, :address, :account_status,
                 NULL, NULL, NULL, :is_approved, :created_at, :updated_at, NULL)'
        );
        $stmt->execute([
            'role' => $data['role'],
            'name' => $data['name'],
            'phone_number' => $data['phone_number'] ?? null,
            'email' => strtolower(trim((string) $data['email'])),
            'password_hash' => $data['password_hash'],
            'address' => $data['address'] ?? null,
            'account_status' => $data['account_status'],
            'is_approved' => $data['is_approved'],
            'created_at' => $data['created_at'],
            'updated_at' => $data['updated_at'] ?? null,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function updateUserCompletion(int $userId, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE users
             SET name = :name,
                 phone_number = :phone_number,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );
        $stmt->execute([
            'id' => $userId,
            'name' => $data['name'],
            'phone_number' => $data['phone_number'],
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function findIdentity(string $provider, string $providerUserId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT *
             FROM user_oauth_identities
             WHERE provider = :provider
             AND provider_user_id = :provider_user_id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute([
            'provider' => $provider,
            'provider_user_id' => $providerUserId,
        ]);
        $identity = $stmt->fetch();

        return $identity ?: null;
    }

    public function findIdentityByUserProvider(int $userId, string $provider): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT *
             FROM user_oauth_identities
             WHERE user_id = :user_id
             AND provider = :provider
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute([
            'user_id' => $userId,
            'provider' => $provider,
        ]);
        $identity = $stmt->fetch();

        return $identity ?: null;
    }

    public function upsertIdentity(int $userId, array $profile): int
    {
        $existing = $this->findIdentityByUserProvider($userId, (string) $profile['provider']);

        if ($existing) {
            $stmt = $this->pdo->prepare(
                'UPDATE user_oauth_identities
                 SET provider_email = :provider_email,
                     provider_name = :provider_name,
                     avatar_url = :avatar_url,
                     updated_at = :updated_at
                 WHERE id = :id
                 AND deleted_at IS NULL'
            );
            $stmt->execute([
                'id' => $existing['id'],
                'provider_email' => $profile['provider_email'],
                'provider_name' => $profile['provider_name'] ?? null,
                'avatar_url' => $profile['avatar_url'] ?? null,
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            return (int) $existing['id'];
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO user_oauth_identities
                (user_id, provider, provider_user_id, provider_email, provider_name, avatar_url,
                 created_at, updated_at, deleted_at)
             VALUES
                (:user_id, :provider, :provider_user_id, :provider_email, :provider_name, :avatar_url,
                 :created_at, NULL, NULL)'
        );
        $stmt->execute([
            'user_id' => $userId,
            'provider' => $profile['provider'],
            'provider_user_id' => $profile['provider_user_id'],
            'provider_email' => $profile['provider_email'],
            'provider_name' => $profile['provider_name'] ?? null,
            'avatar_url' => $profile['avatar_url'] ?? null,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function findShowroomByUserId(int $userId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT *
             FROM showrooms
             WHERE user_id = :user_id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['user_id' => $userId]);
        $showroom = $stmt->fetch();

        return $showroom ?: null;
    }

    public function upsertShowroom(int $userId, array $data): int
    {
        $existing = $this->findShowroomByUserId($userId);

        if ($existing) {
            $stmt = $this->pdo->prepare(
                'UPDATE showrooms
                 SET slug = COALESCE(slug, :slug),
                     name = :name,
                     address = :address,
                     phone_number = :phone_number,
                     updated_at = :updated_at
                 WHERE id = :id
                 AND deleted_at IS NULL'
            );
            $stmt->execute([
                'id' => $existing['id'],
                'slug' => $data['slug'],
                'name' => $data['name'],
                'address' => $data['address'] ?? null,
                'phone_number' => $data['phone_number'],
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            return (int) $existing['id'];
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO showrooms
                (user_id, slug, name, address, phone_number, bank_account_number, bank_type,
                 bank_account_name, created_at, updated_at, deleted_at)
             VALUES
                (:user_id, :slug, :name, :address, :phone_number, NULL, NULL, NULL, :created_at, NULL, NULL)'
        );
        $stmt->execute([
            'user_id' => $userId,
            'slug' => $data['slug'],
            'name' => $data['name'],
            'address' => $data['address'] ?? null,
            'phone_number' => $data['phone_number'],
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function findShowroomIdBySlug(string $slug): ?int
    {
        $stmt = $this->pdo->prepare(
            'SELECT id FROM showrooms WHERE slug = :slug AND deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute(['slug' => $slug]);
        $id = $stmt->fetchColumn();

        return $id !== false ? (int) $id : null;
    }

    /**
     * Records which showroom a buyer is a customer of right now. Overwritten
     * on every showroom-scoped login, never additive — a buyer only "belongs"
     * to the showroom they most recently logged in through.
     */
    public function setHomeShowroomId(int $userId, int $showroomId): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE users
             SET home_showroom_id = :showroom_id,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );
        $stmt->execute([
            'id' => $userId,
            'showroom_id' => $showroomId,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function findHomeShowroomSlug(int $userId): ?string
    {
        $stmt = $this->pdo->prepare(
            'SELECT sh.slug
             FROM users AS u
             INNER JOIN showrooms AS sh ON sh.id = u.home_showroom_id AND sh.deleted_at IS NULL
             WHERE u.id = :id
             AND u.deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $userId]);
        $slug = $stmt->fetchColumn();

        return $slug !== false ? (string) $slug : null;
    }

    public function showroomSlugExists(string $slug, ?int $ignoreShowroomId = null): bool
    {
        $sql = 'SELECT id FROM showrooms WHERE slug = :slug AND deleted_at IS NULL';
        $params = ['slug' => $slug];

        if ($ignoreShowroomId !== null) {
            $sql .= ' AND id <> :id';
            $params['id'] = $ignoreShowroomId;
        }

        $sql .= ' LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return (bool) $stmt->fetch();
    }
}
