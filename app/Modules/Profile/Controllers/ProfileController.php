<?php

declare(strict_types=1);

namespace App\Modules\Profile\Controllers;

use App\Core\Auth\AuthCookie;
use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Auth\Policies\ImpersonationPolicy;
use App\Modules\Auth\Requests\LogoutRequest;
use App\Modules\Auth\Services\AuthService;
use App\Modules\Users\Requests\ChangePasswordRequest;
use App\Modules\Users\Requests\UpdateProfileRequest;
use App\Modules\Users\Services\UserService;

class ProfileController extends Controller
{
    private UserService $users;

    private AuthService $auth;

    public function __construct(UserService $users, AuthService $auth)
    {
        parent::__construct();

        $this->users = $users;
        $this->auth = $auth;
    }

    public function index(Request $request): JsonResponse
    {
        $user = $this->user($request);

        return JsonResponse::success([
            'profile' => $this->users->profile((int) $user['id']),
        ], 'Profil user aktif berhasil diambil.');
    }

    public function update(Request $request): JsonResponse
    {
        ImpersonationPolicy::ensureSensitiveMutationAllowed(
            $request->auth(),
            'Profil affiliate tidak dapat diubah saat admin sedang login sebagai affiliate.'
        );
        $user = $this->user($request);
        $payload = (new UpdateProfileRequest($request))->validate();

        return JsonResponse::success([
            'profile' => $this->users->updateProfile((int) $user['id'], $payload),
        ], 'Profil berhasil diperbarui.');
    }

    public function changePassword(Request $request): JsonResponse
    {
        ImpersonationPolicy::ensureSensitiveMutationAllowed(
            $request->auth(),
            'Password affiliate tidak dapat diubah saat admin sedang login sebagai affiliate.'
        );
        $user = $this->user($request);
        $payload = (new ChangePasswordRequest($request))->validate();

        $this->users->changePassword((int) $user['id'], $payload);

        return JsonResponse::success([
            'changed' => true,
        ], 'Password berhasil diperbarui.');
    }

    public function logout(Request $request): JsonResponse
    {
        (new LogoutRequest($request))->validate();
        $rawToken = $this->rememberTokenFromRequest($request);

        if ($rawToken) {
            $this->auth->logout($rawToken);
        }

        return JsonResponse::success(null, 'Logout berhasil.')->withHeader(
            'Set-Cookie',
            $this->expiredRememberCookieHeader()
        );
    }

    private function rememberTokenFromRequest(Request $request): ?string
    {
        $cookieName = (string) config('auth.remember_cookie.name', 'remember_me');

        return $request->cookie($cookieName);
    }

    private function expiredRememberCookieHeader(): string
    {
        return AuthCookie::expiredHeader(
            (string) config('auth.remember_cookie.name', 'remember_me'),
            (bool) config('auth.remember_cookie.secure', false),
            (string) config('auth.remember_cookie.same_site', 'Strict')
        );
    }
}
