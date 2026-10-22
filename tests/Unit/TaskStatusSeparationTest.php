<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\ValidationException;
use App\Modules\Tasks\Repositories\TaskRepository;
use App\Modules\Tasks\Services\TaskService;
use PDO;
use Tests\TestCase;

class TaskStatusSeparationTest extends TestCase
{
    public function run(): void
    {
        [$pdo, $service] = $this->makeService();
        $admin = ['id' => 73, 'role' => 'admin'];

        $updatedWork = $service->updateWorkStatus($admin, 10, 'done');
        $this->assertSame('done', $updatedWork['work_status']);
        $this->assertSame('open', $updatedWork['status'], 'Marking work done must not confirm it for the owner.');
        $this->assertSame(null, $updatedWork['completed_at']);
        $this->assertSame(null, $updatedWork['completed_by_user_id']);

        $acknowledged = $service->updateStatusPublic(10, 'sip');
        $this->assertSame('sip', $acknowledged['status']);
        $this->assertSame('done', $acknowledged['work_status'], 'Owner confirmation must preserve the work badge.');
        $this->assertSame(null, $acknowledged['completed_by_user_id']);
        $this->assertNotNull($acknowledged['completed_at']);

        $pendingWork = $service->updateWorkStatus($admin, 10, 'pending');
        $this->assertSame('pending', $pendingWork['work_status']);
        $this->assertSame('sip', $pendingWork['status'], 'Changing the work badge must preserve owner confirmation.');
        $this->assertNotNull($pendingWork['completed_at']);

        $this->expectException(ForbiddenException::class, static function () use ($service): void {
            $service->updateWorkStatus(['id' => 5, 'role' => 'buyer'], 10, 'done');
        });

        $this->expectException(ValidationException::class, static function () use ($service, $admin): void {
            $service->updateWorkStatus($admin, 10, 'sip');
        }, 'work_status');

        $row = $pdo->query('SELECT status, work_status FROM tasks WHERE id = 10')->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('sip', $row['status']);
        $this->assertSame('pending', $row['work_status']);
    }

    /**
     * @return array{0: PDO, 1: TaskService}
     */
    private function makeService(): array
    {
        $pdo = $this->sqlite();
        $pdo->exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');
        $pdo->exec('INSERT INTO users (id, name) VALUES (73, "UAT Admin")');
        $pdo->exec('CREATE TABLE tasks (
            id INTEGER PRIMARY KEY,
            task_key TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NULL,
            status TEXT NOT NULL,
            work_status TEXT NOT NULL,
            requested_by_user_id INTEGER NULL,
            completed_by_user_id INTEGER NULL,
            completed_at TEXT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NULL,
            deleted_at TEXT NULL
        )');
        $pdo->exec("INSERT INTO tasks
            (id, task_key, title, description, status, work_status, requested_by_user_id,
             completed_by_user_id, completed_at, created_at, updated_at, deleted_at)
            VALUES (10, 'request-test', 'Tugas uji pemisahan status', NULL, 'open', 'pending',
                    NULL, NULL, NULL, '2026-10-22 00:00:00', NULL, NULL)");

        return [$pdo, new TaskService(new TaskRepository($pdo))];
    }
}
