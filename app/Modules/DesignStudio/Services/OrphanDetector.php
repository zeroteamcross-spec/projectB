<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class OrphanDetector
{
    public function detectElements(string $route, array $registeredElements, array $scannedElements, array $styledElements): array
    {
        $scanned = array_flip($scannedElements);
        $styled = array_flip($styledElements);
        $all = array_values(array_unique(array_merge($registeredElements, $scannedElements, $styledElements)));
        sort($all, SORT_STRING);

        return array_map(static function (string $element) use ($scanned, $styled): array {
            $found = isset($scanned[$element]);
            $hasStyle = isset($styled[$element]);

            return [
                'element' => $element,
                'status' => $found ? 'ACTIVE' : ($hasStyle ? 'ORPHAN' : 'MISSING'),
                'published' => $hasStyle,
                'draft' => $hasStyle,
                'recommendation' => $found ? null : ($hasStyle ? 'Review stale style before cleanup.' : 'Rescan or confirm element removal.'),
            ];
        }, $all);
    }

    public function detectOrphanRoutes(array $knownRoutes, array $indexedRoutes): array
    {
        $known = array_flip($knownRoutes);

        return array_values(array_filter(array_map(static function (string $route) use ($known): ?array {
            if (isset($known[$route])) {
                return null;
            }

            return [
                'route' => $route,
                'status' => 'ORPHAN_ROUTE',
                'recommendation' => 'Route is not present in the provided known route list.',
            ];
        }, array_keys($indexedRoutes))));
    }
}
