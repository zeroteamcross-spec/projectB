<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\UnauthorizedException;
use App\Core\Exceptions\ValidationException;
use App\Modules\Auth\Repositories\AuthTokenRepository;
use App\Modules\Auth\Repositories\GoogleAuthRepository;
use DateInterval;
use DateTimeImmutable;
use PDO;
use RuntimeException;
use Throwable;

class GoogleAuthService
{
    private const PROVIDER = 'google';

    private PDO $pdo;

    private GoogleAuthRepository $repository;

    private AuthTokenRepository $tokens;

    public function __construct(PDO $pdo, GoogleAuthRepository $repository, AuthTokenRepository $tokens)
    {
        $this->pdo = $pdo;
        $this->repository = $repository;
        $this->tokens = $tokens;
    }

    public function status(?string $completionToken = null): array
    {
        return [
            'enabled' => $this->isEnabled(),
            'configured' => $this->isConfigured(),
            'missing_config' => $this->missingConfig(),
            'roles' => [
                'buyer' => ['enabled' => true, 'auto_register' => true],
                'admin' => ['enabled' => true, 'auto_register' => false],
                'seller' => ['enabled' => true, 'auto_register' => true],
                'affiliate' => [
                    'enabled' => false,
                    'auto_register' => false,
                    'message' => 'Affiliate tetap menggunakan login user/password.',
                ],
            ],
            'completion' => $this->completionContext($completionToken),
        ];
    }

    public function redirectForHost(string $host): array
    {
        $context = $this->contextForHost($host);

        if (! (bool) ($context['google_enabled'] ?? false)) {
            throw new ForbiddenException('Google Login tidak tersedia untuk domain ini.');
        }

        return $this->redirect(
            (string) $context['role'],
            $this->redirectUriForHost((string) $context['host']),
            (string) $context['host']
        );
    }

    public function redirect(string $role, ?string $redirectUri = null, ?string $host = null): array
    {
        $role = $this->normalizeRole($role);

        if ($role === 'affiliate_admin') {
            throw new ForbiddenException('Affiliate tetap menggunakan login user/password.');
        }

        $this->ensureEnabled();

        $state = $this->signedToken([
            'type' => 'google_oauth_state',
            'role' => $role,
            'host' => $host,
            'redirect_uri' => $redirectUri ?? $this->redirectUri(),
            'nonce' => bin2hex(random_bytes(16)),
            'iat' => time(),
            'exp' => time() + ((int) config('google.auth.state_cookie.ttl_minutes', 15) * 60),
        ]);

        $query = http_build_query([
            'client_id' => $this->clientId(),
            'redirect_uri' => $redirectUri ?? $this->redirectUri(),
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $state,
            'prompt' => 'select_account',
        ]);

        return [
            'auth_url' => 'https://accounts.google.com/o/oauth2/v2/auth?' . $query,
            'state' => $state,
            'state_expires_at' => date('c', time() + ((int) config('google.auth.state_cookie.ttl_minutes', 15) * 60)),
        ];
    }

    public function callback(string $code, string $state, ?string $cookieState, string $host = ''): array
    {
        $this->ensureEnabled();
        $statePayload = $this->validateState($state, $cookieState);
        $this->ensureStateHostMatches($statePayload, $host);
        $role = (string) $statePayload['role'];
        $profile = $this->fetchProfile($code, (string) ($statePayload['redirect_uri'] ?? $this->redirectUri()));
        $resolved = $this->resolveUser($role, $profile);
        $user = $resolved['user'];

        if ($this->profileCompletionRequired($user)) {
            return [
                'redirect_path' => '/google-login/complete?status=completion_required&role=' . $this->slugForRole($role),
                'completion_cookie' => $this->completionCookie((int) $user['id'], $role),
                'remember_token' => null,
            ];
        }

        if (! $this->canAuthenticate($user)) {
            return [
                'redirect_path' => '/google-login/complete?status=pending_approval&role=' . $this->slugForRole($role),
                'completion_cookie' => null,
                'remember_token' => null,
            ];
        }

        return [
            'redirect_path' => $this->homeForRole($role),
            'completion_cookie' => null,
            'remember_token' => $this->issueRememberToken((int) $user['id']),
        ];
    }

    public function completeProfile(?string $completionToken, array $data): array
    {
        $this->ensureEnabled();
        $payload = $this->validateSignedToken($completionToken, 'google_profile_completion');
        $user = $this->repository->findUserById((int) $payload['user_id']);

        if (! $user) {
            throw new UnauthorizedException('Sesi completion Google tidak valid.');
        }

        if (($user['role'] ?? null) !== 'seller') {
            throw new ForbiddenException('Completion Google hanya tersedia untuk seller.');
        }

        $validated = $this->validateSellerCompletion($data);

        try {
            $this->pdo->beginTransaction();
            $this->repository->updateUserCompletion((int) $user['id'], [
                'name' => $validated['name'],
                'phone_number' => $validated['whatsapp'],
            ]);
            $this->repository->upsertShowroom((int) $user['id'], [
                'name' => $validated['showroom_name'],
                'address' => $validated['showroom_address'] ?? null,
                'phone_number' => $validated['whatsapp'],
            ]);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        $user = $this->repository->findUserById((int) $user['id']);
        $canAuthenticate = $user && $this->canAuthenticate($user);

        $isApproved = (int) ($user['is_approved'] ?? 0) === 1;

        return [
            'user' => $canAuthenticate ? $this->serializeUser($user) : null,
            'remember_token' => $canAuthenticate ? $this->issueRememberToken((int) $user['id']) : null,
            'profile_completion_required' => false,
            'login_available' => $canAuthenticate,
            'next' => [
                'status' => $isApproved ? 'ready' : 'pending_approval',
                'target' => $isApproved ? $this->homeForRole((string) $user['role']) : '/google-login/complete?status=pending_approval&role=' . $this->slugForRole((string) $user['role']),
                'message' => $isApproved
                    ? 'Profil seller Google lengkap.'
                    : 'Profil seller lengkap, sedang menunggu approval admin.',
            ],
        ];
    }

    public function completionContext(?string $completionToken): ?array
    {
        if (! is_string($completionToken) || $completionToken === '') {
            return null;
        }

        try {
            $payload = $this->validateSignedToken($completionToken, 'google_profile_completion');
            $user = $this->repository->findUserById((int) $payload['user_id']);

            if (! $user) {
                return null;
            }

            $showroom = $this->repository->findShowroomByUserId((int) $user['id']);

            return [
                'required' => $this->profileCompletionRequired($user),
                'role' => $user['role'],
                'role_slug' => $this->slugForRole((string) $user['role']),
                'user' => [
                    'name' => $user['name'] ?? '',
                    'email' => $user['email'] ?? '',
                    'phone_number' => $user['phone_number'] ?? '',
                ],
                'showroom' => $showroom ? [
                    'name' => $showroom['name'] ?? '',
                    'address' => $showroom['address'] ?? '',
                    'phone_number' => $showroom['phone_number'] ?? '',
                ] : null,
            ];
        } catch (Throwable $exception) {
            return null;
        }
    }

    public function stateCookieHeader(string $state): string
    {
        return $this->cookieHeader(
            (string) config('google.auth.state_cookie.name', 'google_oauth_state'),
            $state,
            time() + ((int) config('google.auth.state_cookie.ttl_minutes', 15) * 60),
            (bool) config('google.auth.state_cookie.secure', false),
            (string) config('google.auth.state_cookie.same_site', 'Lax')
        );
    }

    public function completionCookieHeader(string $token): string
    {
        return $this->cookieHeader(
            (string) config('google.auth.completion_cookie.name', 'google_profile_completion'),
            $token,
            time() + ((int) config('google.auth.completion_cookie.ttl_minutes', 60) * 60),
            (bool) config('google.auth.completion_cookie.secure', false),
            (string) config('google.auth.completion_cookie.same_site', 'Lax')
        );
    }

    public function expiredCompletionCookieHeader(): string
    {
        return $this->cookieHeader(
            (string) config('google.auth.completion_cookie.name', 'google_profile_completion'),
            '',
            1,
            (bool) config('google.auth.completion_cookie.secure', false),
            (string) config('google.auth.completion_cookie.same_site', 'Lax')
        );
    }

    public function rememberCookieHeader(array $token): string
    {
        return $this->cookieHeader(
            (string) config('auth.remember_cookie.name', 'remember_me'),
            $token['value'],
            strtotime($token['expires_at']) ?: time(),
            (bool) config('auth.remember_cookie.secure', false),
            (string) config('auth.remember_cookie.same_site', 'Strict')
        );
    }

    private function resolveUser(string $role, array $profile): array
    {
        $identity = $this->repository->findIdentity(self::PROVIDER, $profile['provider_user_id']);

        if ($identity) {
            $user = $this->repository->findUserById((int) $identity['user_id']);

            if (! $user) {
                throw new UnauthorizedException('Akun Google tidak terhubung ke user aktif.');
            }

            $this->ensureRoleMatches($user, $role);
            $this->repository->upsertIdentity((int) $user['id'], $profile);

            return ['user' => $user, 'is_new' => false];
        }

        $existing = $this->repository->findUserByEmail((string) $profile['provider_email']);

        if ($existing) {
            $this->ensureRoleMatches($existing, $role);
            $existingIdentity = $this->repository->findIdentityByUserProvider((int) $existing['id'], self::PROVIDER);

            if ($existingIdentity && (string) $existingIdentity['provider_user_id'] !== (string) $profile['provider_user_id']) {
                throw new ForbiddenException('User ini sudah terhubung ke akun Google lain.');
            }

            $this->repository->upsertIdentity((int) $existing['id'], $profile);

            return ['user' => $existing, 'is_new' => false];
        }

        if ($role === 'admin') {
            throw new ForbiddenException('Akun admin belum terdaftar. Hubungi administrator.');
        }

        if ($role === 'affiliate_admin') {
            throw new ForbiddenException('Affiliate tetap menggunakan login user/password.');
        }

        return ['user' => $this->autoRegister($role, $profile), 'is_new' => true];
    }

    private function autoRegister(string $role, array $profile): array
    {
        $now = date('Y-m-d H:i:s');
        $status = $role === 'buyer' ? 'active' : 'pending';
        $approved = $role === 'buyer' ? 1 : 0;

        try {
            $this->pdo->beginTransaction();
            $userId = $this->repository->createUser([
                'role' => $role,
                'name' => $profile['provider_name'] ?: $profile['provider_email'],
                'phone_number' => null,
                'email' => $profile['provider_email'],
                'password_hash' => password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT),
                'address' => null,
                'account_status' => $status,
                'is_approved' => $approved,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $this->repository->upsertIdentity($userId, $profile);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return $this->repository->findUserById($userId) ?: [];
    }

    private function fetchProfile(string $code, string $redirectUri): array
    {
        $token = $this->postForm('https://oauth2.googleapis.com/token', [
            'code' => $code,
            'client_id' => $this->clientId(),
            'client_secret' => $this->clientSecret(),
            'redirect_uri' => $redirectUri,
            'grant_type' => 'authorization_code',
        ]);

        $accessToken = (string) ($token['access_token'] ?? '');

        if ($accessToken === '') {
            throw new UnauthorizedException('Google token tidak valid.');
        }

        $profile = $this->getJson('https://www.googleapis.com/oauth2/v3/userinfo', [
            'Authorization: Bearer ' . $accessToken,
        ]);

        $email = strtolower(trim((string) ($profile['email'] ?? '')));
        $sub = trim((string) ($profile['sub'] ?? ''));

        if ($sub === '' || $email === '') {
            throw new UnauthorizedException('Profil Google tidak lengkap.');
        }

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new UnauthorizedException('Email Google tidak valid.');
        }

        if (! $this->isEmailVerified($profile['email_verified'] ?? false)) {
            throw new UnauthorizedException('Email Google belum terverifikasi.');
        }

        $this->ensureAllowedDomain($email);

        return [
            'provider' => self::PROVIDER,
            'provider_user_id' => $sub,
            'provider_email' => $email,
            'provider_name' => trim((string) ($profile['name'] ?? '')),
            'avatar_url' => trim((string) ($profile['picture'] ?? '')) ?: null,
        ];
    }

    private function validateSellerCompletion(array $data): array
    {
        $errors = [];
        $name = trim((string) ($data['name'] ?? ''));
        $whatsapp = trim((string) ($data['whatsapp'] ?? ''));
        $showroomName = trim((string) ($data['showroom_name'] ?? ''));
        $showroomAddress = trim((string) ($data['showroom_address'] ?? ''));

        if ($name === '' || strlen($name) > 200) {
            $errors['name'] = 'Nama wajib diisi dan maksimal 200 karakter.';
        }

        if (! preg_match('/^62[0-9]{8,18}$/', $whatsapp)) {
            $errors['whatsapp'] = 'Nomor WhatsApp wajib format 62 dan hanya angka, contoh 6281234567890.';
        }

        if ($showroomName === '' || strlen($showroomName) > 225) {
            $errors['showroom_name'] = 'Nama showroom wajib diisi dan maksimal 225 karakter.';
        }

        if ($showroomAddress !== '' && strlen($showroomAddress) > 512) {
            $errors['showroom_address'] = 'Alamat showroom maksimal 512 karakter.';
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        return [
            'name' => $name,
            'whatsapp' => $whatsapp,
            'showroom_name' => $showroomName,
            'showroom_address' => $showroomAddress !== '' ? $showroomAddress : null,
        ];
    }

    private function profileCompletionRequired(array $user): bool
    {
        if (($user['role'] ?? null) !== 'seller') {
            return false;
        }

        $phoneNumber = trim((string) ($user['phone_number'] ?? ''));

        if (! preg_match('/^62[0-9]{8,18}$/', $phoneNumber)) {
            return true;
        }

        $showroom = $this->repository->findShowroomByUserId((int) $user['id']);

        return ! $showroom || trim((string) ($showroom['name'] ?? '')) === '';
    }

    private function validateState(string $state, ?string $cookieState): array
    {
        if (! is_string($cookieState) || $cookieState === '' || ! hash_equals($cookieState, $state)) {
            throw new UnauthorizedException('State Google tidak valid.');
        }

        $payload = $this->validateSignedToken($state, 'google_oauth_state');
        $payload['role'] = $this->normalizeRole((string) ($payload['role'] ?? ''));

        return $payload;
    }

    private function ensureStateHostMatches(array $statePayload, string $host): void
    {
        $expectedHost = $this->normalizeHost((string) ($statePayload['host'] ?? ''));
        $actualHost = $this->normalizeHost($host);

        if ($expectedHost === '' || $actualHost === '' || ! hash_equals($expectedHost, $actualHost)) {
            throw new UnauthorizedException('Domain Google Login tidak valid.');
        }

        $context = $this->contextForHost($actualHost);

        if (! (bool) ($context['google_enabled'] ?? false)) {
            throw new ForbiddenException('Google Login tidak tersedia untuk domain ini.');
        }

        if ((string) $statePayload['role'] !== (string) $context['role']) {
            throw new ForbiddenException('Role Google Login tidak sesuai domain.');
        }
    }

    private function validateSignedToken(?string $token, string $type): array
    {
        if (! is_string($token) || strpos($token, '.') === false) {
            throw new UnauthorizedException('Token Google tidak valid.');
        }

        [$body, $signature] = explode('.', $token, 2);
        $expected = $this->base64UrlEncode(hash_hmac('sha256', $body, $this->clientSecret(), true));

        if (! hash_equals($expected, $signature)) {
            throw new UnauthorizedException('Token Google tidak valid.');
        }

        $decoded = json_decode($this->base64UrlDecode($body), true);

        if (! is_array($decoded) || ($decoded['type'] ?? null) !== $type) {
            throw new UnauthorizedException('Token Google tidak valid.');
        }

        if ((int) ($decoded['exp'] ?? 0) < time()) {
            throw new UnauthorizedException('Token Google sudah kedaluwarsa.');
        }

        return $decoded;
    }

    private function completionCookie(int $userId, string $role): string
    {
        return $this->signedToken([
            'type' => 'google_profile_completion',
            'user_id' => $userId,
            'role' => $role,
            'iat' => time(),
            'exp' => time() + ((int) config('google.auth.completion_cookie.ttl_minutes', 60) * 60),
        ]);
    }

    private function signedToken(array $payload): string
    {
        $body = $this->base64UrlEncode(json_encode($payload, JSON_UNESCAPED_SLASHES));
        $signature = $this->base64UrlEncode(hash_hmac('sha256', $body, $this->clientSecret(), true));

        return $body . '.' . $signature;
    }

    private function ensureRoleMatches(array $user, string $expectedRole): void
    {
        if (($user['role'] ?? null) === $expectedRole) {
            return;
        }

        throw new ForbiddenException(sprintf(
            'Akun Google ini terdaftar sebagai %s. Silakan gunakan halaman Google Login %s.',
            $this->labelForRole((string) ($user['role'] ?? '')),
            $this->labelForRole((string) ($user['role'] ?? ''))
        ));
    }

    private function normalizeRole(string $role): string
    {
        $map = [
            'buyer' => 'buyer',
            'admin' => 'admin',
            'seller' => 'seller',
            'affiliate' => 'affiliate_admin',
            'affiliate_admin' => 'affiliate_admin',
        ];

        $normalized = $map[strtolower(trim($role))] ?? null;

        if ($normalized === null) {
            throw new ValidationException(['role' => 'Role Google Login tidak valid.']);
        }

        return $normalized;
    }

    private function ensureEnabled(): void
    {
        if (! $this->isEnabled()) {
            throw new ForbiddenException('Google Login belum dikonfigurasi.');
        }
    }

    private function isEnabled(): bool
    {
        return (bool) config('google.auth.enabled', false) && $this->isConfigured();
    }

    private function isConfigured(): bool
    {
        return $this->missingConfig() === [];
    }

    private function missingConfig(): array
    {
        $missing = [];

        foreach ([
            'GOOGLE_CLIENT_ID' => $this->clientId(),
            'GOOGLE_CLIENT_SECRET' => $this->clientSecret(),
        ] as $key => $value) {
            if (trim((string) $value) === '') {
                $missing[] = $key;
            }
        }

        return $missing;
    }

    private function ensureAllowedDomain(string $email): void
    {
        $domains = (array) config('google.auth.allowed_domains', []);

        if ($domains === []) {
            return;
        }

        $domain = strtolower(substr(strrchr($email, '@') ?: '', 1));

        if (! in_array($domain, $domains, true)) {
            throw new ForbiddenException('Domain email Google tidak diizinkan.');
        }
    }

    private function issueRememberToken(int $userId): array
    {
        $selector = bin2hex(random_bytes(6));
        $validator = bin2hex(random_bytes(32));
        $expiresAt = $this->rememberTokenExpiresAt();

        $this->tokens->create($userId, $selector, password_hash($validator, PASSWORD_DEFAULT), $expiresAt);

        return [
            'value' => $selector . ':' . $validator,
            'expires_at' => $expiresAt,
        ];
    }

    private function rememberTokenExpiresAt(): string
    {
        return (new DateTimeImmutable())
            ->add(new DateInterval('P' . (int) config('auth.remember_cookie.ttl_days', 365) . 'D'))
            ->format('Y-m-d H:i:s');
    }

    private function canAuthenticate(array $user): bool
    {
        return ($user['account_status'] ?? null) === 'active';
    }

    private function serializeUser(array $user): array
    {
        return [
            'id' => (int) $user['id'],
            'role' => $user['role'],
            'name' => $user['name'] ?? null,
            'phone_number' => $user['phone_number'] ?? null,
            'email' => $user['email'] ?? null,
            'address' => $user['address'] ?? null,
            'account_status' => $user['account_status'] ?? null,
            'is_approved' => (bool) ($user['is_approved'] ?? false),
            'created_at' => $user['created_at'] ?? null,
            'updated_at' => $user['updated_at'] ?? null,
            'has_google_identity' => true,
        ];
    }

    private function postForm(string $url, array $payload): array
    {
        return $this->requestJson($url, [
            'method' => 'POST',
            'headers' => ['Content-Type: application/x-www-form-urlencoded'],
            'body' => http_build_query($payload),
        ]);
    }

    private function getJson(string $url, array $headers = []): array
    {
        return $this->requestJson($url, [
            'method' => 'GET',
            'headers' => $headers,
            'body' => null,
        ]);
    }

    private function requestJson(string $url, array $options): array
    {
        $method = (string) ($options['method'] ?? 'GET');
        $headers = (array) ($options['headers'] ?? []);
        $body = $options['body'] ?? null;

        if (extension_loaded('curl')) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

            if ($body !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
            }

            $raw = curl_exec($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            $error = curl_error($ch);
            curl_close($ch);
        } else {
            $context = stream_context_create([
                'http' => [
                    'method' => $method,
                    'header' => implode("\n", $headers),
                    'content' => $body !== null ? (string) $body : '',
                    'timeout' => 15,
                    'ignore_errors' => true,
                ],
            ]);
            $raw = file_get_contents($url, false, $context);
            $status = $this->statusFromHttpResponseHeaders($http_response_header ?? []);
            $error = $raw === false ? 'HTTP request failed.' : '';
        }

        if ($raw === false || $raw === '') {
            throw new RuntimeException($error !== '' ? $error : 'Google HTTP response kosong.');
        }

        $decoded = json_decode((string) $raw, true);

        if (! is_array($decoded)) {
            throw new RuntimeException('Google response bukan JSON valid.');
        }

        if ($status < 200 || $status >= 300) {
            throw new UnauthorizedException('Google OAuth request gagal.', [
                'google' => $decoded['error_description'] ?? $decoded['error'] ?? 'Google OAuth error.',
            ]);
        }

        return $decoded;
    }

    private function statusFromHttpResponseHeaders(array $headers): int
    {
        foreach ($headers as $header) {
            if (preg_match('/^HTTP\/\S+\s+(\d{3})/', (string) $header, $matches)) {
                return (int) $matches[1];
            }
        }

        return 200;
    }

    private function isEmailVerified($value): bool
    {
        return $value === true || $value === 'true' || $value === 1 || $value === '1';
    }

    private function homeForRole(string $role): string
    {
        $homes = [
            'buyer' => '/buyer',
            'admin' => '/admin',
            'seller' => '/seller',
            'affiliate_admin' => '/affiliate',
        ];

        return $homes[$role] ?? '/';
    }

    private function slugForRole(string $role): string
    {
        return $role === 'affiliate_admin' ? 'affiliate' : $role;
    }

    private function labelForRole(string $role): string
    {
        $labels = [
            'buyer' => 'Buyer',
            'admin' => 'Admin',
            'seller' => 'Seller',
            'affiliate_admin' => 'Affiliate',
        ];

        return $labels[$role] ?? $role;
    }

    private function contextForHost(string $host): array
    {
        $normalizedHost = $this->normalizeHost($host);
        $hosts = (array) config('google.auth.hosts', []);
        $context = $hosts[$normalizedHost] ?? null;

        if (! is_array($context)) {
            throw new ForbiddenException('Domain login tidak diizinkan.');
        }

        $context['host'] = $normalizedHost;
        $context['role'] = $this->normalizeRole((string) ($context['role'] ?? ''));

        return $context;
    }

    private function redirectUriForHost(string $host): string
    {
        $scheme = (bool) config('google.auth.state_cookie.secure', false) ? 'https' : 'http';

        if (strpos($host, 'garasi-mobil.com') !== false) {
            $scheme = 'https';
        }

        return $scheme . '://' . $host . '/api/auth/google/callback';
    }

    private function normalizeHost(string $host): string
    {
        $host = strtolower(trim($host));

        if ($host === '') {
            return '';
        }

        return explode(':', $host, 2)[0];
    }

    private function clientId(): string
    {
        return trim((string) config('google.auth.client_id', ''));
    }

    private function clientSecret(): string
    {
        return trim((string) config('google.auth.client_secret', ''));
    }

    private function redirectUri(): string
    {
        return trim((string) config('google.auth.redirect_uri', ''));
    }

    private function cookieHeader(string $name, string $value, int $expiresAt, bool $secure, string $sameSite): string
    {
        $header = sprintf(
            '%s=%s; Expires=%s; Path=/; HttpOnly; SameSite=%s',
            $name,
            rawurlencode($value),
            gmdate('D, d M Y H:i:s T', $expiresAt),
            $sameSite
        );

        return $secure ? $header . '; Secure' : $header;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string
    {
        $padding = strlen($value) % 4;

        if ($padding > 0) {
            $value .= str_repeat('=', 4 - $padding);
        }

        $decoded = base64_decode(strtr($value, '-_', '+/'), true);

        if ($decoded === false) {
            throw new UnauthorizedException('Token Google tidak valid.');
        }

        return $decoded;
    }
}
