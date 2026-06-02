<?php

declare(strict_types=1);

namespace App\Modules\Affiliate\Repositories;

use PDO;

class AffiliateCommissionRuleRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function findGlobalRuleBySeller(int $sellerUserId, bool $activeOnly = false): ?array
    {
        $sql = 'SELECT id, seller_user_id, car_id, commission_type, commission_percent, commission_flat,
                       status, created_at, updated_at
                FROM affiliate_commission_rules
                WHERE seller_user_id = :seller_user_id
                AND car_id IS NULL
                AND deleted_at IS NULL';

        if ($activeOnly) {
            $sql .= ' AND status = \'active\'';
        }

        $sql .= ' LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['seller_user_id' => $sellerUserId]);
        $rule = $stmt->fetch();

        return $rule ?: null;
    }

    public function findOverrideByCar(int $sellerUserId, int $carId, ?int $ignoreRuleId = null, bool $activeOnly = false): ?array
    {
        $sql = 'SELECT id, seller_user_id, car_id, commission_type, commission_percent, commission_flat,
                       status, created_at, updated_at
                FROM affiliate_commission_rules
                WHERE seller_user_id = :seller_user_id
                AND car_id = :car_id
                AND deleted_at IS NULL';
        $params = [
            'seller_user_id' => $sellerUserId,
            'car_id' => $carId,
        ];

        if ($ignoreRuleId !== null) {
            $sql .= ' AND id <> :ignore_id';
            $params['ignore_id'] = $ignoreRuleId;
        }

        if ($activeOnly) {
            $sql .= ' AND status = \'active\'';
        }

        $sql .= ' LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $rule = $stmt->fetch();

        return $rule ?: null;
    }

    public function findById(int $ruleId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT r.id, r.seller_user_id, r.car_id, r.commission_type, r.commission_percent, r.commission_flat,
                    r.status, r.created_at, r.updated_at,
                    c.brand_name, c.model_name, c.sub_model_name, c.listing_status, c.price_cash
             FROM affiliate_commission_rules AS r
             LEFT JOIN cars AS c ON c.id = r.car_id AND c.deleted_at IS NULL
             WHERE r.id = :id
             AND r.deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $ruleId]);
        $rule = $stmt->fetch();

        return $rule ?: null;
    }

    public function listOverridesBySeller(int $sellerUserId, int $limit, int $offset): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT r.id, r.seller_user_id, r.car_id, r.commission_type, r.commission_percent, r.commission_flat,
                    r.status, r.created_at, r.updated_at,
                    c.brand_name, c.model_name, c.sub_model_name, c.listing_status, c.price_cash
             FROM affiliate_commission_rules AS r
             INNER JOIN cars AS c ON c.id = r.car_id AND c.deleted_at IS NULL
             WHERE r.seller_user_id = :seller_user_id
             AND r.car_id IS NOT NULL
             AND r.deleted_at IS NULL
             ORDER BY r.updated_at DESC, r.id DESC
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':seller_user_id', $sellerUserId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function countOverridesBySeller(int $sellerUserId): int
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) AS total
             FROM affiliate_commission_rules
             WHERE seller_user_id = :seller_user_id
             AND car_id IS NOT NULL
             AND deleted_at IS NULL'
        );
        $stmt->execute(['seller_user_id' => $sellerUserId]);

        return (int) ($stmt->fetch()['total'] ?? 0);
    }

    public function findSellerCar(int $sellerUserId, int $carId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, seller_user_id, brand_name, model_name, sub_model_name, listing_status, price_cash
             FROM cars
             WHERE id = :id
             AND seller_user_id = :seller_user_id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute([
            'id' => $carId,
            'seller_user_id' => $sellerUserId,
        ]);
        $car = $stmt->fetch();

        return $car ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO affiliate_commission_rules
                (seller_user_id, car_id, commission_type, commission_percent, commission_flat,
                 status, created_at, updated_at, deleted_at)
             VALUES
                (:seller_user_id, :car_id, :commission_type, :commission_percent, :commission_flat,
                 :status, :created_at, NULL, NULL)'
        );
        $stmt->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    public function update(int $ruleId, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE affiliate_commission_rules
             SET car_id = :car_id,
                 commission_type = :commission_type,
                 commission_percent = :commission_percent,
                 commission_flat = :commission_flat,
                 status = :status,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );
        $data['id'] = $ruleId;
        $stmt->execute($data);
    }
}
