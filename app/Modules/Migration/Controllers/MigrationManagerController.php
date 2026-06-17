<?php

declare(strict_types=1);

namespace App\Modules\Migration\Controllers;

use App\Core\Controller;
use App\Core\Exceptions\HttpException;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Auth\Policies\AuthPolicy;
use App\Modules\Migration\Services\MigrationManagerService;

class MigrationManagerController extends Controller
{
    private MigrationManagerService $service;

    public function __construct(MigrationManagerService $service)
    {
        parent::__construct();

        $this->service = $service;
    }

    public function index(Request $request): JsonResponse
    {
        AuthPolicy::requireRole($this->user($request), ['super_admin']);

        return JsonResponse::success([
            'migrations' => $this->service->status(),
        ], 'Status migration berhasil diambil.');
    }

    public function run(Request $request): JsonResponse
    {
        AuthPolicy::requireRole($this->user($request), ['super_admin']);

        $limit = $request->input('limit');

        return JsonResponse::success([
            'results' => $this->service->runPending(is_numeric($limit) ? max(1, (int) $limit) : null),
            'migrations' => $this->service->status(),
        ], 'Migration pending selesai diproses.');
    }

    public function markApplied(Request $request): JsonResponse
    {
        AuthPolicy::requireRole($this->user($request), ['super_admin']);

        $name = (string) $request->routeParam('name', '');

        if ($name === '') {
            throw new HttpException('Nama migration wajib diisi.', 422, [
                'name' => 'Nama migration wajib diisi.',
            ]);
        }

        try {
            $migration = $this->service->markApplied(rawurldecode($name));
        } catch (\RuntimeException $exception) {
            throw new HttpException($exception->getMessage(), 404, [
                'name' => $exception->getMessage(),
            ]);
        }

        return JsonResponse::success([
            'migration' => $migration,
            'migrations' => $this->service->status(),
        ], 'Migration ditandai sudah migrasi.');
    }
}
