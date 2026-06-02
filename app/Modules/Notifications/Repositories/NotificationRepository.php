<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Repositories;

use PDO;

class NotificationRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO notifications
                (user_id, role, type, title, body, data_json, link_url, icon_key, priority,
                 source_type, source_id, actor_user_id, is_read, read_at, expires_at,
                 created_at, updated_at, deleted_at)
             VALUES
                (:user_id, :role, :type, :title, :body, :data_json, :link_url, :icon_key, :priority,
                 :source_type, :source_id, :actor_user_id, :is_read, :read_at, :expires_at,
                 :created_at, :updated_at, :deleted_at)'
        );
        $stmt->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    public function findBySourceForUser(
        int $userId,
        string $role,
        string $type,
        string $sourceType,
        string $sourceId
    ): ?array {
        $stmt = $this->pdo->prepare(
            'SELECT id, user_id, role, type, title, body, data_json, link_url, icon_key, priority,
                    source_type, source_id, actor_user_id, is_read, read_at, expires_at,
                    created_at, updated_at
             FROM notifications
             WHERE user_id = :user_id
             AND role = :role
             AND type = :type
             AND source_type = :source_type
             AND source_id = :source_id
             AND deleted_at IS NULL
             ORDER BY id DESC
             LIMIT 1'
        );
        $stmt->execute([
            'user_id' => $userId,
            'role' => $role,
            'type' => $type,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
        ]);
        $notification = $stmt->fetch();

        return $notification ?: null;
    }

    public function findUserById(int $userId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, role, name, email
             FROM users
             WHERE id = :id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function listActiveAdmins(): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, role, name, email
             FROM users
             WHERE role = \'admin\'
             AND account_status = \'active\'
             AND is_approved = 1
             AND deleted_at IS NULL
             ORDER BY id ASC'
        );
        $stmt->execute();

        return $stmt->fetchAll() ?: [];
    }

    public function findForUser(int $notificationId, int $userId, string $role): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, user_id, role, type, title, body, data_json, link_url, icon_key, priority,
                    source_type, source_id, actor_user_id, is_read, read_at, expires_at,
                    created_at, updated_at
             FROM notifications
             WHERE id = :id
             AND user_id = :user_id
             AND role = :role
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute([
            'id' => $notificationId,
            'user_id' => $userId,
            'role' => $role,
        ]);
        $notification = $stmt->fetch();

        return $notification ?: null;
    }

    public function latestForUser(int $userId, string $role, int $limit): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, user_id, role, type, title, body, data_json, link_url, icon_key, priority,
                    source_type, source_id, actor_user_id, is_read, read_at, expires_at,
                    created_at, updated_at
             FROM notifications
             WHERE user_id = :user_id
             AND role = :role
             AND deleted_at IS NULL
             AND (expires_at IS NULL OR expires_at > :now)
             ORDER BY created_at DESC, id DESC
             LIMIT :limit'
        );
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':role', $role);
        $stmt->bindValue(':now', date('Y-m-d H:i:s'));
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll() ?: [];
    }

    public function listForUser(int $userId, string $role, array $filters, int $limit, ?int $cursor): array
    {
        $conditions = [
            'user_id = :user_id',
            'role = :role',
            'deleted_at IS NULL',
            '(expires_at IS NULL OR expires_at > :now)',
        ];
        $params = [
            'user_id' => $userId,
            'role' => $role,
            'now' => date('Y-m-d H:i:s'),
        ];

        if (($filters['status'] ?? 'all') === 'unread') {
            $conditions[] = 'is_read = 0';
        }

        if (($filters['status'] ?? 'all') === 'read') {
            $conditions[] = 'is_read = 1';
        }

        if ($cursor !== null && $cursor > 0) {
            $conditions[] = 'id < :cursor';
            $params['cursor'] = $cursor;
        }

        $sql = 'SELECT id, user_id, role, type, title, body, data_json, link_url, icon_key, priority,
                       source_type, source_id, actor_user_id, is_read, read_at, expires_at,
                       created_at, updated_at
                FROM notifications
                WHERE ' . implode(' AND ', $conditions) . '
                ORDER BY created_at DESC, id DESC
                LIMIT :limit';

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $paramType = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
            $stmt->bindValue(':' . $key, $value, $paramType);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll() ?: [];
    }

    public function unreadCountForUser(int $userId, string $role): int
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) AS total
             FROM notifications
             WHERE user_id = :user_id
             AND role = :role
             AND is_read = 0
             AND deleted_at IS NULL
             AND (expires_at IS NULL OR expires_at > :now)'
        );
        $stmt->execute([
            'user_id' => $userId,
            'role' => $role,
            'now' => date('Y-m-d H:i:s'),
        ]);

        return (int) ($stmt->fetch()['total'] ?? 0);
    }

    public function markRead(int $notificationId, int $userId, string $role, string $readAt): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE notifications
             SET is_read = 1,
                 read_at = COALESCE(read_at, :read_at),
                 updated_at = :updated_at
             WHERE id = :id
             AND user_id = :user_id
             AND role = :role
             AND deleted_at IS NULL'
        );
        $stmt->execute([
            'id' => $notificationId,
            'user_id' => $userId,
            'role' => $role,
            'read_at' => $readAt,
            'updated_at' => $readAt,
        ]);
    }

    public function markAllRead(int $userId, string $role, string $readAt): int
    {
        $stmt = $this->pdo->prepare(
            'UPDATE notifications
             SET is_read = 1,
                 read_at = COALESCE(read_at, :read_at),
                 updated_at = :updated_at
             WHERE user_id = :user_id
             AND role = :role
             AND is_read = 0
             AND deleted_at IS NULL'
        );
        $stmt->execute([
            'user_id' => $userId,
            'role' => $role,
            'read_at' => $readAt,
            'updated_at' => $readAt,
        ]);

        return $stmt->rowCount();
    }
}
