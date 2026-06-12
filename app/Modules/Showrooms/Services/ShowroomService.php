<?php

declare(strict_types=1);

namespace App\Modules\Showrooms\Services;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\NotFoundException;
use App\Modules\Showrooms\Repositories\ShowroomRepository;

class ShowroomService
{
    private ShowroomRepository $showrooms;

    public function __construct(ShowroomRepository $showrooms)
    {
        $this->showrooms = $showrooms;
    }

    public function mine(array $user): array
    {
        $this->ensureSeller($user);
        $showroom = $this->showrooms->findByUserId((int) $user['id']);

        if (! $showroom) {
            throw new NotFoundException('Showroom belum tersedia.');
        }

        return $this->serializeShowroom($showroom);
    }

    public function show(int $id, array $user): array
    {
        $showroom = $this->showrooms->findById($id);

        if (! $showroom) {
            throw new NotFoundException('Showroom tidak ditemukan.');
        }

        if (($user['role'] ?? null) !== 'admin' && (int) $showroom['user_id'] !== (int) $user['id']) {
            throw new ForbiddenException('Akses showroom tidak diizinkan.');
        }

        return $this->serializeShowroom($showroom);
    }

    public function upsertMine(array $user, array $data): array
    {
        $this->ensureSeller($user);
        $existing = $this->showrooms->findByUserId((int) $user['id']);

        if ($existing) {
            $payload = [
                'name' => $data['name'] ?? $existing['name'],
                'address' => array_key_exists('address', $data) ? $data['address'] : $existing['address'],
                'phone_number' => array_key_exists('phone_number', $data) ? $data['phone_number'] : $existing['phone_number'],
                'bank_account_number' => array_key_exists('bank_account_number', $data)
                    ? $data['bank_account_number']
                    : $existing['bank_account_number'],
                'bank_type' => array_key_exists('bank_type', $data) ? $data['bank_type'] : $existing['bank_type'],
                'bank_account_name' => array_key_exists('bank_account_name', $data)
                    ? $data['bank_account_name']
                    : $existing['bank_account_name'],
            ];

            $this->showrooms->update((int) $existing['id'], $payload);

            return $this->mine($user);
        }

        $showroomId = $this->showrooms->create((int) $user['id'], $data);

        return $this->show((int) $showroomId, $user);
    }

    private function ensureSeller(array $user): void
    {
        if (! in_array(($user['role'] ?? null), ['seller', 'super_admin'], true)) {
            throw new ForbiddenException('Hanya seller yang dapat mengelola showroom.');
        }
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
