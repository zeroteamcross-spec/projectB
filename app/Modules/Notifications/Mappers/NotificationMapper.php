<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Mappers;

class NotificationMapper
{
    public static function notification(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'user_id' => (int) $row['user_id'],
            'role' => $row['role'],
            'type' => $row['type'],
            'title' => $row['title'],
            'body' => $row['body'],
            'data' => self::decodeJson($row['data_json'] ?? null),
            'link_url' => $row['link_url'] ?? null,
            'icon_key' => $row['icon_key'] ?? null,
            'priority' => $row['priority'] ?? 'normal',
            'source_type' => $row['source_type'] ?? null,
            'source_id' => $row['source_id'] ?? null,
            'actor_user_id' => isset($row['actor_user_id']) ? (int) $row['actor_user_id'] : null,
            'is_read' => (bool) ($row['is_read'] ?? false),
            'read_at' => $row['read_at'] ?? null,
            'expires_at' => $row['expires_at'] ?? null,
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }

    public static function snapshotNotification(array $row): array
    {
        $notification = self::notification($row);

        return [
            'id' => $notification['id'],
            'type' => $notification['type'],
            'title' => $notification['title'],
            'body' => $notification['body'],
            'data' => $notification['data'],
            'icon_key' => $notification['icon_key'],
            'link_url' => $notification['link_url'],
            'is_read' => $notification['is_read'],
            'created_at' => $notification['created_at'],
        ];
    }

    private static function decodeJson(?string $json): array
    {
        if ($json === null || trim($json) === '') {
            return [];
        }

        $decoded = json_decode($json, true);

        return is_array($decoded) ? $decoded : [];
    }
}
