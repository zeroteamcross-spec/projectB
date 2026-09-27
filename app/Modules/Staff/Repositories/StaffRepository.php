<?php

declare(strict_types=1);

namespace App\Modules\Staff\Repositories;

use PDO;

class StaffRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function emailExists(string $email, ?int $ignoreUserId = null): bool
    {
        $sql = 'SELECT id FROM users WHERE email = :email AND deleted_at IS NULL';
        $params = ['email' => $email];

        if ($ignoreUserId !== null) {
            $sql .= ' AND id <> :id';
            $params['id'] = $ignoreUserId;
        }

        $sql .= ' LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return (bool) $stmt->fetch();
    }

    public function createStaffUser(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO users
                (role, name, phone_number, email, password_hash, address, account_status,
                 is_approved, staff_showroom_id, created_at, updated_at, deleted_at)
             VALUES
                (\'seller_staff\', :name, :phone_number, :email, :password_hash, NULL, :account_status,
                 1, :staff_showroom_id, :created_at, :updated_at, NULL)'
        );
        $stmt->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    public function updateStaffUser(int $userId, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE users
             SET name = :name,
                 phone_number = :phone_number,
                 email = :email,
                 password_hash = COALESCE(:password_hash, password_hash),
                 account_status = :account_status,
                 updated_at = :updated_at
             WHERE id = :id
             AND role = \'seller_staff\'
             AND deleted_at IS NULL'
        );
        $data['id'] = $userId;
        $stmt->execute($data);
    }

    public function findById(int $userId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, name, email, phone_number, account_status, staff_showroom_id, created_at, updated_at
             FROM users
             WHERE id = :id
             AND role = \'seller_staff\'
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $userId]);
        $staff = $stmt->fetch();

        return $staff ?: null;
    }

    public function countByShowroomId(int $showroomId): int
    {
        $stmt = $this->pdo->prepare(
            "SELECT COUNT(*) AS total FROM users
             WHERE role = 'seller_staff' AND staff_showroom_id = :showroom_id AND deleted_at IS NULL"
        );
        $stmt->execute(['showroom_id' => $showroomId]);

        return (int) ($stmt->fetch()['total'] ?? 0);
    }

    public function listByShowroomId(int $showroomId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT id, name, email, phone_number, account_status, staff_showroom_id, created_at, updated_at
             FROM users
             WHERE role = 'seller_staff' AND staff_showroom_id = :showroom_id AND deleted_at IS NULL
             ORDER BY created_at ASC"
        );
        $stmt->execute(['showroom_id' => $showroomId]);

        return $stmt->fetchAll();
    }
}
