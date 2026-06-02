<?php

declare(strict_types=1);

namespace App\Modules\Auth\Repositories;

use PDO;

class AuthUserRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function emailExists(string $email): bool
    {
        $stmt = $this->pdo->prepare('SELECT id FROM users WHERE email = :email AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['email' => $email]);

        return (bool) $stmt->fetch();
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE email = :email AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function findByPhoneAndOtp(string $phoneNumber, string $otpCode): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM users
             WHERE phone_number = :phone_number
             AND otp_code = :otp_code
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute([
            'phone_number' => $phoneNumber,
            'otp_code' => $otpCode,
        ]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function createUser(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO users
                (role, name, phone_number, email, password_hash, address, account_status,
                 otp_code, otp_expires_at, security_key, is_approved, created_at, updated_at)
             VALUES
                (:role, :name, :phone_number, :email, :password_hash, :address, :account_status,
                 :otp_code, :otp_expires_at, :security_key, :is_approved, :created_at, :updated_at)'
        );

        $stmt->execute([
            'role' => $data['role'],
            'name' => $data['name'],
            'phone_number' => $data['phone_number'] ?? null,
            'email' => $data['email'],
            'password_hash' => $data['password_hash'],
            'address' => $data['address'] ?? null,
            'account_status' => $data['account_status'],
            'otp_code' => $data['otp_code'] ?? null,
            'otp_expires_at' => $data['otp_expires_at'] ?? null,
            'security_key' => $data['security_key'] ?? null,
            'is_approved' => $data['is_approved'],
            'created_at' => $data['created_at'],
            'updated_at' => $data['updated_at'] ?? null,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function createShowroom(int $userId, array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO showrooms
                (user_id, name, address, phone_number, bank_account_number,
                 bank_type, bank_account_name, created_at, updated_at)
             VALUES
                (:user_id, :name, :address, :phone_number, :bank_account_number,
                 :bank_type, :bank_account_name, :created_at, :updated_at)'
        );

        $stmt->execute([
            'user_id' => $userId,
            'name' => $data['name'],
            'address' => $data['address'] ?? null,
            'phone_number' => $data['phone_number'] ?? null,
            'bank_account_number' => $data['bank_account_number'] ?? null,
            'bank_type' => $data['bank_type'] ?? null,
            'bank_account_name' => $data['bank_account_name'] ?? null,
            'created_at' => $data['created_at'],
            'updated_at' => $data['updated_at'] ?? null,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function clearOtp(int $userId): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE users SET otp_code = NULL, otp_expires_at = NULL, updated_at = :updated_at WHERE id = :id'
        );
        $stmt->execute([
            'id' => $userId,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function pendingUsers(int $limit = 500): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, role, name, phone_number, email, account_status, is_approved, created_at, updated_at
             FROM users
             WHERE deleted_at IS NULL
             AND (account_status = :account_status OR is_approved = 0)
             ORDER BY id DESC
             LIMIT :limit'
        );
        $stmt->bindValue('account_status', 'pending');
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function approveUsers(array $userIds): int
    {
        if ($userIds === []) {
            return 0;
        }

        $placeholders = implode(',', array_fill(0, count($userIds), '?'));
        $stmt = $this->pdo->prepare(
            "UPDATE users
             SET account_status = 'active', is_approved = 1, updated_at = ?
             WHERE id IN ($placeholders)
             AND deleted_at IS NULL"
        );

        $stmt->execute(array_merge([date('Y-m-d H:i:s')], array_values($userIds)));

        return $stmt->rowCount();
    }
}
