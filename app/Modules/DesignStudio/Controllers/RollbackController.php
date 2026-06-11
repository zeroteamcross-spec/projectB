<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Core\Exceptions\ValidationException;
use App\Modules\Auth\Policies\AuthPolicy;
use App\Modules\DesignStudio\Services\RollbackService;
use App\Modules\DesignStudio\Services\VersionTimelineService;

class RollbackController extends Controller
{
    private RollbackService $rollbackService;
    private VersionTimelineService $timelineService;

    public function __construct(RollbackService $rollbackService, VersionTimelineService $timelineService)
    {
        parent::__construct();
        $this->rollbackService = $rollbackService;
        $this->timelineService = $timelineService;
    }

    public function timeline(Request $request): JsonResponse
    {
        $actor = $this->user($request);
        AuthPolicy::requireRole($actor, ['super_admin']);

        $route = (string) $request->query('route', '');

        if ($route === '') {
            throw new ValidationException([
                'route' => 'Parameter route wajib diisi.',
            ]);
        }

        $timeline = $this->timelineService->timeline($route);

        return JsonResponse::success($timeline, 'Timeline riwayat versi berhasil dimuat.');
    }

    public function preview(Request $request): JsonResponse
    {
        $actor = $this->user($request);
        AuthPolicy::requireRole($actor, ['super_admin']);

        $route = (string) $request->query('route', '');
        $targetVersion = (int) $request->query('targetVersion', 0);

        if ($route === '') {
            throw new ValidationException([
                'route' => 'Parameter route wajib diisi.',
            ]);
        }

        if ($targetVersion <= 0) {
            throw new ValidationException([
                'targetVersion' => 'Parameter targetVersion wajib berupa integer positif.',
            ]);
        }

        $preview = $this->rollbackService->preview($route, $targetVersion);

        if ($preview === null) {
            return JsonResponse::error('Gagal memuat pratinjau rollback. Pastikan versi target valid.', [], 400);
        }

        return JsonResponse::success($preview, 'Pratinjau rollback berhasil dimuat.');
    }

    public function rollback(Request $request): JsonResponse
    {
        $actor = $this->user($request);
        AuthPolicy::requireRole($actor, ['super_admin']);

        $route = (string) $request->query('route', '');

        if ($route === '') {
            throw new ValidationException([
                'route' => 'Parameter route wajib diisi.',
            ]);
        }

        $targetVersion = (int) $request->input('targetVersion', 0);
        $rollbackNote = (string) $request->input('rollbackNote', '');

        if ($targetVersion <= 0) {
            throw new ValidationException([
                'targetVersion' => 'Parameter targetVersion wajib berupa integer positif.',
            ]);
        }

        if (strlen(trim($rollbackNote)) < 5 || strlen(trim($rollbackNote)) > 500) {
            throw new ValidationException([
                'rollbackNote' => 'Rollback note wajib diisi antara 5 hingga 500 karakter.',
            ]);
        }

        $actorId = isset($actor['id']) ? (int) $actor['id'] : null;

        if ($actorId === null) {
            return JsonResponse::error('User ID tidak valid.', [], 400);
        }

        $snapshot = $this->rollbackService->rollback($route, $targetVersion, $actorId, $rollbackNote);

        if ($snapshot === null) {
            return JsonResponse::error('Gagal melakukan rollback. Pastikan versi target ada dan valid.', [], 500);
        }

        return JsonResponse::success([
            'route' => $route,
            'published' => $snapshot,
        ], 'Rollback berhasil dilakukan.');
    }
}
