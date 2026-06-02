<?php

declare(strict_types=1);

namespace App\Modules\Auth\Controllers;

use App\Core\Controller;
use App\Core\Exceptions\UnauthorizedException;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Auth\Requests\ApproveUsersRequest;
use App\Modules\Auth\Requests\ConfirmOtpRequest;
use App\Modules\Auth\Requests\ListPendingUsersRequest;
use App\Modules\Auth\Requests\LoginRequest;
use App\Modules\Auth\Requests\LogoutRequest;
use App\Modules\Auth\Requests\RegisterRequest;
use App\Modules\Auth\Services\AuthService;
use App\Modules\Auth\Services\AuthSessionService;

class AuthController extends Controller
{
    private AuthService $service;
    private AuthSessionService $sessionService;

    public function __construct(AuthService $service, AuthSessionService $sessionService)
    {
        parent::__construct();

        $this->service = $service;
        $this->sessionService = $sessionService;
    }

    public function register(Request $request): JsonResponse
    {
        $payload = (new RegisterRequest($request))->validate();
        $result = $this->service->register($payload);

        return JsonResponse::success($result, 'Registrasi berhasil.', [], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $payload = (new LoginRequest($request))->validate();
        $result = $this->service->login($payload);
        $response = JsonResponse::success([
            'user' => $result['user'],
            'remember_expires_at' => $result['remember_token']['expires_at'] ?? null,
        ], 'Login berhasil.');

        return $this->withRememberCookie($response, $result['remember_token']);
    }

    public function autologin(Request $request): JsonResponse
    {
        $rawToken = $this->rememberTokenFromRequest($request);

        if (! $rawToken) {
            throw new UnauthorizedException('Remember token tidak ditemukan.');
        }

        $impersonationCookieName = (string) config('auth.impersonation_cookie.name', 'admin_impersonation');
        $impersonationToken = $request->cookie($impersonationCookieName);
        $result = $this->sessionService->authenticate($rawToken, is_string($impersonationToken) ? $impersonationToken : null);

        return JsonResponse::success($result, 'Autologin berhasil.');
    }

    public function logout(Request $request): JsonResponse
    {
        (new LogoutRequest($request))->validate();
        $rawToken = $this->rememberTokenFromRequest($request);

        if ($rawToken) {
            $this->service->logout($rawToken);
        }

        return JsonResponse::success(null, 'Logout berhasil.')->withHeader(
            'Set-Cookie',
            $this->expiredRememberCookieHeader()
        );
    }

    public function confirmOtp(Request $request): JsonResponse
    {
        $payload = (new ConfirmOtpRequest($request))->validate();
        $result = $this->service->confirmOtp($payload);
        $response = JsonResponse::success([
            'user' => $result['user'],
            'remember_expires_at' => $result['remember_token']['expires_at'] ?? null,
        ], 'Konfirmasi OTP berhasil.');

        return $this->withRememberCookie($response, $result['remember_token']);
    }

    public function pendingUsers(Request $request): JsonResponse
    {
        $actor = $this->user($request);
        $payload = (new ListPendingUsersRequest($request))->validate();
        $limit = (int) ($payload['limit'] ?? 500);

        return JsonResponse::success([
            'users' => $this->service->pendingUsers($actor, $limit),
        ], 'Data user pending berhasil diambil.', [
            'limit' => $limit,
        ]);
    }

    public function approveUsers(Request $request): JsonResponse
    {
        $actor = $this->user($request);
        $payload = (new ApproveUsersRequest($request))->validate();

        return JsonResponse::success(
            $this->service->approveUsers($actor, $payload['user_ids']),
            'Approval user berhasil diproses.'
        );
    }

    private function rememberTokenFromRequest(Request $request): ?string
    {
        $cookieName = (string) config('auth.remember_cookie.name', 'remember_me');

        return $request->cookie($cookieName);
    }

    private function withRememberCookie(JsonResponse $response, ?array $token): JsonResponse
    {
        if (! $token) {
            return $response;
        }

        return $response->withHeader('Set-Cookie', $this->rememberCookieHeader($token['value'], $token['expires_at']));
    }

    private function rememberCookieHeader(string $value, string $expiresAt): string
    {
        $name = (string) config('auth.remember_cookie.name', 'remember_me');
        $sameSite = (string) config('auth.remember_cookie.same_site', 'Strict');
        $secure = (bool) config('auth.remember_cookie.secure', false);

        $header = sprintf(
            '%s=%s; Expires=%s; Path=/; HttpOnly; SameSite=%s',
            $name,
            rawurlencode($value),
            gmdate('D, d M Y H:i:s T', strtotime($expiresAt)),
            $sameSite
        );

        return $secure ? $header . '; Secure' : $header;
    }

    private function expiredRememberCookieHeader(): string
    {
        $name = (string) config('auth.remember_cookie.name', 'remember_me');
        $sameSite = (string) config('auth.remember_cookie.same_site', 'Strict');
        $secure = (bool) config('auth.remember_cookie.secure', false);
        $header = sprintf(
            '%s=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; SameSite=%s',
            $name,
            $sameSite
        );

        return $secure ? $header . '; Secure' : $header;
    }
}
