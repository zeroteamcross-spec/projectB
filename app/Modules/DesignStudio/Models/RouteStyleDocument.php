<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Models;

class RouteStyleDocument
{
    public static function empty(string $route): array
    {
        return [
            'schemaVersion' => (int) config('design_studio.schema_version', 1),
            'route' => $route,
            'updatedBy' => null,
            'updatedAt' => null,
            'elements' => [],
        ];
    }
}
