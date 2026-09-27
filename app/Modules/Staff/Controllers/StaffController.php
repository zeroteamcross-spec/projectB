<?php

declare(strict_types=1);

namespace App\Modules\Staff\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Staff\Requests\UpsertStaffRequest;
use App\Modules\Staff\Services\StaffService;

class StaffController extends Controller
{
    private StaffService $service;

    public function __construct(StaffService $service)
    {
        parent::__construct();

        $this->service = $service;
    }

    public function listMine(Request $request): JsonResponse
    {
        $user = $this->user($request);

        return JsonResponse::success([
            'staff' => $this->service->listMine($user, (int) $request->routeParam('id')),
        ], 'Daftar staf berhasil diambil.');
    }

    public function create(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new UpsertStaffRequest($request))->validate();

        return JsonResponse::success([
            'staff' => $this->service->createManaged($user, (int) $request->routeParam('id'), $payload),
        ], 'Staf berhasil dibuat.', [], 201);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new UpsertStaffRequest($request))->validate();

        return JsonResponse::success([
            'staff' => $this->service->updateManaged(
                $user,
                (int) $request->routeParam('id'),
                (int) $request->routeParam('staff_id'),
                $payload
            ),
        ], 'Staf berhasil diperbarui.');
    }
}
