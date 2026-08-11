<?php

declare(strict_types=1);

namespace App\Modules\Admin\Controllers;

use App\Core\Auth\AuthCookie;
use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Admin\Requests\StartImpersonationRequest;
use App\Modules\Admin\Services\AdminImpersonationService;

class AdminImpersonationController extends Controller
{
    private AdminImpersonationService $service;

    public function __construct(AdminImpersonationService $service)
    {
        parent::__construct();
        $this->service = $service;
    }

    public function start(Request $request): JsonResponse
    {
        $actor = $this->user($request);
        $payload = (new StartImpersonationRequest($request))->validate();
        $result = $this->service->start($actor, (int) $payload['target_user_id'], $this->impersonationMetadata($payload, $request));
        $session = $result['session'];
        $response = JsonResponse::success([
            'user' => $session['user'],
            'actor' => $session['actor'],
            'impersonation' => $session['impersonation'],
        ], 'Impersonation berhasil dimulai.');

        return $response->withHeader(
            'Set-Cookie',
            $this->impersonationCookieHeader(
                $result['token']['value'],
                $result['token']['expires_at']
            )
        );
    }

    public function startSeller(Request $request): JsonResponse
    {
        $actor = $this->user($request);
        $payload = (new StartImpersonationRequest($request))->validate();
        $result = $this->service->startSeller($actor, (int) $payload['target_user_id'], $this->impersonationMetadata($payload, $request));
        $session = $result['session'];
        $response = JsonResponse::success([
            'user' => $session['user'],
            'actor' => $session['actor'],
            'impersonation' => $session['impersonation'],
        ], 'Impersonation seller berhasil dimulai.');

        return $response->withHeader(
            'Set-Cookie',
            $this->impersonationCookieHeader(
                $result['token']['value'],
                $result['token']['expires_at']
            )
        );
    }

    public function startAffiliate(Request $request): JsonResponse
    {
        $actor = $this->user($request);
        $payload = (new StartImpersonationRequest($request))->validate();
        $result = $this->service->startAffiliate($actor, (int) $payload['target_user_id'], $this->impersonationMetadata($payload, $request));
        $session = $result['session'];
        $response = JsonResponse::success([
            'user' => $session['user'],
            'actor' => $session['actor'],
            'impersonation' => $session['impersonation'],
        ], 'Impersonation affiliate berhasil dimulai.');

        return $response->withHeader(
            'Set-Cookie',
            $this->impersonationCookieHeader(
                $result['token']['value'],
                $result['token']['expires_at']
            )
        );
    }

    private function impersonationMetadata(array $payload, Request $request): array
    {
        return [
            'reason' => $payload['reason'] ?? null,
            'ip_address' => $this->clientIp($request),
            'user_agent' => $this->userAgent($request),
        ];
    }

    public function stop(Request $request): JsonResponse
    {
        $auth = $request->auth();
        $actor = $auth ? $auth->actor() : null;
        $impersonation = $auth ? $auth->impersonation() : null;
        $this->service->stop($request->user(), $actor, $impersonation, [
            'ip_address' => $this->clientIp($request),
            'user_agent' => $this->userAgent($request),
        ]);

        return JsonResponse::success([
            'user' => $actor,
            'actor' => $actor,
            'impersonation' => null,
        ], 'Impersonation dihentikan.')
            ->withHeader('Set-Cookie', $this->expiredImpersonationCookieHeader());
    }

    private function clientIp(Request $request): ?string
    {
        $forwardedFor = $request->header('x-forwarded-for');

        if (is_string($forwardedFor) && $forwardedFor !== '') {
            return trim(explode(',', $forwardedFor)[0]);
        }

        $remoteAddr = $request->server('REMOTE_ADDR');

        return is_string($remoteAddr) ? $remoteAddr : null;
    }

    private function userAgent(Request $request): ?string
    {
        $userAgent = $request->header('user-agent');

        return is_string($userAgent) ? $userAgent : null;
    }

    private function impersonationCookieHeader(string $value, string $expiresAt): string
    {
        return AuthCookie::header(
            (string) config('auth.impersonation_cookie.name', 'admin_impersonation'),
            $value,
            $expiresAt,
            (bool) config('auth.impersonation_cookie.secure', false),
            (string) config('auth.impersonation_cookie.same_site', 'Strict')
        );
    }

    private function expiredImpersonationCookieHeader(): string
    {
        return AuthCookie::expiredHeader(
            (string) config('auth.impersonation_cookie.name', 'admin_impersonation'),
            (bool) config('auth.impersonation_cookie.secure', false),
            (string) config('auth.impersonation_cookie.same_site', 'Strict')
        );
    }
}
