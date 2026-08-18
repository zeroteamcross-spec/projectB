<?php

declare(strict_types=1);

namespace App\Modules\Showrooms\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\MasterData\Requests\UploadAppIconRequest;
use App\Modules\MasterData\Services\MasterAssetService;
use App\Modules\Showrooms\Requests\UpsertShowroomRequest;
use App\Modules\Showrooms\Services\ShowroomService;

class ShowroomController extends Controller
{
    private ShowroomService $service;
    private MasterAssetService $assets;

    public function __construct(ShowroomService $service, MasterAssetService $assets)
    {
        parent::__construct();

        $this->service = $service;
        $this->assets = $assets;
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

    public function uploadBrandingIcon(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $this->service->ensureSellerAccess($user);
        $showroom = $this->service->mine($user);
        $payload = (new UploadAppIconRequest($request))->validate();

        return JsonResponse::success([
            'asset' => $this->assets->storeShowroomIcon($payload['icon'], $payload['mime_type'], (int) $showroom['id']),
        ], 'Icon showroom berhasil diupload.', [], 201);
    }

    public function uploadBrandingLogo(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $this->service->ensureSellerAccess($user);
        $showroom = $this->service->mine($user);
        $payload = (new UploadAppIconRequest($request))->validate();

        return JsonResponse::success([
            'asset' => $this->assets->storeShowroomLogo($payload['icon'], $payload['mime_type'], (int) $showroom['id']),
        ], 'Logo header showroom berhasil diupload.', [], 201);
    }
}
