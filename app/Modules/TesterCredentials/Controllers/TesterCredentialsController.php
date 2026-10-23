<?php

declare(strict_types=1);

namespace App\Modules\TesterCredentials\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\TesterCredentials\Services\TesterCredentialsService;

final class TesterCredentialsController extends Controller
{
    private TesterCredentialsService $service;

    public function __construct(TesterCredentialsService $service)
    {
        parent::__construct();
        $this->service = $service;
    }

    public function unlock(Request $request): JsonResponse
    {
        $this->service->unlock($request);

        return JsonResponse::success([
            'expires_in' => (int) config('tester.credentials_page.session_ttl_seconds', 1800),
        ], 'Akses tester dibuka.');
    }

    public function accounts(Request $request): JsonResponse
    {
        return JsonResponse::success(
            $this->service->accounts($request),
            'Akun dummy tester berhasil diambil.'
        );
    }

    public function lock(Request $request): JsonResponse
    {
        $this->service->lock($request);

        return JsonResponse::success(null, 'Akses tester dikunci.');
    }
}
