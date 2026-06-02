<?php

declare(strict_types=1);

namespace App\Modules\Users\Services;

use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\ValidationException;
use App\Modules\Users\Repositories\UserRepository;

class UserService
{
    private UserRepository $users;

    public function __construct(UserRepository $users)
    {
        $this->users = $users;
    }

    public function profile(int $userId): array
    {
        $user = $this->users->findWithShowroom($userId);

        if (! $user) {
            throw new NotFoundException('User tidak ditemukan.');
        }

        return $this->serializeUser($user);
    }

    public function updateProfile(int $userId, array $data): array
    {
        $current = $this->users->findById($userId);

        if (! $current) {
            throw new NotFoundException('User tidak ditemukan.');
        }

        $payload = [
            'name' => $data['name'] ?? $current['name'],
            'phone_number' => array_key_exists('phone_number', $data) ? $data['phone_number'] : $current['phone_number'],
            'email' => $data['email'] ?? $current['email'],
            'address' => array_key_exists('address', $data) ? $data['address'] : $current['address'],
        ];

        if ($payload['email'] !== $current['email'] && $this->users->emailExistsForOtherUser($payload['email'], $userId)) {
            throw new ValidationException([
                'email' => 'Email sudah digunakan oleh user lain.',
            ]);
        }

        $this->users->updateProfile($userId, $payload);

        return $this->profile($userId);
    }

    public function changePassword(int $userId, array $data): void
    {
        $credentials = $this->users->findCredentialsById($userId);

        if (! $credentials) {
            throw new NotFoundException('User tidak ditemukan.');
        }

        if (! password_verify((string) $data['current_password'], (string) $credentials['password_hash'])) {
            throw new ValidationException([
                'current_password' => 'Password lama tidak sesuai.',
            ]);
        }

        $this->users->updatePasswordHash($userId, password_hash((string) $data['new_password'], PASSWORD_DEFAULT));
    }

    public function approvalStatus(int $userId): array
    {
        $user = $this->users->findById($userId);

        if (! $user) {
            throw new NotFoundException('User tidak ditemukan.');
        }

        return [
            'user_id' => (int) $user['id'],
            'role' => $user['role'],
            'account_status' => $user['account_status'],
            'is_approved' => (bool) $user['is_approved'],
        ];
    }

    private function serializeUser(array $user): array
    {
        return [
            'id' => (int) $user['id'],
            'username' => $this->usernameFromEmail((string) ($user['email'] ?? '')),
            'role' => $user['role'],
            'login_level' => $user['role'],
            'effective_group' => $user['role'],
            'data_scope' => 'own',
            'name' => $user['name'],
            'full_name' => $user['name'],
            'phone_number' => $user['phone_number'],
            'email' => $user['email'],
            'address' => $user['address'],
            'account_status' => $user['account_status'],
            'is_approved' => (bool) $user['is_approved'],
            'created_at' => $user['created_at'],
            'updated_at' => $user['updated_at'],
            'showroom' => isset($user['showroom']) && is_array($user['showroom'])
                ? $this->serializeShowroom($user['showroom'])
                : null,
        ];
    }

    private function usernameFromEmail(string $email): string
    {
        if ($email === '' || strpos($email, '@') === false) {
            return $email;
        }

        return explode('@', $email, 2)[0];
    }

    private function serializeShowroom(array $showroom): array
    {
        return [
            'id' => (int) $showroom['id'],
            'user_id' => (int) $showroom['user_id'],
            'name' => $showroom['name'],
            'address' => $showroom['address'],
            'phone_number' => $showroom['phone_number'],
            'bank_account_number' => $showroom['bank_account_number'],
            'bank_type' => $showroom['bank_type'],
            'bank_account_name' => $showroom['bank_account_name'],
            'created_at' => $showroom['created_at'],
            'updated_at' => $showroom['updated_at'],
        ];
    }
}
