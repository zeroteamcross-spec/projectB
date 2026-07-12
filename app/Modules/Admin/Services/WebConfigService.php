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
        $config = $this->normalizePayload($payload, $user);
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

        if ($config['landing_page_route_name'] !== null) {
            $theme['landingPage'] = array_merge($theme['landingPage'] ?? [], [
                'routeName' => $config['landing_page_route_name'],
            ]);
        }

        $this->masters->upsert(self::MASTER_KEY, [
            'display_name' => 'Konfigurasi WEB',
            'data' => $theme,
            'bump_version' => true,
        ]);
        $this->syncStaticHtmlMetadata($theme);

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

    private function normalizePayload(array $payload, array $user): array
    {
        $appName = trim((string) ($payload['app_name'] ?? ''));
        $tagline = trim((string) ($payload['tagline'] ?? ''));
        $whatsapp = trim((string) ($payload['whatsapp_number'] ?? ''));
        $iconUrl = $this->nullableString($payload['icon_url'] ?? null);
        $hasLandingPage = array_key_exists('landing_page_route_name', $payload);
        $landingPageRouteName = $hasLandingPage ? $this->nullableString($payload['landing_page_route_name'] ?? null) : null;

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
        if ($landingPageRouteName !== null && ($user['role'] ?? null) !== 'super_admin') {
            $errors['landing_page_route_name'] = 'Landing page utama hanya dapat diubah oleh superadmin.';
        }
        if ($landingPageRouteName !== null && ! in_array($landingPageRouteName, $this->allowedLandingPageRouteNames(), true)) {
            $errors['landing_page_route_name'] = 'Landing page utama tidak valid.';
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        return [
            'icon_url' => $iconUrl,
            'app_name' => substr($appName, 0, 120),
            'tagline' => substr($tagline, 0, 180),
            'whatsapp_number' => $whatsapp,
            'landing_page_route_name' => $landingPageRouteName,
        ];
    }

    private function configFromTheme(array $theme): array
    {
        return [
            'icon_url' => $theme['brand']['iconUrl'] ?? $theme['brand']['logoMarkAsset'] ?? null,
            'app_name' => $theme['brand']['appName'] ?? 'BeliMobil',
            'tagline' => $theme['brand']['tagline'] ?? 'Jual beli mobil terpercaya',
            'whatsapp_number' => $theme['contact']['whatsapp'] ?? '',
            'landing_page_route_name' => $theme['landingPage']['routeName'] ?? 'public.saas-landing',
        ];
    }

    private function allowedLandingPageRouteNames(): array
    {
        return [
            'public.saas-landing',
            'public.catalog-alias',
            'public.auth-landing',
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

    private function syncStaticHtmlMetadata(array $theme): void
    {
        foreach ([base_path('public/index.html'), base_path('public/app.html')] as $path) {
            if (! is_file($path) || ! is_writable($path)) {
                continue;
            }

            $html = file_get_contents($path);
            if (! is_string($html) || $html === '') {
                continue;
            }

            file_put_contents($path, $this->injectHtmlMetadata($html, $theme));
        }
    }

    private function injectHtmlMetadata(string $html, array $theme): string
    {
        $config = $this->configFromTheme($theme);
        $appName = (string) $config['app_name'];
        $tagline = (string) $config['tagline'];
        $iconUrl = $this->shareableIconUrl((string) ($config['icon_url'] ?? ''));
        $absoluteIconUrl = $iconUrl !== '' ? $this->absoluteUrl($iconUrl) : '';

        $html = preg_replace('/<title>.*?<\/title>/is', '<title>' . $this->escapeHtml($appName) . '</title>', $html, 1) ?? $html;

        foreach ([
            ['name', 'application-name', $appName],
            ['name', 'apple-mobile-web-app-title', $appName],
            ['name', 'description', $tagline],
            ['property', 'og:site_name', $appName],
            ['property', 'og:title', $appName],
            ['property', 'og:description', $tagline],
            ['name', 'twitter:title', $appName],
            ['name', 'twitter:description', $tagline],
        ] as [$attribute, $key, $content]) {
            $html = $this->upsertHtmlMeta($html, $attribute, $key, $content);
        }

        if ($iconUrl !== '') {
            $html = $this->upsertHtmlLink($html, 'icon', $iconUrl);
            $html = $this->upsertHtmlLink($html, 'shortcut icon', $iconUrl);
            $html = $this->upsertHtmlLink($html, 'apple-touch-icon', $iconUrl);
        }

        if ($absoluteIconUrl !== '') {
            $html = $this->upsertHtmlMeta($html, 'property', 'og:image', $absoluteIconUrl);
            $html = $this->upsertHtmlMeta($html, 'name', 'twitter:image', $absoluteIconUrl);
        }

        return $html;
    }

    private function upsertHtmlMeta(string $html, string $attribute, string $key, string $content): string
    {
        $tag = '<meta ' . $attribute . '="' . $this->escapeHtml($key) . '" content="' . $this->escapeHtml($content) . '">';
        $pattern = '/<meta\s+' . preg_quote($attribute, '/') . '=["\']' . preg_quote($key, '/') . '["\'][^>]*>/i';

        return preg_match($pattern, $html) === 1
            ? (preg_replace($pattern, $tag, $html, 1) ?? $html)
            : (preg_replace('/<\/head>/i', '    ' . $tag . "\n  </head>", $html, 1) ?? $html);
    }

    private function upsertHtmlLink(string $html, string $rel, string $href): string
    {
        $type = $this->iconMimeType($href);
        $tag = '<link rel="' . $this->escapeHtml($rel) . '" href="' . $this->escapeHtml($href) . '"' . ($type !== '' ? ' type="' . $this->escapeHtml($type) . '"' : '') . '>';
        $pattern = '/<link\s+rel=["\']' . preg_quote($rel, '/') . '["\'][^>]*>/i';

        return preg_match($pattern, $html) === 1
            ? (preg_replace($pattern, $tag, $html, 1) ?? $html)
            : (preg_replace('/<\/head>/i', '    ' . $tag . "\n  </head>", $html, 1) ?? $html);
    }

    private function shareableIconUrl(string $url): string
    {
        $url = trim($url);
        if ($url === '' || strpos($url, 'brand.') === 0 || ! $this->isAllowedAssetUrl($url)) {
            return '';
        }

        return $url;
    }

    private function absoluteUrl(string $url): string
    {
        if (preg_match('/^https?:\/\//i', $url) === 1) {
            return $url;
        }

        $baseUrl = rtrim((string) env('APP_URL', ''), '/');
        if ($baseUrl === '') {
            return $url;
        }

        return $baseUrl . '/' . ltrim($url, '/');
    }

    private function iconMimeType(string $href): string
    {
        if (preg_match('/\.svg(?:[?#].*)?$/i', $href) === 1) {
            return 'image/svg+xml';
        }
        if (preg_match('/\.png(?:[?#].*)?$/i', $href) === 1) {
            return 'image/png';
        }
        if (preg_match('/\.webp(?:[?#].*)?$/i', $href) === 1) {
            return 'image/webp';
        }

        return '';
    }

    private function escapeHtml(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
