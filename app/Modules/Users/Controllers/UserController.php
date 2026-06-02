<?php

declare(strict_types=1);

namespace App\Modules\Users\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Auth\Policies\AuthPolicy;
use App\Modules\Auth\Policies\ImpersonationPolicy;
use App\Modules\Users\Requests\ChangePasswordRequest;
use App\Modules\Users\Requests\UpdateProfileRequest;
use App\Modules\Users\Services\UserService;

class UserController extends Controller
{
    private UserService $service;

    public function __construct(UserService $service)
    {
        parent::__construct();

        $this->service = $service;
    }

    public function me(Request $request): JsonResponse
    {
        $user = $this->user($request);

        return JsonResponse::success([
            'user' => $this->service->profile((int) $user['id']),
        ], 'Profil user berhasil diambil.');
    }

    public function updateMe(Request $request): JsonResponse
    {
        ImpersonationPolicy::ensureSensitiveMutationAllowed(
            $request->auth(),
            'Profil affiliate tidak dapat diubah saat admin sedang login sebagai affiliate.'
        );
        $user = $this->user($request);
        $payload = (new UpdateProfileRequest($request))->validate();

        return JsonResponse::success([
            'user' => $this->service->updateProfile((int) $user['id'], $payload),
        ], 'Profil user berhasil diperbarui.');
    }

    public function changePassword(Request $request): JsonResponse
    {
        ImpersonationPolicy::ensureSensitiveMutationAllowed(
            $request->auth(),
            'Password affiliate tidak dapat diubah saat admin sedang login sebagai affiliate.'
        );
        $user = $this->user($request);
        $payload = (new ChangePasswordRequest($request))->validate();

        $this->service->changePassword((int) $user['id'], $payload);

        return JsonResponse::success([
            'changed' => true,
        ], 'Password berhasil diperbarui.');
    }

    public function show(Request $request): JsonResponse
    {
        $targetUserId = (int) $request->routeParam('id');
        AuthPolicy::ensureCanViewUser($request->user(), $targetUserId);

        return JsonResponse::success([
            'user' => $this->service->profile($targetUserId),
        ], 'Profil user berhasil diambil.');
    }

    public function approvalStatus(Request $request): JsonResponse
    {
        $targetUserId = (int) $request->routeParam('id');
        AuthPolicy::ensureCanViewApprovalStatus($request->user(), $targetUserId);

        return JsonResponse::success([
            'approval' => $this->service->approvalStatus($targetUserId),
        ], 'Status approval berhasil diambil.');
    }
}
