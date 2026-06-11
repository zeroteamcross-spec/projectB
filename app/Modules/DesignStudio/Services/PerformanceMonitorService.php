<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class PerformanceMonitorService
{
    public function measure(callable $operation): array
    {
        $start = microtime(true);
        $memoryStart = memory_get_usage(true);
        $result = $operation();

        return [
            'result' => $result,
            'durationMs' => (int) round((microtime(true) - $start) * 1000),
            'memoryBytes' => max(0, memory_get_usage(true) - $memoryStart),
        ];
    }
}
