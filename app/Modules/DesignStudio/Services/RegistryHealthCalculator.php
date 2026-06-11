<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class RegistryHealthCalculator
{
    public function score(array $statuses): int
    {
        if ($statuses === []) {
            return 100;
        }

        $score = 0;

        foreach ($statuses as $status) {
            switch ($status['status'] ?? 'UNKNOWN') {
                case 'ACTIVE':
                    $score += 1;
                    break;
                case 'ORPHAN':
                    $score -= 1;
                    break;
                default:
                    $score += 0;
                    break;
            }
        }

        return max(0, min(100, (int) round((($score + count($statuses)) / (count($statuses) * 2)) * 100)));
    }

    public function summary(array $routes): array
    {
        $summary = [
            'totalRoutes' => count($routes),
            'totalElements' => 0,
            'ACTIVE' => 0,
            'MISSING' => 0,
            'ORPHAN' => 0,
            'UNKNOWN' => 0,
        ];

        foreach ($routes as $route) {
            foreach (($route['elements'] ?? []) as $element) {
                $summary['totalElements']++;
                $status = $element['status'] ?? 'UNKNOWN';
                $summary[$status] = ($summary[$status] ?? 0) + 1;
            }
        }

        return $summary;
    }
}
