<?php

declare(strict_types=1);

namespace App\Modules\Admin\Services;

use App\Modules\Auth\Policies\AuthPolicy;
use App\Modules\Auth\Services\AuthService;
use App\Modules\Users\Repositories\UserRepository;

class AdminUserService
{
    private UserRepository $users;

    private AuthService $authService;

    public function __construct(UserRepository $users, AuthService $authService)
    {
        $this->users = $users;
        $this->authService = $authService;
    }

    public function listUsers(array $actor, array $filters = []): array
    {
        AuthPolicy::requireAdmin($actor);

        return array_map(function (array $user): array {
            $serialized = $this->authService->serializeUser($user);
            $showroom = $user['showroom'] ?? null;
            $serialized['showroom'] = is_array($showroom)
                ? [
                    'id' => (int) $showroom['id'],
                    'user_id' => (int) $showroom['user_id'],
                    'name' => $showroom['name'],
                ]
                : null;

            return $serialized;
        }, $this->users->listForAdmin($filters));
    }

    /**
     * Membuat akun admin atau akun showroom, khusus super admin.
     *
     * Pembuatannya diserahkan ke AuthService::register supaya aturan slug
     * showroom, transaksi, dan penanganan bentrok unik tidak ditulis ulang di
     * jalur kedua yang lama-lama menyimpang dari jalur pendaftaran mandiri.
     *
     * Bedanya satu: akun yang dibuat super admin langsung aktif dan disetujui.
     * Pendaftaran mandiri sengaja menunggu approval, tapi di sini approval-nya
     * sudah terjadi -- yang membuat akunnya justru orang yang berwenang
     * menyetujui.
     */
    public function createAccount(array $actor, array $data): array
    {
        AuthPolicy::requireSuperAdmin($actor);

        $hasil = $this->authService->register($data);
        $userId = (int) ($hasil['user']['id'] ?? 0);

        if ($userId > 0) {
            $this->users->activateAccount($userId);
            $segar = $this->users->findById($userId);

            if (is_array($segar)) {
                $hasil['user'] = $this->authService->serializeUser($segar);
            }
        }

        return $hasil;
    }
}
