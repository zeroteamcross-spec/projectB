<?php

declare(strict_types=1);

namespace App\Modules\Showrooms\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Showrooms\Requests\UpsertShowroomRequest;
use App\Modules\Showrooms\Services\ShowroomService;

class ShowroomController extends Controller
{
    private ShowroomService $service;

    public function __construct(ShowroomService $service)
    {
        parent::__construct();

        $this->service = $service;
    }

    public function mine(Request $request): JsonResponse
    {
        $user = $this->user($request);

        return JsonResponse::success([
            'showroom' => $this->service->mine($user),
        ], 'Showroom berhasil diambil.');
    }

    public function upsertMine(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new UpsertShowroomRequest($request))->validate();

        return JsonResponse::success([
            'showroom' => $this->service->upsertMine($user, $payload),
        ], 'Showroom berhasil disimpan.');
    }

    public function show(Request $request): JsonResponse
    {
        $user = $this->user($request);

        return JsonResponse::success([
            'showroom' => $this->service->show((int) $request->routeParam('id'), $user),
        ], 'Showroom berhasil diambil.');
    }

    public function validateSlug(Request $request): JsonResponse
    {
        return JsonResponse::success([
            'showroom' => $this->service->validateSlug((string) $request->routeParam('slug')),
        ], 'Validasi slug showroom selesai.');
    }
}
