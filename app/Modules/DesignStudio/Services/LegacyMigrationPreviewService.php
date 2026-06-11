<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class LegacyMigrationPreviewService
{
    private LegacyMigrationAnalyzer $analyzer;
    private MigrationConflictService $conflicts;

    public function __construct(?LegacyMigrationAnalyzer $analyzer = null, ?MigrationConflictService $conflicts = null)
    {
        $this->analyzer = $analyzer ?? new LegacyMigrationAnalyzer();
        $this->conflicts = $conflicts ?? new MigrationConflictService();
    }

    public function preview(array $legacyPayload, array $existingDraft = []): array
    {
        $analysis = $this->analyzer->analyze($legacyPayload);
        $conflicts = $this->conflicts->detect($analysis['elements'], $existingDraft['elements'] ?? []);

        return [
            'previewToken' => hash('sha256', json_encode($legacyPayload) ?: ''),
            'route' => $analysis['route'],
            'elements' => $analysis['elements'],
            'unsupported' => $analysis['unsupported'],
            'conflicts' => $conflicts,
            'risk' => $conflicts !== [] ? 'HIGH' : $analysis['risk'],
            'writeAllowed' => false,
        ];
    }
}
