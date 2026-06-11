<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

use App\Modules\DesignStudio\Repositories\RollbackRepository;

class RollbackService
{
    private RollbackRepository $rollback;
    private RollbackValidator $validator;
    private VersionCompareService $compare;
    private ?AuditService $audit;
    private DiffEngine $diff;
    private ?HealthCheckerService $healthChecker;

    public function __construct(
        RollbackRepository $rollback,
        ?RollbackValidator $validator = null,
        ?VersionCompareService $compare = null,
        ?AuditService $audit = null,
        ?DiffEngine $diff = null,
        ?HealthCheckerService $healthChecker = null
    )
    {
        $this->rollback = $rollback;
        $this->validator = $validator ?? new RollbackValidator();
        $this->compare = $compare ?? new VersionCompareService();
        $this->audit = $audit;
        $this->diff = $diff ?? new DiffEngine();
        $this->healthChecker = $healthChecker;
    }

    public function preview(string $route, int $targetVersion): ?array
    {
        $current = $this->rollback->getCurrentPublished($route);
        $target = $this->rollback->getTargetVersion($route, $targetVersion);

        if ($current === null || $target === null || ! $this->validator->validateSnapshot($target, $route)) {
            return null;
        }

        $diff = $this->compare->compare($current, $target);

        return [
            'route' => $route,
            'currentVersion' => $current['version'] ?? null,
            'targetVersion' => $targetVersion,
            'targetPublishNote' => $target['publishNote'] ?? null,
            'elementChanges' => count($diff),
            'propertyChanges' => $this->countPropertyChanges($diff),
            'diff' => $diff,
        ];
    }

    public function rollback(string $route, int $targetVersion, int $publishedBy, string $rollbackNote): ?array
    {
        $rollbackNote = trim($rollbackNote);

        if (! $this->validator->validateNote($rollbackNote)) {
            return null;
        }

        $current = $this->rollback->getCurrentPublished($route);
        $target = $this->rollback->getTargetVersion($route, $targetVersion);

        if ($current === null || $target === null || ! $this->validator->validateSnapshot($target, $route)) {
            return null;
        }

        $nextVersion = $this->rollback->nextVersion($route);
        $snapshot = $target;
        $snapshot['version'] = $nextVersion;
        $snapshot['publishedBy'] = $publishedBy;
        $snapshot['publishedAt'] = date('Y-m-d H:i:s');
        $snapshot['publishNote'] = $target['publishNote'] ?? '';
        $snapshot['rollback'] = true;
        $snapshot['rollbackFrom'] = $current['version'] ?? null;
        $snapshot['rollbackTarget'] = $targetVersion;
        $snapshot['rollbackNote'] = $rollbackNote;

        if (! $this->rollback->saveRollbackSnapshot($route, $nextVersion, $snapshot)) {
            return null;
        }

        if (! $this->rollback->publishRollback($route, $snapshot)) {
            $this->rollback->deleteRollbackSnapshot($route, $nextVersion);
            return null;
        }

        $this->rollback->enforceRetention($route, (int) config('design_studio.max_history', 20));
        $this->rollback->clearRouteCache($route);

        $statistics = $this->diff->statistics($this->diff->diff($current, $snapshot));

        if ($this->audit !== null && $this->audit->recordRollback($snapshot, $statistics) === null) {
            $snapshot['warning'] = 'audit_write_failed';
        }

        if ($this->healthChecker !== null) {
            $healthReport = $this->healthChecker->check($snapshot);
            $snapshot['healthReport'] = $healthReport;
            $snapshot['requiresConfirmation'] = $healthReport['requiresConfirmation'] ?? false;
            $snapshot['requiresReason'] = $healthReport['requiresReason'] ?? false;
        }

        return $snapshot;
    }

    private function countPropertyChanges(array $diff): int
    {
        $count = 0;

        foreach ($diff as $elementDiff) {
            foreach ($elementDiff as $breakpointDiff) {
                $count += is_array($breakpointDiff) ? count($breakpointDiff) : 0;
            }
        }

        return $count;
    }
}
