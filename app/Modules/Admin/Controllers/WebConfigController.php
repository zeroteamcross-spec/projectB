<?php

declare(strict_types=1);

namespace App\Modules\Admin\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Admin\Services\WebConfigService;

class WebConfigController extends Controller
{
    private WebConfigService $service;

    public function __construct(WebConfigService $service)
    {
        parent::__construct();

        $this->service = $service;
    }

    public function show(Request $request): JsonResponse
    {
        return JsonResponse::success([
            'config' => $this->service->get($this->user($request)),
            'theme' => $this->service->theme(),
        ], 'Konfigurasi WEB berhasil diambil.');
    }

    public function update(Request $request): JsonResponse
    {
        $result = $this->service->update($this->user($request), $request->input());

        return JsonResponse::success([
            'config' => $result['config'],
            'theme' => $result['theme'],
        ], 'Konfigurasi WEB berhasil disimpan.');
    }
}
