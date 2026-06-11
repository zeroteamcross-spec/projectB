<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class HealthReportService
{
    public function toJson(array $report): string
    {
        return json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) ?: '{}';
    }

    public function toCsv(array $report): string
    {
        $lines = ['severity,count'];

        foreach (($report['summary'] ?? []) as $severity => $count) {
            $lines[] = $severity . ',' . $count;
        }

        return implode(PHP_EOL, $lines);
    }

    public function toMarkdown(array $report): string
    {
        $lines = [
            '# Design Studio Health Report',
            '',
            'Route: ' . ($report['route'] ?? 'system'),
            '',
            '| Severity | Count |',
            '| --- | ---: |',
        ];

        foreach (($report['summary'] ?? []) as $severity => $count) {
            $lines[] = '| ' . $severity . ' | ' . $count . ' |';
        }

        return implode(PHP_EOL, $lines);
    }
}
