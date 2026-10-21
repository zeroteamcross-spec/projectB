<?php

declare(strict_types=1);

namespace App\Modules\Showrooms\Services;

use App\Core\Router;
use RuntimeException;

/**
 * Derives reserved root slugs from the active SPA/PHP routes and actual public
 * document-root entries. The latter are served directly by .htaccess before
 * the SPA fallback, so a showroom slug must not shadow one of them.
 */
final class SystemRouteSlugRegistry
{
    private static ?array $cachedPrefixes = null;

    /** @return array<int, string> */
    public static function reservedPrefixes(): array
    {
        if (self::$cachedPrefixes !== null) {
            return self::$cachedPrefixes;
        }

        $paths = self::frontendRoutePaths();
        $paths = array_merge($paths, self::backendRoutePaths());
        $prefixes = [];

        foreach ($paths as $path) {
            $path = trim((string) $path);
            if ($path === '' || $path[0] !== '/') {
                continue;
            }

            $firstSegment = explode('/', trim($path, '/'))[0] ?? '';
            // Parameter-only roots (/:slug) are the showroom route itself,
            // not a fixed system path. Keep only slug-compatible literals.
            if ($firstSegment === '' || ! preg_match('/^[a-z0-9-]+$/i', $firstSegment)) {
                continue;
            }

            $prefixes[strtolower($firstSegment)] = true;
        }

        foreach (self::publicDocumentRootPrefixes() as $prefix) {
            $prefixes[$prefix] = true;
        }

        $result = array_keys($prefixes);
        sort($result, SORT_STRING);
        self::$cachedPrefixes = $result;

        return $result;
    }

    /** @return array<int, string> */
    public static function publicDocumentRootPrefixes(): array
    {
        $configuredPublicRoot = base_path('public');
        $publicRoot = realpath($configuredPublicRoot);
        if ($publicRoot === false || ! is_dir($publicRoot) || ! is_readable($publicRoot)) {
            throw new RuntimeException('Public document root could not be read.');
        }

        $entries = scandir($publicRoot);
        if ($entries === false) {
            throw new RuntimeException('Public document root entries could not be read.');
        }

        $prefixes = [];
        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }

            $path = $publicRoot . DIRECTORY_SEPARATOR . $entry;
            if (! is_file($path) && ! is_dir($path)) {
                continue;
            }

            // These are the only names a showroom slug can use. Entries with
            // extensions or other punctuation cannot collide with a slug.
            if (preg_match('/^[a-z0-9-]+$/i', $entry) === 1) {
                $prefixes[strtolower($entry)] = true;
            }
        }

        $result = array_keys($prefixes);
        sort($result, SORT_STRING);

        return $result;
    }

    public static function isReserved(string $slug): bool
    {
        return in_array(strtolower(trim($slug)), self::reservedPrefixes(), true);
    }

    /** @return array<int, string> */
    private static function frontendRoutePaths(): array
    {
        $routeFiles = glob(base_path('public/assets/js/modules/*/routes.js')) ?: [];
        if ($routeFiles === []) {
            throw new RuntimeException('SPA route definitions could not be located.');
        }

        $paths = [];
        $pattern = '~\bpath\s*:\s*(?:"([^"]+)"|\'([^\']+)\'|`([^`]+)`)~';

        foreach ($routeFiles as $routeFile) {
            $source = file_get_contents($routeFile);
            if ($source === false) {
                throw new RuntimeException('SPA route definitions could not be read.');
            }

            preg_match_all($pattern, $source, $matches, PREG_SET_ORDER);
            foreach ($matches as $match) {
                // PREG_SET_ORDER fills unmatched capture groups with an empty
                // string. Null coalescing therefore stops at group 1 even for
                // single-quoted strings and template literals unless we pick
                // the first non-empty capture explicitly.
                $path = '';
                foreach ([1, 2, 3] as $capture) {
                    if (isset($match[$capture]) && $match[$capture] !== '') {
                        $path = (string) $match[$capture];
                        break;
                    }
                }
                if ($path !== '') {
                    $paths[] = $path;
                }
            }
        }

        if ($paths === []) {
            throw new RuntimeException('No SPA route paths were found.');
        }

        return $paths;
    }

    /** @return array<int, string> */
    private static function backendRoutePaths(): array
    {
        $routeFile = base_path('routes/api.php');
        if (! is_file($routeFile)) {
            throw new RuntimeException('PHP API route definitions could not be located.');
        }

        $registerRoutes = require $routeFile;
        if (! is_callable($registerRoutes)) {
            throw new RuntimeException('PHP API route definitions are invalid.');
        }

        $router = new Router();
        $registerRoutes($router);

        return $router->registeredPaths();
    }
}
