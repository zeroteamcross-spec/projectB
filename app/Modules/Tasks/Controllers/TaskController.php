<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Tasks\Services\TaskService;
use App\Modules\Tasks\Support\TasksSchema;

class TaskController extends Controller
{
    private TaskService $service;

    private TasksSchema $schema;

    public function __construct(TaskService $service, TasksSchema $schema)
    {
        parent::__construct();

        $this->service = $service;
        $this->schema = $schema;
    }

    public function index(Request $request): JsonResponse
    {
        $this->schema->ensure();

        return JsonResponse::success([
            'tasks' => $this->service->list($this->user($request)),
        ], 'Daftar tugas berhasil diambil.');
    }

    public function update(Request $request): JsonResponse
    {
        $this->schema->ensure();
        $status = trim((string) $request->input('status', ''));
        $task = $this->service->updateStatus(
            $this->user($request),
            (int) $request->routeParam('task_id'),
            $status
        );

        return JsonResponse::success([
            'task' => $task,
        ], 'Status tugas berhasil diperbarui.');
    }
}
