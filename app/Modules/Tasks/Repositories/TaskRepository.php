<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Repositories;

use App\Modules\Tasks\Support\TaskCatalog;
use PDO;

class TaskRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function ensureFirstTask(): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO tasks
                (task_key, title, description, status, requested_by_user_id, completed_by_user_id,
                 completed_at, created_at, updated_at, deleted_at)
             VALUES
                (:task_key, :title, :description, :status, NULL, NULL, NULL, :created_at, NULL, NULL)
             ON DUPLICATE KEY UPDATE task_key = VALUES(task_key)'
        );
        foreach ($this->taskCatalog() as $task) {
            $stmt->execute($task);
        }
    }

    private function taskCatalog(): array
    {
        return [
            [
                'task_key' => TaskCatalog::FIRST_TASK_KEY,
                'title' => TaskCatalog::FIRST_TASK_TITLE,
                'description' => TaskCatalog::FIRST_TASK_DESCRIPTION,
                'status' => 'open',
                'created_at' => '2026-10-01 00:00:00',
            ],
            [
                'task_key' => TaskCatalog::SHOWROOM_INSPECTION_MASTER_TASK_KEY,
                'title' => TaskCatalog::SHOWROOM_INSPECTION_MASTER_TASK_TITLE,
                'description' => TaskCatalog::SHOWROOM_INSPECTION_MASTER_TASK_DESCRIPTION,
                'status' => 'open',
                'created_at' => '2026-10-08 00:00:00',
            ],
        ];
    }

    public function listAll(): array
    {
        $stmt = $this->pdo->query(
            'SELECT t.id, t.task_key, t.title, t.description, t.status,
                    t.requested_by_user_id, requested.name AS requested_by_name,
                    t.completed_by_user_id, completed.name AS completed_by_name,
                    t.completed_at, t.created_at, t.updated_at
             FROM tasks t
             LEFT JOIN users requested ON requested.id = t.requested_by_user_id
             LEFT JOIN users completed ON completed.id = t.completed_by_user_id
             WHERE t.deleted_at IS NULL
             ORDER BY CASE WHEN t.status = \'open\' THEN 0 ELSE 1 END,
                      t.created_at ASC, t.id ASC'
        );

        return $stmt->fetchAll() ?: [];
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT t.id, t.task_key, t.title, t.description, t.status,
                    t.requested_by_user_id, requested.name AS requested_by_name,
                    t.completed_by_user_id, completed.name AS completed_by_name,
                    t.completed_at, t.created_at, t.updated_at
             FROM tasks t
             LEFT JOIN users requested ON requested.id = t.requested_by_user_id
             LEFT JOIN users completed ON completed.id = t.completed_by_user_id
             WHERE t.id = :id
             AND t.deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $task = $stmt->fetch();

        return $task ?: null;
    }

    public function updateStatus(int $id, string $status, ?int $completedByUserId, ?string $completedAt, string $updatedAt): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE tasks
             SET status = :status,
                 completed_by_user_id = :completed_by_user_id,
                 completed_at = :completed_at,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );
        $stmt->bindValue(':status', $status);
        $stmt->bindValue(':completed_by_user_id', $completedByUserId, $completedByUserId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindValue(':completed_at', $completedAt, $completedAt === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $stmt->bindValue(':updated_at', $updatedAt);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
    }
}
