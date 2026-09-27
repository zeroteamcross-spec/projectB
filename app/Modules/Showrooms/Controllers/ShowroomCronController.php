<?php

declare(strict_types=1);

namespace App\Modules\Showrooms\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Showrooms\Services\ShowroomService;

class ShowroomCronController extends Controller
{
    private ShowroomService $service;

    public function __construct(ShowroomService $service)
    {
        parent::__construct();

        $this->service = $service;
    }

    public function suspendOverdue(Request $request): JsonResponse
    {
        $result = $this->service->suspendOverdue();

        return JsonResponse::success($result, 'Showroom menunggak berhasil diproses.');
    }
}
