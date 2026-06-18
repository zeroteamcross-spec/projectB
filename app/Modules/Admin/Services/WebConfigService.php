<?php

declare(strict_types=1);

namespace App\Modules\Admin\Services;

use App\Core\Exceptions\ValidationException;
use App\Modules\Auth\Policies\AuthPolicy;
use App\Modules\MasterData\Services\MasterDataService;

class WebConfigService
{
    private const MASTER_KEY = 'design_studio.theme_config';

    private MasterDataService $masters;

    public function __construct(MasterDataService $masters)
    {
        $this->masters = $masters;
    }

    public function get(array $user): array
    {
        AuthPolicy::requireAdmin($user);

        return $this->configFromTheme($this->theme());
    }

    public function update(array $user, array $payload): array
    {
        AuthPolicy::requireAdmin($user);
        $config = $this->normalizePayload($payload);
        $theme = $this->theme();
        $theme['brand'] = array_merge($theme['brand'] ?? [], [
            'appName' => $config['app_name'],
            'tagline' => $config['tagline'],
        ]);
        $theme['contact'] = array_merge($theme['contact'] ?? [], [
            'whatsapp' => $config['whatsapp_number'],
        ]);

        if ($config['icon_url'] !== null) {
            $theme['brand']['logoIcon'] = 'brandMark';
            $theme['brand']['logoMarkAsset'] = $config['icon_url'];
            $theme['brand']['iconUrl'] = $config['icon_url'];
        }

        $this->masters->upsert(self::MASTER_KEY, [
            'display_name' => 'Konfigurasi WEB',
            'data' => $theme,
            'bump_version' => true,
        ]);

        return [
            'config' => $this->configFromTheme($theme),
            'theme' => $theme,
        ];
    }

    public function theme(): array
    {
        try {
            $master = $this->masters->get(self::MASTER_KEY);
            return is_array($master['data'] ?? null) ? $master['data'] : [];
        } catch (\Throwable $exception) {
            return [];
        }
    }

    private function normalizePayload(array $payload): array
    {
        $appName = trim((string) ($payload['app_name'] ?? ''));
        $tagline = trim((string) ($payload['tagline'] ?? ''));
        $whatsapp = trim((string) ($payload['whatsapp_number'] ?? ''));
        $iconUrl = $this->nullableString($payload['icon_url'] ?? null);

        $errors = [];
        if ($appName === '') {
            $errors['app_name'] = 'Nama Web / Aplikasi wajib diisi.';
        }
        if ($tagline === '') {
            $errors['tagline'] = 'Tagline wajib diisi.';
        }
        if ($whatsapp === '' || preg_match('/^[0-9+()\-\s]{8,25}$/', $whatsapp) !== 1) {
            $errors['whatsapp_number'] = 'Nomor Whatsapp Aplikasi tidak valid.';
        }
        if ($iconUrl !== null && ! $this->isAllowedAssetUrl($iconUrl)) {
            $errors['icon_url'] = 'Icon URL harus berupa http(s), path upload, atau asset key aman.';
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        return [
            'icon_url' => $iconUrl,
            'app_name' => substr($appName, 0, 120),
            'tagline' => substr($tagline, 0, 180),
            'whatsapp_number' => $whatsapp,
        ];
    }

    private function configFromTheme(array $theme): array
    {
        return [
            'icon_url' => $theme['brand']['iconUrl'] ?? $theme['brand']['logoMarkAsset'] ?? null,
            'app_name' => $theme['brand']['appName'] ?? 'BeliMobil',
            'tagline' => $theme['brand']['tagline'] ?? 'Jual beli mobil terpercaya',
            'whatsapp_number' => $theme['contact']['whatsapp'] ?? '',
        ];
    }

    private function nullableString($value): ?string
    {
        $value = trim((string) ($value ?? ''));

        return $value === '' ? null : $value;
    }

    private function isAllowedAssetUrl(string $url): bool
    {
        return preg_match('/^https?:\/\//i', $url) === 1
            || (preg_match('/^\/(?!\/)[A-Za-z0-9._~!$&\'()*+,;=:@\/%-]*$/', $url) === 1 && stripos($url, 'javascript:') === false)
            || preg_match('/^[a-zA-Z0-9_.-]+$/', $url) === 1;
    }
}
