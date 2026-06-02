<?php

declare(strict_types=1);

namespace App\Modules\Sliders\Services;

use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\ValidationException;
use App\Infrastructure\Storage\StorageServiceInterface;
use App\Modules\Auth\Policies\AuthPolicy;
use App\Modules\Sliders\Mappers\SliderMapper;
use App\Modules\Sliders\Repositories\SliderRepository;

class SliderService
{
    private SliderRepository $sliders;

    private StorageServiceInterface $storage;

    public function __construct(SliderRepository $sliders, StorageServiceInterface $storage)
    {
        $this->sliders = $sliders;
        $this->storage = $storage;
    }

    public function adminList(array $user, array $filters): array
    {
        AuthPolicy::requireAdmin($user);
        $pagination = $this->pagination($filters);
        $rows = $this->sliders->list($filters, $pagination['limit'], $pagination['offset']);
        $total = $this->sliders->count($filters);

        return [
            'sliders' => SliderMapper::many($rows),
            'meta' => [
                'page' => $pagination['page'],
                'limit' => $pagination['limit'],
                'total' => $total,
            ],
        ];
    }

    public function publicList(array $filters): array
    {
        $positionKey = $filters['position_key'] ?? $filters['position'] ?? null;
        $limit = max(1, min((int) ($filters['limit'] ?? 10), 20));

        if ($positionKey !== null && $positionKey !== '' && ! in_array($positionKey, SliderTemplateRegistry::POSITIONS, true)) {
            throw new ValidationException([
                'position' => 'Position slider tidak valid.',
            ]);
        }

        return [
            'sliders' => SliderMapper::many($this->sliders->publicList($positionKey, $limit, date('Y-m-d H:i:s'))),
            'meta' => [
                'limit' => $limit,
                'position' => $positionKey,
            ],
        ];
    }

    public function detail(array $user, int $id): array
    {
        AuthPolicy::requireAdmin($user);

        return SliderMapper::toArray($this->requireSlider($id));
    }

    public function create(array $user, array $data): array
    {
        AuthPolicy::requireAdmin($user);
        $payload = $this->normalizePayload($data);
        $payload['code'] = $this->normalizeCode((string) ($data['code'] ?? ''), (string) $payload['title']);

        if ($this->sliders->findByCode($payload['code']) !== null) {
            throw new ValidationException([
                'code' => 'Kode slider sudah digunakan.',
            ]);
        }

        $now = date('Y-m-d H:i:s');
        $payload['created_by'] = (int) $user['id'];
        $payload['updated_by'] = null;
        $payload['created_at'] = $now;
        $payload['updated_at'] = null;
        $payload['deleted_at'] = null;

        $id = $this->sliders->create($payload);

        return SliderMapper::toArray($this->requireSlider($id));
    }

    public function update(array $user, int $id, array $data): array
    {
        AuthPolicy::requireAdmin($user);
        $current = $this->requireSlider($id);
        $payload = $this->normalizePayload(array_merge($current, $data));
        $payload['code'] = $this->normalizeCode((string) ($data['code'] ?? $current['code']), (string) $payload['title']);

        if ($this->sliders->findByCode($payload['code'], $id) !== null) {
            throw new ValidationException([
                'code' => 'Kode slider sudah digunakan.',
            ]);
        }

        $payload['updated_by'] = (int) $user['id'];
        $payload['updated_at'] = date('Y-m-d H:i:s');

        $this->sliders->update($id, $payload);

        return SliderMapper::toArray($this->requireSlider($id));
    }

    public function delete(array $user, int $id): array
    {
        AuthPolicy::requireAdmin($user);
        $this->requireSlider($id);
        $this->sliders->softDelete($id, (int) $user['id']);

        return [
            'id' => $id,
            'deleted_at' => date('Y-m-d H:i:s'),
        ];
    }

    public function toggle(array $user, int $id): array
    {
        AuthPolicy::requireAdmin($user);
        $current = $this->requireSlider($id);
        $this->sliders->update($id, [
            'is_active' => (int) ! (bool) $current['is_active'],
            'updated_by' => (int) $user['id'],
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return SliderMapper::toArray($this->requireSlider($id));
    }

    public function reorder(array $user, array $items): array
    {
        AuthPolicy::requireAdmin($user);

        if ($items === []) {
            throw new ValidationException([
                'items' => 'Payload urutan slider wajib diisi.',
            ]);
        }

        foreach ($items as $index => $item) {
            $id = (int) ($item['id'] ?? 0);
            if ($id < 1) {
                throw new ValidationException([
                    'items' => 'Payload urutan slider tidak valid.',
                ]);
            }

            $this->requireSlider($id);
            $this->sliders->update($id, [
                'sort_order' => array_key_exists('sort_order', $item) ? max(0, (int) $item['sort_order']) : (($index + 1) * 10),
                'updated_by' => (int) $user['id'],
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
        }

        return $this->adminList($user, ['limit' => 100]);
    }

    public function uploadImage(array $user, array $payload): array
    {
        AuthPolicy::requireAdmin($user);
        $stored = $this->storage->storeUploadedFile($payload['image'], 'sliders');

        return [
            'url' => $stored['file_path'],
            'path' => $stored['file_path'],
            'file_name' => $stored['file_name'],
            'mime_type' => $payload['mime_type'],
            'size' => (int) ($payload['image']['size'] ?? 0),
        ];
    }

    private function requireSlider(int $id): array
    {
        $slider = $this->sliders->findById($id);

        if (! $slider) {
            throw new NotFoundException('Slider tidak ditemukan.');
        }

        return $slider;
    }

    private function normalizePayload(array $data): array
    {
        $templateKey = (string) ($data['template_key'] ?? 'elegant_gradient');
        $positionKey = (string) ($data['position_key'] ?? $data['position'] ?? 'landing_hero');
        $animationKey = (string) ($data['animation_key'] ?? 'fade');
        $ctaUrl = $this->nullableString($data['cta_url'] ?? null);

        if (! in_array($templateKey, SliderTemplateRegistry::TEMPLATES, true)) {
            throw new ValidationException(['template_key' => 'Template slider tidak valid.']);
        }

        if (! in_array($positionKey, SliderTemplateRegistry::POSITIONS, true)) {
            throw new ValidationException(['position_key' => 'Position slider tidak valid.']);
        }

        if (! in_array($animationKey, SliderTemplateRegistry::ANIMATIONS, true)) {
            throw new ValidationException(['animation_key' => 'Animasi slider tidak valid.']);
        }

        if ($ctaUrl !== null && ! $this->isAllowedCtaUrl($ctaUrl)) {
            throw new ValidationException(['cta_url' => 'CTA URL harus berupa http(s), route hash, atau path relatif aman.']);
        }

        $startAt = $this->nullableDateTime($data['start_at'] ?? null);
        $endAt = $this->nullableDateTime($data['end_at'] ?? null);

        if ($startAt !== null && $endAt !== null && strtotime($endAt) < strtotime($startAt)) {
            throw new ValidationException([
                'end_at' => 'Jadwal selesai tidak boleh lebih awal dari jadwal mulai.',
            ]);
        }

        return [
            'title' => trim((string) ($data['title'] ?? '')),
            'subtitle' => $this->nullableString($data['subtitle'] ?? null),
            'body_text' => $this->nullableString($data['description'] ?? $data['body_text'] ?? null),
            'html_content' => null,
            'image_url' => $this->nullableString($data['image_url'] ?? null),
            'image_alt' => $this->nullableString($data['image_alt'] ?? null),
            'cta_text' => $this->nullableString($data['cta_text'] ?? null),
            'cta_url' => $ctaUrl,
            'position_key' => $positionKey,
            'template_key' => $templateKey,
            'animation_key' => $animationKey,
            'sort_order' => max(0, (int) ($data['sort_order'] ?? 0)),
            'is_active' => (int) $this->toBoolean($data['is_active'] ?? true),
            'start_at' => $startAt,
            'end_at' => $endAt,
        ];
    }

    private function normalizeCode(string $code, string $title): string
    {
        $source = trim($code) !== '' ? $code : $title . '-' . bin2hex(random_bytes(3));
        $slug = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $source) ?? '', '-'));

        return $slug !== '' ? substr($slug, 0, 80) : 'slider-' . bin2hex(random_bytes(4));
    }

    private function pagination(array $filters): array
    {
        $page = max(1, (int) ($filters['page'] ?? 1));
        $limit = max(1, min((int) ($filters['limit'] ?? 100), 100));

        return [
            'page' => $page,
            'limit' => $limit,
            'offset' => ($page - 1) * $limit,
        ];
    }

    private function nullableString($value): ?string
    {
        $value = trim((string) ($value ?? ''));

        return $value === '' ? null : $value;
    }

    private function nullableDateTime($value): ?string
    {
        $value = trim((string) ($value ?? ''));

        if ($value === '') {
            return null;
        }

        $timestamp = strtotime($value);

        if ($timestamp === false) {
            throw new ValidationException([
                'schedule' => 'Format jadwal slider tidak valid.',
            ]);
        }

        return date('Y-m-d H:i:s', $timestamp);
    }

    private function toBoolean($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        return in_array($value, [1, '1', 'true', 'yes', 'on'], true);
    }

    private function isAllowedCtaUrl(string $url): bool
    {
        $value = trim($url);

        if (preg_match('/^https?:\/\//i', $value) === 1) {
            return true;
        }

        if (strpos($value, '#/') === 0 || preg_match('/^\/(?!\/)[A-Za-z0-9._~!$&\'()*+,;=:@\/%-]*$/', $value) === 1) {
            return stripos($value, 'javascript:') === false;
        }

        return false;
    }
}
