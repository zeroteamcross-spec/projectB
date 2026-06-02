<?php

declare(strict_types=1);

namespace App\Modules\ApiVersion\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\ApiVersion\Services\ApiVersionService;

class ApiVersionController extends Controller
{
    private ApiVersionService $service;

    public function __construct(ApiVersionService $service)
    {
        parent::__construct();

        $this->service = $service;
    }

    public function show(Request $request): JsonResponse
    {
        return JsonResponse::success([
            'version' => $this->service->get((string) $request->routeParam('resource_name')),
        ], 'Versi resource berhasil diambil.');
    }
}
