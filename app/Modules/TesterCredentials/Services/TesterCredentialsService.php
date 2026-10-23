<?php

declare(strict_types=1);

namespace App\Modules\TesterCredentials\Services;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\HttpException;
use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\UnauthorizedException;
use App\Core\Request;

final class TesterCredentialsService
{
    private const SESSION_KEY = 'tester_credentials_gate';

    public function unlock(Request $request): void
    {
        $this->assertEnabled();
        $this->assertSameOrigin($request);

        if (! $request->isJson()) {
            throw new HttpException('Request tidak valid.', 415);
        }

        $password = $request->input('password');
        if (! is_string($password) || $password === '' || strlen($password) > 128) {
            throw new UnauthorizedException('Password tidak sesuai.');
        }

        if (! $this->verifyPassphraseWithRateLimit($password, $request)) {
            throw new UnauthorizedException('Password tidak sesuai.');
        }

        $this->startSession();
        if (! session_regenerate_id(true)) {
            throw new HttpException('Sesi tester tidak dapat dibuat.', 503);
        }

        $now = time();
        $_SESSION[self::SESSION_KEY] = [
            'issued_at' => $now,
            'expires_at' => $now + $this->sessionTtl(),
        ];
    }

    public function accounts(Request $request): array
    {
        $this->assertEnabled();
        $this->assertUnlocked();

        $dataPath = (string) config('tester.credentials_page.accounts_path', '');
        $resolvedPath = realpath($dataPath);
        $publicPath = realpath(base_path('public'));
        if ($resolvedPath === false || $publicPath === false || ! is_file($resolvedPath)) {
            throw new HttpException('Data akun tester belum disiapkan.', 503);
        }

        $normalizedPublicPath = rtrim(str_replace('\\', '/', $publicPath), '/') . '/';
        $normalizedDataPath = str_replace('\\', '/', $resolvedPath);
        if (stripos($normalizedDataPath, $normalizedPublicPath) === 0) {
            throw new HttpException('Penyimpanan akun tester tidak aman.', 503);
        }

        $raw = file_get_contents($resolvedPath);
        $source = is_string($raw) ? json_decode($raw, true) : null;
        if (! is_array($source) || ! is_array($source['akun'] ?? null)) {
            throw new HttpException('Data akun tester tidak dapat dibaca.', 503);
        }

        $this->refreshSession();

        return [
            // Variabel ini dipakai runner UAT yang juga melewati gerbang akses.
            'variabel' => is_array($source['variabel'] ?? null) ? $source['variabel'] : [],
            'accounts' => $this->selectRoleAccounts($source['akun']),
        ];
    }

    public function lock(Request $request): void
    {
        $this->assertSameOrigin($request);
        $this->startSession();
        unset($_SESSION[self::SESSION_KEY]);
        session_regenerate_id(true);
    }

    private function selectRoleAccounts(array $sourceAccounts): array
    {
        $roles = [
            ['role' => 'super_admin', 'label' => 'Super Admin', 'login_url' => '/login/admin', 'preferred_variable' => 'superadmin_email'],
            ['role' => 'admin', 'label' => 'Admin', 'login_url' => '/login/admin', 'preferred_variable' => 'admin_email'],
            ['role' => 'seller', 'label' => 'Owner Showroom', 'login_url' => '/login/seller', 'preferred_variable' => 'seller_email'],
            ['role' => 'seller_staff', 'label' => 'Staf Showroom', 'login_url' => '/login/seller', 'preferred_variable' => 'staff_email'],
            ['role' => 'buyer', 'label' => 'Buyer', 'login_url' => '/login/buyer', 'preferred_variable' => 'buyer_email'],
            ['role' => 'affiliate_admin', 'label' => 'Marketing', 'login_url' => '/login/affiliate', 'preferred_variable' => 'marketing_email'],
        ];

        $selected = [];
        foreach ($roles as $definition) {
            $candidate = $this->preferredAccount($sourceAccounts, $definition['role'], $definition['preferred_variable']);
            $selected[] = [
                'role' => $definition['role'],
                'label' => $definition['label'],
                'login_url' => $definition['login_url'],
                'username' => is_array($candidate) ? (string) ($candidate['email'] ?? '') : '',
                'password' => is_array($candidate) ? (string) ($candidate['password'] ?? '') : '',
                'showroom' => is_array($candidate) ? (string) ($candidate['showroom'] ?? '') : '',
                'available' => is_array($candidate)
                    && trim((string) ($candidate['email'] ?? '')) !== ''
                    && trim((string) ($candidate['password'] ?? '')) !== '',
            ];
        }

        return $selected;
    }

    private function preferredAccount(array $accounts, string $role, string $preferredVariable): ?array
    {
        $roleAccounts = array_values(array_filter(
            $accounts,
            static fn ($account): bool => is_array($account) && ($account['role'] ?? null) === $role
        ));

        if ($roleAccounts === []) {
            return null;
        }

        foreach ($roleAccounts as $account) {
            if (strpos((string) ($account['variabel'] ?? ''), $preferredVariable) !== false) {
                return $account;
            }
        }

        return $roleAccounts[0];
    }

    private function verifyPassphraseWithRateLimit(string $password, Request $request): bool
    {
        $passwordHash = (string) config('tester.credentials_page.password_hash', '');
        if ($passwordHash === '') {
            throw new HttpException('Akses halaman tester belum dikonfigurasi.', 503);
        }

        $directory = (string) config('tester.credentials_page.attempts_path', '');
        if ($directory === '') {
            throw new HttpException('Pembatasan akses tester tidak tersedia.', 503);
        }

        if (! is_dir($directory) && ! @mkdir($directory, 0700, true) && ! is_dir($directory)) {
            throw new HttpException('Pembatasan akses tester tidak tersedia.', 503);
        }

        $clientIp = (string) $request->server('REMOTE_ADDR', 'unknown');
        $stateFile = rtrim($directory, DIRECTORY_SEPARATOR)
            . DIRECTORY_SEPARATOR
            . hash('sha256', $clientIp)
            . '.json';
        $handle = @fopen($stateFile, 'c+');
        if ($handle === false || ! flock($handle, LOCK_EX)) {
            if (is_resource($handle)) {
                fclose($handle);
            }
            throw new HttpException('Pembatasan akses tester tidak tersedia.', 503);
        }

        try {
            rewind($handle);
            $rawState = stream_get_contents($handle);
            $state = is_string($rawState) ? json_decode($rawState, true) : null;
            $now = time();
            if (! is_array($state) || (int) ($state['window_started_at'] ?? 0) + $this->lockoutSeconds() <= $now) {
                $state = ['window_started_at' => $now, 'attempts' => 0, 'locked_until' => 0];
            }

            $lockedUntil = (int) ($state['locked_until'] ?? 0);
            if ($lockedUntil > $now) {
                throw new HttpException('Terlalu banyak percobaan. Coba lagi nanti.', 429, [], [
                    'retry_after' => $lockedUntil - $now,
                ]);
            }

            if (password_verify($password, $passwordHash)) {
                $state = ['window_started_at' => $now, 'attempts' => 0, 'locked_until' => 0];
                $this->writeAttemptState($handle, $state);
                return true;
            }

            $state['attempts'] = (int) ($state['attempts'] ?? 0) + 1;
            if ($state['attempts'] >= $this->maxAttempts()) {
                $state['locked_until'] = $now + $this->lockoutSeconds();
            }
            $this->writeAttemptState($handle, $state);

            return false;
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    private function writeAttemptState($handle, array $state): void
    {
        $encoded = json_encode($state);
        if (! is_string($encoded)) {
            throw new HttpException('Pembatasan akses tester tidak dapat disimpan.', 503);
        }

        rewind($handle);
        if (! ftruncate($handle, 0) || fwrite($handle, $encoded) === false || ! fflush($handle)) {
            throw new HttpException('Pembatasan akses tester tidak dapat disimpan.', 503);
        }
    }

    private function assertUnlocked(): void
    {
        $this->startSession();
        $gate = $_SESSION[self::SESSION_KEY] ?? null;
        $now = time();
        if (! is_array($gate)
            || (int) ($gate['expires_at'] ?? 0) <= $now
            || (int) ($gate['issued_at'] ?? 0) + $this->sessionMaxSeconds() <= $now) {
            unset($_SESSION[self::SESSION_KEY]);
            throw new UnauthorizedException('Masukkan password untuk membuka daftar akun tester.');
        }

    }

    private function refreshSession(): void
    {
        $now = time();
        $_SESSION[self::SESSION_KEY]['expires_at'] = $now + $this->sessionTtl();
    }

    private function startSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        if (session_status() === PHP_SESSION_DISABLED || headers_sent()) {
            throw new HttpException('Sesi tester tidak tersedia.', 503);
        }

        $sessionName = (string) config('tester.credentials_page.session_name', 'carlynk_tester_gate');
        session_name($sessionName);
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => (string) config('app.env', 'local') === 'production'
                || (! empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        ini_set('session.use_strict_mode', '1');

        if (! session_start()) {
            throw new HttpException('Sesi tester tidak tersedia.', 503);
        }
    }

    private function assertSameOrigin(Request $request): void
    {
        $origin = $request->header('origin');
        $host = strtolower(trim((string) $request->server('HTTP_HOST', '')));
        $originHost = is_string($origin) ? parse_url($origin, PHP_URL_HOST) : false;

        if (! is_string($originHost) || $originHost === '' || $host === ''
            || strtolower($originHost) !== strtolower((string) preg_replace('/:\\d+$/', '', $host))) {
            throw new ForbiddenException('Permintaan tester harus berasal dari halaman ini.');
        }
    }

    private function assertEnabled(): void
    {
        if (! (bool) config('tester.credentials_page.enabled', false)) {
            throw new NotFoundException('Halaman tidak ditemukan.');
        }
    }

    private function sessionTtl(): int
    {
        return max(300, (int) config('tester.credentials_page.session_ttl_seconds', 1800));
    }

    private function sessionMaxSeconds(): int
    {
        return max($this->sessionTtl(), (int) config('tester.credentials_page.session_max_seconds', 7200));
    }

    private function maxAttempts(): int
    {
        return max(3, (int) config('tester.credentials_page.max_attempts', 5));
    }

    private function lockoutSeconds(): int
    {
        return max(60, (int) config('tester.credentials_page.lockout_seconds', 900));
    }
}
