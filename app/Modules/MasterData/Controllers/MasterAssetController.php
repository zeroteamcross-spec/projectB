<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Auth\Policies\AuthPolicy;
use App\Modules\MasterData\Requests\UploadBankIconRequest;
use App\Modules\MasterData\Requests\UploadAppIconRequest;
use App\Modules\MasterData\Services\MasterAssetService;

class MasterAssetController extends Controller
{
    private MasterAssetService $assets;

    public function __construct(MasterAssetService $assets)
    {
        parent::__construct();

        $this->assets = $assets;
    }

    public function uploadBankIcon(Request $request): JsonResponse
    {
        AuthPolicy::requireAdmin($request->user());
        $payload = (new UploadBankIconRequest($request))->validate();

        return JsonResponse::success([
            'asset' => $this->assets->storeBankIcon($payload['icon'], $payload['mime_type']),
        ], 'Icon bank berhasil diupload.', [], 201);
    }

    public function uploadAppIcon(Request $request): JsonResponse
    {
        AuthPolicy::requireAdmin($request->user());
        $payload = (new UploadAppIconRequest($request))->validate();

        return JsonResponse::success([
            'asset' => $this->assets->storeAppIcon($payload['icon'], $payload['mime_type']),
        ], 'Icon aplikasi berhasil diupload.', [], 201);
    }
}
