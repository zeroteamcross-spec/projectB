<?php

declare(strict_types=1);

namespace App\Modules\Showrooms\Services;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\ValidationException;
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
                'slug' => $existing['slug'] ?: $this->generateSlug((string) ($data['name'] ?? $existing['name']), (int) $existing['id']),
                'name' => $data['name'] ?? $existing['name'],
                'address' => array_key_exists('address', $data) ? $data['address'] : $existing['address'],
                'city_name' => array_key_exists('city_name', $data) ? $data['city_name'] : $existing['city_name'],
                'phone_number' => array_key_exists('phone_number', $data) ? $data['phone_number'] : $existing['phone_number'],
                'bank_account_number' => array_key_exists('bank_account_number', $data)
                    ? $data['bank_account_number']
                    : $existing['bank_account_number'],
                'bank_type' => array_key_exists('bank_type', $data) ? $data['bank_type'] : $existing['bank_type'],
                'bank_account_name' => array_key_exists('bank_account_name', $data)
                    ? $data['bank_account_name']
                    : $existing['bank_account_name'],
                'icon_url' => array_key_exists('icon_url', $data) ? $data['icon_url'] : $existing['icon_url'],
                'header_logo_url' => array_key_exists('header_logo_url', $data)
                    ? $data['header_logo_url']
                    : $existing['header_logo_url'],
                'tab_title' => array_key_exists('tab_title', $data) ? $data['tab_title'] : $existing['tab_title'],
            ];

            $this->showrooms->update((int) $existing['id'], $payload);

            return $this->mine($user);
        }

        $data['slug'] = $this->generateSlug((string) $data['name']);
        $showroomId = $this->showrooms->create((int) $user['id'], $data);

        return $this->show((int) $showroomId, $user);
    }

    public function validateSlug(string $slug): array
    {
        $normalized = $this->normalizeSlug($slug);
        $this->assertSlugFormat($normalized);
        $showroom = $this->showrooms->findPublicContextBySlug($normalized);

        return [
            'slug' => $normalized,
            'is_valid' => $showroom !== null,
            'seller_user_id' => $showroom ? (int) $showroom['user_id'] : null,
            'contact_whatsapp' => $showroom ? ($showroom['phone_number'] ?: $showroom['seller_phone_number']) : null,
            'seller' => $showroom ? [
                'id' => (int) $showroom['user_id'],
                'name' => $showroom['seller_name'] ?? null,
                'email' => $showroom['seller_email'] ?? null,
                'phone_number' => $showroom['seller_phone_number'] ?? null,
            ] : null,
            'showroom' => $showroom ? [
                'id' => (int) $showroom['id'],
                'slug' => $showroom['slug'],
                'name' => $showroom['name'] ?? null,
                'address' => $showroom['address'] ?? null,
                'city_name' => $showroom['city_name'] ?? null,
                'phone_number' => $showroom['phone_number'] ?? null,
                'icon_url' => $showroom['icon_url'] ?? null,
                'header_logo_url' => $showroom['header_logo_url'] ?? null,
                'tab_title' => $showroom['tab_title'] ?? null,
            ] : null,
        ];
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
            'slug' => $showroom['slug'] ?? null,
            'name' => $showroom['name'],
            'address' => $showroom['address'],
            'city_name' => $showroom['city_name'] ?? null,
            'phone_number' => $showroom['phone_number'],
            'bank_account_number' => $showroom['bank_account_number'],
            'bank_type' => $showroom['bank_type'],
            'bank_account_name' => $showroom['bank_account_name'],
            'icon_url' => $showroom['icon_url'] ?? null,
            'header_logo_url' => $showroom['header_logo_url'] ?? null,
            'tab_title' => $showroom['tab_title'] ?? null,
            'created_at' => $showroom['created_at'],
            'updated_at' => $showroom['updated_at'],
        ];
    }

    public function ensureSellerAccess(array $user): void
    {
        $this->ensureSeller($user);
    }

    private function generateSlug(string $name, ?int $ignoreShowroomId = null): string
    {
        $base = $this->normalizeSlug($name);

        if ($base === '') {
            $base = 'showroom';
        }

        for ($attempt = 0; $attempt < 20; $attempt++) {
            $suffix = $attempt === 0 ? '' : '-' . strtolower(bin2hex(random_bytes(2)));
            $slug = substr($base, 0, 60 - strlen($suffix)) . $suffix;

            if (! $this->showrooms->slugExists($slug, $ignoreShowroomId)) {
                return $slug;
            }
        }

        throw new ValidationException(['slug' => 'Unable to generate unique showroom slug.']);
    }

    private function normalizeSlug(string $value): string
    {
        $slug = strtolower(trim($value));
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
        $slug = trim($slug, '-');

        return $slug;
    }

    private function assertSlugFormat(string $slug): void
    {
        if ($slug === '' || ! preg_match('/^[a-z0-9-]+$/', $slug)) {
            throw new ValidationException([
                'slug' => 'Slug showroom hanya boleh berisi huruf kecil, angka, dan dash.',
            ]);
        }
    }
}
