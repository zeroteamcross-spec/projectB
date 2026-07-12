<?php

declare(strict_types=1);

namespace App\Modules\Showrooms\Repositories;

use PDO;

class ShowroomRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, user_id, slug, name, address, phone_number, bank_account_number,
                    bank_type, bank_account_name, created_at, updated_at
             FROM showrooms
             WHERE id = :id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $showroom = $stmt->fetch();

        return $showroom ?: null;
    }

    public function findByUserId(int $userId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, user_id, slug, name, address, phone_number, bank_account_number,
                    bank_type, bank_account_name, created_at, updated_at
             FROM showrooms
             WHERE user_id = :user_id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['user_id' => $userId]);
        $showroom = $stmt->fetch();

        return $showroom ?: null;
    }

    public function findPublicContextBySlug(string $slug): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT sh.id, sh.user_id, sh.slug, sh.name, sh.address, sh.phone_number,
                    u.name AS seller_name, u.email AS seller_email, u.phone_number AS seller_phone_number
             FROM showrooms AS sh
             INNER JOIN users AS u ON u.id = sh.user_id
             WHERE sh.slug = :slug
             AND sh.deleted_at IS NULL
             AND u.deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['slug' => $slug]);
        $showroom = $stmt->fetch();

        return $showroom ?: null;
    }

    public function slugExists(string $slug, ?int $ignoreShowroomId = null): bool
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

    public function create(int $userId, array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO showrooms
                (user_id, slug, name, address, phone_number, bank_account_number,
                 bank_type, bank_account_name, created_at, updated_at)
             VALUES
                (:user_id, :slug, :name, :address, :phone_number, :bank_account_number,
                 :bank_type, :bank_account_name, :created_at, :updated_at)'
        );

        $stmt->execute([
            'user_id' => $userId,
            'slug' => $data['slug'],
            'name' => $data['name'],
            'address' => $data['address'] ?? null,
            'phone_number' => $data['phone_number'] ?? null,
            'bank_account_number' => $data['bank_account_number'] ?? null,
            'bank_type' => $data['bank_type'] ?? null,
            'bank_account_name' => $data['bank_account_name'] ?? null,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => null,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function update(int $id, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE showrooms
             SET slug = :slug,
                 name = :name,
                 address = :address,
                 phone_number = :phone_number,
                 bank_account_number = :bank_account_number,
                 bank_type = :bank_type,
                 bank_account_name = :bank_account_name,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );

        $stmt->execute([
            'id' => $id,
            'slug' => $data['slug'],
            'name' => $data['name'],
            'address' => $data['address'] ?? null,
            'phone_number' => $data['phone_number'] ?? null,
            'bank_account_number' => $data['bank_account_number'] ?? null,
            'bank_type' => $data['bank_type'] ?? null,
            'bank_account_name' => $data['bank_account_name'] ?? null,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }
}
