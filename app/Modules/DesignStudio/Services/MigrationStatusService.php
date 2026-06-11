<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class MigrationStatusService
{
    public function summary(array $routes): array
    {
        $summary = [
            'NOT_MIGRATED' => 0,
            'PARTIAL' => 0,
            'FULL' => 0,
            'DISABLED' => 0,
        ];

        foreach ($routes as $route) {
            $status = $route['status'] ?? 'NOT_MIGRATED';
            $summary[$status] = ($summary[$status] ?? 0) + 1;
        }

        return $summary;
    }
}
