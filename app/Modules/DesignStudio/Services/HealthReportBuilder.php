<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class HealthReportBuilder
{
    public function build(string $route, array $issues): array
    {
        $summary = [
            'INFO' => 0,
            'WARNING' => 0,
            'HIGH' => 0,
            'CRITICAL' => 0,
        ];

        foreach ($issues as $issue) {
            $severity = $issue['severity'] ?? 'INFO';
            $summary[$severity] = ($summary[$severity] ?? 0) + 1;
        }

        return [
            'route' => $route,
            'summary' => $summary,
            'requiresConfirmation' => $summary['HIGH'] > 0 || $summary['CRITICAL'] > 0,
            'requiresReason' => $summary['CRITICAL'] > 0,
            'issues' => array_values($issues),
            'generatedAt' => date('Y-m-d H:i:s'),
        ];
    }
}
