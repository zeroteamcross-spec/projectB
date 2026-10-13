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

        $response = JsonResponse::success([
            'auth_url' => $result['auth_url'],
            'state_expires_at' => $result['state_expires_at'],
        ], 'URL Google Login berhasil dibuat.');

        if (($result['set_state_cookie'] ?? true) === true) {
            return $response->withHeader(
                'Set-Cookie',
                $this->service->stateCookieHeader($result['state'])
            );
        }

        return $response;
    }

    public function start(Request $request): Response
    {
        try {
            $result = $this->service->brokerStart(
                (string) $request->query('ticket', ''),
                (string) $request->server('HTTP_HOST', '')
            );

            return $this->redirectTo($result['auth_url'])
                ->withHeader('Set-Cookie', $this->service->stateCookieHeader($result['state']))
                ->withHeader('Cache-Control', 'no-store')
                ->withHeader('Referrer-Policy', 'no-referrer');
        } catch (Throwable $exception) {
            return $this->redirectTo('/google-login/complete?' . http_build_query([
                'status' => 'error',
                'message' => $exception->getMessage(),
            ]));
        }
    }

    public function callback(Request $request): Response
    {
        $host = (string) $request->server('HTTP_HOST', '');
        $state = (string) $request->query('state', '');

        if ($this->service->isBrokerHost($host)) {
            return $this->brokerCallback($request, $state, $host);
        }

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
                $host
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

    public function consume(Request $request): Response
    {
        try {
            $result = $this->service->consumeHandoff(
                (string) $request->query('token', ''),
                (string) $request->server('HTTP_HOST', '')
            );
            $response = $this->redirectTo($result['redirect_url'])
                ->withHeader('Cache-Control', 'no-store')
                ->withHeader('Referrer-Policy', 'no-referrer');

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
            return $this->redirectTo('/google-login/complete?' . http_build_query([
                'status' => 'error',
                'message' => $exception->getMessage(),
            ]));
        }
    }

    private function brokerCallback(Request $request, string $state, string $host): Response
    {
        $error = (string) $request->query('error', '');

        if ($error !== '') {
            return $this->redirectTo($this->service->brokerFailureLocation(
                $state,
                'Google Login dibatalkan atau ditolak.'
            ));
        }

        try {
            $stateCookie = $request->cookie((string) config('google.auth.state_cookie.name', 'google_oauth_state'));
            $result = $this->service->brokerCallback(
                (string) $request->query('code', ''),
                $state,
                is_string($stateCookie) ? $stateCookie : null,
                $host
            );

            return $this->redirectTo($result['consume_url'])
                ->withHeader('Set-Cookie', $this->service->expiredStateCookieHeader())
                ->withHeader('Cache-Control', 'no-store')
                ->withHeader('Referrer-Policy', 'no-referrer');
        } catch (Throwable $exception) {
            return $this->redirectTo($this->service->brokerFailureLocation(
                $state,
                $exception->getMessage()
            ));
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
        return $this->redirectTo(strpos($path, '/') === 0 ? $path : '/' . $path);
    }

    private function redirectTo(string $location): Response
    {
        return new Response('', 302, [
            'Location' => $location,
        ]);
    }
}
