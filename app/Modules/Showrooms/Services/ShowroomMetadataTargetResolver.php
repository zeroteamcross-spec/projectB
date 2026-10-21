<?php

declare(strict_types=1);

namespace App\Modules\Showrooms\Services;

/** Resolves metadata targets while distinguishing trusted custom-domain context. */
final class ShowroomMetadataTargetResolver
{
    /**
     * @return array{slug:?string,referral_code:?string}
     */
    public static function resolve(
        string $path,
        array $reservedRoutePrefixes,
        ?string $trustedCustomDomainSlug = null
    ): array {
        $segments = self::normalizedPathSegments($path);
        if ($segments === null) {
            return ['slug' => null, 'referral_code' => null];
        }

        $trustedCustomDomainSlug = trim((string) $trustedCustomDomainSlug);
        if ($trustedCustomDomainSlug !== '') {
            // This slug came from the active custom-domain lookup, not from an
            // untrusted path segment. Legacy slugs may now overlap routes or
            // real public files, but their custom-domain branding must remain.
            return ['slug' => $trustedCustomDomainSlug, 'referral_code' => null];
        }

        $showroomOnlySubPaths = ['cars', 'transactions', 'login'];
        if ($segments === []) {
            return ['slug' => null, 'referral_code' => null];
        }

        $reservedPrefixes = array_fill_keys(array_map(
            static fn ($prefix): string => strtolower((string) $prefix),
            $reservedRoutePrefixes
        ), true);

        $slug = null;
        $referralCode = null;
        if (in_array(strtolower($segments[0]), ['showrooms', 's'], true) && isset($segments[1])) {
            if (! isset($reservedPrefixes[strtolower($segments[1])])) {
                $slug = $segments[1];
            }
        } elseif (in_array(strtolower($segments[0]), ['af', 'a'], true) && isset($segments[1])) {
            $referralCode = $segments[1];
        } elseif (! isset($reservedPrefixes[strtolower($segments[0])])) {
            $slug = $segments[0];
            if (isset($segments[1]) && ! in_array(strtolower($segments[1]), $showroomOnlySubPaths, true)) {
                $referralCode = $segments[1];
            }
        }

        return ['slug' => $slug, 'referral_code' => $referralCode];
    }

    /**
     * Decode each URL path segment exactly once, rejecting ambiguous paths
     * before they can be used for showroom or affiliate metadata lookups.
     *
     * @return array<int, string>|null null indicates an invalid request path
     */
    private static function normalizedPathSegments(string $path): ?array
    {
        if (
            $path === ''
            || $path[0] !== '/'
            || strpos($path, '\\') !== false
            || strpos($path, '?') !== false
            || strpos($path, '#') !== false
        ) {
            return null;
        }

        if (preg_match('/%(?![a-f0-9]{2})/i', $path) === 1) {
            return null;
        }

        $segments = [];
        foreach (explode('/', $path) as $encodedSegment) {
            if ($encodedSegment === '') {
                continue;
            }

            $segment = rawurldecode($encodedSegment);
            if (
                strpos($segment, '/') !== false
                || strpos($segment, '\\') !== false
                || strpos($segment, '%') !== false
                || $segment === '.'
                || $segment === '..'
                || preg_match('/[\x00-\x1f\x7f]/', $segment) === 1
            ) {
                return null;
            }

            $segments[] = $segment;
        }

        return $segments;
    }
}
