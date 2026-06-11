<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class ReadOnlyModeService
{
    public function evaluate(array $corruptionReport): array
    {
        $severity = $corruptionReport['severity'] ?? 'NORMAL';
        $isReadOnly = in_array($severity, ['CRITICAL'], true);

        return [
            'isReadOnly' => $isReadOnly,
            'severity' => $severity,
            'reason' => $isReadOnly ? 'Critical corruption detected.' : null,
        ];
    }
}
