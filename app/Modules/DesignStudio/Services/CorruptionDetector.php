<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class CorruptionDetector
{
    private JsonValidator $validator;

    public function __construct(?JsonValidator $validator = null)
    {
        $this->validator = $validator ?? new JsonValidator();
    }

    public function detect(array $paths): array
    {
        $issues = [];

        foreach ($paths as $type => $path) {
            $result = $this->validator->validateFile($path);

            if ($result['valid'] !== true) {
                $issues[] = [
                    'type' => is_string($type) ? $type : 'file',
                    'path' => $path,
                    'reason' => $result['reason'],
                    'severity' => $this->severity((string) $type),
                ];
            }
        }

        return [
            'severity' => $this->overallSeverity($issues),
            'issues' => $issues,
        ];
    }

    private function severity(string $type): string
    {
        if ($type === 'published') {
            return 'CRITICAL';
        }

        if ($type === 'history') {
            return 'HIGH';
        }

        return 'LOW';
    }

    private function overallSeverity(array $issues): string
    {
        if ($issues === []) {
            return 'NORMAL';
        }

        $severities = array_column($issues, 'severity');

        if (in_array('CRITICAL', $severities, true)) {
            return 'CRITICAL';
        }

        if (in_array('HIGH', $severities, true)) {
            return 'HIGH';
        }

        return count($issues) > 1 ? 'MEDIUM' : 'LOW';
    }
}
