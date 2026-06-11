<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class EnvironmentCompareService
{
    private DiffEngine $diff;

    public function __construct(?DiffEngine $diff = null)
    {
        $this->diff = $diff ?? new DiffEngine();
    }

    public function compare(array $leftExport, array $rightExport): array
    {
        $left = $leftExport['published'] ?? ['elements' => []];
        $right = $rightExport['published'] ?? ['elements' => []];
        $diff = $this->diff->diff($left, $right);

        return [
            'leftEnvironment' => $leftExport['metadata']['environment'] ?? null,
            'rightEnvironment' => $rightExport['metadata']['environment'] ?? null,
            'leftVersion' => $leftExport['version'] ?? null,
            'rightVersion' => $rightExport['version'] ?? null,
            'statistics' => $this->diff->statistics($diff),
            'diff' => $diff,
        ];
    }
}
