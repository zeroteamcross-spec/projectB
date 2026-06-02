<?php

declare(strict_types=1);

namespace App\Modules\Affiliate\Repositories;

use PDO;

class AffiliateClickLogRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function create(int $affiliateId, array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO affiliate_click_logs
                (affiliate_id, clicked_at, ip_address, user_agent, landing_url, created_at)
             VALUES
                (:affiliate_id, :clicked_at, :ip_address, :user_agent, :landing_url, :created_at)'
        );
        $data['affiliate_id'] = $affiliateId;
        $stmt->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    public function incrementAffiliateClicks(int $affiliateId): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE affiliates
             SET total_clicks = total_clicks + 1,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );
        $stmt->execute([
            'id' => $affiliateId,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function listByAffiliate(int $affiliateId, int $limit, int $offset): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, affiliate_id, clicked_at, ip_address, user_agent, landing_url, created_at
             FROM affiliate_click_logs
             WHERE affiliate_id = :affiliate_id
             ORDER BY clicked_at DESC, id DESC
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':affiliate_id', $affiliateId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function countByAffiliate(int $affiliateId): int
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) AS total
             FROM affiliate_click_logs
             WHERE affiliate_id = :affiliate_id'
        );
        $stmt->execute(['affiliate_id' => $affiliateId]);

        return (int) ($stmt->fetch()['total'] ?? 0);
    }

    public function todayCountByAffiliate(int $affiliateId): int
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) AS total
             FROM affiliate_click_logs
             WHERE affiliate_id = :affiliate_id
             AND DATE(clicked_at) = CURRENT_DATE()'
        );
        $stmt->execute(['affiliate_id' => $affiliateId]);

        return (int) ($stmt->fetch()['total'] ?? 0);
    }

    public function topLandingByAffiliate(int $affiliateId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT landing_url, COUNT(*) AS total
             FROM affiliate_click_logs
             WHERE affiliate_id = :affiliate_id
             AND landing_url IS NOT NULL
             AND landing_url <> \'\'
             GROUP BY landing_url
             ORDER BY total DESC, landing_url ASC
             LIMIT 1'
        );
        $stmt->execute(['affiliate_id' => $affiliateId]);
        $row = $stmt->fetch();

        return $row ?: null;
    }
}
