<?php

declare(strict_types=1);

namespace App\Modules\Affiliate\Repositories;

use PDO;

class AffiliateRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function findUser(int $userId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, role, name, email, account_status, is_approved
             FROM users
             WHERE id = :id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch();

        return $user ?: null;
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

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT a.id, a.user_id, a.seller_user_id, a.referral_code,
                    a.commission_type, a.commission_percent, a.commission_flat,
                    a.total_clicks, a.total_transactions, a.total_commission,
                    a.status, a.created_at, a.updated_at,
                    u.name AS user_name, u.email AS user_email, u.role AS user_role, u.phone_number AS user_phone_number,
                    s.name AS seller_name, s.email AS seller_email,
                    sh.id AS showroom_id, sh.name AS showroom_name
             FROM affiliates AS a
             INNER JOIN users AS u ON u.id = a.user_id
             INNER JOIN users AS s ON s.id = a.seller_user_id
             LEFT JOIN showrooms AS sh ON sh.user_id = a.seller_user_id AND sh.deleted_at IS NULL
             WHERE a.id = :id
             AND a.deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $affiliate = $stmt->fetch();

        return $affiliate ?: null;
    }

    public function findByReferralCode(string $referralCode): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, user_id, seller_user_id, referral_code, commission_type,
                    commission_percent, commission_flat, total_clicks,
                    total_transactions, total_commission, status, created_at, updated_at
             FROM affiliates
             WHERE referral_code = :referral_code
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['referral_code' => $referralCode]);
        $affiliate = $stmt->fetch();

        return $affiliate ?: null;
    }

    public function findByUserId(int $userId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT a.id, a.user_id, a.seller_user_id, a.referral_code,
                    a.commission_type, a.commission_percent, a.commission_flat,
                    a.total_clicks, a.total_transactions, a.total_commission,
                    a.status, a.created_at, a.updated_at,
                    u.name AS user_name, u.email AS user_email, u.role AS user_role, u.phone_number AS user_phone_number,
                    s.name AS seller_name, s.email AS seller_email, s.phone_number AS seller_phone_number,
                    sh.id AS showroom_id, sh.slug AS showroom_slug, sh.name AS showroom_name, sh.address AS showroom_address, sh.phone_number AS showroom_phone_number
             FROM affiliates AS a
             INNER JOIN users AS u ON u.id = a.user_id
             INNER JOIN users AS s ON s.id = a.seller_user_id
             LEFT JOIN showrooms AS sh ON sh.user_id = a.seller_user_id AND sh.deleted_at IS NULL
             WHERE a.user_id = :user_id
             AND a.deleted_at IS NULL
             ORDER BY a.created_at DESC, a.id DESC
             LIMIT 1'
        );
        $stmt->execute(['user_id' => $userId]);
        $affiliate = $stmt->fetch();

        return $affiliate ?: null;
    }

    public function findPublicContextByReferralCode(string $referralCode): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT a.id, a.user_id, a.seller_user_id, a.referral_code, a.status,
                    u.name AS affiliate_name, u.email AS affiliate_email, u.phone_number AS affiliate_phone_number,
                    s.name AS seller_name, s.email AS seller_email, s.phone_number AS seller_phone_number,
                    sh.id AS showroom_id, sh.slug AS showroom_slug, sh.name AS showroom_name, sh.address AS showroom_address, sh.phone_number AS showroom_phone_number, sh.header_logo_url AS showroom_header_logo_url
             FROM affiliates AS a
             INNER JOIN users AS u ON u.id = a.user_id
             INNER JOIN users AS s ON s.id = a.seller_user_id
             LEFT JOIN showrooms AS sh ON sh.user_id = a.seller_user_id AND sh.deleted_at IS NULL
             WHERE a.referral_code = :referral_code
             AND a.deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['referral_code' => $referralCode]);
        $affiliate = $stmt->fetch();

        return $affiliate ?: null;
    }

    public function referralCodeExists(string $referralCode, ?int $ignoreAffiliateId = null): bool
    {
        $sql = 'SELECT id FROM affiliates WHERE referral_code = :referral_code AND deleted_at IS NULL';
        $params = ['referral_code' => $referralCode];

        if ($ignoreAffiliateId !== null) {
            $sql .= ' AND id <> :id';
            $params['id'] = $ignoreAffiliateId;
        }

        $sql .= ' LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return (bool) $stmt->fetch();
    }

    public function relationExists(int $userId, int $sellerUserId, ?int $ignoreAffiliateId = null): bool
    {
        $sql = 'SELECT id FROM affiliates
                WHERE user_id = :user_id
                AND seller_user_id = :seller_user_id
                AND deleted_at IS NULL';
        $params = [
            'user_id' => $userId,
            'seller_user_id' => $sellerUserId,
        ];

        if ($ignoreAffiliateId !== null) {
            $sql .= ' AND id <> :id';
            $params['id'] = $ignoreAffiliateId;
        }

        $sql .= ' LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return (bool) $stmt->fetch();
    }

    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO affiliates
                (user_id, seller_user_id, referral_code, commission_type,
                 commission_percent, commission_flat, total_clicks,
                 total_transactions, total_commission, status, created_at, updated_at, deleted_at)
             VALUES
                (:user_id, :seller_user_id, :referral_code, :commission_type,
                 :commission_percent, :commission_flat, 0, 0, 0.00, :status, :created_at, NULL, NULL)'
        );
        $stmt->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    public function createAffiliateUser(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO users
                (role, name, phone_number, email, password_hash, address, account_status,
                 is_approved, created_at, updated_at, deleted_at)
             VALUES
                (:role, :name, :phone_number, :email, :password_hash, :address, :account_status,
                 :is_approved, :created_at, :updated_at, NULL)'
        );
        $stmt->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    public function listBySeller(int $sellerUserId, int $limit, int $offset): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT a.id, a.user_id, a.seller_user_id, a.referral_code,
                    a.commission_type, a.commission_percent, a.commission_flat,
                    a.total_clicks, a.total_transactions, a.total_commission,
                    a.status, a.created_at, a.updated_at,
                    u.name AS user_name, u.email AS user_email, u.role AS user_role, u.phone_number AS user_phone_number,
                    s.name AS seller_name, s.email AS seller_email,
                    sh.id AS showroom_id, sh.name AS showroom_name
             FROM affiliates AS a
             INNER JOIN users AS u ON u.id = a.user_id
             INNER JOIN users AS s ON s.id = a.seller_user_id
             LEFT JOIN showrooms AS sh ON sh.user_id = a.seller_user_id AND sh.deleted_at IS NULL
             WHERE a.seller_user_id = :seller_user_id
             AND a.deleted_at IS NULL
             ORDER BY a.created_at DESC, a.id DESC
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':seller_user_id', $sellerUserId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function countBySeller(int $sellerUserId): int
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) AS total FROM affiliates WHERE seller_user_id = :seller_user_id AND deleted_at IS NULL'
        );
        $stmt->execute(['seller_user_id' => $sellerUserId]);

        return (int) ($stmt->fetch()['total'] ?? 0);
    }

    public function updateAffiliateUser(int $userId, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE users
             SET name = :name,
                 phone_number = :phone_number,
                 email = :email,
                 password_hash = COALESCE(:password_hash, password_hash),
                 account_status = :account_status,
                 is_approved = :is_approved,
                 updated_at = :updated_at,
                 deleted_at = NULL
             WHERE id = :id
             AND deleted_at IS NULL'
        );
        $data['id'] = $userId;
        $stmt->execute($data);
    }

    public function updateSettings(int $affiliateId, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE affiliates
             SET referral_code = :referral_code,
                 commission_type = :commission_type,
                 commission_percent = :commission_percent,
                 commission_flat = :commission_flat,
                 status = :status,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );
        $data['id'] = $affiliateId;
        $stmt->execute($data);
    }
}
