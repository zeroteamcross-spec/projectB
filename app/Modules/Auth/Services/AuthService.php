<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\UnauthorizedException;
use App\Core\Exceptions\ValidationException;
use App\Modules\Auth\Repositories\AuthTokenRepository;
use App\Modules\Auth\Repositories\AuthUserRepository;
use App\Modules\Auth\Policies\AuthPolicy;
use DateInterval;
use DateTimeImmutable;
use PDO;
use PDOException;
use Throwable;

class AuthService
{
    private const SHOWROOM_SLUG_MIN_LENGTH = 3;

    private const SHOWROOM_SLUG_MAX_LENGTH = 80;

    private PDO $pdo;

    private AuthUserRepository $users;

    private AuthTokenRepository $tokens;

    public function __construct(PDO $pdo, AuthUserRepository $users, AuthTokenRepository $tokens)
    {
        $this->pdo = $pdo;
        $this->users = $users;
        $this->tokens = $tokens;
    }

    public function register(array $data): array
    {
        if ($this->users->emailExists($data['email'])) {
            throw new ValidationException([
                'email' => 'Email sudah terdaftar.',
            ]);
        }

        $now = date('Y-m-d H:i:s');
        $accountStatus = $data['role'] === 'buyer' ? 'active' : 'pending';
        $isApproved = $data['role'] === 'buyer' ? 1 : 0;
        $showroomSlug = $data['role'] === 'seller'
            ? $this->resolveShowroomSlug((string) ($data['showroom']['slug'] ?? ''))
            : null;

        try {
            $this->pdo->beginTransaction();

            $userId = $this->users->createUser([
                'role' => $data['role'],
                'name' => $data['name'],
                'phone_number' => $data['phone_number'] ?? null,
                'email' => $data['email'],
                'password_hash' => password_hash($data['password'], PASSWORD_DEFAULT),
                'address' => $data['address'] ?? null,
                'account_status' => $accountStatus,
                'is_approved' => $isApproved,
                'created_at' => $now,
            ]);

            if ($data['role'] === 'seller') {
                $showroom = $data['showroom'];
                $showroom['created_at'] = $now;
                $showroom['slug'] = $showroomSlug;
                $this->users->createShowroom($userId, $showroom);
            }

            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            // Two registrations can pass the availability check and still collide
            // on the unique index. Surface that as the same validation error
            // instead of a 500.
            if ($showroomSlug !== null && $this->isShowroomSlugConflict($exception)) {
                throw $this->showroomSlugTakenException($showroomSlug);
            }

            throw $exception;
        }

        $user = $this->users->findById($userId);

        return [
            'user' => $this->serializeUser($user),
        ];
    }

    public function login(array $data): array
    {
        $user = $this->users->findByEmail($data['email']);

        if (! $user || ! password_verify($data['password'], $user['password_hash'])) {
            throw new UnauthorizedException('Email atau password salah.');
        }

        $this->ensureCanAuthenticate($user);

        $result = [
            'user' => $this->serializeUser($user),
            'remember_token' => null,
        ];

        $result['remember_token'] = $this->issueRememberToken((int) $user['id']);

        return $result;
    }

    public function authenticateRememberToken(?string $rawToken): array
    {
        [$selector, $validator] = $this->parseRememberToken($rawToken);
        $token = $this->tokens->findActiveBySelector($selector);

        if (! $token || ! password_verify($validator, $token['hashed_validator'])) {
            $this->tokens->revokeBySelector($selector);
            throw new UnauthorizedException('Remember token tidak valid.');
        }

        $user = $this->users->findById((int) $token['user_id']);

        if (! $user) {
            $this->tokens->revokeBySelector($selector);
            throw new UnauthorizedException('User tidak ditemukan.');
        }

        $this->ensureCanAuthenticate($user);
        $this->tokens->markLastUsed((int) $token['id']);

        // Token rotation can be added here later by returning a replacement token with the user payload.
        return [
            'user' => $this->serializeUser($user),
        ];
    }

    public function logout(?string $rawToken): void
    {
        if (! is_string($rawToken) || strpos($rawToken, ':') === false) {
            return;
        }

        [$selector] = explode(':', $rawToken, 2);

        if ($selector !== '') {
            $this->tokens->revokeBySelector($selector);
        }
    }

    public function confirmOtp(array $data): array
    {
        $user = $this->users->findByPhoneAndOtp($data['phone_number'], $data['otp_code']);

        if (! $user) {
            throw new UnauthorizedException('Konfirmasi OTP gagal.');
        }

        if (! empty($user['otp_expires_at']) && strtotime((string) $user['otp_expires_at']) < time()) {
            throw new UnauthorizedException('OTP sudah kedaluwarsa.');
        }

        $this->users->clearOtp((int) $user['id']);

        $result = [
            'user' => $this->serializeUser($user),
            'remember_token' => null,
        ];

        if ($this->canAuthenticate($user)) {
            $result['remember_token'] = $this->issueRememberToken((int) $user['id']);
        }

        return $result;
    }

    public function pendingUsers(array $actor, int $limit = 500): array
    {
        AuthPolicy::requireAdmin($actor);

        return array_map(fn (array $user): array => $this->serializeUser($user), $this->users->pendingUsers($limit));
    }

    public function approveUsers(array $actor, array $userIds): array
    {
        AuthPolicy::requireAdmin($actor);

        $ids = array_values(array_unique(array_map('intval', $userIds)));
        $ids = array_filter($ids, fn (int $id): bool => $id > 0);

        return [
            'approved_count' => $this->users->approveUsers($ids),
            'user_ids' => array_values($ids),
        ];
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

    private function parseRememberToken(?string $rawToken): array
    {
        if (! is_string($rawToken) || strpos($rawToken, ':') === false) {
            throw new UnauthorizedException('Remember token tidak ditemukan.');
        }

        [$selector, $validator] = explode(':', $rawToken, 2);

        if ($selector === '' || $validator === '') {
            throw new UnauthorizedException('Remember token tidak valid.');
        }

        return [$selector, $validator];
    }

    private function ensureCanAuthenticate(array $user): void
    {
        if (! $this->canAuthenticate($user)) {
            if (($user['account_status'] ?? null) === 'suspended') {
                throw new ForbiddenException('Akun Anda sedang disuspended.');
            }

            throw new ForbiddenException('Akun Anda belum aktif, hubungi Admin untuk informasi lebih lanjut.', [], [
                'account_status' => $user['account_status'] ?? null,
                'is_approved' => (bool) ($user['is_approved'] ?? false),
            ]);
        }
    }

    private function canAuthenticate(array $user): bool
    {
        $status = $user['account_status'] ?? null;
        $role = $user['role'] ?? null;

        if ($role === 'seller') {
            return $status !== 'suspended';
        }

        return $status === 'active' && (int) ($user['is_approved'] ?? 0) === 1;
    }

    /**
     * The showroom picks its own slug at registration. Normalize it, hold it to
     * the canon format, then make sure nothing else already owns it.
     */
    private function resolveShowroomSlug(string $requested): string
    {
        $slug = $this->normalizeShowroomSlug($requested);

        if (strlen($slug) < self::SHOWROOM_SLUG_MIN_LENGTH) {
            throw new ValidationException([
                'showroom.slug' => 'Slug showroom minimal ' . self::SHOWROOM_SLUG_MIN_LENGTH
                    . ' karakter huruf kecil, angka, atau dash.',
            ]);
        }

        if (strlen($slug) > self::SHOWROOM_SLUG_MAX_LENGTH) {
            throw new ValidationException([
                'showroom.slug' => 'Slug showroom maksimal ' . self::SHOWROOM_SLUG_MAX_LENGTH . ' karakter.',
            ]);
        }

        if ($this->users->showroomSlugExists($slug)) {
            throw $this->showroomSlugTakenException($slug);
        }

        return $slug;
    }

    private function showroomSlugTakenException(string $slug): ValidationException
    {
        $suggestion = $this->suggestShowroomSlug($slug);
        $message = "Slug '{$slug}' sudah dipakai.";

        if ($suggestion !== null) {
            $message .= " Coba '{$suggestion}'.";
        }

        return new ValidationException(['showroom.slug' => $message]);
    }

    private function suggestShowroomSlug(string $base): ?string
    {
        for ($counter = 2; $counter <= 50; $counter++) {
            $suffix = '-' . $counter;
            $candidate = substr($base, 0, self::SHOWROOM_SLUG_MAX_LENGTH - strlen($suffix)) . $suffix;

            if (! $this->users->showroomSlugExists($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    private function isShowroomSlugConflict(Throwable $exception): bool
    {
        if (! $exception instanceof PDOException) {
            return false;
        }

        if (($exception->errorInfo[0] ?? null) !== '23000') {
            return false;
        }

        return stripos($exception->getMessage(), 'showrooms_slug_unique') !== false
            || stripos($exception->getMessage(), 'slug') !== false;
    }

    private function normalizeShowroomSlug(string $value): string
    {
        $slug = strtolower(trim($value));
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';

        return trim($slug, '-');
    }

    public function serializeUser(?array $user): array
    {
        if (! $user) {
            return [];
        }

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
            'has_google_identity' => (bool) ($user['has_google_identity'] ?? false),
            'home_showroom_slug' => $this->homeShowroomSlug($user),
        ];
    }

    /**
     * Which showroom this buyer is a customer of, set the first time they log
     * in through a showroom-scoped Google login and overwritten on every
     * later login through a different showroom's link. Meaningless for other
     * roles, so this stays null for them.
     */
    private function homeShowroomSlug(array $user): ?string
    {
        if (($user['role'] ?? null) !== 'buyer') {
            return null;
        }

        $showroomId = $user['home_showroom_id'] ?? null;

        return $showroomId !== null ? $this->users->findShowroomSlugById((int) $showroomId) : null;
    }
}
