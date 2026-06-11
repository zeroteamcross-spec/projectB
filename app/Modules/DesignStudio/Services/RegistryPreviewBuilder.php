<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class RegistryPreviewBuilder
{
    public function build(string $route, array $currentElements, array $nextElements): array
    {
        $current = array_values(array_unique($currentElements));
        $next = array_values(array_unique($nextElements));

        return [
            'previewToken' => hash('sha256', $route . '|' . implode(',', $next)),
            'route' => $route,
            'added' => array_values(array_diff($next, $current)),
            'removed' => array_values(array_diff($current, $next)),
            'unchanged' => array_values(array_intersect($current, $next)),
            'nextElements' => $next,
            'warning' => 'Preview only. Confirm is required before registry index is replaced.',
        ];
    }
}
