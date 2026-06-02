<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Auth\Policies\AuthPolicy;
use App\Modules\MasterData\Requests\UpsertMasterDataRequest;
use App\Modules\MasterData\Services\MasterDataService;

class MasterDataController extends Controller
{
    private MasterDataService $service;

    public function __construct(MasterDataService $service)
    {
        parent::__construct();

        $this->service = $service;
    }

    public function show(Request $request): JsonResponse
    {
        return JsonResponse::success([
            'master' => $this->service->get((string) $request->routeParam('master_key')),
        ], 'Master data berhasil diambil.');
    }

    public function upsert(Request $request): JsonResponse
    {
        AuthPolicy::requireRole($request->user(), ['admin']);
        $payload = (new UpsertMasterDataRequest($request))->validate();

        return JsonResponse::success([
            'master' => $this->service->upsert((string) $request->routeParam('master_key'), $payload),
        ], 'Master data berhasil disimpan.');
    }
}
