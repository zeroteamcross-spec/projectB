<?php

declare(strict_types=1);

namespace App\Modules\Admin\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Admin\Requests\ListAdminUsersRequest;
use App\Modules\Admin\Services\AdminUserService;

class AdminUserController extends Controller
{
    private AdminUserService $service;

    public function __construct(AdminUserService $service)
    {
        parent::__construct();
        $this->service = $service;
    }

    public function index(Request $request): JsonResponse
    {
        $actor = $this->user($request);
        $filters = (new ListAdminUsersRequest($request))->validate();

        return JsonResponse::success([
            'users' => $this->service->listUsers($actor, $filters),
        ], 'Daftar user admin berhasil diambil.', [
            'filters' => $filters === [] ? (object) [] : $filters,
        ]);
    }
}
