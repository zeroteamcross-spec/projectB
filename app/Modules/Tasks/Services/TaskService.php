<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Services;

use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\ValidationException;
use App\Modules\Auth\Policies\AuthPolicy;
use App\Modules\Tasks\Repositories\TaskRepository;

class TaskService
{
    private TaskRepository $tasks;

    public function __construct(TaskRepository $tasks)
    {
        $this->tasks = $tasks;
    }

    public function list(array $user): array
    {
        AuthPolicy::requireAdmin($user);
        $this->tasks->ensureFirstTask();

        return array_map([$this, 'map'], $this->tasks->listAll());
    }

    public function updateStatus(array $user, int $taskId, string $status): array
    {
        AuthPolicy::requireAdmin($user);

        if ($taskId <= 0) {
            throw new ValidationException(['task_id' => 'ID tugas tidak valid.']);
        }

        if (! in_array($status, ['open', 'sip'], true)) {
            throw new ValidationException(['status' => 'Status tugas harus open atau sip.']);
        }

        if (! $this->tasks->findById($taskId)) {
            throw new NotFoundException('Tugas tidak ditemukan.');
        }

        $now = date('Y-m-d H:i:s');
        $this->tasks->updateStatus(
            $taskId,
            $status,
            $status === 'sip' ? (int) ($user['id'] ?? 0) : null,
            $status === 'sip' ? $now : null,
            $now
        );

        return $this->map($this->tasks->findById($taskId));
    }

    private function map(?array $task): array
    {
        return [
            'id' => (int) ($task['id'] ?? 0),
            'task_key' => (string) ($task['task_key'] ?? ''),
            'title' => (string) ($task['title'] ?? ''),
            'description' => $task['description'] !== null ? (string) $task['description'] : null,
            'status' => (string) ($task['status'] ?? 'open'),
            'requested_by_user_id' => $task['requested_by_user_id'] !== null ? (int) $task['requested_by_user_id'] : null,
            'requested_by_name' => $task['requested_by_name'] !== null ? (string) $task['requested_by_name'] : null,
            'completed_by_user_id' => $task['completed_by_user_id'] !== null ? (int) $task['completed_by_user_id'] : null,
            'completed_by_name' => $task['completed_by_name'] !== null ? (string) $task['completed_by_name'] : null,
            'completed_at' => $task['completed_at'] !== null ? (string) $task['completed_at'] : null,
            'created_at' => (string) ($task['created_at'] ?? ''),
            'updated_at' => $task['updated_at'] !== null ? (string) $task['updated_at'] : null,
        ];
    }
}
