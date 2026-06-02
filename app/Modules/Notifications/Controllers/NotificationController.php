<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Notifications\Services\NotificationService;

class NotificationController extends Controller
{
    private NotificationService $service;

    public function __construct(NotificationService $service)
    {
        parent::__construct();

        $this->service = $service;
    }

    public function snapshot(Request $request): JsonResponse
    {
        return JsonResponse::success(
            $this->service->snapshot($this->user($request)),
            'Snapshot notifikasi berhasil diambil.'
        );
    }

    public function list(Request $request): JsonResponse
    {
        return JsonResponse::success(
            $this->service->list($this->user($request), $request->query()),
            'Daftar notifikasi berhasil diambil.'
        );
    }

    public function markRead(Request $request): JsonResponse
    {
        return JsonResponse::success(
            $this->service->markRead($this->user($request), (int) $request->routeParam('notification_id')),
            'Notifikasi ditandai sudah dibaca.'
        );
    }

    public function markAllRead(Request $request): JsonResponse
    {
        return JsonResponse::success(
            $this->service->markAllRead($this->user($request)),
            'Semua notifikasi ditandai sudah dibaca.'
        );
    }
}
