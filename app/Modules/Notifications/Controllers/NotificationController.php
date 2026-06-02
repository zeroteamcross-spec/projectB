<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Notifications\Services\NotificationService;
use App\Modules\Notifications\Support\NotificationsSchema;

class NotificationController extends Controller
{
    private NotificationService $service;

    private NotificationsSchema $schema;

    public function __construct(NotificationService $service, NotificationsSchema $schema)
    {
        parent::__construct();

        $this->service = $service;
        $this->schema = $schema;
    }

    public function snapshot(Request $request): JsonResponse
    {
        $this->schema->ensure();

        return JsonResponse::success(
            $this->service->snapshot($this->user($request)),
            'Snapshot notifikasi berhasil diambil.'
        );
    }

    public function list(Request $request): JsonResponse
    {
        $this->schema->ensure();

        return JsonResponse::success(
            $this->service->list($this->user($request), $request->query()),
            'Daftar notifikasi berhasil diambil.'
        );
    }

    public function markRead(Request $request): JsonResponse
    {
        $this->schema->ensure();

        return JsonResponse::success(
            $this->service->markRead($this->user($request), (int) $request->routeParam('notification_id')),
            'Notifikasi ditandai sudah dibaca.'
        );
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $this->schema->ensure();

        return JsonResponse::success(
            $this->service->markAllRead($this->user($request)),
            'Semua notifikasi ditandai sudah dibaca.'
        );
    }
}
