<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Support;

use App\Core\Exceptions\HttpException;
use App\Infrastructure\Database\SchemaBootstrapper;
use Throwable;

class TasksSchema
{
    private SchemaBootstrapper $bootstrapper;

    public function __construct(SchemaBootstrapper $bootstrapper)
    {
        $this->bootstrapper = $bootstrapper;
    }

    public function ensure(): void
    {
        try {
            $this->bootstrapper->ensureTable('tasks', $this->createTasksTableSql());
        } catch (Throwable $exception) {
            error_log('Tasks schema bootstrap failed: ' . $exception->getMessage());

            throw new HttpException(
                'Schema tugas belum siap. Periksa privilege CREATE TABLE dan konfigurasi database.',
                500
            );
        }
    }

    private function createTasksTableSql(): string
    {
        return <<<'SQL'
CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_key VARCHAR(120) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  status ENUM('open', 'sip') NOT NULL DEFAULT 'open',
  requested_by_user_id BIGINT UNSIGNED NULL,
  completed_by_user_id BIGINT UNSIGNED NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tasks_task_key (task_key),
  KEY idx_tasks_status_created (status, created_at, id),
  KEY idx_tasks_requested_by_user (requested_by_user_id),
  KEY idx_tasks_completed_by_user (completed_by_user_id),
  CONSTRAINT fk_tasks_requested_by_user
    FOREIGN KEY (requested_by_user_id) REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_tasks_completed_by_user
    FOREIGN KEY (completed_by_user_id) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL;
    }
}
