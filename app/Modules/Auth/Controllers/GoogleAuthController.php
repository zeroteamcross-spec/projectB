<?php

declare(strict_types=1);

namespace App\Modules\Auth\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\Services\GoogleAuthService;
use Throwable;

class GoogleAuthController extends Controller
{
    private GoogleAuthService $service;

    public function __construct(GoogleAuthService $service)
    {
        parent::__construct();

        $this->service = $service;
    }

    public function status(Request $request): JsonResponse
    {
        $cookie = $request->cookie((string) config('google.auth.completion_cookie.name', 'google_profile_completion'));

        return JsonResponse::success(
            $this->service->status(is_string($cookie) ? $cookie : null),
            'Status Google Login berhasil diambil.'
        );
    }

    public function redirect(Request $request): JsonResponse
    {
        $next = $request->query('next');
        $showroomSlug = $request->query('showroom_slug');
        $result = $this->service->redirectForHost(
            (string) $request->server('HTTP_HOST', ''),
            is_string($next) ? $next : null,
            is_string($showroomSlug) ? $showroomSlug : null
        );

        return JsonResponse::success([
            'auth_url' => $result['auth_url'],
            'state_expires_at' => $result['state_expires_at'],
        ], 'URL Google Login berhasil dibuat.')->withHeader(
            'Set-Cookie',
            $this->service->stateCookieHeader($result['state'])
        );
    }

    public function callback(Request $request): Response
    {
        $error = (string) $request->query('error', '');

        if ($error !== '') {
            return $this->redirectToFrontend('/google-login/complete?' . http_build_query([
                'status' => 'error',
                'message' => 'Google Login dibatalkan atau ditolak.',
            ]));
        }

        try {
            $stateCookie = $request->cookie((string) config('google.auth.state_cookie.name', 'google_oauth_state'));
            $result = $this->service->callback(
                (string) $request->query('code', ''),
                (string) $request->query('state', ''),
                is_string($stateCookie) ? $stateCookie : null,
                (string) $request->server('HTTP_HOST', '')
            );
            $response = $this->redirectToFrontend($result['redirect_path']);

            if (is_string($result['completion_cookie'] ?? null) && $result['completion_cookie'] !== '') {
                return $response->withHeader(
                    'Set-Cookie',
                    $this->service->completionCookieHeader($result['completion_cookie'])
                );
            }

            if (is_array($result['remember_token'] ?? null)) {
                return $response->withHeader(
                    'Set-Cookie',
                    $this->service->rememberCookieHeader($result['remember_token'])
                );
            }

            return $response;
        } catch (Throwable $exception) {
            return $this->redirectToFrontend('/google-login/complete?' . http_build_query([
                'status' => 'error',
                'message' => $exception->getMessage(),
            ]));
        }
    }

    public function completeProfile(Request $request): JsonResponse
    {
        $cookie = $request->cookie((string) config('google.auth.completion_cookie.name', 'google_profile_completion'));
        $result = $this->service->completeProfile(is_string($cookie) ? $cookie : null, $request->input());
        $response = JsonResponse::success([
            'user' => $result['user'],
            'profile_completion_required' => $result['profile_completion_required'],
            'login_available' => $result['login_available'],
            'next' => $result['next'],
            'remember_expires_at' => $result['remember_token']['expires_at'] ?? null,
        ], 'Profil Google berhasil dilengkapi.');

        if (is_array($result['remember_token'] ?? null)) {
            return $response->withHeader('Set-Cookie', $this->service->rememberCookieHeader($result['remember_token']));
        }

        return $response->withHeader('Set-Cookie', $this->service->expiredCompletionCookieHeader());
    }

    private function redirectToFrontend(string $path): Response
    {
        return new Response('', 302, [
            'Location' => '/#' . (strpos($path, '/') === 0 ? $path : '/' . $path),
        ]);
    }
}
