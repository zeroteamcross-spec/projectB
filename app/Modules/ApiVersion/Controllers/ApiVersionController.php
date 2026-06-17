<?php

declare(strict_types=1);

namespace App\Modules\ApiVersion\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\ApiVersion\Services\ApiVersionService;
use App\Modules\Auth\Policies\AuthPolicy;

class ApiVersionController extends Controller
{
    private ApiVersionService $service;

    public function __construct(ApiVersionService $service)
    {
        parent::__construct();

        $this->service = $service;
    }

    public function index(Request $request): JsonResponse
    {
        $resources = $this->parseResourcesQuery($request->query('resources', ''));

        return JsonResponse::success([
            'versions' => $this->service->list($resources),
        ], 'Daftar versi resource berhasil diambil.');
    }

    public function show(Request $request): JsonResponse
    {
        return JsonResponse::success([
            'version' => $this->service->get((string) $request->routeParam('resource_name')),
        ], 'Versi resource berhasil diambil.');
    }

    public function bump(Request $request): JsonResponse
    {
        AuthPolicy::requireRole($this->user($request), ['super_admin']);

        $displayName = $request->input('display_name');

        return JsonResponse::success([
            'version' => $this->service->bump(
                (string) $request->routeParam('resource_name'),
                is_string($displayName) && trim($displayName) !== '' ? trim($displayName) : null
            ),
        ], 'Versi resource berhasil dinaikkan.');
    }

    private function parseResourcesQuery($value): array
    {
        if (! is_string($value) || trim($value) === '') {
            return [];
        }

        return array_values(array_filter(array_map(
            static fn (string $resource): string => trim($resource),
            explode(',', $value)
        )));
    }
}
